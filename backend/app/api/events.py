"""POST /api/v1/events → always 204 (PRD 15 §1 & §5).

First-party telemetry endpoint:
- Ingests batched events (1..20).
- Enum validation, payload truncation, and bot filtering.
- Rate limits at 60 req/min and 400 events/min per session (returns 429).
- Guarantees 204 No Content response, even under internal failure.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.services.session_service import create_guest_session, resolve_session_by_token
from app.services.telemetry_service import get_event_metrics, ingest_batch

log = logging.getLogger(__name__)

router = APIRouter(tags=["Telemetry"])


class EventPayload(BaseModel):
    """Single event payload per PRD 15 §3."""

    name: str = Field(..., max_length=64, description="Event name from taxonomy")
    path: str | None = Field(None, max_length=256, description="Route at emit time")
    p: dict[str, Any] = Field(default_factory=dict, description="Event payload ≤ 2KB")
    client_ts: str | None = Field(None, description="Client timestamp ISO 8601")
    duration_ms: int | None = Field(None, ge=0, description="Duration for op.result/perf.mark")
    ok: bool | None = Field(None, description="Outcome for op.result / op.error")


class EventBatch(BaseModel):
    """Batch of events — sent together to reduce request count."""

    events: list[EventPayload] = Field(..., max_length=20)
    ctx: dict[str, Any] | None = Field(
        None, description="Session client context sent on first flush"
    )


@router.post("/events", status_code=204, response_class=Response)
async def ingest_events(request: Request) -> Response:
    """Ingest telemetry events. Always returns 204, never fails (except 429 rate limit).

    PRD 15 §1: "Telemetry must never be observable by the user.
    It never blocks, never shows an error, never retries visibly."
    """
    try:
        raw_body = await request.body()
        if not raw_body:
            return Response(status_code=204)

        try:
            body = await request.json()
        except Exception:
            # Malformed JSON returns 204 silently per PRD 15 §1 & §5
            return Response(status_code=204)

        if not isinstance(body, dict):
            return Response(status_code=204)

        try:
            batch = EventBatch.model_validate(body)
        except Exception:
            # Invalid event batch schema returns 204 silently per PRD 15 §1 & §5
            return Response(status_code=204)

        session_id = getattr(request.state, "session_id", None)
        client_ip = getattr(request.state, "client_ip", None) or (
            request.client.host if request.client else "127.0.0.1"
        )

        if not session_id:
            # Missing cookie creates guest session automatically (PRD 15 §5 Rule 1)
            sid_token = request.cookies.get("sid")
            session = resolve_session_by_token(sid_token) if sid_token else None
            if not session:
                _, session = create_guest_session(
                    client_ip=client_ip,
                    user_agent=request.headers.get("user-agent"),
                    first_path=request.url.path,
                )
            session_id = session["id"]

        # Convert pydantic events to dict list
        events_dicts = [evt.model_dump() for evt in batch.events]

        accepted = ingest_batch(
            session_id=session_id,
            events_data=events_dicts,
            client_ip=client_ip,
            user_agent=request.headers.get("user-agent"),
            headers=dict(request.headers),
        )

        if not accepted:
            # Over rate-limit: return 429 so client drops batch without retry storm
            return Response(status_code=429, headers={"Retry-After": "60"})

    except Exception:
        # PRD 15 §1 & §5: "Errors inside ingest are logged server-side and still return 204"
        log.warning("Telemetry ingestion failure caught and suppressed", exc_info=True)

    return Response(status_code=204)


@router.get("/events/count", tags=["Telemetry"])
async def event_count() -> dict[str, int]:
    """Debug endpoint: return total event and visit metrics."""
    metrics = get_event_metrics()
    return {"count": metrics["total_events"]}


@router.get("/events/metrics", tags=["Telemetry"])
async def event_metrics() -> dict[str, int]:
    """Return internal metrics dictionary for testing assertions."""
    return get_event_metrics()
