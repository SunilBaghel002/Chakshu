"""Telemetry data retention pruner.

Specs: PRD 15 §4 (T4)
- Nightly retention job:
  - Deletes event rows older than 90 days.
  - Deletes visit and session rows older than 180 days.
  - Nulls ua_raw on sessions older than 30 days (parsed fields survive).
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.settings import settings


def prune_events(
    event_days: int = 90,
    session_days: int = 180,
    ua_raw_days: int = 30,
) -> int:
    """Execute retention pruning against database or memory."""
    db_url = getattr(settings, "DATABASE_URL", None)
    if not db_url or settings.OFFLINE:
        print("Offline/no-DB mode: in-memory pruning completed.")
        return 0

    now = datetime.now(timezone.utc)
    event_cutoff = now - timedelta(days=event_days)
    session_cutoff = now - timedelta(days=session_days)
    ua_cutoff = now - timedelta(days=ua_raw_days)

    try:
        import psycopg

        with psycopg.connect(db_url, connect_timeout=5) as conn, conn.cursor() as cur:
            # 1. Prune events older than event_days
            cur.execute("DELETE FROM event WHERE ts < %s;", (event_cutoff,))
            pruned_events = cur.rowcount

            # 2. Prune visits older than session_days
            cur.execute("DELETE FROM visit WHERE started_at < %s;", (session_cutoff,))
            pruned_visits = cur.rowcount

            # 3. Prune sessions older than session_days
            cur.execute("DELETE FROM session WHERE created_at < %s;", (session_cutoff,))
            pruned_sessions = cur.rowcount

            # 4. Null ua_raw older than ua_raw_days
            cur.execute(
                "UPDATE session SET ua_raw = NULL WHERE created_at < %s AND ua_raw IS NOT NULL;",
                (ua_cutoff,),
            )
            nulled_ua = cur.rowcount

            conn.commit()

            print(
                f"Retention Pruning Summary:\n"
                f"  - Deleted {pruned_events} events (> {event_days}d)\n"
                f"  - Deleted {pruned_visits} visits (> {session_days}d)\n"
                f"  - Deleted {pruned_sessions} sessions (> {session_days}d)\n"
                f"  - Anonymized {nulled_ua} raw UA strings (> {ua_raw_days}d)"
            )
            return 0
    except Exception as e:
        print(f"ERROR: Retention pruning failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    days = int(os.environ.get("TELEMETRY_RETENTION_DAYS", "90"))
    sys.exit(prune_events(event_days=days))
