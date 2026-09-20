"""POST /api/v1/events → always 204.

PRD 15 §1 (T1): First-party telemetry endpoint.
Task 8.10: POST /api/v1/events → always 204.

- Accepts event payloads, stores in-memory (DB optional).
- Never blocks the client.
- Never returns an error to the client (always 204).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

log = logging.getLogger(__name__)

router = APIRouter(tags=["Telemetry"])

# In-memory event store (graceful fallback when DB is unavailable)
_events: list[dict[str, Any]] = []


class EventPayload(BaseModel):
    """Single event payload per PRD 15 §3."""

    name: str = Field(..., max_length=64, description="Event name from taxonomy")
    path: str | None = Field(None, max_length=256, description="Route at emit time")
    p: dict[str, Any] = Field(default_factory=dict, description="Event payload ≤ 2KB")
    client_ts: str | None = Field(None, description="Client timestamp ISO 8601")
    duration_ms: int | None = Field(None, ge=0, description="Duration for op.result/perf.mark")


class EventBatch(BaseModel):
    """Batch of events — sent together to reduce request count."""

    events: list[EventPayload] = Field(..., max_length=20)


@router.post("/events", status_code=204, response_class=Response)
async def ingest_events(request: Request, batch: EventBatch) -> Response:
    """Ingest telemetry events. Always returns 204, never fails.

    PRD 15 §1: "Telemetry must never be observable by the user.
    It never blocks, never shows an error."
    """
    try:
        session_id = getattr(request.state, "session_id", None)
        now = datetime.now(timezone.utc).isoformat()

        for evt in batch.events:
            event_record = {
                "session_id": session_id,
                "name": evt.name,
                "ts": now,
                "client_ts": evt.client_ts,
                "path": evt.path,
                "p": evt.p,
                "duration_ms": evt.duration_ms,
            }
            _events.append(event_record)

        log.debug(
            "Ingested %d events for session %s",
            len(batch.events),
            session_id,
        )
    except Exception:
        # PRD 15 §1: never fail, never block
        log.warning("Event ingestion failed silently", exc_info=True)

    return Response(status_code=204)


@router.get("/events/count", tags=["Telemetry"])
async def event_count() -> dict[str, int]:
    """Debug endpoint: return total event count."""
    return {"count": len(_events)}
