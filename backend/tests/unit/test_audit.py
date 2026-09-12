"""Unit test verifying cryptographic audit log hash chaining and tamper detection."""

from app.db.audit import GENESIS_PREV_HASH, create_audit_entry, verify_audit_chain


def test_audit_chain_creation_and_verification() -> None:
    """A valid audit chain must pass verification."""
    e1 = create_audit_entry(
        prev_hash=GENESIS_PREV_HASH,
        content={"action": "create_aoi", "aoi_id": "b1d3a4e9"},
        recorded_at="2026-09-12T10:00:00Z",
        decision_id=1,
    )
    e2 = create_audit_entry(
        prev_hash=e1["entry_hash"],
        content={"action": "confirm", "change_object_id": "8f2c1a4e"},
        recorded_at="2026-09-12T10:05:00Z",
        decision_id=2,
    )

    valid, error = verify_audit_chain([e1, e2])
    assert valid is True
    assert error is None


def test_audit_chain_detects_tampering() -> None:
    """Altering content or breaking link in audit log must be detected."""
    e1 = create_audit_entry(
        prev_hash=GENESIS_PREV_HASH,
        content={"action": "create_aoi", "aoi_id": "b1d3a4e9"},
        recorded_at="2026-09-12T10:00:00Z",
    )
    e2 = create_audit_entry(
        prev_hash=e1["entry_hash"],
        content={"action": "confirm", "change_object_id": "8f2c1a4e"},
        recorded_at="2026-09-12T10:05:00Z",
    )

    # Tamper with content in e1
    tampered_e1 = dict(e1)
    tampered_e1["content"] = {"action": "tampered_action"}

    valid, error = verify_audit_chain([tampered_e1, e2])
    assert valid is False
    assert error is not None
    assert "Tampered" in error or "Broken" in error
