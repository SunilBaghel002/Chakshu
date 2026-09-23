"""Guest session middleware for Chakshu.

PRD 14 §1, §2 (S1, S2):
- Resolves or creates anonymous guest sessions automatically on first API request.
- Sets HttpOnly, SameSite=Lax, Path=/, Max-Age=30 days (sliding), Secure when ENV=prod.
- Token stored as SHA-256 binary hash; plain token never logged or stored.
- Session attached to request.state.session_id and request.state.session.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.services.session_service import (
    GUEST_MAX_AGE_DAYS,
    SID_COOKIE_NAME,
    create_guest_session,
    resolve_session_by_token,
    touch_session_ua,
)
from app.settings import settings

log = logging.getLogger(__name__)


def _extract_client_ip(request: Request) -> str:
    """Extract client IP from headers or connection without writing to logs."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


class GuestSessionMiddleware(BaseHTTPMiddleware):
    """Creates or validates a guest session on every request."""

    def __init__(self, app: Any, *, env: str = "dev") -> None:
        super().__init__(app)
        self.env = env

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip static assets
        path = request.url.path
        if path.startswith("/assets/") or path.endswith((".ico", ".svg", ".png", ".woff2")):
            return await call_next(request)

        client_ip = _extract_client_ip(request)
        sid_token = request.cookies.get(SID_COOKIE_NAME)
        session = None
        new_session = False
        reissue_cookie = False

        if sid_token:
            session = resolve_session_by_token(sid_token)

        if not session:
            # Create new guest session
            new_session = True
            sid_token, session = create_guest_session(
                client_ip=client_ip,
                user_agent=request.headers.get("user-agent"),
                referrer=request.headers.get("referer"),
                first_path=path,
            )
        else:
            touch_session_ua(session, request.headers.get("user-agent"))
            # Check sliding window: re-issue if last_seen is older than 1 hour
            created_or_last = session.get("last_seen_at")
            if isinstance(created_or_last, datetime):
                age_seconds = (datetime.now(timezone.utc) - created_or_last).total_seconds()
                if age_seconds > 3600:
                    reissue_cookie = True

        # Attach session and safe metadata to request state
        request.state.session_id = session["id"]
        request.state.session_label = session.get("label", "GUEST")
        request.state.session = session
        request.state.client_ip = client_ip
        request.state.sid_token = sid_token

        response = await call_next(request)

        # Set cookie if new session or refreshed (skip if endpoint already set or cleared sid)
        has_sid_cookie = any(
            k.lower() == b"set-cookie" and v.startswith(f"{SID_COOKIE_NAME}=".encode("ascii"))
            for k, v in response.raw_headers
        )
        if not has_sid_cookie and (new_session or reissue_cookie) and sid_token:
            is_prod = getattr(settings, "ENV", "dev") == "prod"
            response.set_cookie(
                key=SID_COOKIE_NAME,
                value=sid_token,
                max_age=GUEST_MAX_AGE_DAYS * 86400,
                httponly=True,
                secure=is_prod,
                samesite="lax",
                path="/",
            )

        return response
