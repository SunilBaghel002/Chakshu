"""Seed fixture telemetry events and sessions for demo/staging evaluation.

Specs: PRD 16 §7 (D7):
- Generates plausible dataset: realistic device/geo mix, varied operations,
  funnel drop-off, errors, and signed-up users.
- Seeded rows are tagged event.p.seeded = True.
- Session labels are prefixed with 'DEMO-'.
- Refuses to run if ENV=prod unless --force is specified.
- Inserts into database if available, and seeds in-memory collections.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Add backend directory to sys.path
_repo_root = Path(__file__).resolve().parent.parent
_backend_dir = _repo_root / "backend"
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from app.services.session_service import _in_memory_sessions, hash_token
from app.services.telemetry_service import _in_memory_events, _in_memory_visits
from app.settings import settings

CITIES_COUNTRIES = [
    ("Delhi", "IN", "Delhi"),
    ("Bengaluru", "IN", "Karnataka"),
    ("Mumbai", "IN", "Maharashtra"),
    ("Hyderabad", "IN", "Telangana"),
    ("Gurugram", "IN", "Haryana"),
    ("London", "GB", "Greater London"),
    ("San Francisco", "US", "California"),
    ("Singapore", "SG", "Central"),
]

DEVICES = [
    ("desktop", "Chrome 128", "Windows 11", "1920x1080"),
    ("desktop", "Chrome 127", "macOS 14", "2560x1440"),
    ("desktop", "Firefox 130", "Linux", "1920x1080"),
    ("mobile", "Safari Mobile", "iOS 17", "390x844"),
    ("mobile", "Chrome Mobile", "Android 14", "412x915"),
    ("tablet", "Safari Mobile", "iPadOS 17", "820x1180"),
]

OPERATIONS = [
    ("change_detect", 420, 1850),
    ("ask", 120, 680),
    ("aoi_create", 80, 240),
    ("search", 250, 750),
    ("export", 500, 2100),
]


def seed_telemetry(visitors: int = 40, days: int = 7, force: bool = False) -> int:
    """Generate and insert synthetic demo telemetry."""
    env = getattr(settings, "ENV", "dev").lower()
    if env == "prod" and not force:
        print(
            "ERROR: Refusing to seed telemetry in ENV=prod without --force.",
            file=sys.stderr,
        )
        return 1

    print(f"[*] Seeding {visitors} demo visitors across {days} days...")
    now = datetime.now(UTC)
    start_time = now - timedelta(days=days)

    total_visits = 0
    total_events = 0

    db_url = getattr(settings, "DATABASE_URL", None)
    if db_url:
        db_url = db_url.replace("postgresql+psycopg://", "postgresql://")
    conn = None
    cur = None
    if db_url and not settings.OFFLINE:
        try:
            import psycopg

            conn = psycopg.connect(db_url, connect_timeout=1)
            cur = conn.cursor()
        except Exception as e:
            print(f"[!] Database connection not established; seeding in-memory store.")

    for i in range(visitors):
        sess_id = str(uuid.uuid4())
        label_hex = sess_id[:4].upper()
        is_user = i < 2  # 2 signed up users
        user_name = f"Analyst {i + 1}" if is_user else None
        label = f"DEMO-{user_name if is_user else f'GUEST-{label_hex}'}"

        city, country, region = random.choice(CITIES_COUNTRIES)
        device_type, browser, os_name, screen = random.choice(DEVICES)

        # Distribute sessions across the time window
        sess_created = start_time + timedelta(
            seconds=random.uniform(0, days * 86400 - 3600)
        )
        sess_last_seen = sess_created + timedelta(minutes=random.uniform(5, 120))

        sess_record = {
            "id": sess_id,
            "token_hash": hash_token(f"demo_token_{sess_id}"),
            "user_id": str(uuid.uuid4()) if is_user else None,
            "role": "analyst" if is_user else "guest",
            "label": label,
            "created_at": sess_created,
            "last_seen_at": sess_last_seen,
            "expires_at": sess_created + timedelta(days=30),
            "admin_since": None,
            "revoked_at": None,
            "first_path": "/" if random.random() > 0.3 else "/console",
            "referrer_host": random.choice(["google.com", "github.com", "twitter.com", None]),
            "ua_raw": f"Mozilla/5.0 ({os_name}) AppleWebKit/537.36 ({browser})",
            "ua_device": device_type,
            "ua_browser": browser.split()[0],
            "ua_os": os_name.split()[0],
            "screen": screen,
            "ip_hash": uuid.uuid4().bytes[:16],
            "geo_city": city,
            "geo_region": region,
            "geo_country": country,
        }
        _in_memory_sessions[sess_id] = sess_record

        if cur:
            try:
                cur.execute(
                    """
                    INSERT INTO session (
                        id, token_hash, user_id, role, label, created_at,
                        last_seen_at, expires_at, first_path, referrer_host,
                        ua_raw, ua_device, ua_browser, ua_os, screen,
                        ip_hash, geo_city, geo_region, geo_country
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (id) DO NOTHING;
                    """,
                    (
                        sess_record["id"], sess_record["token_hash"], sess_record["user_id"],
                        sess_record["role"], sess_record["label"], sess_record["created_at"],
                        sess_record["last_seen_at"], sess_record["expires_at"],
                        sess_record["first_path"], sess_record["referrer_host"],
                        sess_record["ua_raw"], sess_record["ua_device"],
                        sess_record["ua_browser"], sess_record["ua_os"],
                        sess_record["screen"], sess_record["ip_hash"],
                        sess_record["geo_city"], sess_record["geo_region"],
                        sess_record["geo_country"],
                    ),
                )
            except Exception:
                pass

        # Generate visits for this session (1 to 3 visits)
        num_visits = random.choices([1, 2, 3], weights=[70, 20, 10])[0]
        curr_visit_time = sess_created

        for v_idx in range(num_visits):
            total_visits += 1
            visit_id = str(uuid.uuid4())
            visit_entry = sess_record["first_path"] if v_idx == 0 else "/console"
            visit_exit = "/console" if random.random() > 0.4 else "/"
            visit_end = curr_visit_time + timedelta(minutes=random.uniform(2, 25))

            v_ops = {}
            v_events = []

            # 1. Landing / Page views
            v_events.append({
                "session_id": sess_id,
                "visit_id": visit_id,
                "user_id": sess_record["user_id"],
                "name": "page.view",
                "ts": curr_visit_time,
                "client_ts": curr_visit_time,
                "path": visit_entry,
                "p": {"route": visit_entry, "seeded": True},
                "duration_ms": None,
                "ok": None,
            })

            # Funnel progression
            if visit_entry == "/":
                v_events.append({
                    "session_id": sess_id,
                    "visit_id": visit_id,
                    "user_id": sess_record["user_id"],
                    "name": "landing.section.view",
                    "ts": curr_visit_time + timedelta(seconds=15),
                    "client_ts": curr_visit_time + timedelta(seconds=15),
                    "path": "/",
                    "p": {"section": "proof", "seeded": True},
                    "duration_ms": None,
                    "ok": None,
                })
                # CTA click
                if random.random() > 0.35:
                    v_events.append({
                        "session_id": sess_id,
                        "visit_id": visit_id,
                        "user_id": sess_record["user_id"],
                        "name": "landing.cta.click",
                        "ts": curr_visit_time + timedelta(seconds=45),
                        "client_ts": curr_visit_time + timedelta(seconds=45),
                        "path": "/",
                        "p": {"cta": "launch_console", "seeded": True},
                        "duration_ms": None,
                        "ok": None,
                    })

            # Operations run (if made it to console)
            if random.random() > 0.3:
                num_ops = random.randint(1, 4)
                for _ in range(num_ops):
                    op_choice, dur_min, dur_max = random.choice(OPERATIONS)
                    dur = random.randint(dur_min, dur_max)
                    is_ok = random.random() > 0.08  # ~8% error rate
                    op_time = curr_visit_time + timedelta(seconds=random.randint(60, 600))

                    v_ops[op_choice] = v_ops.get(op_choice, 0) + 1
                    v_events.append({
                        "session_id": sess_id,
                        "visit_id": visit_id,
                        "user_id": sess_record["user_id"],
                        "name": "op.start",
                        "ts": op_time,
                        "client_ts": op_time,
                        "path": "/console",
                        "p": {"op": op_choice, "seeded": True},
                        "duration_ms": None,
                        "ok": None,
                    })
                    v_events.append({
                        "session_id": sess_id,
                        "visit_id": visit_id,
                        "user_id": sess_record["user_id"],
                        "name": "op.result" if is_ok else "op.error",
                        "ts": op_time + timedelta(milliseconds=dur),
                        "client_ts": op_time + timedelta(milliseconds=dur),
                        "path": "/console",
                        "p": {"op": op_choice, "code": "OK" if is_ok else "ERR_TIMEOUT", "seeded": True},
                        "duration_ms": dur,
                        "ok": is_ok,
                    })

            visit_rec = {
                "id": visit_id,
                "session_id": sess_id,
                "started_at": curr_visit_time,
                "ended_at": visit_end,
                "entry_path": visit_entry,
                "exit_path": visit_exit,
                "event_count": len(v_events),
                "ops": v_ops,
            }
            _in_memory_visits[visit_id] = visit_rec

            if cur:
                try:
                    cur.execute(
                        """
                        INSERT INTO visit (id, session_id, started_at, ended_at, entry_path, exit_path, event_count, ops)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING;
                        """,
                        (visit_id, sess_id, curr_visit_time, visit_end, visit_entry, visit_exit, len(v_events), json.dumps(v_ops)),
                    )
                except Exception:
                    pass

            for ev in v_events:
                total_events += 1
                _in_memory_events.append(ev)
                if cur:
                    try:
                        cur.execute(
                            """
                            INSERT INTO event (session_id, visit_id, user_id, name, ts, client_ts, path, p, duration_ms, ok)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                            """,
                            (
                                ev["session_id"], ev["visit_id"], ev["user_id"],
                                ev["name"], ev["ts"], ev["client_ts"], ev["path"],
                                json.dumps(ev["p"]), ev["duration_ms"], ev["ok"],
                            ),
                        )
                    except Exception:
                        pass

            curr_visit_time = visit_end + timedelta(hours=random.uniform(2, 24))

    if conn:
        try:
            conn.commit()
            conn.close()
        except Exception:
            pass

    from app.services.telemetry_storage import save_sessions_cache, save_telemetry_state

    save_sessions_cache({s["id"]: s for s in _in_memory_sessions.values()})
    save_telemetry_state(_in_memory_events, _in_memory_visits)

    print(
        f"[SUCCESS] Seeding completed: {visitors} sessions, {total_visits} visits, {total_events} events."
    )
    print("    Seeded rows tagged with 'seeded=True' and labeled 'DEMO-*'.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Chakshu Telemetry Seeding Utility")
    parser.add_argument("--visitors", type=int, default=40, help="Number of visitors to seed")
    parser.add_argument("--days", type=int, default=7, help="Number of days in the past")
    parser.add_argument("--force", action="store_true", help="Force seeding even if ENV=prod")

    args = parser.parse_args()
    return seed_telemetry(visitors=args.visitors, days=args.days, force=args.force)


if __name__ == "__main__":
    sys.exit(main())
