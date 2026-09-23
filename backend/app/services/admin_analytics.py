"""Admin analytics aggregation, session queries, and CSV export for Chakshu.

Specs: PRD 16 §1–§8 (D1–D8), PRD 14 §4, §6 (S4, S6)
- Calculates OVERVIEW metrics (KPIs, ops breakdown, devices, locations, entry/exit).
- Serves VISITORS table with filtering, cursor pagination, and state classification.
- Delivers visit-grouped event streams for the timeline.
- Privacy hygiene: token_hash NEVER stored/returned, raw IP NEVER stored/returned.
- All aggregate calls return query_ms and rows_scanned.
"""

from __future__ import annotations

import csv
import io
import logging
import time
from datetime import UTC, datetime, timedelta
from typing import Any

from app.services.session_service import _in_memory_sessions
from app.services.telemetry_service import _in_memory_events, _in_memory_visits

log = logging.getLogger(__name__)

_in_memory_audits: list[dict[str, Any]] = []


def get_range_bounds(range_str: str) -> tuple[datetime, datetime | None]:
    """Calculate the starting timestamp and previous comparison period cutoff."""
    now = datetime.now(UTC)
    clean = range_str.lower().strip()
    if clean == "24h":
        delta = timedelta(hours=24)
    elif clean == "30d":
        delta = timedelta(days=30)
    elif clean == "all":
        return datetime.fromtimestamp(0, UTC), None
    else:  # default 7d
        delta = timedelta(days=7)
    return now - delta, now - (delta * 2)


def get_overview(range_str: str = "7d") -> dict[str, Any]:
    """Calculate aggregated KPIs and distribution statistics per PRD 16 D3.1."""
    t0 = time.perf_counter()
    start_ts, prev_ts = get_range_bounds(range_str)

    scanned = 0
    curr_events: list[dict[str, Any]] = []
    prev_events: list[dict[str, Any]] = []
    has_seeded = False

    for ev in _in_memory_events:
        scanned += 1
        ev_ts = ev["ts"]
        if ev_ts >= start_ts:
            curr_events.append(ev)
            if ev.get("p", {}).get("seeded"):
                has_seeded = True
        elif prev_ts and ev_ts >= prev_ts:
            prev_events.append(ev)

    curr_sessions = {e["session_id"] for e in curr_events}
    prev_sessions = {e["session_id"] for e in prev_events}
    curr_visits = {e["visit_id"] for e in curr_events}
    prev_visits = {e["visit_id"] for e in prev_events}

    dwells: list[float] = []
    for vid in curr_visits:
        visit = _in_memory_visits.get(vid)
        if visit:
            s_at = visit["started_at"]
            e_at = visit.get("ended_at", s_at)
            dwells.append(max(1.0, (e_at - s_at).total_seconds()))

    median_dwell = float(sorted(dwells)[len(dwells) // 2]) if dwells else 0.0

    op_counts: dict[str, int] = {}
    op_durations: dict[str, list[int]] = {}
    op_success: dict[str, int] = {}
    curr_ops_total = 0
    curr_errors_total = 0

    for ev in curr_events:
        name = ev["name"]
        if name in ("op.start", "op.result", "op.error"):
            curr_ops_total += 1
            op_name = ev.get("p", {}).get("op") or (
                ev["path"].split("/")[-1] if "/" in ev["path"] else "operation"
            )
            op_counts[op_name] = op_counts.get(op_name, 0) + 1
            if ev.get("duration_ms") is not None:
                op_durations.setdefault(op_name, []).append(ev["duration_ms"])
            if ev.get("ok") is True:
                op_success[op_name] = op_success.get(op_name, 0) + 1
            elif ev.get("ok") is False or name == "op.error":
                curr_errors_total += 1

    ops_list = []
    for op_name, count in sorted(op_counts.items(), key=lambda x: x[1], reverse=True):
        durs = sorted(op_durations.get(op_name, []))
        p50 = durs[len(durs) // 2] if durs else 0
        p95 = durs[int(len(durs) * 0.95)] if durs else 0
        succ = op_success.get(op_name, 0)
        succ_pct = round((succ / count) * 100, 1) if count > 0 else 100.0
        ops_list.append({
            "op": op_name, "count": count, "p50_ms": p50,
            "p95_ms": p95, "success_pct": succ_pct,
        })

    device_counts: dict[str, int] = {}
    location_counts: dict[str, int] = {}
    entry_counts: dict[str, int] = {}
    exit_counts: dict[str, int] = {}
    dropped_landing = 0

    for s_id in curr_sessions:
        sess = _in_memory_sessions.get(s_id)
        if not sess:
            continue
        dev = (sess.get("ua_device") or "").upper()
        dev = "DESKTOP" if dev in ("", "UNKNOWN") else dev
        device_counts[dev] = device_counts.get(dev, 0) + 1

        country = sess.get("geo_country") or "UNKNOWN"
        city = sess.get("geo_city")
        loc_str = f"{country} · {city}" if city else country
        location_counts[loc_str] = location_counts.get(loc_str, 0) + 1

        first_p = sess.get("first_path") or "/"
        entry_counts[first_p] = entry_counts.get(first_p, 0) + 1

    for vid in curr_visits:
        visit = _in_memory_visits.get(vid)
        if visit:
            ex = visit.get("exit_path") or "/"
            exit_counts[ex] = exit_counts.get(ex, 0) + 1
            if visit.get("entry_path") == "/" and visit.get("event_count", 0) <= 2:
                dropped_landing += 1

    def fmt_delta(curr: float, prev: float | None) -> dict[str, Any]:
        if prev is None or prev == 0:
            return {"text": "—", "n": int(prev or 0), "direction": "neutral"}
        diff = ((curr - prev) / prev) * 100
        sign = "+" if diff >= 0 else ""
        return {
            "text": f"{sign}{round(diff)}%", "n": int(prev),
            "direction": "up" if diff > 0 else "down" if diff < 0 else "neutral",
        }

    prev_ops = sum(1 for e in prev_events if e["name"].startswith("op."))
    prev_errors = sum(1 for e in prev_events if e.get("ok") is False or e["name"] == "op.error")
    err_rate = round((curr_errors_total / max(1, curr_ops_total)) * 100, 1)
    prev_err_rate = round((prev_errors / max(1, prev_ops)) * 100, 1) if prev_ops else None

    query_ms = max(1, round((time.perf_counter() - t0) * 1000, 2))

    return {
        "range": range_str,
        "kpis": {
            "visitors": {"value": len(curr_sessions), "delta": fmt_delta(len(curr_sessions), len(prev_sessions))},
            "visits": {"value": len(curr_visits), "delta": fmt_delta(len(curr_visits), len(prev_visits))},
            "median_dwell_s": {"value": round(median_dwell), "delta": fmt_delta(median_dwell, None)},
            "operations_run": {"value": curr_ops_total, "delta": fmt_delta(curr_ops_total, prev_ops)},
            "error_rate": {"value": f"{err_rate}%", "delta": fmt_delta(err_rate, prev_err_rate)},
        },
        "ops": ops_list,
        "devices": [{"label": k, "count": v} for k, v in sorted(device_counts.items(), key=lambda x: -x[1])],
        "locations": [{"label": k, "count": v} for k, v in sorted(location_counts.items(), key=lambda x: -x[1])],
        "entry": [{"path": k, "count": v} for k, v in sorted(entry_counts.items(), key=lambda x: -x[1])],
        "exit": [{"path": k, "count": v} for k, v in sorted(exit_counts.items(), key=lambda x: -x[1])],
        "dropped_after_landing": {
            "count": dropped_landing,
            "pct": round((dropped_landing / max(1, len(curr_visits))) * 100, 1),
        },
        "seeded": has_seeded,
        "filtered_bots": sum(1 for s in _in_memory_sessions.values() if s.get("ua_device") == "bot"),
        "query_ms": query_ms,
        "rows_scanned": scanned,
    }


def get_sessions(
    range_str: str = "7d",
    device: str | None = None,
    country: str | None = None,
    op: str | None = None,
    entry: str | None = None,
    include_bots: bool = False,
    q: str | None = None,
    cursor: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """Retrieve filtered, cursor-paginated visitor sessions per PRD 16 D3.2."""
    t0 = time.perf_counter()
    start_ts, _ = get_range_bounds(range_str)
    now = datetime.now(UTC)

    matched: list[dict[str, Any]] = []
    scanned = 0

    seen_ids: set[str] = set()
    for sess in _in_memory_sessions.values():
        sid = sess.get("id")
        if not sid or sid in seen_ids or sess.get("revoked_at"):
            continue
        seen_ids.add(sid)
        scanned += 1
        last_seen = sess.get("last_seen_at", now)
        if last_seen < start_ts:
            continue
        if sess.get("ua_device") == "bot" and not include_bots:
            continue
        if device and (sess.get("ua_device") or "").lower() != device.lower():
            continue
        if country and (sess.get("geo_country") or "").lower() != country.lower():
            continue
        if entry and sess.get("first_path") != entry:
            continue
        if q:
            ql = q.lower()
            if ql not in (sess.get("label") or "").lower() and ql not in (sess.get("referrer_host") or "").lower():
                continue

        sess_visits = [v for v in _in_memory_visits.values() if v.get("session_id") == sess["id"]]
        sess_events = [e for e in _in_memory_events if e.get("session_id") == sess["id"]]

        if op:
            if not any(e.get("p", {}).get("op") == op or e.get("name") == op for e in sess_events):
                continue

        idle_s = (now - last_seen).total_seconds()
        state = "SIGNED UP" if sess.get("user_id") else "ACTIVE" if idle_s < 600 else "IDLE"

        op_counts: dict[str, int] = {}
        for ev in sess_events:
            if ev["name"] in ("op.start", "op.result"):
                op_n = ev.get("p", {}).get("op", "OP")[:3].upper()
                op_counts[op_n] = op_counts.get(op_n, 0) + 1
        ops_chip = " · ".join([f"{k} {v}" for k, v in list(op_counts.items())[:3]]) or "—"

        d_val = (sess.get("ua_device") or "DESKTOP").upper()
        b_val = (sess.get("ua_browser") or "CHROME").upper()
        o_val = (sess.get("ua_os") or "WINDOWS").upper()
        dev_str = f"{'DESKTOP' if d_val == 'UNKNOWN' else d_val} · {'CHROME' if b_val == 'UNKNOWN' else b_val} · {'WINDOWS' if o_val == 'UNKNOWN' else o_val}"
        matched.append({
            "id": sess["id"],
            "session": sess.get("label", f"GUEST-{sess['id'][:4].upper()}"),
            "first_seen": sess.get("created_at", now).isoformat(),
            "last_seen": last_seen.isoformat(),
            "visits": max(1, len(sess_visits)),
            "events": len(sess_events),
            "ops": ops_chip,
            "device": dev_str,
            "location": f"{sess.get('geo_city')}, {sess.get('geo_country')}" if sess.get("geo_city") else (sess.get("geo_country") or "UNKNOWN"),
            "entry": sess.get("first_path", "/"),
            "state": state,
            "seeded": sess.get("label", "").startswith("DEMO-") or any(e.get("p", {}).get("seeded") for e in sess_events),
        })

    matched.sort(key=lambda s: s["last_seen"], reverse=True)
    offset = int(cursor) if cursor and cursor.isdigit() else 0

    page_items = matched[offset : offset + limit]
    next_cursor = str(offset + limit) if (offset + limit) < len(matched) else None
    query_ms = max(1, round((time.perf_counter() - t0) * 1000, 2))

    return {
        "items": page_items,
        "next_cursor": next_cursor,
        "total": len(matched),
        "query_ms": query_ms,
        "rows_scanned": scanned,
    }


def _classify_event_family(name: str) -> str:
    if name.startswith(("ui.", "page.", "scroll.")):
        return "nav"
    if name.startswith("op."):
        return "op"
    if name.startswith("decision."):
        return "decision"
    if name.startswith("map."):
        return "map"
    if name.startswith("auth."):
        return "auth"
    if name.startswith("error."):
        return "error"
    return "perf"


def get_session_events(
    session_id: str,
    visit_id: str | None = None,
    family: str | None = None,
) -> dict[str, Any]:
    """Retrieve visit-grouped events for the visitor action timeline."""
    t0 = time.perf_counter()
    sess_visits = [v for v in _in_memory_visits.values() if v.get("session_id") == session_id]
    sess_events = [e for e in _in_memory_events if e.get("session_id") == session_id]

    sess_visits.sort(key=lambda v: v["started_at"], reverse=True)
    visits_payload = []

    for idx, v in enumerate(sess_visits, start=1):
        if visit_id and v["id"] != visit_id:
            continue
        v_events = [e for e in sess_events if e.get("visit_id") == v["id"]]
        v_events.sort(key=lambda e: e["ts"], reverse=True)

        ev_items = []
        for e in v_events:
            fam = _classify_event_family(e["name"])
            if family and fam != family:
                continue
            salient = ""
            p = e.get("p", {})
            if "op" in p:
                salient = f"op:{p['op']}"
            elif "cta" in p:
                salient = f"cta:{p['cta']}"
            elif "depth" in p:
                salient = f"depth:{p['depth']}%"
            elif "route" in p:
                salient = p["route"]

            ev_items.append({
                "name": e["name"],
                "family": fam,
                "time": e["ts"].strftime("%H:%M:%S"),
                "iso_ts": e["ts"].isoformat(),
                "path": e.get("path", "/"),
                "salient": salient,
                "p": p,
                "duration_ms": e.get("duration_ms"),
                "ok": e.get("ok"),
            })

        visits_payload.append({
            "visit_id": v["id"],
            "title": f"VISIT {len(sess_visits) - idx + 1} · {v['started_at'].strftime('%d %b %H:%M')} · ENTRY {v.get('entry_path', '/')}",
            "started_at": v["started_at"].isoformat(),
            "ended_at": v.get("ended_at", v["started_at"]).isoformat(),
            "events": ev_items,
        })

    return {
        "visits": visits_payload,
        "query_ms": max(1, round((time.perf_counter() - t0) * 1000, 2)),
        "rows_scanned": len(sess_events),
    }


def export_csv(
    range_str: str = "7d",
    device: str | None = None,
    country: str | None = None,
    op: str | None = None,
    entry: str | None = None,
    include_bots: bool = False,
    q: str | None = None,
    admin_user: str = "admin@chakshu.internal",
) -> str:
    """Generate CSV of visitors table with an audit row recorded."""
    sessions_data = get_sessions(
        range_str=range_str,
        device=device,
        country=country,
        op=op,
        entry=entry,
        include_bots=include_bots,
        q=q,
        limit=10000,
    )

    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow([
        "session_id", "label", "first_seen", "last_seen", "visits", "events",
        "ops", "device", "location", "entry_path", "state", "seeded",
    ])

    for it in sessions_data["items"]:
        writer.writerow([
            it["id"], it["session"], it["first_seen"], it["last_seen"],
            it["visits"], it["events"], it["ops"], it["device"],
            it["location"], it["entry"], it["state"], it["seeded"],
        ])

    _in_memory_audits.append({
        "action": "admin.export.csv",
        "actor": admin_user,
        "ts": datetime.now(UTC),
        "details": {"range": range_str, "rows": len(sessions_data["items"])},
    })

    return out.getvalue()
