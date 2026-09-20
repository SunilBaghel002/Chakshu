"""Pure domain false-alarm suppression gates.

Implements Task 3.3 per PRD 2 §6, PRD 3 §A9, and PRD 4 §2 & §3.
Pure Python module with zero framework/DB imports (enforced by test_purity.py).

Contains all eight false-alarm suppression gates:
1. min_size: Drops candidates below the minimum detectable spatial resolution (400 m² / 4 px).
2. cloud: Discards patches overlapping cloudy pixels (SCL cloud or cloud prob > 20%).
3. cloud_shadow: Discards patches co-located with cloud shadows (SCL 3 or projected shadow).
4. registration: Discards boundary slivers or false changes from alignment error (> 2.0 px).
5. seasonal: Filters out cyclic agricultural phenology lacking structural NDBI rise.
6. illumination: Filters broadband brightness changes caused by differing solar geometry.
7. snow_cover: Filters ephemeral snow / frost events via NDSI (> 0.40).
8. low_confidence: Rejects low-magnitude or low-confidence candidate detections (< 0.30).

Every suppressed candidate is guaranteed to have an explicit SuppressionReason and detail string.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.domain.constants import (
    CLASSIFY_ROAD_ISOPERIMETRIC_QUOTIENT_MAX,
    MAX_REGISTRATION_SHIFT_PX,
    SUPPRESS_CLOUD_PROB_MAX,
    SUPPRESS_CONFIDENCE_MIN,
    SUPPRESS_MIN_AREA_M2,
    SUPPRESS_SNOW_NDSI_MIN,
)
from app.schemas.common import SuppressionReason


@dataclass(frozen=True)
class CandidateEvaluationInput:
    """Input parameters of a candidate change polygon for suppression gate evaluation."""

    candidate_id: str
    area_m2: float
    pixel_count: int = 16
    cloud_prob: float = 0.0
    scl_class: int | None = None
    is_shadow: bool = False
    registration_shift_px: float = 0.0
    isoperimetric_quotient: float = 0.50
    is_seasonal_cycle: bool = False
    prior_landcover: str | None = None
    d_ndbi: float = 0.0
    d_ndvi: float = 0.0
    d_ndwi: float = 0.0
    is_illumination_artifact: bool = False
    sun_elevation_diff_deg: float = 0.0
    ndsi: float = 0.0
    confidence_score: float = 0.85
    change_magnitude: float = 0.50


@dataclass(frozen=True)
class SuppressionGateResult:
    """Result of gate evaluation for a single candidate."""

    passed: bool
    reason: SuppressionReason | None = None
    detail: str | None = None


def evaluate_suppression_gates(candidate: CandidateEvaluationInput) -> SuppressionGateResult:
    """Evaluate candidate against all eight suppression gates in deterministic priority order.

    Returns:
        SuppressionGateResult: passed=True if all gates pass, or passed=False with
        guaranteed non-null SuppressionReason and non-empty detail string.

    """
    # Gate 1: Cloud overlap
    if candidate.cloud_prob > SUPPRESS_CLOUD_PROB_MAX or (
        candidate.scl_class is not None and candidate.scl_class in (8, 9, 10)
    ):
        return SuppressionGateResult(
            passed=False,
            reason=SuppressionReason.CLOUD,
            detail=(
                f"Candidate overlaps cloud mask (cloud probability "
                f"{candidate.cloud_prob:.1%} exceeds tolerance {SUPPRESS_CLOUD_PROB_MAX:.0%})."
            ),
        )

    # Gate 2: Cloud shadow
    if candidate.is_shadow or (candidate.scl_class is not None and candidate.scl_class == 3):
        return SuppressionGateResult(
            passed=False,
            reason=SuppressionReason.CLOUD_SHADOW,
            detail=(
                "Dark patch co-located with cloud mask projection vector / SCL cloud shadow class."
            ),
        )

    # Gate 3: Sub-pixel registration error & boundary sliver
    if candidate.registration_shift_px > MAX_REGISTRATION_SHIFT_PX:
        return SuppressionGateResult(
            passed=False,
            reason=SuppressionReason.REGISTRATION,
            detail=(
                f"Scene shift magnitude {candidate.registration_shift_px:.2f} px exceeds "
                f"registration tolerance ({MAX_REGISTRATION_SHIFT_PX:.1f} px); "
                "high risk of false edge artifacts."
            ),
        )
    if (
        candidate.registration_shift_px > 0.50
        and candidate.isoperimetric_quotient < CLASSIFY_ROAD_ISOPERIMETRIC_QUOTIENT_MAX / 3.0
    ):
        return SuppressionGateResult(
            passed=False,
            reason=SuppressionReason.REGISTRATION,
            detail=(
                "Boundary sliver artifact along high-contrast edge "
                f"(isoperimetric quotient {candidate.isoperimetric_quotient:.3f}, "
                f"shift {candidate.registration_shift_px:.2f} px)."
            ),
        )

    # Gate 4: Ephemeral snow cover
    if candidate.ndsi > SUPPRESS_SNOW_NDSI_MIN:
        return SuppressionGateResult(
            passed=False,
            reason=SuppressionReason.SNOW_COVER,
            detail=(
                f"Spectral signature matches ephemeral snow/ice cover "
                f"(NDSI {candidate.ndsi:.2f} > {SUPPRESS_SNOW_NDSI_MIN:.2f})."
            ),
        )

    # Gate 5: Seasonal crop / phenology variation
    prior = (candidate.prior_landcover or "").lower()
    if candidate.is_seasonal_cycle or (
        prior in ("crop", "vegetation")
        and candidate.d_ndbi <= 0.02
        and candidate.d_ndvi < -0.15
        and not candidate.is_shadow
    ):
        return SuppressionGateResult(
            passed=False,
            reason=SuppressionReason.SEASONAL,
            detail=(
                "Vegetation index swing consistent with pre/post monsoon cyclic variation; "
                "no structural NDBI increase."
            ),
        )

    # Gate 6: Solar illumination variation
    if candidate.is_illumination_artifact or (
        abs(candidate.sun_elevation_diff_deg) > 20.0
        and abs(candidate.d_ndvi) < 0.05
        and abs(candidate.d_ndbi) < 0.05
    ):
        return SuppressionGateResult(
            passed=False,
            reason=SuppressionReason.ILLUMINATION,
            detail=(
                "Broadband brightness difference without spectral index shift; "
                f"consistent with solar illumination angle variation "
                f"({abs(candidate.sun_elevation_diff_deg):.1f}° difference)."
            ),
        )

    # Gate 7: Minimum spatial area
    if candidate.area_m2 < SUPPRESS_MIN_AREA_M2 or candidate.pixel_count < 4:
        return SuppressionGateResult(
            passed=False,
            reason=SuppressionReason.MIN_SIZE,
            detail=(
                f"Candidate area {candidate.area_m2:.1f} m² is below minimum spatial threshold "
                f"{SUPPRESS_MIN_AREA_M2:.1f} m² (4 pixels at 10m GSD)."
            ),
        )

    # Gate 8: Low confidence / weak change signal
    if candidate.confidence_score < SUPPRESS_CONFIDENCE_MIN or candidate.change_magnitude < 0.10:
        return SuppressionGateResult(
            passed=False,
            reason=SuppressionReason.LOW_CONFIDENCE,
            detail=(
                f"Overall change score ({candidate.confidence_score:.2f}) is below minimum "
                f"detection confidence threshold ({SUPPRESS_CONFIDENCE_MIN:.2f})."
            ),
        )

    return SuppressionGateResult(passed=True)


@dataclass
class SuppressionAggregator:
    """Aggregates and accounts for all candidates generated, suppressed, and retained."""

    aoi_id: str = ""
    candidates_generated: int = 0
    candidates_suppressed: int = 0
    candidates_retained: int = 0
    by_reason: dict[str, int] = field(
        default_factory=lambda: {r.value: 0 for r in SuppressionReason}
    )
    sample_reasons: list[dict[str, str]] = field(default_factory=list)

    def record_evaluation(
        self,
        candidate_id: str,
        result: SuppressionGateResult,
    ) -> None:
        """Record evaluation of a candidate."""
        self.candidates_generated += 1
        if result.passed:
            self.candidates_retained += 1
        else:
            self.candidates_suppressed += 1
            if result.reason is not None:
                r_key = result.reason.value
                self.by_reason[r_key] = self.by_reason.get(r_key, 0) + 1
                if len(self.sample_reasons) < 10 and result.detail:
                    self.sample_reasons.append(
                        {
                            "candidate_id": candidate_id,
                            "reason": r_key,
                            "detail": result.detail,
                        }
                    )

    def to_context_dict(self) -> dict[str, Any]:
        """Convert to dictionary matching SuppressionContextSubObject schema."""
        return {
            "candidates_generated": self.candidates_generated,
            "candidates_suppressed": self.candidates_suppressed,
            "candidates_retained": self.candidates_retained,
            "by_reason": dict(self.by_reason),
        }

    def to_summary_dict(self) -> dict[str, Any]:
        """Convert to dictionary matching GET /aoi/{id}/suppression endpoint format."""
        return {
            "aoi_id": self.aoi_id,
            "candidates_generated": self.candidates_generated,
            "candidates_suppressed": self.candidates_suppressed,
            "candidates_retained": self.candidates_retained,
            "by_reason": dict(self.by_reason),
            "sample_reasons": list(self.sample_reasons),
        }
