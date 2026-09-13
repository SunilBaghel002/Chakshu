"""Unit tests for pure domain confidence scoring module (Task 3.6).

Tests:
1. Mandatory test: test_confidence_geometric_mean_one_bad_component_sinks_score (PRD 5 §7 line 201).
2. All-good components produce high confidence.
3. Clamping and zero-handling robustness.
4. Schema compatibility with ConfidenceSubObject and ConfidenceParts.
"""

from __future__ import annotations

from app.domain.confidence import (
    compute_geometric_mean_confidence,
    evaluate_temporal_persistence_score,
)
from app.schemas.evidence import ConfidenceParts, ConfidenceSubObject


def test_confidence_geometric_mean_one_bad_component_sinks_score() -> None:
    """Mandatory test (PRD 5 §7 line 201): One bad component sinks the overall geometric mean.

    Contrast with arithmetic mean:
    - Four 0.95 components and one 0.15 component:
      - Arithmetic mean = (4 * 0.95 + 0.15) / 5 = 0.79 (falsely looks solid!)
      - Geometric mean = (0.95^4 * 0.15)^0.2 = 0.657 (drops below 0.70 threshold)
    """
    res = compute_geometric_mean_confidence(
        detector_agreement=0.95,
        image_quality=0.95,
        registration=0.95,
        classification_margin=0.95,
        temporal_persistence=0.15,  # The bad component!
    )

    arithmetic_mean = (0.95 * 4 + 0.15) / 5.0

    # Overall must be visibly sunk by the bad component
    assert res.overall < 0.70
    assert res.overall < arithmetic_mean - 0.10
    assert res.parts.temporal_persistence == 0.15


def test_confidence_all_good_components_produce_high_score() -> None:
    """When all five components are high, overall score is solid (0.88-0.95)."""
    res = compute_geometric_mean_confidence(
        detector_agreement=0.92,
        image_quality=0.88,
        registration=0.96,
        classification_margin=0.88,
        temporal_persistence=0.89,
    )

    assert res.overall >= 0.88
    assert res.overall <= 0.95
    assert res.method == "geometric_mean"
    assert res.calibrated is True
    assert res.calibration_ece == 0.041
    assert res.calibration_n == 150


def test_confidence_zero_component_results_in_zero_overall() -> None:
    """A zero component causes geometric mean to drop to 0.0."""
    res = compute_geometric_mean_confidence(
        detector_agreement=0.90,
        image_quality=0.0,
        registration=0.95,
        classification_margin=0.85,
        temporal_persistence=0.90,
    )

    assert res.overall == 0.0


def test_confidence_subobject_roundtrip() -> None:
    """ConfidenceResult converts cleanly to Pydantic ConfidenceSubObject."""
    res = compute_geometric_mean_confidence(
        detector_agreement=0.90,
        image_quality=0.85,
        registration=0.95,
        classification_margin=0.80,
        temporal_persistence=0.88,
    )

    parts_obj = ConfidenceParts(
        detector_agreement=res.parts.detector_agreement,
        image_quality=res.parts.image_quality,
        registration=res.parts.registration,
        classification_margin=res.parts.classification_margin,
        temporal_persistence=res.parts.temporal_persistence,
    )

    sub_obj = ConfidenceSubObject(
        overall=res.overall,
        parts=parts_obj,
        method=res.method,
        calibrated=res.calibrated,
        calibration_ece=res.calibration_ece,
        calibration_n=res.calibration_n,
    )

    assert sub_obj.overall == res.overall
    assert sub_obj.parts.detector_agreement == 0.90


def test_evaluate_temporal_persistence_scoring() -> None:
    """evaluate_temporal_persistence_score scales appropriately with k."""
    assert evaluate_temporal_persistence_score(3, target_k=3) >= 0.88
    assert evaluate_temporal_persistence_score(5, target_k=3) >= 0.94
    assert evaluate_temporal_persistence_score(2, target_k=3) == 0.65
    assert evaluate_temporal_persistence_score(1, target_k=3) == 0.35
    assert evaluate_temporal_persistence_score(0, target_k=3) == 0.15
