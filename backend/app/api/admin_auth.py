"""Admin authorization dependency for Chakshu API endpoints.

Specs: PRD 14 §4, §6 (S4, S6), PRD 16 §1, §8 (D1, D8)
- Requires role='admin' on protected routes.
- guest → 401 AuthRequiredError (never redirect loop, never 500).
- analyst → 403 RoleRequiredError.
- No admin configured in DB/system → 503 NoAdminConfiguredError.
- Rejects admin sessions older than 12 hours or idle > 60 minutes (401 SessionExpiredError).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Request

from app.exceptions import (
    AuthRequiredError,
    NoAdminConfiguredError,
    RoleRequiredError,
    SessionExpiredError,
)
from app.services.admin_service import has_any_admin
from app.services.session_service import resolve_session_by_token

log = logging.getLogger(__name__)


async def require_admin(request: Request) -> dict[str, Any]:
    """Validate that caller holds an active, unexpired admin session."""
    # 1. Bootstrap verification: check if any admin exists in the system
    if not has_any_admin():
        log.warning("Admin route accessed but no admin configured in system.")
        raise NoAdminConfiguredError()

    # 2. Extract session attached by middleware or from request headers/cookies
    session = getattr(request.state, "session", None)
    if not session:
        sid = request.cookies.get("sid")
        if not sid:
            auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
            if auth_header and auth_header.lower().startswith("bearer "):
                sid = auth_header[7:].strip()
        if sid:
            session = resolve_session_by_token(sid)

    if not session:
        raise AuthRequiredError()

    # 3. Role verification (guest → 401, analyst → 403)
    role = session.get("role", "guest")
    if role != "admin":
        from app.services.admin_service import is_session_elevated

        if is_session_elevated(session.get("id", "")) or is_session_elevated(session.get("label", "")):
            session["role"] = "admin"
            role = "admin"

    if role == "guest" or not role:
        raise AuthRequiredError()
    if role == "analyst":
        raise RoleRequiredError()
    if role != "admin":
        raise RoleRequiredError()

    # 4. Expiry and idle timeout enforcement (PRD 14 §4)
    now = datetime.now(UTC)

    # Admin maximum session lifetime: 12 hours
    admin_since = session.get("admin_since")
    if not admin_since:
        admin_since = session.get("created_at")

    if isinstance(admin_since, datetime):
        if (now - admin_since) > timedelta(hours=12):
            log.info("Admin session expired (>12h). Session: %s", session.get("id"))
            raise SessionExpiredError("Admin session expired (12h maximum lifetime).")

    # Admin idle timeout: 60 minutes
    last_idle = session.get("idle_at") or session.get("last_seen_at")
    if isinstance(last_idle, datetime):
        if (now - last_idle) > timedelta(minutes=60):
            log.info("Admin session idle timeout (>60m). Session: %s", session.get("id"))
            raise SessionExpiredError("Admin session timed out due to 60m inactivity.")

    return session
