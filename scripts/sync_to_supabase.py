"""Initialize Supabase PostgreSQL schema and batch-sync local sessions/telemetry to Supabase."""

from __future__ import annotations

import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

import psycopg

REPO_ROOT = Path(__file__).resolve().parent.parent
SESSIONS_FILE = REPO_ROOT / "data" / "sessions_cache.json"
TELEMETRY_FILE = REPO_ROOT / "data" / "telemetry_state.json"


def _load_db_url() -> str:
    env_url = os.environ.get("DATABASE_URL", "")
    if not env_url and (REPO_ROOT / ".env").exists():
        for line in (REPO_ROOT / ".env").read_text(encoding="utf-8").splitlines():
            if line.startswith("DATABASE_URL="):
                env_url = line.split("=", 1)[1].strip()
                break
    return env_url.replace("postgresql+psycopg://", "postgresql://")


def _parse_dt(val: object) -> datetime:
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=UTC)
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            pass
    return datetime.now(UTC)


def main() -> int:
    db_url = _load_db_url()
    if not db_url:
        print("ERROR: DATABASE_URL not set in .env or environment.")
        return 1

    print("Connecting to Supabase PostgreSQL...", flush=True)
    migrations_dir = REPO_ROOT / "backend" / "app" / "db" / "migrations"

    with psycopg.connect(db_url, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            for sql_file in sorted(migrations_dir.glob("*.sql")):
                print(f"Applying migration: {sql_file.name}", flush=True)
                cur.execute(sql_file.read_text(encoding="utf-8"))
            conn.commit()

            valid_sids: set[str] = set()
            if SESSIONS_FILE.exists():
                sessions_data = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
                s_rows = []
                for sid, s in sessions_data.items():
                    real_id = s.get("id", sid)
                    valid_sids.add(real_id)
                    token_hex = s.get("token_hash") or ""
                    token_bytes = bytes.fromhex(token_hex) if token_hex else real_id.encode("ascii")
                    created_at = _parse_dt(s.get("created_at"))
                    last_seen_at = _parse_dt(s.get("last_seen_at"))
                    expires_at = _parse_dt(s.get("expires_at")) if s.get("expires_at") else last_seen_at
                    s_rows.append((
                        real_id, token_bytes, None, s.get("role", "guest"),
                        s.get("label", f"GUEST-{real_id[:4].upper()}"),
                        created_at, last_seen_at, expires_at,
                        s.get("first_path") or "/", s.get("referrer_host"),
                        s.get("ua_raw"), s.get("ua_device") or "desktop",
                        s.get("ua_browser") or "Chrome", s.get("ua_os") or "Windows",
                        s.get("screen"), s.get("geo_city"), s.get("geo_region"), s.get("geo_country"),
                    ))
                cur.executemany(
                    """
                    INSERT INTO session (
                        id, token_hash, user_id, role, label,
                        created_at, last_seen_at, expires_at, first_path,
                        referrer_host, ua_raw, ua_device, ua_browser, ua_os, screen,
                        geo_city, geo_region, geo_country
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at, role = EXCLUDED.role;
                    """,
                    s_rows,
                )
                conn.commit()
                print(f"Batch-synced {len(s_rows)} sessions to Supabase.", flush=True)

            if TELEMETRY_FILE.exists():
                tel_data = json.loads(TELEMETRY_FILE.read_text(encoding="utf-8"))
                visits = tel_data.get("visits", {})
                events = tel_data.get("events", [])
                v_rows = [
                    (
                        v.get("id", vid), v.get("session_id"),
                        _parse_dt(v.get("started_at")), _parse_dt(v.get("ended_at")),
                        v.get("entry_path") or "/", v.get("exit_path") or "/",
                        v.get("event_count") or 0, json.dumps(v.get("ops") or {}),
                    )
                    for vid, v in visits.items()
                    if v.get("session_id") in valid_sids
                ]
                if v_rows:
                    cur.executemany(
                        """
                        INSERT INTO visit (id, session_id, started_at, ended_at, entry_path, exit_path, event_count, ops)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT (id) DO UPDATE SET ended_at = EXCLUDED.ended_at, event_count = EXCLUDED.event_count;
                        """,
                        v_rows,
                    )
                    conn.commit()
                    print(f"Batch-synced {len(v_rows)} visits to Supabase.", flush=True)

                cur.execute("SELECT COUNT(*) FROM event;")
                existing_events = (cur.fetchone() or (0,))[0]
                if existing_events == 0 and events:
                    e_rows = [
                        (
                            ev.get("session_id"), ev.get("visit_id"), None,
                            ev.get("name", "page.view"), _parse_dt(ev.get("ts")),
                            _parse_dt(ev.get("client_ts")) if ev.get("client_ts") else None,
                            ev.get("path") or "/", json.dumps(ev.get("p") or {}),
                            ev.get("duration_ms"), ev.get("ok"),
                        )
                        for ev in events[-250:]
                        if ev.get("session_id") in valid_sids and ev.get("visit_id")
                    ]
                    if e_rows:
                        cur.executemany(
                            """
                            INSERT INTO event (session_id, visit_id, user_id, name, ts, client_ts, path, p, duration_ms, ok)
                            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
                            """,
                            e_rows,
                        )
                        conn.commit()
                        print(f"Batch-synced {len(e_rows)} events to Supabase.", flush=True)

            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
            tables = [r[0] for r in cur.fetchall()]
            print("Supabase Public Tables:", tables, flush=True)
            for tbl in ("app_user", "session", "visit", "event"):
                cur.execute(f"SELECT COUNT(*) FROM {tbl};")
                print(f"  - {tbl}: {(cur.fetchone() or (0,))[0]} rows", flush=True)

    return 0


if __name__ == "__main__":
    sys.exit(main())
