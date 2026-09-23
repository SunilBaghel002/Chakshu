"""Purge synthetic/demo telemetry data from Chakshu storage.

Removes:
- Events tagged with p.seeded = True
- Sessions with labels prefixed by 'DEMO-'
- Associated visits
Preserves all genuine user traffic, admin logins, and operations.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_repo_root = Path(__file__).resolve().parent.parent
_backend_dir = _repo_root / "backend"
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from app.services.telemetry_storage import TELEMETRY_FILE, SESSIONS_FILE, load_telemetry_state, save_telemetry_state, save_sessions_cache


def purge_demo_data() -> int:
    print("[*] Inspecting telemetry storage for demo/synthetic data...")

    if not TELEMETRY_FILE.exists() and not SESSIONS_FILE.exists():
        print("[!] No telemetry storage files found.")
        return 0

    t_data = json.loads(TELEMETRY_FILE.read_text(encoding="utf-8")) if TELEMETRY_FILE.exists() else {}
    s_data = json.loads(SESSIONS_FILE.read_text(encoding="utf-8")) if SESSIONS_FILE.exists() else {}

    raw_events = t_data.get("events", [])
    raw_visits = t_data.get("visits", {})

    demo_session_ids: set[str] = set()
    real_sessions: dict[str, dict] = {}
    purged_sessions_count = 0

    for sid, s in s_data.items():
        if s.get("label", "").startswith("DEMO-"):
            demo_session_ids.add(s["id"])
            purged_sessions_count += 1
        else:
            real_sessions[sid] = s

    real_events = []
    purged_events_count = 0
    for e in raw_events:
        if e.get("p", {}).get("seeded") or e.get("session_id") in demo_session_ids:
            purged_events_count += 1
        else:
            real_events.append(e)

    real_visits = {}
    purged_visits_count = 0
    for vid, v in raw_visits.items():
        if v.get("session_id") in demo_session_ids:
            purged_visits_count += 1
        else:
            real_visits[vid] = v

    print(f"[*] Found {purged_sessions_count} demo sessions, {purged_visits_count} demo visits, and {purged_events_count} demo events.")

    # Overwrite clean files
    save_sessions_cache(real_sessions)
    save_telemetry_state(real_events, real_visits)

    print(f"[SUCCESS] Purge complete! Retained {len(real_sessions)} real sessions, {len(real_visits)} real visits, and {len(real_events)} real events.")
    print("    Demo data badge removed. Only real telemetry will be shown.")
    return 0


if __name__ == "__main__":
    sys.exit(purge_demo_data())
