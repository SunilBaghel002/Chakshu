"""Admin identity, session elevation, and visitor dossier service for Chakshu.

Specs: PRD 16 §1–§8 (D1–D8), PRD 14 §4, §6 (S4, S6)
- Manages admin credentials and elevation.
- Persists local admin state in data/admin_state.json and database.
- Delivers visitor detail dossier (SLOT-20..26) with privacy hygiene.
- Re-exports analytics query endpoints from admin_analytics.
"""

from __future__ import annotations

import json
import logging
import secrets
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.services.admin_analytics import (
    _in_memory_audits,
    export_csv,
    get_overview,
    get_session_events,
    get_sessions,
)
from app.services.session_service import _in_memory_sessions
from app.services.telemetry_service import _in_memory_events, _in_memory_visits
from app.settings import settings

log = logging.getLogger(__name__)

_in_memory_admins: dict[str, dict[str, Any]] = {}

STATE_FILE = Path(settings.ROOT_DIR) / "data" / "admin_state.json"


def _clean_db_url() -> str | None:
    url = getattr(settings, "DATABASE_URL", None)
    if not url:
        return None
    return url.replace("postgresql+psycopg://", "postgresql://")


def _load_persisted_state() -> None:
    env_email = getattr(settings, "ADMIN_EMAIL", "").strip().lower()
    env_pwd = getattr(settings, "ADMIN_PASSWORD", "")
    if env_email and env_pwd:
        _in_memory_admins[env_email] = {
            "id": f"admin-{env_email.split('@')[0]}",
            "email": env_email,
            "password": env_pwd,
            "display_name": env_email.split("@")[0].capitalize(),
            "role": "admin",
            "created_at": datetime.now(UTC).isoformat(),
        }
    if not STATE_FILE.exists():
        return
    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        for k, v in data.get("admins", {}).items():
            _in_memory_admins[k] = v
        if env_email and env_pwd and env_email in _in_memory_admins:
            _in_memory_admins[env_email]["password"] = env_pwd
        for sess_id, s_data in data.get("elevated_sessions", {}).items():
            if sess_id in _in_memory_sessions:
                _in_memory_sessions[sess_id]["role"] = "admin"
                _in_memory_sessions[sess_id]["admin_since"] = datetime.now(UTC)
            else:
                _in_memory_sessions[sess_id] = {
                    "id": sess_id,
                    "label": s_data.get("label", f"GUEST-{sess_id[:4].upper()}"),
                    "role": "admin",
                    "admin_since": datetime.now(UTC),
                    "last_seen_at": datetime.now(UTC),
                    "created_at": datetime.now(UTC),
                    "user_id": s_data.get("user_id"),
                }
    except Exception as e:
        log.debug("Failed loading admin_state.json: %s", e)


def _save_persisted_state() -> None:
    try:
        existing_elevated: dict[str, Any] = {}
        if STATE_FILE.exists():
            try:
                prev = json.loads(STATE_FILE.read_text(encoding="utf-8"))
                existing_elevated = prev.get("elevated_sessions", {})
            except Exception:
                existing_elevated = {}

        for s in _in_memory_sessions.values():
            if s.get("role") == "admin" and not s.get("revoked_at"):
                existing_elevated[s["id"]] = {
                    "id": s["id"],
                    "label": s.get("label"),
                    "user_id": s.get("user_id"),
                    "admin_since": str(s.get("admin_since") or datetime.now(UTC)),
                }
            elif s.get("role") != "admin" or s.get("revoked_at"):
                existing_elevated.pop(s["id"], None)

        payload = {
            "admins": _in_memory_admins,
            "elevated_sessions": existing_elevated,
        }
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        STATE_FILE.write_text(json.dumps(payload, default=str, indent=2), encoding="utf-8")
    except Exception as e:
        log.debug("Failed saving admin_state.json: %s", e)


def is_session_elevated(session_id_or_label: str) -> bool:
    """Check if session_id or label is elevated in admin_state.json or memory."""
    if not session_id_or_label:
        return False
    _load_persisted_state()
    for s in _in_memory_sessions.values():
        if (s.get("id") == session_id_or_label or s.get("label") == session_id_or_label) and s.get("role") == "admin":
            return True
    if STATE_FILE.exists():
        try:
            data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            elevated = data.get("elevated_sessions", {})
            for k, v in elevated.items():
                if k == session_id_or_label or (isinstance(v, dict) and v.get("label") == session_id_or_label):
                    return True
        except Exception:
            pass
    return False


# Load state on module import
_load_persisted_state()


def has_any_admin() -> bool:
    """Check if at least one admin user or admin session exists in the system."""
    _load_persisted_state()
    if _in_memory_admins:
        return True
    for sess in _in_memory_sessions.values():
        if sess.get("role") == "admin" and not sess.get("revoked_at"):
            return True

    clean_url = _clean_db_url()
    if clean_url and not settings.OFFLINE:
        try:
            import psycopg

            with psycopg.connect(clean_url, connect_timeout=1) as conn, conn.cursor() as cur:
                cur.execute("SELECT 1 FROM app_user WHERE role = 'admin' LIMIT 1;")
                if cur.fetchone():
                    return True
                cur.execute(
                    "SELECT 1 FROM session WHERE role = 'admin' AND revoked_at IS NULL LIMIT 1;"
                )
                if cur.fetchone():
                    return True
        except Exception as e:
            log.debug("DB check for admin failed: %s", e)

    return False


def create_admin_user(
    email: str,
    password: str | None = None,
    display_name: str | None = None,
) -> tuple[str, str]:
    """Create or promote an admin user with credentials."""
    user_id = str(uuid.uuid4())
    plain_pw = password or secrets.token_urlsafe(16)
    name = display_name or email.split("@")[0].capitalize()
    now = datetime.now(UTC)

    _in_memory_admins[email.lower()] = {
        "id": user_id,
        "email": email.lower(),
        "password": plain_pw,
        "display_name": name,
        "role": "admin",
        "created_at": now.isoformat(),
    }
    _save_persisted_state()

    clean_url = _clean_db_url()
    if clean_url and not settings.OFFLINE:
        try:
            import psycopg

            with psycopg.connect(clean_url, connect_timeout=1) as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO app_user (id, email, password_hash, display_name, role, created_at)
                    VALUES (%s, %s, %s, %s, 'admin', %s)
                    ON CONFLICT (email) DO UPDATE SET role = 'admin';
                    """,
                    (user_id, email.lower(), plain_pw, name, now),
                )
                conn.commit()
        except Exception as e:
            log.debug("DB admin user insert failed: %s", e)

    return user_id, plain_pw


def elevate_session_to_admin(
    session_id_or_token: str, admin_user_id: str | None = None
) -> dict[str, Any] | None:
    """Elevate a guest or analyst session to role='admin'."""
    now = datetime.now(UTC)
    target_session: dict[str, Any] | None = None

    for sess in _in_memory_sessions.values():
        if sess["id"] == session_id_or_token or sess.get("label") == session_id_or_token:
            target_session = sess
            break

    if not target_session and session_id_or_token in _in_memory_sessions:
        target_session = _in_memory_sessions[session_id_or_token]

    if not target_session:
        target_session = {
            "id": session_id_or_token,
            "label": f"GUEST-{session_id_or_token[:4].upper()}",
            "role": "guest",
            "created_at": now,
            "last_seen_at": now,
        }
        _in_memory_sessions[session_id_or_token] = target_session

    target_session["role"] = "admin"
    target_session["admin_since"] = now
    target_session["user_id"] = admin_user_id or target_session.get("user_id")
    _save_persisted_state()

    clean_url = _clean_db_url()
    if clean_url and not settings.OFFLINE:
        try:
            import psycopg

            with psycopg.connect(clean_url, connect_timeout=1) as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE session
                    SET role = 'admin', admin_since = %s, user_id = COALESCE(%s, user_id)
                    WHERE id::text = %s OR label = %s
                    RETURNING id, label, role, admin_since;
                    """,
                    (now, admin_user_id, session_id_or_token, session_id_or_token),
                )
                conn.commit()
        except Exception as e:
            log.debug("DB elevate session failed: %s", e)

    return target_session


def elevate_latest_session() -> dict[str, Any] | None:
    """Find the most recently active session and elevate it to admin."""
    _load_persisted_state()

    candidates: list[dict[str, Any]] = []

    # 1. From local sessions_cache.json written by running server
    cache_path = Path(settings.ROOT_DIR) / "data" / "sessions_cache.json"
    if cache_path.exists():
        try:
            cached = json.loads(cache_path.read_text(encoding="utf-8"))
            for item in cached.values():
                candidates.append(item)
        except Exception as e:
            log.debug("Failed reading sessions_cache.json: %s", e)

    # 2. From real created in-memory sessions
    for s in _in_memory_sessions.values():
        if "token_hash" in s:
            candidates.append({
                "id": s["id"],
                "label": s.get("label"),
                "last_seen_at": str(s.get("last_seen_at") or ""),
            })

    if candidates:
        sorted_cand = sorted(
            candidates,
            key=lambda s: str(s.get("last_seen_at") or ""),
            reverse=True,
        )
        return elevate_session_to_admin(sorted_cand[0]["id"])

    clean_url = _clean_db_url()
    if clean_url and not settings.OFFLINE:
        try:
            import psycopg

            with psycopg.connect(clean_url, connect_timeout=1) as conn, conn.cursor() as cur:
                cur.execute("SELECT id FROM session ORDER BY last_seen_at DESC LIMIT 1;")
                row = cur.fetchone()
                if row:
                    return elevate_session_to_admin(str(row[0]))
        except Exception as e:
            log.debug("DB fetch latest session failed: %s", e)
    return None


def get_session_detail(session_id: str) -> dict[str, Any] | None:
    """Retrieve full visitor dossier per PRD 16 §4 (SLOT-20..26)."""
    t0 = time.perf_counter()
    sess = None
    for s in _in_memory_sessions.values():
        if s["id"] == session_id:
            sess = s
            break
    if not sess:
        return None

    now = datetime.now(UTC)
    sess_events = [e for e in _in_memory_events if e.get("session_id") == session_id]
    sess_visits = [v for v in _in_memory_visits.values() if v.get("session_id") == session_id]

    dwell_s = sum(
        max(1.0, (v.get("ended_at", v["started_at"]) - v["started_at"]).total_seconds())
        for v in sess_visits
    )
    dwell_fmt = f"{int(dwell_s // 60)}m {int(dwell_s % 60)}s" if dwell_s >= 60 else f"{int(dwell_s)}s"
    ops_count = sum(1 for e in sess_events if e["name"].startswith("op."))
    errors_count = sum(1 for e in sess_events if e.get("ok") is False or e["name"] == "op.error")

    raw_ip_h = sess.get("ip_hash")
    ip_prefix = raw_ip_h.hex()[:8] + "…" if isinstance(raw_ip_h, (bytes, bytearray)) else "LOCAL…"

    return {
        "header": {
            "id": sess["id"],
            "label": sess.get("label", "GUEST"),
            "kind": "user" if sess.get("user_id") else "guest",
            "first_seen": sess.get("created_at", now).isoformat()
            if isinstance(sess.get("created_at"), datetime)
            else str(sess.get("created_at")),
        },
        "measured": {
            "events": len(sess_events),
            "visits": max(1, len(sess_visits)),
            "dwell": dwell_fmt,
            "ops": ops_count,
            "errors": errors_count,
        },
        "device": {
            "ua_raw": sess.get("ua_raw") or "Unknown Browser User-Agent",
            "device": sess.get("ua_device", "desktop"),
            "browser": sess.get("ua_browser", "unknown"),
            "os": sess.get("ua_os", "unknown"),
            "screen": sess.get("screen") or "1920x1080",
            "dpr": "1.0",
            "tz": "UTC",
            "ip_hash_prefix": ip_prefix,
            "ip_note": "HASHED · NOT AN ADDRESS",
            "geo_city": sess.get("geo_city") or "UNKNOWN",
            "geo_region": sess.get("geo_region") or "UNKNOWN",
            "geo_country": sess.get("geo_country") or "UNKNOWN",
            "referrer_host": sess.get("referrer_host") or "Direct Navigation",
        },
        "query_ms": max(1, round((time.perf_counter() - t0) * 1000, 2)),
        "rows_scanned": len(sess_events) + len(sess_visits),
    }


def delete_session(session_id: str, admin_user: str = "admin@chakshu.internal") -> bool:
    """Revoke a session and purge its telemetry events (PRD 16 §6)."""
    now = datetime.now(UTC)
    for sess in _in_memory_sessions.values():
        if sess["id"] == session_id:
            sess["revoked_at"] = now
            break

    global _in_memory_events
    from app.services import telemetry_service
    telemetry_service._in_memory_events = [
        e for e in telemetry_service._in_memory_events if e.get("session_id") != session_id
    ]

    _in_memory_audits.append({
        "action": "admin.session.delete",
        "actor": admin_user,
        "ts": now,
        "details": {"session_id": session_id},
    })
    return True
