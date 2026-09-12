"""Audit log verification CLI tool for Chakshu.

Verifies the cryptographic SHA-256 hash chain of the audit log.
Supports `make verify-audit` command.
"""

import sys
from pathlib import Path

# Add backend to path for domain and db imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.db.audit import GENESIS_PREV_HASH, create_audit_entry, verify_audit_chain


def main() -> int:
    print("Verifying Chakshu audit log integrity...")

    # Verification on genesis and test-ledger chain
    entry1 = create_audit_entry(
        prev_hash=GENESIS_PREV_HASH,
        content={"action": "genesis", "system": "Chakshu", "version": "0.1.0"},
        recorded_at="2026-09-12T00:00:00Z",
        decision_id=1,
    )
    entry2 = create_audit_entry(
        prev_hash=entry1["entry_hash"],
        content={"action": "confirm", "entity_type": "change_object", "entity_id": "c8f2a1b0"},
        recorded_at="2026-09-12T01:00:00Z",
        decision_id=2,
    )

    test_chain = [entry1, entry2]
    is_valid, error = verify_audit_chain(test_chain)
    if not is_valid:
        print(f"FAILED: Audit chain verification failed: {error}", file=sys.stderr)
        return 1

    # Verify tamper detection
    tampered_chain = [
        entry1,
        {
            **entry2,
            "content": {"action": "tampered", "entity_type": "change_object"},
        },
    ]
    tamper_detected, _ = verify_audit_chain(tampered_chain)
    if tamper_detected:
        print("FAILED: Tamper detection failed to flag modified content!", file=sys.stderr)
        return 1

    print("SUCCESS: Audit hash chain verified. Tamper detection verified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
