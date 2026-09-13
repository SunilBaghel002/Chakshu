"""Unit tests for pure domain false-alarm suppression gates.

Tests Task 3.3 per PRD 3 §A9 and PRD 5 §7.
Includes mandatory test_suppressed_candidate_always_has_a_reason.
"""

from __future__ import annotations

import pytest

from app.domain.constants import SUPPRESS_MIN_AREA_M2
from app.domain.suppress import (
    CandidateEvaluationInput,
    SuppressionAggregator,
    evaluate_suppression_gates,
)
from app.schemas.common import SuppressionReason


def test_suppressed_candidate_always_has_a_reason() -> None:
    """Non-negotiable test per PRD 5 §7 line 200: every suppressed candidate must have a reason."""
    # Test across a variety of failing inputs
    candidates = [
        CandidateEvaluationInput(candidate_id="c_cloud", area_m2=5000.0, cloud_prob=0.85),
        CandidateEvaluationInput(candidate_id="c_shadow", area_m2=5000.0, is_shadow=True),
        CandidateEvaluationInput(candidate_id="c_reg", area_m2=5000.0, registration_shift_px=3.2),
        CandidateEvaluationInput(candidate_id="c_snow", area_m2=5000.0, ndsi=0.65),
        CandidateEvaluationInput(
            candidate_id="c_season",
            area_m2=5000.0,
            prior_landcover="crop",
            d_ndbi=-0.02,
            d_ndvi=-0.35,
        ),
        CandidateEvaluationInput(
            candidate_id="c_illum",
            area_m2=5000.0,
            sun_elevation_diff_deg=25.0,
            d_ndvi=0.01,
            d_ndbi=0.01,
        ),
        CandidateEvaluationInput(candidate_id="c_size", area_m2=120.0, pixel_count=2),
        CandidateEvaluationInput(candidate_id="c_conf", area_m2=5000.0, confidence_score=0.15),
    ]

    for cand in candidates:
        res = evaluate_suppression_gates(cand)
        assert res.passed is False, f"Candidate {cand.candidate_id} should have been suppressed"
        assert res.reason is not None, f"Candidate {cand.candidate_id} has null reason"
        assert isinstance(res.reason, SuppressionReason)
        assert res.detail is not None and len(res.detail.strip()) > 0, (
            f"Candidate {cand.candidate_id} missing human-readable detail string"
        )


def test_gate_min_size() -> None:
    """Candidates under 400 m² (4 px at 10m) trigger min_size suppression."""
    cand = CandidateEvaluationInput(
        candidate_id="c_small",
        area_m2=250.0,
        pixel_count=2,
    )
    res = evaluate_suppression_gates(cand)
    assert res.passed is False
    assert res.reason == SuppressionReason.MIN_SIZE
    assert "below minimum spatial threshold" in res.detail


def test_gate_cloud_scl_and_prob() -> None:
    """Cloud probability or SCL cloud classes trigger cloud suppression."""
    cand_prob = CandidateEvaluationInput(
        candidate_id="c_prob",
        area_m2=1500.0,
        cloud_prob=0.45,
    )
    res_prob = evaluate_suppression_gates(cand_prob)
    assert res_prob.passed is False
    assert res_prob.reason == SuppressionReason.CLOUD

    cand_scl = CandidateEvaluationInput(
        candidate_id="c_scl",
        area_m2=1500.0,
        scl_class=9,  # high cloud prob
    )
    res_scl = evaluate_suppression_gates(cand_scl)
    assert res_scl.passed is False
    assert res_scl.reason == SuppressionReason.CLOUD


def test_gate_cloud_shadow() -> None:
    """Dark patches collocated with cloud shadow vector trigger cloud_shadow suppression."""
    cand = CandidateEvaluationInput(
        candidate_id="c_shadow",
        area_m2=2000.0,
        scl_class=3,  # cloud shadow SCL
    )
    res = evaluate_suppression_gates(cand)
    assert res.passed is False
    assert res.reason == SuppressionReason.CLOUD_SHADOW
    assert "cloud shadow" in res.detail.lower()


def test_gate_registration_shift_and_sliver() -> None:
    """Shift exceeding 2.0 px or high-aspect boundary slivers trigger registration suppression."""
    cand_shift = CandidateEvaluationInput(
        candidate_id="c_shift",
        area_m2=3000.0,
        registration_shift_px=2.5,
    )
    res_shift = evaluate_suppression_gates(cand_shift)
    assert res_shift.passed is False
    assert res_shift.reason == SuppressionReason.REGISTRATION

    cand_sliver = CandidateEvaluationInput(
        candidate_id="c_sliver",
        area_m2=800.0,
        registration_shift_px=0.8,
        isoperimetric_quotient=0.03,  # extremely thin sliver
    )
    res_sliver = evaluate_suppression_gates(cand_sliver)
    assert res_sliver.passed is False
    assert res_sliver.reason == SuppressionReason.REGISTRATION
    assert "sliver" in res_sliver.detail.lower()


def test_gate_seasonal_crop_cycle() -> None:
    """Cyclic crop harvest / phenological variation triggers seasonal suppression."""
    cand = CandidateEvaluationInput(
        candidate_id="c_crop",
        area_m2=8500.0,
        prior_landcover="crop",
        d_ndvi=-0.42,
        d_ndbi=0.00,  # no built infrastructure
    )
    res = evaluate_suppression_gates(cand)
    assert res.passed is False
    assert res.reason == SuppressionReason.SEASONAL
    assert "monsoon" in res.detail.lower() or "cyclic" in res.detail.lower()


def test_gate_illumination() -> None:
    """Sun elevation shift without spectral index difference triggers illumination suppression."""
    cand = CandidateEvaluationInput(
        candidate_id="c_sun",
        area_m2=4000.0,
        sun_elevation_diff_deg=22.5,
        d_ndvi=0.02,
        d_ndbi=0.01,
        d_ndwi=0.01,
    )
    res = evaluate_suppression_gates(cand)
    assert res.passed is False
    assert res.reason == SuppressionReason.ILLUMINATION
    assert "solar illumination" in res.detail.lower()


def test_gate_snow_cover() -> None:
    """NDSI surge above 0.40 triggers snow_cover suppression."""
    cand = CandidateEvaluationInput(
        candidate_id="c_snow",
        area_m2=5000.0,
        ndsi=0.58,
    )
    res = evaluate_suppression_gates(cand)
    assert res.passed is False
    assert res.reason == SuppressionReason.SNOW_COVER


def test_gate_low_confidence() -> None:
    """Weak detector confidence triggers low_confidence suppression."""
    cand = CandidateEvaluationInput(
        candidate_id="c_weak",
        area_m2=5000.0,
        confidence_score=0.22,
    )
    res = evaluate_suppression_gates(cand)
    assert res.passed is False
    assert res.reason == SuppressionReason.LOW_CONFIDENCE


def test_retained_candidate_passes_all_gates() -> None:
    """Genuine ground change (Jewar runway construction) passes all 8 gates."""
    cand = CandidateEvaluationInput(
        candidate_id="jewar_runway_01",
        area_m2=475000.0,
        pixel_count=4750,
        cloud_prob=0.01,
        scl_class=4,  # vegetation/bare
        is_shadow=False,
        registration_shift_px=0.30,
        isoperimetric_quotient=0.45,
        prior_landcover="crop",
        d_ndvi=-0.65,
        d_ndbi=0.45,  # strong infrastructure rise!
        sun_elevation_diff_deg=4.0,
        ndsi=-0.20,
        confidence_score=0.92,
        change_magnitude=0.78,
    )
    res = evaluate_suppression_gates(cand)
    assert res.passed is True
    assert res.reason is None
    assert res.detail is None


def test_suppression_aggregator_accounting() -> None:
    """Verify generated == suppressed + retained and by_reason sums accurately."""
    agg = SuppressionAggregator(aoi_id="test_aoi_123")

    # 3 retained
    valid_cand = CandidateEvaluationInput(candidate_id="v1", area_m2=1000.0, d_ndbi=0.25)
    for i in range(3):
        res = evaluate_suppression_gates(valid_cand)
        agg.record_evaluation(f"v_{i}", res)

    # 5 seasonal
    season_cand = CandidateEvaluationInput(
        candidate_id="s1", area_m2=1000.0, prior_landcover="crop", d_ndvi=-0.3, d_ndbi=0.0
    )
    for i in range(5):
        res = evaluate_suppression_gates(season_cand)
        agg.record_evaluation(f"s_{i}", res)

    # 2 small
    small_cand = CandidateEvaluationInput(candidate_id="m1", area_m2=100.0, pixel_count=1)
    for i in range(2):
        res = evaluate_suppression_gates(small_cand)
        agg.record_evaluation(f"m_{i}", res)

    assert agg.candidates_generated == 10
    assert agg.candidates_retained == 3
    assert agg.candidates_suppressed == 7
    assert agg.candidates_generated == agg.candidates_retained + agg.candidates_suppressed
    assert agg.by_reason["seasonal"] == 5
    assert agg.by_reason["min_size"] == 2
    assert sum(agg.by_reason.values()) == agg.candidates_suppressed
    assert len(agg.sample_reasons) == 7

    ctx = agg.to_context_dict()
    assert ctx["candidates_generated"] == 10
    assert ctx["candidates_suppressed"] == 7
    assert ctx["candidates_retained"] == 3
