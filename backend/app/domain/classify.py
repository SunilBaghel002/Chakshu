"""Pure domain change classification decision table.

Implements Task 3.1 per PRD 2 §6, PRD 3 §A8, and PRD 4 §3.
Pure Python module with zero framework/DB imports (enforced by test_purity.py).
Evaluates bi-temporal spectral differences and land-cover priors to produce:
- Discrete ChangeType
- Human-readable rule_trace list
- Ranked alternative candidates with explanatory rationale
- Classification margin for confidence calculation
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.domain.constants import (
    CLASSIFY_NDBI_FALL_DEMOLITION,
    CLASSIFY_NDBI_MAX_CLEARANCE,
    CLASSIFY_NDBI_RISE_CONSTRUCTION,
    CLASSIFY_NDVI_FALL_CLEARANCE,
    CLASSIFY_NDVI_FALL_CONSTRUCTION,
    CLASSIFY_NDVI_RISE_VEGETATION,
    CLASSIFY_NDWI_FALL_WATER_LOSS,
    CLASSIFY_NDWI_RISE_WATER_GAIN,
    CLASSIFY_ROAD_ASPECT_RATIO_MIN,
    CLASSIFY_ROAD_ISOPERIMETRIC_QUOTIENT_MAX,
)
from app.schemas.common import ChangeType


@dataclass(frozen=True)
class RuleTraceEntry:
    """Single rule evaluation step in the classification decision table."""

    rule: str
    field: str
    value: Any
    threshold: Any | None = None
    expected: Any | None = None
    fired: bool = False

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary matching RuleTraceItem schema."""
        d: dict[str, Any] = {
            "rule": self.rule,
            "field": self.field,
            "value": self.value,
            "fired": self.fired,
        }
        if self.threshold is not None:
            d["threshold"] = self.threshold
        if self.expected is not None:
            d["expected"] = self.expected
        return d


@dataclass(frozen=True)
class AlternativeCandidate:
    """Alternative candidate class considered with rationale."""

    change_type: str
    score: float
    reason: str

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary matching ClassificationAlternative schema."""
        return {
            "change_type": self.change_type,
            "score": round(self.score, 2),
            "reason": self.reason,
        }


@dataclass(frozen=True)
class ClassificationResult:
    """Complete output of the classification decision table."""

    change_type: ChangeType
    rule_trace: list[RuleTraceEntry] = field(default_factory=list)
    alternatives: list[AlternativeCandidate] = field(default_factory=list)
    confidence_margin: float = 0.50
    winner_score: float = 1.0


def _clip(val: float, lo: float = 0.0, hi: float = 1.0) -> float:
    """Clamp float to bounds."""
    return max(lo, min(hi, val))


def classify_change(
    d_ndvi: float,
    d_ndbi: float,
    d_ndwi: float,
    prior_landcover: str | None = None,
    post_landcover: str | None = None,
    ndvi_before: float | None = None,
    ndvi_after: float | None = None,
    ndbi_before: float | None = None,
    ndbi_after: float | None = None,
    ndwi_before: float | None = None,
    ndwi_after: float | None = None,
    aspect_ratio: float | None = None,
    isoperimetric_quotient: float | None = None,
) -> ClassificationResult:
    """Evaluate decision table over spectral deltas and land-cover priors."""
    prior = (prior_landcover or "unclassified").lower()
    round_d_ndvi = round(float(d_ndvi), 3)
    round_d_ndbi = round(float(d_ndbi), 3)
    round_d_ndwi = round(float(d_ndwi), 3)

    # 1. Evaluate individual decision rules
    rule_ndbi_rise = RuleTraceEntry(
        rule="d_ndbi_rise",
        field="d_ndbi",
        value=round_d_ndbi,
        threshold=CLASSIFY_NDBI_RISE_CONSTRUCTION,
        fired=bool(d_ndbi > CLASSIFY_NDBI_RISE_CONSTRUCTION),
    )
    rule_ndvi_fall_constr = RuleTraceEntry(
        rule="d_ndvi_fall",
        field="d_ndvi",
        value=round_d_ndvi,
        threshold=CLASSIFY_NDVI_FALL_CONSTRUCTION,
        fired=bool(d_ndvi < CLASSIFY_NDVI_FALL_CONSTRUCTION),
    )
    rule_prior_landcover_constr = RuleTraceEntry(
        rule="prior_landcover",
        field="worldcover_2021",
        value=prior,
        expected=["crop", "bare", "vegetation", "unclassified"],
        fired=bool(prior in ["crop", "bare", "vegetation", "unclassified"]),
    )
    rule_not_water = RuleTraceEntry(
        rule="not_water",
        field="d_ndwi",
        value=round_d_ndwi,
        threshold=0.15,
        fired=bool(
            (d_ndwi < 0.15 or d_ndbi > 0.05)
            and (ndwi_after is None or ndwi_after < 0.15 or d_ndbi > 0.05)
        ),
    )
    rule_ndvi_fall_clear = RuleTraceEntry(
        rule="d_ndvi_fall_clearance",
        field="d_ndvi",
        value=round_d_ndvi,
        threshold=CLASSIFY_NDVI_FALL_CLEARANCE,
        fired=bool(d_ndvi < CLASSIFY_NDVI_FALL_CLEARANCE),
    )
    rule_ndbi_subdued_clear = RuleTraceEntry(
        rule="d_ndbi_subdued",
        field="d_ndbi",
        value=round_d_ndbi,
        threshold=CLASSIFY_NDBI_MAX_CLEARANCE,
        fired=bool(d_ndbi <= CLASSIFY_NDBI_MAX_CLEARANCE),
    )
    rule_ndwi_rise = RuleTraceEntry(
        rule="d_ndwi_rise",
        field="d_ndwi",
        value=round_d_ndwi,
        threshold=CLASSIFY_NDWI_RISE_WATER_GAIN,
        fired=bool(d_ndwi > CLASSIFY_NDWI_RISE_WATER_GAIN and d_ndbi <= 0.05),
    )
    rule_ndwi_fall = RuleTraceEntry(
        rule="d_ndwi_fall",
        field="d_ndwi",
        value=round_d_ndwi,
        threshold=CLASSIFY_NDWI_FALL_WATER_LOSS,
        fired=bool(d_ndwi < CLASSIFY_NDWI_FALL_WATER_LOSS),
    )
    rule_ndvi_rise = RuleTraceEntry(
        rule="d_ndvi_rise",
        field="d_ndvi",
        value=round_d_ndvi,
        threshold=CLASSIFY_NDVI_RISE_VEGETATION,
        fired=bool(d_ndvi > CLASSIFY_NDVI_RISE_VEGETATION),
    )
    rule_ndbi_fall = RuleTraceEntry(
        rule="d_ndbi_fall",
        field="d_ndbi",
        value=round_d_ndbi,
        threshold=CLASSIFY_NDBI_FALL_DEMOLITION,
        fired=bool(d_ndbi < CLASSIFY_NDBI_FALL_DEMOLITION),
    )
    rule_linear_road = RuleTraceEntry(
        rule="linear_geometry",
        field="aspect_ratio",
        value=round(aspect_ratio, 2) if aspect_ratio is not None else None,
        threshold=CLASSIFY_ROAD_ASPECT_RATIO_MIN,
        fired=bool(
            aspect_ratio is not None
            and aspect_ratio >= CLASSIFY_ROAD_ASPECT_RATIO_MIN
            and (
                isoperimetric_quotient is None
                or isoperimetric_quotient <= CLASSIFY_ROAD_ISOPERIMETRIC_QUOTIENT_MAX
            )
        ),
    )

    # 2. Compute class compatibility scores
    scores: dict[ChangeType, float] = {}

    # Construction score
    s_constr = 0.0
    if rule_not_water.fired:
        ndbi_component = _clip((d_ndbi - 0.05) / 0.20) if d_ndbi > 0.05 else 0.0
        ndvi_component = _clip((-d_ndvi - 0.10) / 0.30) if d_ndvi < -0.10 else 0.0
        prior_bonus = 0.20 if rule_prior_landcover_constr.fired else 0.0
        if rule_ndbi_rise.fired and rule_ndvi_fall_constr.fired:
            s_constr = 0.45 * ndbi_component + 0.35 * ndvi_component + prior_bonus
        elif rule_ndbi_rise.fired:
            s_constr = 0.50 * ndbi_component + prior_bonus
        elif rule_ndvi_fall_clear.fired:
            s_constr = 0.30 * ndvi_component
    scores[ChangeType.CONSTRUCTION] = _clip(s_constr)

    # Clearance score
    s_clear = 0.0
    if rule_not_water.fired and rule_ndvi_fall_clear.fired:
        veg_loss = _clip((-d_ndvi - 0.15) / 0.35)
        prior_bonus = 0.20 if prior in ["crop", "vegetation"] else 0.10
        if rule_ndbi_subdued_clear.fired:
            s_clear = 0.70 * veg_loss + prior_bonus
        else:
            s_clear = 0.35 * veg_loss + 0.05
    scores[ChangeType.CLEARANCE] = _clip(s_clear)

    # Demolition score
    s_demo = 0.0
    if rule_not_water.fired and rule_ndbi_fall.fired:
        ndbi_drop = _clip((-d_ndbi - 0.05) / 0.20)
        built_prior = 0.30 if (prior == "built" or (ndbi_before and ndbi_before > 0.05)) else 0.0
        s_demo = _clip(0.70 * ndbi_drop + built_prior)
    scores[ChangeType.DEMOLITION] = s_demo

    # Water gain score (water must not have strong built-up NDBI rise)
    s_wgain = 0.0
    if rule_ndwi_rise.fired and d_ndbi <= 0.05:
        w_comp = _clip((d_ndwi - 0.15) / 0.25)
        post_bonus = 0.20 if (ndwi_after is not None and ndwi_after > 0.10) else 0.0
        s_wgain = _clip(0.80 * w_comp + post_bonus)
    scores[ChangeType.WATER_GAIN] = s_wgain

    # Water loss score
    s_wloss = 0.0
    if rule_ndwi_fall.fired:
        w_comp = _clip((-d_ndwi - 0.15) / 0.25)
        prior_bonus = 0.20 if (ndwi_before is not None and ndwi_before > 0.10) else 0.0
        s_wloss = _clip(0.80 * w_comp + prior_bonus)
    scores[ChangeType.WATER_LOSS] = s_wloss

    # Vegetation gain score
    s_vgain = 0.0
    if rule_not_water.fired and rule_ndvi_rise.fired:
        v_comp = _clip((d_ndvi - 0.20) / 0.30)
        s_vgain = _clip(0.80 * v_comp + 0.20)
    scores[ChangeType.VEGETATION_GAIN] = s_vgain

    # Road score
    s_road = 0.0
    if rule_not_water.fired and rule_linear_road.fired and d_ndbi > 0.02:
        linear_comp = 0.50
        ndbi_comp = _clip(d_ndbi / 0.15) * 0.30
        s_road = _clip(linear_comp + ndbi_comp)
    scores[ChangeType.ROAD] = s_road

    # Expansion score (built prior + built rise)
    s_expansion = 0.0
    if prior == "built" and d_ndbi > 0.05 and rule_not_water.fired:
        s_expansion = _clip(0.50 + 0.50 * _clip((d_ndbi - 0.05) / 0.15))
    scores[ChangeType.EXPANSION] = s_expansion

    # 3. Determine winner and runner-up
    sorted_classes = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    winner_type, winner_score = sorted_classes[0]

    # If top score is negligible, assign OTHER
    if winner_score < 0.20:
        winner_type = ChangeType.OTHER
        winner_score = 0.30
        runner_up_score = 0.0
    else:
        runner_up_score = sorted_classes[1][1] if len(sorted_classes) > 1 else 0.0

    margin = _clip(winner_score - runner_up_score, 0.0, 1.0)

    # 4. Formulate alternatives with explicit domain rationales
    alternatives: list[AlternativeCandidate] = []
    for c_type, score in sorted_classes[1:]:
        if score < 0.15:
            continue
        reason = _generate_alternative_rationale(
            winner_type=winner_type,
            alt_type=c_type,
            d_ndvi=d_ndvi,
            d_ndbi=d_ndbi,
            d_ndwi=d_ndwi,
            prior=prior,
        )
        alternatives.append(
            AlternativeCandidate(change_type=c_type.value, score=score, reason=reason)
        )

    # 5. Compile relevant rule_trace entries
    rule_trace: list[RuleTraceEntry] = []
    if winner_type in (ChangeType.CONSTRUCTION, ChangeType.EXPANSION):
        rule_trace = [
            rule_ndbi_rise,
            rule_ndvi_fall_constr,
            rule_prior_landcover_constr,
            rule_not_water,
        ]
    elif winner_type == ChangeType.CLEARANCE:
        rule_trace = [
            rule_ndvi_fall_clear,
            rule_ndbi_subdued_clear,
            rule_prior_landcover_constr,
            rule_not_water,
        ]
    elif winner_type == ChangeType.DEMOLITION:
        rule_trace = [rule_ndbi_fall, rule_not_water]
    elif winner_type == ChangeType.WATER_GAIN:
        rule_trace = [rule_ndwi_rise]
    elif winner_type == ChangeType.WATER_LOSS:
        rule_trace = [rule_ndwi_fall]
    elif winner_type == ChangeType.VEGETATION_GAIN:
        rule_trace = [rule_ndvi_rise, rule_not_water]
    elif winner_type == ChangeType.ROAD:
        rule_trace = [rule_linear_road, rule_ndbi_rise, rule_ndvi_fall_constr, rule_not_water]
    else:
        rule_trace = [rule_ndbi_rise, rule_ndvi_fall_constr, rule_not_water]

    return ClassificationResult(
        change_type=winner_type,
        rule_trace=rule_trace,
        alternatives=alternatives,
        confidence_margin=round(margin, 2),
        winner_score=round(winner_score, 2),
    )


def _generate_alternative_rationale(
    winner_type: ChangeType,
    alt_type: ChangeType,
    d_ndvi: float,
    d_ndbi: float,
    d_ndwi: float,
    prior: str,
) -> str:
    """Generate human-readable justification for why alternative was considered."""
    if winner_type == ChangeType.CONSTRUCTION and alt_type == ChangeType.CLEARANCE:
        return (
            f"d_ndvi also fell ({d_ndvi:+.2f}), but d_ndbi rise ({d_ndbi:+.2f}) "
            "indicates structural built-up development."
        )
    if winner_type == ChangeType.CLEARANCE and alt_type == ChangeType.CONSTRUCTION:
        return (
            f"d_ndvi fell significantly ({d_ndvi:+.2f}), but d_ndbi ({d_ndbi:+.2f}) is subdued, "
            "indicating earthworks/clearance rather than built structures."
        )
    if winner_type == ChangeType.CONSTRUCTION and alt_type == ChangeType.ROAD:
        return "Aspect ratio does not satisfy linear infrastructure geometry threshold."
    if winner_type == ChangeType.ROAD and alt_type == ChangeType.CONSTRUCTION:
        return (
            "Elongated geometry indicates corridor/road infrastructure rather than "
            "compact building cluster."
        )
    if alt_type == ChangeType.WATER_GAIN:
        return (
            f"Moderate moisture or shadow signature detected, but d_ndwi ({d_ndwi:+.2f}) "
            "does not dominate."
        )
    if alt_type == ChangeType.DEMOLITION:
        return f"Reflectance decrease detected, but prior land-cover was '{prior}', not built-up."
    return f"Secondary spectral match ({alt_type.value}) observed with lower confidence."
