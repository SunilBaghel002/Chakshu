"""Persistence and Supabase PostgreSQL layer for Telemetry & Sessions.

Specs: PRD 15 §7, PRD 16 §1-§8
- Automatically normalizes Supabase direct IPv6 URLs to the IPv4 Session Pooler.
- Ensures `app_user`, `session`, `visit`, and `event` tables exist in Supabase Postgres.
- Loads and syncs visitor sessions, visits, and events from Supabase Postgres + local cache.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.services.ua_service import parse_user_agent
from app.settings import settings

log = logging.getLogger(__name__)

TELEMETRY_FILE = Path(settings.ROOT_DIR) / "data" / "telemetry_state.json"
SESSIONS_FILE = Path(settings.ROOT_DIR) / "data" / "sessions_cache.json"

_db_status_cache: tuple[bool, float] = (False, 0.0)
_schema_initialized: bool = False
DB_CACHE_TTL = 30.0

_SUPABASE_DIRECT_RE = re.compile(
    r"^postgresql://postgres:([^@]+)@db\.([a-z0-9]+)\.supabase\.co:(\d+)/(.*)$"
)


def normalize_db_url(raw_url: str | None = None) -> str | None:
    """Normalize SQLAlchemy/Supabase URL to an IPv4-compatible psycopg URL."""
    url = (raw_url or getattr(settings, "DATABASE_URL", "") or "").strip()
    if not url:
        return None
    clean = url.replace("postgresql+psycopg://", "postgresql://")
    m = _SUPABASE_DIRECT_RE.match(clean)
    if m:
        pw, project_ref, _port, db_name = m.groups()
        pooler_region = os.environ.get("SUPABASE_POOLER_REGION", "ap-northeast-2")
        return f"postgresql://postgres.{project_ref}:{pw}@aws-0-{pooler_region}.pooler.supabase.com:5432/{db_name}"
    return clean


def _is_testing() -> bool:
    return "PYTEST_CURRENT_TEST" in os.environ or getattr(settings, "TESTING", False)


def _ensure_schema(conn: Any) -> None:
    """Ensure telemetry and session tables exist in Supabase Postgres."""
    global _schema_initialized
    if _schema_initialized:
        return
    mig_path = Path(__file__).resolve().parent.parent / "db" / "migrations" / "004_sessions.sql"
    if mig_path.exists():
        with conn.cursor() as cur:
            cur.execute(mig_path.read_text(encoding="utf-8"))
            conn.commit()
    _schema_initialized = True


def is_db_available() -> bool:
    """Check if Postgres DB is reachable without blocking on every event."""
    global _db_status_cache
    if settings.OFFLINE or _is_testing():
        return False
    clean_url = normalize_db_url()
    if not clean_url or "localhost" in clean_url:
        return False

    now = time.time()
    cached_status, cached_time = _db_status_cache
    if (now - cached_time) < DB_CACHE_TTL:
        return cached_status

    try:
        import psycopg

        with psycopg.connect(clean_url, connect_timeout=4) as conn:
            _ensure_schema(conn)
        _db_status_cache = (True, now)
        return True
    except Exception as e:
        log.debug("Database connection probe failed: %s", e)
        _db_status_cache = (False, now)
        return False


def _serialize_dt(val: Any) -> Any:
    return val.isoformat() if isinstance(val, datetime) else val


def _parse_dt(val: Any) -> datetime:
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=UTC)
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            pass
    return datetime.now(UTC)


def load_telemetry_state() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    """Load persisted events and visits from local file AND Supabase Postgres."""
    events: list[dict[str, Any]] = []
    visits: dict[str, dict[str, Any]] = {}

    if TELEMETRY_FILE.exists():
        try:
            data = json.loads(TELEMETRY_FILE.read_text(encoding="utf-8"))
            for ev in data.get("events", []):
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
            for vid, v in data.get("visits", {}).items():
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
        except Exception as e:
            log.debug("Failed loading telemetry_state.json: %s", e)

    if is_db_available():
        try:
            import psycopg

            clean_url = normalize_db_url()
            if clean_url:
                with psycopg.connect(clean_url, connect_timeout=4) as conn, conn.cursor() as cur:
                    cur.execute(
                        "SELECT id, session_id, started_at, ended_at, entry_path, exit_path, event_count, ops FROM visit ORDER BY started_at DESC LIMIT 1000;"
                    )
                    for row in cur.fetchall():
                        vid = str(row[0])
                        visits[vid] = {
                            "id": vid,
                            "session_id": str(row[1]),
                            "started_at": _parse_dt(row[2]),
                            "ended_at": _parse_dt(row[3] or row[2]),
                            "last_activity": _parse_dt(row[3] or row[2]),
                            "entry_path": row[4] or "/",
                            "exit_path": row[5] or "/",
                            "event_count": row[6] or 0,
                            "ops": row[7] if isinstance(row[7], dict) else {},
                        }
                    cur.execute(
                        "SELECT session_id, visit_id, user_id, name, ts, client_ts, path, p, duration_ms, ok FROM event ORDER BY ts ASC LIMIT 5000;"
                    )
                    db_events = [
                        {
                            "session_id": str(r[0]),
                            "visit_id": str(r[1]),
                            "user_id": str(r[2]) if r[2] else None,
                            "name": r[3],
                            "ts": _parse_dt(r[4]),
                            "client_ts": _serialize_dt(r[5]),
                            "path": r[6] or "/",
                            "p": r[7] if isinstance(r[7], dict) else {},
                            "duration_ms": r[8],
                            "ok": r[9],
                        }
                        for r in cur.fetchall()
                    ]
                    if db_events:
                        events = db_events
        except Exception as e:
            log.debug("Failed loading telemetry from Supabase DB: %s", e)

    return events, visits


def save_telemetry_state(events: list[dict[str, Any]], visits: dict[str, dict[str, Any]]) -> None:
    """Save events and visits to local disk cache."""
    if _is_testing():
        return
    try:
        TELEMETRY_FILE.parent.mkdir(parents=True, exist_ok=True)
        capped = events[-5000:]
        payload = {
            "events": [
                {
                    "session_id": ev.get("session_id"),
                    "visit_id": ev.get("visit_id"),
                    "user_id": ev.get("user_id"),
                    "name": ev.get("name"),
                    "ts": _serialize_dt(ev.get("ts")),
                    "client_ts": _serialize_dt(ev.get("client_ts")),
                    "path": ev.get("path"),
                    "p": ev.get("p"),
                    "duration_ms": ev.get("duration_ms"),
                    "ok": ev.get("ok"),
                }
                for ev in capped
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


def load_sessions_cache() -> dict[str, dict[str, Any]]:
    """Load cached session records from local file AND Supabase Postgres."""
    sessions: dict[str, dict[str, Any]] = {}
    if SESSIONS_FILE.exists():
        try:
            data = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
            for sid, s in data.items():
                raw_ua = s.get("ua_raw")
                ua_dev = s.get("ua_device")
                ua_br = s.get("ua_browser")
                ua_os = s.get("ua_os")
                if raw_ua and (not ua_dev or ua_dev == "unknown"):
                    parsed = parse_user_agent(raw_ua)
                    ua_dev, ua_br, ua_os = parsed["ua_device"], parsed["ua_browser"], parsed["ua_os"]
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
        except Exception as e:
            log.debug("Failed loading sessions_cache.json: %s", e)

    if is_db_available():
        try:
            import psycopg

            clean_url = normalize_db_url()
            if clean_url:
                with psycopg.connect(clean_url, connect_timeout=4) as conn, conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, token_hash, user_id, role, label, created_at, last_seen_at,
                               first_path, referrer_host, ua_raw, ua_device, ua_browser, ua_os,
                               screen, ip_hash, geo_city, geo_region, geo_country, revoked_at, admin_since
                        FROM session ORDER BY last_seen_at DESC LIMIT 1000;
                        """
                    )
                    for r in cur.fetchall():
                        sid = str(r[0])
                        sessions[sid] = {
                            "id": sid,
                            "token_hash": bytes(r[1]) if r[1] else b"",
                            "user_id": str(r[2]) if r[2] else None,
                            "role": r[3] or "guest",
                            "label": r[4] or f"GUEST-{sid[:4].upper()}",
                            "created_at": _parse_dt(r[5]),
                            "last_seen_at": _parse_dt(r[6]),
                            "first_path": r[7] or "/",
                            "referrer_host": r[8],
                            "ua_raw": r[9],
                            "ua_device": r[10] or "desktop",
                            "ua_browser": r[11] or "Browser",
                            "ua_os": r[12] or "Windows",
                            "screen": r[13],
                            "ip_hash": bytes(r[14]) if r[14] else None,
                            "geo_city": r[15],
                            "geo_region": r[16],
                            "geo_country": r[17],
                            "revoked_at": _parse_dt(r[18]) if r[18] else None,
                            "admin_since": _parse_dt(r[19]) if r[19] else None,
                        }
        except Exception as e:
            log.debug("Failed loading sessions from Supabase DB: %s", e)

    return sessions


def save_sessions_cache(sessions: dict[str, dict[str, Any]]) -> None:
    """Save sessions to sessions_cache.json."""
    if _is_testing():
        return
    try:
        SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        serializable: dict[str, Any] = {}
        for s in sessions.values():
            token_h = s.get("token_hash")
            hex_hash = token_h.hex() if isinstance(token_h, (bytes, bytearray)) else token_h
            ip_h = s.get("ip_hash")
            hex_ip = ip_h.hex() if isinstance(ip_h, (bytes, bytearray)) else ip_h
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
                "ip_hash": hex_ip,
                "geo_city": s.get("geo_city"),
                "geo_region": s.get("geo_region"),
                "geo_country": s.get("geo_country"),
                "revoked_at": _serialize_dt(s.get("revoked_at")),
                "admin_since": _serialize_dt(s.get("admin_since")),
            }
        SESSIONS_FILE.write_text(json.dumps(serializable, default=str, indent=2), encoding="utf-8")
    except Exception as e:
        log.debug("Failed saving sessions_cache.json: %s", e)
