"""Unit tests for pure domain change classification decision table.

Tests Task 3.1 & Task 3.2 per PRD 3 §A8.
"""

from __future__ import annotations

from app.domain.classify import classify_change
from app.schemas.common import ChangeType


def test_classify_construction_jewar_signature() -> None:
    """Jewar Airport ground change: farmland to infrastructure produces CONSTRUCTION."""
    res = classify_change(
        d_ndvi=-0.34,
        d_ndbi=0.21,
        d_ndwi=-0.02,
        prior_landcover="crop",
        ndwi_after=-0.05,
    )
    assert res.change_type == ChangeType.CONSTRUCTION
    assert res.winner_score >= 0.70
    assert len(res.rule_trace) >= 4

    # Verify rule trace entries
    fired_rules = {r.rule: r for r in res.rule_trace}
    assert "d_ndbi_rise" in fired_rules
    assert fired_rules["d_ndbi_rise"].fired is True
    assert fired_rules["d_ndbi_rise"].value == 0.21
    assert "d_ndvi_fall" in fired_rules
    assert fired_rules["d_ndvi_fall"].fired is True
    assert fired_rules["d_ndvi_fall"].value == -0.34
    assert "prior_landcover" in fired_rules
    assert fired_rules["prior_landcover"].fired is True

    # Verify alternatives include CLEARANCE with explanation
    alt_types = [a.change_type for a in res.alternatives]
    assert "clearance" in alt_types
    clearance_alt = next(a for a in res.alternatives if a.change_type == "clearance")
    assert "d_ndbi rise" in clearance_alt.reason
    assert res.confidence_margin > 0.0


def test_classify_clearance_earthworks() -> None:
    """Severe vegetation drop without built-up NDBI rise produces CLEARANCE."""
    res = classify_change(
        d_ndvi=-0.35,
        d_ndbi=0.01,
        d_ndwi=-0.01,
        prior_landcover="vegetation",
    )
    assert res.change_type == ChangeType.CLEARANCE
    assert res.winner_score >= 0.60
    # Alternative should consider construction
    alt_types = [a.change_type for a in res.alternatives]
    assert "construction" in alt_types


def test_classify_demolition() -> None:
    """NDBI fall on prior built surface produces DEMOLITION."""
    res = classify_change(
        d_ndvi=0.02,
        d_ndbi=-0.18,
        d_ndwi=-0.03,
        prior_landcover="built",
        ndbi_before=0.25,
    )
    assert res.change_type == ChangeType.DEMOLITION
    assert res.winner_score >= 0.60


def test_classify_water_gain() -> None:
    """Positive NDWI surge produces WATER_GAIN."""
    res = classify_change(
        d_ndvi=-0.15,
        d_ndbi=-0.10,
        d_ndwi=0.30,
        ndwi_after=0.25,
    )
    assert res.change_type == ChangeType.WATER_GAIN
    fired_rules = {r.rule: r for r in res.rule_trace}
    assert fired_rules["d_ndwi_rise"].fired is True


def test_classify_water_loss() -> None:
    """Negative NDWI plunge on prior water body produces WATER_LOSS."""
    res = classify_change(
        d_ndvi=0.05,
        d_ndbi=0.05,
        d_ndwi=-0.30,
        ndwi_before=0.22,
    )
    assert res.change_type == ChangeType.WATER_LOSS
    fired_rules = {r.rule: r for r in res.rule_trace}
    assert fired_rules["d_ndwi_fall"].fired is True


def test_classify_vegetation_gain() -> None:
    """Strong positive NDVI rise produces VEGETATION_GAIN."""
    res = classify_change(
        d_ndvi=0.35,
        d_ndbi=-0.08,
        d_ndwi=-0.05,
        prior_landcover="bare",
    )
    assert res.change_type == ChangeType.VEGETATION_GAIN


def test_classify_road_elongated_geometry() -> None:
    """Elongated linear feature with rising NDBI produces ROAD."""
    res = classify_change(
        d_ndvi=-0.12,
        d_ndbi=0.10,
        d_ndwi=-0.02,
        aspect_ratio=6.2,
        isoperimetric_quotient=0.15,
    )
    assert res.change_type == ChangeType.ROAD
    fired_rules = {r.rule: r for r in res.rule_trace}
    assert fired_rules["linear_geometry"].fired is True


def test_classify_other_fallback() -> None:
    """Sub-threshold changes fallback to OTHER with low score."""
    res = classify_change(
        d_ndvi=0.01,
        d_ndbi=0.01,
        d_ndwi=0.01,
    )
    assert res.change_type == ChangeType.OTHER
