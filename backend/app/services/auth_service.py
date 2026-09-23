"""Authentication service for Chakshu.

Specs: PRD 14 §4, §5, §6 (S4, S5, S6)
- Authenticates users against app_user (DB) or persisted admin state (data/admin_state.json).
- Implements session fixation protection: rotates session token on login.
- Sets admin_since timestamp for role='admin'.
- Provides session revocation for logout.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from app.services.admin_service import _clean_db_url, _in_memory_admins, _load_persisted_state, _save_persisted_state
from app.services.session_service import (
    _in_memory_sessions,
    generate_token,
    hash_token,
)
from app.settings import settings

log = logging.getLogger(__name__)


def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    """Verify user credentials against memory cache, admin_state.json, or database."""
    _load_persisted_state()
    clean_email = email.strip().lower()

    # 1. Check in memory / admin_state.json
    admin_user = _in_memory_admins.get(clean_email)
    if admin_user and admin_user.get("password") == password:
        return admin_user

    # 2. Check in Postgres database if available
    clean_url = _clean_db_url()
    if clean_url and not settings.OFFLINE:
        try:
            import psycopg

            with psycopg.connect(clean_url, connect_timeout=1) as conn, conn.cursor() as cur:
                cur.execute(
                    "SELECT id, email, password_hash, display_name, role FROM app_user WHERE email = %s;",
                    (clean_email,),
                )
                row = cur.fetchone()
                if row:
                    user_id, u_email, stored_pw, name, role = row
                    if stored_pw == password:
                        return {
                            "id": str(user_id),
                            "email": u_email,
                            "display_name": name,
                            "role": role,
                        }
        except Exception as e:
            log.debug("Database user authentication lookup failed: %s", e)

    return None


def login_session_as_user(
    session: dict[str, Any],
    user: dict[str, Any],
    current_token: str | None,
) -> tuple[str, dict[str, Any]]:
    """Associate session with authenticated user and rotate token for fixation protection."""
    now = datetime.now(UTC)
    session["user_id"] = user["id"]
    session["role"] = user.get("role", "analyst")
    if session["role"] == "admin":
        session["admin_since"] = now
    session["label"] = user.get("display_name") or user.get("email", "").split("@")[0].capitalize()

    # Token rotation per PRD 14 §4
    new_token = generate_token()
    new_hash = hash_token(new_token)
    session["token_hash"] = new_hash

    if current_token and current_token in _in_memory_sessions:
        del _in_memory_sessions[current_token]

    _in_memory_sessions[new_token] = session
    _save_persisted_state()

    clean_url = _clean_db_url()
    if clean_url and not settings.OFFLINE:
        try:
            import psycopg

            with psycopg.connect(clean_url, connect_timeout=1) as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE session
                    SET token_hash = %s, user_id = %s, role = %s, label = %s, admin_since = %s
                    WHERE id = %s;
                    """,
                    (
                        new_hash,
                        user["id"],
                        session["role"],
                        session["label"],
                        session.get("admin_since"),
                        session["id"],
                    ),
                )
                cur.execute(
                    "UPDATE app_user SET last_login_at = %s WHERE id = %s;",
                    (now, user["id"]),
                )
                conn.commit()
        except Exception as e:
            log.debug("Database session login update failed: %s", e)

    return new_token, session


def logout_session(session: dict[str, Any] | None, current_token: str | None) -> None:
    """Revoke session and clear cached state."""
    now = datetime.now(UTC)
    if session:
        session["revoked_at"] = now
        session["role"] = "guest"
        session["admin_since"] = None

    if current_token and current_token in _in_memory_sessions:
        del _in_memory_sessions[current_token]

    _save_persisted_state()

    clean_url = _clean_db_url()
    if clean_url and not settings.OFFLINE and session:
        try:
            import psycopg

            with psycopg.connect(clean_url, connect_timeout=1) as conn, conn.cursor() as cur:
                cur.execute("UPDATE session SET revoked_at = %s WHERE id = %s;", (now, session["id"]))
                conn.commit()
        except Exception as e:
            log.debug("Database session logout update failed: %s", e)
