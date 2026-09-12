"""Cryptographic audit log hash chaining for Chakshu.

Implements the append-only SHA-256 hash chain specified in PRD 2 §4:
  entry_hash = sha256(prev_hash || canonical_json(content) || recorded_at)
Genesis row uses prev_hash = '0'*64.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

GENESIS_PREV_HASH: str = "0" * 64


def canonical_json(content: dict[str, Any]) -> str:
    """Format dictionary into deterministic, canonical JSON representation."""
    return json.dumps(content, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def compute_entry_hash(prev_hash: str, content: dict[str, Any], recorded_at: str) -> str:
    """Compute the SHA-256 digest of an audit entry."""
    payload = f"{prev_hash}{canonical_json(content)}{recorded_at}".encode()
    return hashlib.sha256(payload).hexdigest()


def create_audit_entry(
    prev_hash: str,
    content: dict[str, Any],
    recorded_at: str,
    decision_id: int | None = None,
) -> dict[str, Any]:
    """Create a validated audit log entry with computed cryptographic hash."""
    entry_hash = compute_entry_hash(prev_hash, content, recorded_at)
    return {
        "prev_hash": prev_hash,
        "entry_hash": entry_hash,
        "decision_id": decision_id,
        "recorded_at": recorded_at,
        "content": content,
    }


def verify_audit_chain(entries: list[dict[str, Any]]) -> tuple[bool, str | None]:
    """Verify integrity of an audit chain.

    Returns:
        (True, None) if the chain is intact.
        (False, reason_string) if tampering or broken link is detected.

    """
    if not entries:
        return True, None

    expected_prev = GENESIS_PREV_HASH

    for i, entry in enumerate(entries):
        prev_hash = entry.get("prev_hash")
        entry_hash = entry.get("entry_hash")
        content = entry.get("content", {})
        recorded_at = entry.get("recorded_at", "")

        if prev_hash != expected_prev:
            return (
                False,
                f"Broken chain at index {i}: expected '{expected_prev}', got '{prev_hash}'",
            )

        calculated_hash = compute_entry_hash(prev_hash, content, recorded_at)
        if calculated_hash != entry_hash:
            return (
                False,
                f"Tampered content at index {i}: recorded entry_hash '{entry_hash}' "
                f"does not match calculated '{calculated_hash}'",
            )

        expected_prev = entry_hash

    return True, None
