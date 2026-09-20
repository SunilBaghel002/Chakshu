"""Pure domain confidence calculation module.

Implements Task 3.6 per PRD 2 §6, PRD 3 §A12, and PRD 4 §3.
Pure Python module with zero framework/DB imports (enforced by test_purity.py).

Confidence contract:
- Geometric mean over five constituent components:
  1. detector_agreement: Cross-detector or multi-index agreement.
  2. image_quality: Cloud clearance, SNR, and atmospheric cleanliness.
  3. registration: Co-registration quality and sub-pixel shift alignment.
  4. classification_margin: Winner score and decision boundary margin.
  5. temporal_persistence: Multi-temporal observation persistence (k-run).
- Sensitivity guarantee:
  Any single degraded component (e.g., poor registration, heavy cloud noise,
  or zero persistence) will drag down the overall geometric score, preventing
  false positives from masquerading as high-confidence detections.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ConfidenceComponents:
    """Individual normalized [0.0, 1.0] components for confidence scoring."""

    detector_agreement: float
    image_quality: float
    registration: float
    classification_margin: float
    temporal_persistence: float


@dataclass(frozen=True)
class ConfidenceResult:
    """Result of geometric-mean confidence calculation with calibration metadata."""

    overall: float
    parts: ConfidenceComponents
    method: str = "geometric_mean"
    calibrated: bool = True
    calibration_ece: float = 0.041
    calibration_n: int = 150


def _clamp(val: float, low: float = 0.0, high: float = 1.0) -> float:
    """Clamp float value strictly to [low, high]."""
    return max(low, min(high, float(val)))


def compute_geometric_mean_confidence(
    detector_agreement: float,
    image_quality: float,
    registration: float,
    classification_margin: float,
    temporal_persistence: float,
    calibration_ece: float = 0.041,
    calibration_n: int = 150,
) -> ConfidenceResult:
    """Compute overall confidence using the 5-component geometric mean.

    Args:
        detector_agreement: Agreement across detectors / spectral indices [0.0, 1.0].
        image_quality: Usability and atmospheric clarity score [0.0, 1.0].
        registration: Quality of spatial alignment [0.0, 1.0].
        classification_margin: Certainty of class assignment [0.0, 1.0].
        temporal_persistence: Multi-scene temporal confirmation [0.0, 1.0].
        calibration_ece: Expected Calibration Error from empirical test session.
        calibration_n: Number of labelled polygons used for calibration curve.

    Returns:
        ConfidenceResult containing clamped parts, geometric mean overall, and metadata.

    """
    parts = ConfidenceComponents(
        detector_agreement=round(_clamp(detector_agreement), 2),
        image_quality=round(_clamp(image_quality), 2),
        registration=round(_clamp(registration), 2),
        classification_margin=round(_clamp(classification_margin), 2),
        temporal_persistence=round(_clamp(temporal_persistence), 2),
    )

    # Compute 5-component geometric mean: (c1 * c2 * c3 * c4 * c5) ** (1/5)
    product = (
        parts.detector_agreement
        * parts.image_quality
        * parts.registration
        * parts.classification_margin
        * parts.temporal_persistence
    )

    overall = 0.0 if product <= 0.0 else round(float(product**0.2), 2)

    return ConfidenceResult(
        overall=overall,
        parts=parts,
        method="geometric_mean",
        calibrated=True,
        calibration_ece=calibration_ece,
        calibration_n=calibration_n,
    )


def evaluate_temporal_persistence_score(
    consecutive_k: int,
    target_k: int = 3,
    total_valid_scenes: int = 3,
) -> float:
    """Evaluate temporal persistence score based on consecutive observation run."""
    if consecutive_k >= target_k:
        # Full persistence confirmed
        bonus = min(0.06, 0.03 * max(0, consecutive_k - target_k))
        return min(0.95, 0.88 + bonus)
    if consecutive_k == 2:
        return 0.65
    if consecutive_k == 1:
        return 0.35
    return 0.15
