"""Admin API endpoints for system telemetry, visitor analytics, and dossier.

Specs: PRD 16 §1–§8 (D1–D8), PRD 14 §4, §6 (S4, S6)
All endpoints (except status) require role='admin'.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request, Response

from app.api.admin_auth import require_admin
from app.exceptions import NotFoundError
from app.services.admin_service import (
    delete_session,
    export_csv,
    get_overview,
    get_session_detail,
    get_session_events,
    get_sessions,
    has_any_admin,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/status")
async def get_admin_status(request: Request) -> dict[str, Any]:
    """Public probe for admin readiness and caller's current role."""
    session = getattr(request.state, "session", None)
    role = session.get("role", "guest") if session else "guest"
    if role != "admin" and session:
        from app.services.admin_service import is_session_elevated

        if is_session_elevated(session.get("id", "")) or is_session_elevated(session.get("label", "")):
            session["role"] = "admin"
            role = "admin"
    label = session.get("label", "GUEST") if session else "GUEST"

    return {
        "admin_configured": has_any_admin(),
        "role": role,
        "session_label": label,
    }


@router.get("/overview")
async def get_admin_overview(
    range: str = Query("7d", description="Time range (24h, 7d, 30d, all)"),
    admin_session: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Retrieve aggregate telemetry overview, KPIs, and breakdowns."""
    return get_overview(range_str=range)


@router.get("/sessions")
async def list_admin_sessions(
    range: str = Query("7d"),
    device: str | None = Query(None),
    country: str | None = Query(None),
    op: str | None = Query(None),
    entry: str | None = Query(None),
    include_bots: bool = Query(False),
    q: str | None = Query(None),
    cursor: str | None = Query(None),
    limit: int = Query(50, le=100),
    admin_session: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Retrieve filtered, cursor-paginated list of visitor sessions."""
    return get_sessions(
        range_str=range,
        device=device,
        country=country,
        op=op,
        entry=entry,
        include_bots=include_bots,
        q=q,
        cursor=cursor,
        limit=limit,
    )


@router.get("/sessions/{session_id}")
async def get_admin_session_dossier(
    session_id: str,
    admin_session: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Retrieve full visitor dossier (device details, measurements, header)."""
    detail = get_session_detail(session_id)
    if not detail:
        raise NotFoundError("Session not found.")
    return detail


@router.get("/sessions/{session_id}/events")
async def get_admin_session_timeline(
    session_id: str,
    visit_id: str | None = Query(None),
    family: str | None = Query(None),
    admin_session: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Retrieve visit-grouped event stream for visitor action replay."""
    return get_session_events(
        session_id=session_id,
        visit_id=visit_id,
        family=family,
    )


@router.get("/export.csv")
async def export_admin_csv(
    range: str = Query("7d"),
    device: str | None = Query(None),
    country: str | None = Query(None),
    op: str | None = Query(None),
    entry: str | None = Query(None),
    include_bots: bool = Query(False),
    q: str | None = Query(None),
    admin_session: dict[str, Any] = Depends(require_admin),
) -> Response:
    """Generate filtered CSV export of visitors and record audit log row."""
    admin_user = admin_session.get("label", "admin@chakshu.internal")
    csv_content = export_csv(
        range_str=range,
        device=device,
        country=country,
        op=op,
        entry=entry,
        include_bots=include_bots,
        q=q,
        admin_user=admin_user,
    )

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=chakshu_telemetry.csv"},
    )


@router.delete("/sessions/{session_id}")
async def revoke_admin_session(
    session_id: str,
    admin_session: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Revoke session and purge all its telemetry events with audit record."""
    admin_user = admin_session.get("label", "admin@chakshu.internal")
    delete_session(session_id=session_id, admin_user=admin_user)
    return {"ok": True, "id": session_id}
