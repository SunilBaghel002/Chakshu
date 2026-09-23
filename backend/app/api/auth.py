"""Authentication endpoints for Chakshu (PRD 14 §6).

Routes:
- POST /api/v1/auth/login: Authenticate email/password, rotate token, set sid cookie.
- POST /api/v1/auth/logout: Revoke session, clear sid cookie with Max-Age=0.
- GET /api/v1/auth/me: Retrieve caller's current session and authenticated identity.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app.services.auth_service import authenticate_user, login_session_as_user, logout_session
from app.services.session_service import (
    create_guest_session,
    get_public_session_envelope,
    resolve_session_by_token,
)
from app.services.telemetry_service import ingest_batch
from app.settings import settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    """Admin/User login request payload."""

    email: str = Field(..., max_length=256, description="User email address")
    password: str = Field(..., min_length=1, max_length=256, description="User password")


@router.post("/login")
async def login(req: LoginRequest, request: Request, response: Response) -> dict[str, Any]:
    """Authenticate with email and password per PRD 14 §6."""
    user = authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password.",
            },
        )

    # Resolve or create the current caller session
    sid_token = request.cookies.get("sid")
    session = resolve_session_by_token(sid_token) if sid_token else None
    if not session:
        sid_token, session = create_guest_session(
            client_ip=getattr(request.state, "client_ip", None),
            user_agent=request.headers.get("user-agent"),
            first_path=request.url.path,
        )

    # Rotate token and link session
    new_token, updated_session = login_session_as_user(session, user, sid_token)

    # Set hardened HttpOnly cookie per PRD 14 §2
    is_prod = getattr(settings, "ENV", "dev") == "prod"
    response.set_cookie(
        key="sid",
        value=new_token,
        max_age=30 * 86400,
        httponly=True,
        samesite="lax",
        secure=is_prod,
        path="/",
    )

    # Ingest auth.login event
    try:
        ingest_batch(
            session_id=updated_session["id"],
            events_data=[{"name": "auth.login", "path": "/admin", "p": {"role": updated_session["role"]}}],
            client_ip=getattr(request.state, "client_ip", None),
            user_agent=request.headers.get("user-agent"),
            headers=dict(request.headers),
        )
    except Exception:
        pass

    return {
        "session": get_public_session_envelope(updated_session),
        "role": updated_session["role"],
        "user": {
            "id": user["id"],
            "email": user["email"],
            "display_name": user.get("display_name"),
            "role": user.get("role", "analyst"),
        },
    }


@router.post("/logout", status_code=204)
async def logout(request: Request) -> Response:
    """Revoke session and clear authentication cookie."""
    sid_token = request.cookies.get("sid")
    session = resolve_session_by_token(sid_token) if sid_token else None

    logout_session(session, sid_token)

    is_prod = getattr(settings, "ENV", "dev") == "prod"
    res = Response(status_code=204)
    res.delete_cookie(
        key="sid",
        path="/",
        httponly=True,
        samesite="lax",
        secure=is_prod,
    )

    if session:
        try:
            ingest_batch(
                session_id=session["id"],
                events_data=[{"name": "auth.logout", "path": "/admin", "p": {}}],
                client_ip=getattr(request.state, "client_ip", None),
                user_agent=request.headers.get("user-agent"),
                headers=dict(request.headers),
            )
        except Exception:
            pass

    return res


@router.get("/me")
async def get_current_user(request: Request) -> dict[str, Any]:
    """Retrieve identity of the current session."""
    session = getattr(request.state, "session", None)
    if not session:
        sid_token = request.cookies.get("sid")
        session = resolve_session_by_token(sid_token) if sid_token else None

    if not session:
        return {"authenticated": False, "role": "guest", "session_label": "GUEST-ANON"}

    return {
        "authenticated": session.get("role") in ("admin", "analyst"),
        "role": session.get("role", "guest"),
        "session": get_public_session_envelope(session),
    }
