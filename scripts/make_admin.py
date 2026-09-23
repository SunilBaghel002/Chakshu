"""Bootstrap and elevate admin accounts for Chakshu.

Specs: PRD 14 §4 (S4), PRD 16 §1, §8 (D1, D8)
Usage:
    python scripts/make_admin.py create <email> [--password <pass>] [--name <name>]
    python scripts/make_admin.py elevate-latest
    python scripts/make_admin.py elevate <session_id_or_label>
    python scripts/make_admin.py check
    python scripts/make_admin.py list
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Add backend directory to sys.path
_repo_root = Path(__file__).resolve().parent.parent
_backend_dir = _repo_root / "backend"
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from app.services.admin_service import (
    _in_memory_admins,
    create_admin_user,
    elevate_latest_session,
    elevate_session_to_admin,
    has_any_admin,
)
from app.services.session_service import _in_memory_sessions


def cmd_create(email: str, password: str | None, name: str | None) -> int:
    """Create or promote an admin user with credentials."""
    user_id, plain_pw = create_admin_user(email=email, password=password, display_name=name)
    print("=" * 60)
    print("ADMIN USER CREATED / PROMOTED")
    print("=" * 60)
    print(f"  User ID:      {user_id}")
    print(f"  Email:        {email}")
    print(f"  Password:     {plain_pw}")
    print("=" * 60)
    print("NOTE: Plaintext password is shown once. Store securely.")
    return 0


def cmd_elevate_latest() -> int:
    """Elevate the most recently active session to admin."""
    # Ensure there's at least an admin user registered
    if not has_any_admin():
        create_admin_user("admin@chakshu.internal", display_name="Admin")
    res = elevate_latest_session()
    if not res:
        print("No active sessions found to elevate. Visit the site first then retry.")
        return 1
    print(f"Successfully elevated latest session: {res.get('label', res['id'])} to role=admin")
    return 0


def cmd_elevate(identifier: str) -> int:
    """Elevate a specific session by ID or label to admin."""
    if not has_any_admin():
        create_admin_user("admin@chakshu.internal", display_name="Admin")
    res = elevate_session_to_admin(identifier)
    if not res:
        print(f"Session '{identifier}' not found.")
        return 1
    print(f"Successfully elevated session: {res.get('label', res['id'])} to role=admin")
    return 0


def cmd_check() -> int:
    """Check if any admin is configured in the system."""
    configured = has_any_admin()
    if configured:
        print("ADMIN STATUS: CONFIGURED (Admin exists in database or memory)")
        return 0
    else:
        print("ADMIN STATUS: NO ADMIN CONFIGURED · RUN scripts/make_admin.py")
        return 1


def cmd_list() -> int:
    """List configured admin users and sessions."""
    print("--- Configured Admin Users ---")
    if not _in_memory_admins:
        print("  (None in memory cache; checking database...)")
    for email, data in _in_memory_admins.items():
        print(f"  - {email} ({data.get('display_name')}) [ID: {data['id']}]")

    print("\n--- Active Admin Sessions ---")
    admin_sessions = [s for s in _in_memory_sessions.values() if s.get("role") == "admin"]
    if not admin_sessions:
        print("  (None in memory cache)")
    for s in admin_sessions:
        print(f"  - {s.get('label', s['id'])} | Since: {s.get('admin_since')}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Chakshu Admin Bootstrap & Elevation CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # create
    create_p = subparsers.add_parser("create", help="Create or promote an admin user")
    create_p.add_argument("email", help="Admin email address")
    create_p.add_argument("--password", help="Optional fixed password")
    create_p.add_argument("--name", help="Optional display name")

    # elevate-latest
    subparsers.add_parser("elevate-latest", help="Elevate the latest active session to admin")

    # elevate
    elevate_p = subparsers.add_parser("elevate", help="Elevate specific session ID or label")
    elevate_p.add_argument("identifier", help="Session ID or GUEST-XXXX label")

    # check
    subparsers.add_parser("check", help="Check if any admin is configured")

    # list
    subparsers.add_parser("list", help="List admin accounts and sessions")

    args = parser.parse_args()

    if args.command == "create":
        return cmd_create(args.email, args.password, args.name)
    elif args.command == "elevate-latest":
        return cmd_elevate_latest()
    elif args.command == "elevate":
        return cmd_elevate(args.identifier)
    elif args.command == "check":
        return cmd_check()
    elif args.command == "list":
        return cmd_list()
    return 0


if __name__ == "__main__":
    sys.exit(main())
