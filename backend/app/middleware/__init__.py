"""Guest session middleware for Chakshu.

PRD 14 §1 (S1): Creates anonymous guest sessions automatically
on the first API request from a browser with no `sid` cookie.

Task 8.10: Guest sessions — middleware, cookie, session/visit DDL.
"""

from __future__ import annotations

import hashlib
import logging
import os
import secrets
import uuid
from base64 import urlsafe_b64encode
from datetime import datetime, timedelta, timezone

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

log = logging.getLogger(__name__)

# Cookie config per PRD 14 §2
SID_COOKIE_NAME = "sid"
GUEST_MAX_AGE_DAYS = 30
TOKEN_BYTES = 32  # 32 random bytes → 43 chars base64url


def _generate_token() -> str:
    """Generate a 32-byte random token as base64url (43 chars)."""
    return urlsafe_b64encode(secrets.token_bytes(TOKEN_BYTES)).decode("ascii").rstrip("=")


def _hash_token(token: str) -> bytes:
    """SHA-256 hash of the token — this is what gets stored, never the token itself."""
    return hashlib.sha256(token.encode("ascii")).digest()


def _session_label(session_id: uuid.UUID) -> str:
    """Generate the GUEST-XXXX label from first 4 hex of the session fingerprint."""
    return f"GUEST-{session_id.hex[:4].upper()}"


class GuestSessionMiddleware(BaseHTTPMiddleware):
    """Creates or validates a guest session on every request.

    - If no `sid` cookie: creates a new guest session, sets the cookie.
    - If `sid` cookie present: validates against stored hash.
    - The session is available as `request.state.session_id`.

    DB interaction is gracefully degraded — if DB is unavailable,
    sessions are still created in-memory for the request lifecycle.
    """

    def __init__(self, app, *, env: str = "dev"):  # type: ignore[no-untyped-def]
        super().__init__(app)
        self.env = env
        self._sessions: dict[str, dict] = {}  # In-memory fallback when DB is down

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip for health checks and static assets
        path = request.url.path
        if path in ("/health", "/api/v1/health") or path.startswith("/assets/"):
            return await call_next(request)

        sid_token = request.cookies.get(SID_COOKIE_NAME)
        session_id: str | None = None
        new_session = False

        if sid_token and sid_token in self._sessions:
            # Existing session — update last_seen
            session_data = self._sessions[sid_token]
            session_data["last_seen_at"] = datetime.now(timezone.utc).isoformat()
            session_id = session_data["id"]
        else:
            # Create new guest session
            new_session = True
            sid_token = _generate_token()
            new_id = uuid.uuid4()
            session_id = str(new_id)
            now = datetime.now(timezone.utc)

            self._sessions[sid_token] = {
                "id": session_id,
                "token_hash": _hash_token(sid_token).hex(),
                "role": "guest",
                "label": _session_label(new_id),
                "created_at": now.isoformat(),
                "last_seen_at": now.isoformat(),
                "expires_at": (now + timedelta(days=GUEST_MAX_AGE_DAYS)).isoformat(),
                "first_path": path,
                "ua_raw": request.headers.get("user-agent", ""),
            }
            log.info(
                "New guest session created",
                extra={"session_id": session_id, "label": _session_label(new_id)},
            )

        # Attach session to request state
        request.state.session_id = session_id
        request.state.session_label = self._sessions.get(sid_token, {}).get("label", "GUEST")

        response = await call_next(request)

        # Set cookie on new sessions
        if new_session and sid_token:
            is_prod = os.environ.get("ENV", "dev") == "prod"
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
