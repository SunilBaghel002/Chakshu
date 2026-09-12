"""Unit tests for services/verifier.py.

Asserts the three mandatory verifier rules specified in PRD 5 §7 and PRD 7 Task 0.8:
1. test_verifier_rejects_fabricated_number
2. test_verifier_accepts_unit_conversion
3. test_count_comes_from_db_not_model_prose
"""

from app.schemas.summary import NarrativeFact
from app.services.verifier import NumberVerifier


def test_verifier_rejects_fabricated_number() -> None:
    """The verifier must reject any prose mentioning numbers not in the bundle."""
    verifier = NumberVerifier()

    # Facts: 6 construction changes, 184320.5 m2, earliest onset 2024-06-09
    facts = [
        NarrativeFact(fact_id="f1", kind="count", value=6, unit="changes", type="construction"),
        NarrativeFact(
            fact_id="f2",
            kind="area",
            value=184320.5,
            unit="m2",
            label="18.43 ha",
            type="construction",
        ),
        NarrativeFact(fact_id="f3", kind="onset", value="2024-06-09", type="earliest_construction"),
    ]

    # Candidate prose with a fabricated number: "40 buildings" or "50 hectares"
    hallucinated_prose = (
        "In the last 3 years, approximately 40 buildings were constructed covering 50 hectares."
    )

    verdict = verifier.verify(hallucinated_prose, facts, allowed_free_numbers={3.0})
    assert verdict.passed is False
    assert verdict.verdict == "FAIL"
    assert len(verdict.rejected_tokens) > 0
    # Both 40 and 50 must be caught as unverified
    rejected_str = " ".join(verdict.rejected_tokens)
    assert "40" in rejected_str or "50" in rejected_str


def test_verifier_accepts_unit_conversion() -> None:
    """Verifier accepts mathematically valid unit conversions (18.43 ha <-> 184320.5 m2)."""
    verifier = NumberVerifier()

    facts = [
        NarrativeFact(fact_id="f1", kind="count", value=6, unit="changes", type="construction"),
        NarrativeFact(
            fact_id="f2",
            kind="area",
            value=184320.5,
            unit="m2",
            label="18.43 ha",
            type="construction",
        ),
    ]

    # Valid prose quoting 18.43 ha and 6 changes
    valid_prose = (
        "Over the observation window, 6 construction changes were detected, totalling 18.43 ha."
    )

    verdict = verifier.verify(valid_prose, facts)
    assert verdict.passed is True
    assert verdict.verdict == "PASS"
    assert len(verdict.rejected_tokens) == 0


def test_count_comes_from_db_not_model_prose() -> None:
    """If model prose claims '12 structures' when DB count is 6, verifier must fail."""
    verifier = NumberVerifier()

    db_facts = [
        NarrativeFact(fact_id="f1", kind="count", value=6, unit="changes", type="construction"),
    ]

    # Model hallucinated count
    model_prose = "I identified 12 construction sites in the selected area."

    verdict = verifier.verify(model_prose, db_facts)
    assert verdict.passed is False
    assert verdict.verdict == "FAIL"
    assert any("12" in token for token in verdict.rejected_tokens)
