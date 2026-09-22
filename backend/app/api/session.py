"""Session API Endpoints.

Specs: PRD 14 §6 (S6)
- GET /api/v1/session: returns public Session envelope.
- Automatically creates anonymous guest session if no cookie exists.
- Invariant: Never contains token_hash or ip_hash.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from app.services.session_service import (
    create_guest_session,
    get_public_session_envelope,
    resolve_session_by_token,
)
from app.services.telemetry_service import get_event_metrics

router = APIRouter(tags=["Identity"])


@router.get("/session")
async def get_current_session(request: Request) -> dict[str, Any]:
    """Retrieve or create current guest session.

    Returns:
        Session schema per PRD 14 §6. Never returns token_hash or ip_hash.

    """
    session = getattr(request.state, "session", None)
    if not session:
        # Fallback if middleware was skipped
        sid_token = request.cookies.get("sid")
        if sid_token:
            session = resolve_session_by_token(sid_token)
        if not session:
            _, session = create_guest_session(
                client_ip=request.client.host if request.client else "127.0.0.1",
                user_agent=request.headers.get("user-agent"),
                first_path=request.url.path,
            )

    metrics = get_event_metrics()
    return get_public_session_envelope(session, event_count=metrics["total_events"])
