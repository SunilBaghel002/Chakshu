"""Telemetry Ingestion and Visit Clustering Service.

Specs: PRD 15 §3, §4, §5, §7.4, §9 (T3, T4, T5, T7, T9)
- Enforces closed event taxonomy enum.
- Enforces payload bounds: ≤2KB serialized, strings ≤256 chars, arrays ≤20 items, depth ≤3.
- In-process rate limiting: 60 req/min/session, 400 events/min/session.
- Bot & self-traffic filtering: drops bot traffic, preview requests, and TELEMETRY_IGNORE_IPS.
- 30-minute visit clustering: automatically creates and maintains visit records.
- Ingest always returns 204, even on internal failure.
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from app.services.telemetry_storage import (
    is_db_available,
    load_telemetry_state,
    save_telemetry_state,
)
from app.services.ua_service import BOT_PATTERN
from app.settings import settings

log = logging.getLogger(__name__)

# PRD 15 §3 Closed Taxonomy Enum
ALLOWED_EVENT_NAMES = {
    "page.view",
    "landing.cta.click",
    "landing.section.view",
    "scroll.depth",
    "landing.demo.interact",
    "ui.nav.click",
    "ui.control.click",
    "map.hover",
    "map.viewport",
    "map.swipe",
    "op.start",
    "op.result",
    "op.error",
    "ask.question",
    "decision.set",
    "upload.complete",
    "export.complete",
    "auth.signup",
    "auth.login",
    "auth.logout",
    "error.client",
    "perf.mark",
    "offline.mode",
}

# Rate limit constants
MAX_REQUESTS_PER_MINUTE = 60
MAX_EVENTS_PER_MINUTE = 400
RATE_LIMIT_WINDOW_SECONDS = 60

# Visit clustering window
VISIT_GAP_MINUTES = 30

# In-memory rate limiting state: session_id -> list of timestamps
_request_timestamps: dict[str, list[float]] = defaultdict(list)
_event_timestamps: dict[str, list[float]] = defaultdict(list)

# In-memory storage & metrics fallback (seeded/restored from local state)
_loaded_evts, _loaded_vsts = load_telemetry_state()
_in_memory_events: list[dict[str, Any]] = _loaded_evts
_in_memory_visits: dict[str, dict[str, Any]] = _loaded_vsts
_active_session_visits: dict[str, str] = {
    v["session_id"]: vid for vid, v in _in_memory_visits.items() if "session_id" in v
}
_filtered_events_count: int = 0
_unknown_events_count: int = 0


def sanitize_payload(obj: Any, depth: int = 0) -> Any:
    """Sanitize and truncate payload p per PRD 15 §3 limits."""
    if depth > 3:
        return None
    if isinstance(obj, str):
        return obj[:256]
    if isinstance(obj, (int, float, bool)) or obj is None:
        return obj
    if isinstance(obj, list):
        return [sanitize_payload(item, depth + 1) for item in obj[:20]]
    if isinstance(obj, dict):
        sanitized = {}
        for k, v in list(obj.items())[:50]:
            clean_k = str(k)[:64]
            clean_v = sanitize_payload(v, depth + 1)
            if clean_v is not None:
                sanitized[clean_k] = clean_v
        return sanitized
    return str(obj)[:128]


def is_rate_limited(session_id: str, new_events_count: int) -> bool:
    """Check and record request/event count within 60s sliding window."""
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS

    # Prune expired timestamps
    reqs = [ts for ts in _request_timestamps[session_id] if ts > cutoff]
    evts = [ts for ts in _event_timestamps[session_id] if ts > cutoff]

    if (
        len(reqs) >= MAX_REQUESTS_PER_MINUTE
        or (len(evts) + new_events_count) > MAX_EVENTS_PER_MINUTE
    ):
        _request_timestamps[session_id] = reqs
        _event_timestamps[session_id] = evts
        return True

    reqs.append(now)
    evts.extend([now] * new_events_count)
    _request_timestamps[session_id] = reqs
    _event_timestamps[session_id] = evts
    return False


def is_bot_or_ignored(
    client_ip: str | None,
    user_agent: str | None,
    headers: dict[str, str],
) -> bool:
    """Filter automated bot traffic, previews, and self-testing IPs."""
    # 1. Check IP against configured ignore list
    if client_ip and client_ip.strip() in settings.TELEMETRY_IGNORE_IPS:
        return True

    # 2. Check X-Purpose: preview
    purpose = headers.get("x-purpose") or headers.get("purpose")
    if purpose and "preview" in purpose.lower():
        return True

    # 3. Check User-Agent for known crawler/bot patterns
    ua = user_agent or ""
    return bool(BOT_PATTERN.search(ua))


def get_or_create_visit(
    session_id: str,
    first_event_path: str | None,
    now: datetime,
) -> str:
    """Resolve active visit for session or start a new visit if gap >= 30m."""
    visit_id = _active_session_visits.get(session_id)
    if visit_id and visit_id in _in_memory_visits:
        visit = _in_memory_visits[visit_id]
        last_activity = visit.get("last_activity", visit["started_at"])
        if now - last_activity < timedelta(minutes=VISIT_GAP_MINUTES):
            visit["last_activity"] = now
            return visit_id

    # Create new visit
    new_visit_id = str(uuid.uuid4())
    entry = (first_event_path or "/").split("?")[0][:256]
    visit_record = {
        "id": new_visit_id,
        "session_id": session_id,
        "started_at": now,
        "ended_at": now,
        "last_activity": now,
        "entry_path": entry,
        "exit_path": entry,
        "event_count": 0,
        "ops": {},
    }
    _in_memory_visits[new_visit_id] = visit_record
    _active_session_visits[session_id] = new_visit_id
    save_telemetry_state(_in_memory_events, _in_memory_visits)

    # Persist visit to DB if reachable
    if is_db_available():
        try:
            import psycopg

            db_url = getattr(settings, "DATABASE_URL", "").replace("postgresql+psycopg://", "postgresql://")
            with psycopg.connect(db_url, connect_timeout=1) as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO visit (
                        id, session_id, started_at, ended_at,
                        entry_path, exit_path, event_count, ops
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING;
                    """,
                    (
                        new_visit_id,
                        session_id,
                        now,
                        now,
                        entry,
                        entry,
                        0,
                        json.dumps({}),
                    ),
                )
                conn.commit()
        except Exception as e:
            log.debug("Visit DB insert failed: %s", e)

    return new_visit_id


def ingest_batch(
    *,
    session_id: str,
    events_data: list[dict[str, Any]],
    client_ip: str | None = None,
    user_agent: str | None = None,
    headers: dict[str, str] | None = None,
) -> bool:
    """Process and persist an event batch.

    Returns:
        bool: True if batch was accepted/filtered normally,
              False if dropped due to rate-limiting (429 condition).

    """
    global _filtered_events_count, _unknown_events_count

    if not events_data:
        return True

    # Rate limiting check
    if is_rate_limited(session_id, len(events_data)):
        log.warning("Rate limit exceeded for session %s (dropping batch)", session_id)
        return False

    # Bot & self-traffic check
    headers_dict = headers or {}
    if is_bot_or_ignored(client_ip, user_agent, headers_dict):
        _filtered_events_count += len(events_data)
        log.debug("Filtered %d events from bot/ignored source", len(events_data))
        return True

    now = datetime.now(UTC)
    valid_records: list[dict[str, Any]] = []

    for item in events_data[:20]:  # Batches capped at 20 items
        name = item.get("name", "")
        if name not in ALLOWED_EVENT_NAMES:
            _unknown_events_count += 1
            log.debug("Unknown telemetry event name '%s' dropped", name)
            continue

        path = item.get("path")
        clean_path = path.split("?")[0][:256] if path else "/"

        raw_p = item.get("p", {})
        clean_p = sanitize_payload(raw_p) if isinstance(raw_p, dict) else {}

        # Enforce 2KB serialized limit on payload
        serialized = json.dumps(clean_p)
        if len(serialized.encode("utf-8")) > 2048:
            clean_p = {"_truncated": True}

        # Client timestamp parsing
        client_ts_raw = item.get("client_ts")
        client_ts = None
        if client_ts_raw:
            try:
                client_ts = datetime.fromisoformat(client_ts_raw.replace("Z", "+00:00"))
            except Exception:
                client_ts = None

        dur_raw = item.get("duration_ms") if item.get("duration_ms") is not None else (item.get("p", {}).get("duration_ms") if isinstance(item.get("p"), dict) else None)
        ok_raw = item.get("ok") if item.get("ok") is not None else (item.get("p", {}).get("ok") if isinstance(item.get("p"), dict) else None)
        ok_val = bool(ok_raw) if ok_raw is not None else None

        valid_records.append(
            {
                "name": name,
                "path": clean_path,
                "p": clean_p,
                "client_ts": client_ts,
                "duration_ms": dur_raw
                if isinstance(dur_raw, int) and dur_raw >= 0
                else None,
                "ok": ok_val,
            }
        )

    if not valid_records:
        return True

    # Resolve visit
    visit_id = get_or_create_visit(session_id, valid_records[0]["path"], now)

    # Update visit record state
    if visit_id in _in_memory_visits:
        visit = _in_memory_visits[visit_id]
        visit["event_count"] += len(valid_records)
        visit["ended_at"] = now
        visit["exit_path"] = valid_records[-1]["path"]

        # Track operations in visit ops JSON
        for rec in valid_records:
            if rec["name"] in ("op.start", "op.result"):
                op_name = rec["p"].get("op")
                if op_name and isinstance(op_name, str):
                    clean_op = op_name[:32]
                    visit["ops"][clean_op] = visit["ops"].get(clean_op, 0) + 1

    # Store events in memory and persist
    for rec in valid_records:
        _in_memory_events.append(
            {
                "session_id": session_id,
                "visit_id": visit_id,
                "user_id": None,
                "name": rec["name"],
                "ts": now,
                "client_ts": rec["client_ts"],
                "path": rec["path"],
                "p": rec["p"],
                "duration_ms": rec["duration_ms"],
                "ok": rec["ok"],
            }
        )
    save_telemetry_state(_in_memory_events, _in_memory_visits)

    # Persist to DB if reachable
    if is_db_available():
        try:
            import psycopg

            db_url = getattr(settings, "DATABASE_URL", "").replace("postgresql+psycopg://", "postgresql://")
            with psycopg.connect(db_url, connect_timeout=1) as conn, conn.cursor() as cur:
                # Update visit
                cur.execute(
                    """
                    UPDATE visit
                    SET ended_at = %s, exit_path = %s, event_count = event_count + %s, ops = %s
                    WHERE id = %s;
                    """,
                    (
                        now,
                        valid_records[-1]["path"],
                        len(valid_records),
                        json.dumps(_in_memory_visits[visit_id]["ops"]),
                        visit_id,
                    ),
                )
                # Insert events batch
                insert_tuples = [
                    (
                        session_id,
                        visit_id,
                        None,
                        rec["name"],
                        now,
                        rec["client_ts"],
                        rec["path"],
                        json.dumps(rec["p"]),
                        rec["duration_ms"],
                        rec["ok"],
                    )
                    for rec in valid_records
                ]
                cur.executemany(
                    """
                    INSERT INTO event (
                        session_id, visit_id, user_id, name,
                        ts, client_ts, path, p, duration_ms, ok
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """,
                    insert_tuples,
                )
                conn.commit()
        except Exception as e:
            log.debug("Telemetry DB batch insert failed: %s", e)

    return True


def get_event_metrics() -> dict[str, int]:
    """Retrieve telemetry metrics for monitoring and testing."""
    return {
        "total_events": len(_in_memory_events),
        "total_visits": len(_in_memory_visits),
        "filtered_events": _filtered_events_count,
        "unknown_events": _unknown_events_count,
    }
