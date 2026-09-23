"""Local persistence and DB reachability layer for Telemetry & Sessions.

Specs: PRD 15 §7, PRD 16 §1-§8
- Provides fast, durable fallback storage in data/telemetry_state.json and data/sessions_cache.json.
- Caches DB reachability status (15s TTL) to prevent 500ms-2s DNS blocks per event.
- Loads existing visitor sessions, visits, and events on module initialization.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.settings import settings

log = logging.getLogger(__name__)

TELEMETRY_FILE = Path(settings.ROOT_DIR) / "data" / "telemetry_state.json"
SESSIONS_FILE = Path(settings.ROOT_DIR) / "data" / "sessions_cache.json"

# DB reachability cache: (status: bool, timestamp: float)
_db_status_cache: tuple[bool, float] = (False, 0.0)
DB_CACHE_TTL = 15.0


def is_db_available() -> bool:
    """Check if Postgres DB is reachable without blocking on every event."""
    global _db_status_cache
    if settings.OFFLINE:
        return False
    db_url = getattr(settings, "DATABASE_URL", None)
    if not db_url:
        return False

    now = time.time()
    cached_status, cached_time = _db_status_cache
    if (now - cached_time) < DB_CACHE_TTL:
        return cached_status

    clean_url = db_url.replace("postgresql+psycopg://", "postgresql://")
    try:
        import psycopg

        with psycopg.connect(clean_url, connect_timeout=1) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                cur.fetchone()
        _db_status_cache = (True, now)
        return True
    except Exception:
        _db_status_cache = (False, now)
        return False


def _serialize_dt(val: Any) -> Any:
    if isinstance(val, datetime):
        return val.isoformat()
    return val


def _parse_dt(val: Any) -> datetime:
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            pass
    return datetime.now(UTC)


def load_telemetry_state() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    """Load persisted events and visits from telemetry_state.json."""
    if not TELEMETRY_FILE.exists():
        return [], {}
    try:
        data = json.loads(TELEMETRY_FILE.read_text(encoding="utf-8"))
        raw_events = data.get("events", [])
        raw_visits = data.get("visits", {})

        events: list[dict[str, Any]] = []
        for ev in raw_events:
            events.append({
                "session_id": ev.get("session_id", ""),
                "visit_id": ev.get("visit_id", ""),
                "user_id": ev.get("user_id"),
                "name": ev.get("name", ""),
                "ts": _parse_dt(ev.get("ts")),
                "client_ts": ev.get("client_ts"),
                "path": ev.get("path", "/"),
                "p": ev.get("p", {}),
                "duration_ms": ev.get("duration_ms"),
                "ok": ev.get("ok"),
            })

        visits: dict[str, dict[str, Any]] = {}
        for vid, v in raw_visits.items():
            visits[vid] = {
                "id": v.get("id", vid),
                "session_id": v.get("session_id", ""),
                "started_at": _parse_dt(v.get("started_at")),
                "ended_at": _parse_dt(v.get("ended_at")),
                "last_activity": _parse_dt(v.get("last_activity")),
                "entry_path": v.get("entry_path", "/"),
                "exit_path": v.get("exit_path", "/"),
                "event_count": v.get("event_count", 0),
                "ops": v.get("ops", {}),
            }
        return events, visits
    except Exception as e:
        log.debug("Failed loading telemetry_state.json: %s", e)
        return [], {}


def save_telemetry_state(
    events: list[dict[str, Any]],
    visits: dict[str, dict[str, Any]],
) -> None:
    """Save events and visits to disk, retaining up to 5,000 most recent events."""
    try:
        TELEMETRY_FILE.parent.mkdir(parents=True, exist_ok=True)
        # Keep recent events to avoid unbounded file growth
        capped_events = events[-5000:]
        payload = {
            "events": [
                {
                    "session_id": ev.get("session_id"),
                    "visit_id": ev.get("visit_id"),
                    "user_id": ev.get("user_id"),
                    "name": ev.get("name"),
                    "ts": _serialize_dt(ev.get("ts")),
                    "client_ts": ev.get("client_ts"),
                    "path": ev.get("path"),
                    "p": ev.get("p"),
                    "duration_ms": ev.get("duration_ms"),
                    "ok": ev.get("ok"),
                }
                for ev in capped_events
            ],
            "visits": {
                vid: {
                    "id": v.get("id"),
                    "session_id": v.get("session_id"),
                    "started_at": _serialize_dt(v.get("started_at")),
                    "ended_at": _serialize_dt(v.get("ended_at")),
                    "last_activity": _serialize_dt(v.get("last_activity")),
                    "entry_path": v.get("entry_path"),
                    "exit_path": v.get("exit_path"),
                    "event_count": v.get("event_count"),
                    "ops": v.get("ops"),
                }
                for vid, v in visits.items()
            },
        }
        TELEMETRY_FILE.write_text(json.dumps(payload, default=str, indent=2), encoding="utf-8")
    except Exception as e:
        log.debug("Failed saving telemetry_state.json: %s", e)


from app.services.ua_service import parse_user_agent


def _is_testing() -> bool:
    import os

    return "PYTEST_CURRENT_TEST" in os.environ or getattr(settings, "TESTING", False)


def load_sessions_cache() -> dict[str, dict[str, Any]]:
    """Load cached session records from sessions_cache.json."""
    if not SESSIONS_FILE.exists():
        return {}
    try:
        data = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
        sessions: dict[str, dict[str, Any]] = {}
        for sid, s in data.items():
            raw_ua = s.get("ua_raw")
            ua_dev = s.get("ua_device")
            ua_br = s.get("ua_browser")
            ua_os = s.get("ua_os")
            if raw_ua and (not ua_dev or ua_dev == "unknown" or not ua_br or ua_br == "unknown"):
                parsed = parse_user_agent(raw_ua)
                ua_dev = parsed["ua_device"]
                ua_br = parsed["ua_browser"]
                ua_os = parsed["ua_os"]
            elif not raw_ua and (not ua_dev or ua_dev == "unknown"):
                ua_dev = "desktop"
                ua_br = "Browser"
                ua_os = "Windows"

            sessions[sid] = {
                "id": s.get("id", sid),
                "token_hash": bytes.fromhex(s["token_hash"]) if s.get("token_hash") else b"",
                "user_id": s.get("user_id"),
                "role": s.get("role", "guest"),
                "label": s.get("label", f"GUEST-{sid[:4].upper()}"),
                "created_at": _parse_dt(s.get("created_at")),
                "last_seen_at": _parse_dt(s.get("last_seen_at")),
                "first_path": s.get("first_path", "/"),
                "referrer_host": s.get("referrer_host"),
                "ua_raw": raw_ua,
                "ua_device": ua_dev or "desktop",
                "ua_browser": ua_br or "Browser",
                "ua_os": ua_os or "Windows",
                "screen": s.get("screen"),
                "ip_hash": s.get("ip_hash"),
                "geo_city": s.get("geo_city"),
                "geo_region": s.get("geo_region"),
                "geo_country": s.get("geo_country"),
                "revoked_at": _parse_dt(s["revoked_at"]) if s.get("revoked_at") else None,
                "admin_since": _parse_dt(s["admin_since"]) if s.get("admin_since") else None,
            }
        return sessions
    except Exception as e:
        log.debug("Failed loading sessions_cache.json: %s", e)
        return {}


def save_sessions_cache(sessions: dict[str, dict[str, Any]]) -> None:
    """Save sessions to sessions_cache.json."""
    if _is_testing():
        return
    try:
        SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        serializable: dict[str, Any] = {}
        for sid, s in sessions.items():
            token_h = s.get("token_hash")
            hex_hash = token_h.hex() if isinstance(token_h, (bytes, bytearray)) else token_h
            serializable[s["id"]] = {
                "id": s["id"],
                "token_hash": hex_hash,
                "user_id": s.get("user_id"),
                "role": s.get("role", "guest"),
                "label": s.get("label"),
                "created_at": _serialize_dt(s.get("created_at")),
                "last_seen_at": _serialize_dt(s.get("last_seen_at")),
                "first_path": s.get("first_path"),
                "referrer_host": s.get("referrer_host"),
                "ua_raw": s.get("ua_raw"),
                "ua_device": s.get("ua_device"),
                "ua_browser": s.get("ua_browser"),
                "ua_os": s.get("ua_os"),
                "screen": s.get("screen"),
                "ip_hash": s.get("ip_hash"),
                "geo_city": s.get("geo_city"),
                "geo_region": s.get("geo_region"),
                "geo_country": s.get("geo_country"),
                "revoked_at": _serialize_dt(s.get("revoked_at")),
                "admin_since": _serialize_dt(s.get("admin_since")),
            }
        SESSIONS_FILE.write_text(json.dumps(serializable, default=str, indent=2), encoding="utf-8")
    except Exception as e:
        log.debug("Failed saving sessions_cache.json: %s", e)
