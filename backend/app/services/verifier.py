"""The Number Verifier for Chakshu.

Enforces the central architectural invariant from PRD 1 §2 and PRD 2 §7:
    THE AI NEVER PRODUCES A NUMBER.
Every quantity Chakshu displays comes from deterministic geometry, arithmetic,
or SQL. A language model may understand a question and phrase an answer,
but it may never be the source of a measurement.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

from app.schemas.summary import NarrativeFact

log = logging.getLogger(__name__)

# Unit conversion factors to base SI units (m² for area, m for length)
AREA_CONVERSIONS_TO_M2: dict[str, float] = {
    "m2": 1.0,
    "m²": 1.0,
    "sq m": 1.0,
    "sqm": 1.0,
    "square metre": 1.0,
    "square metres": 1.0,
    "square meter": 1.0,
    "square meters": 1.0,
    "ha": 10000.0,
    "hectare": 10000.0,
    "hectares": 10000.0,
    "km2": 1000000.0,
    "km²": 1000000.0,
    "sq km": 1000000.0,
    "square kilometre": 1000000.0,
    "square kilometres": 1000000.0,
    "square kilometer": 1000000.0,
    "square kilometers": 1000000.0,
}

# Regex to match numeric tokens, optionally followed by units
NUMBER_TOKEN_PATTERN = re.compile(
    r"\b(?P<number>\d+(?:,\d{3})*(?:\.\d+)?)\s*(?P<unit>[a-zA-Z²%]+)?\b"
)

# Date pattern YYYY-MM-DD
DATE_PATTERN = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")

# Month Year pattern (e.g., June 2024)
MONTH_YEAR_PATTERN = re.compile(
    r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b",
    re.IGNORECASE,
)


@dataclass
class ExtractedQuantity:
    """A numerical or measurement token extracted from text."""

    raw_text: str
    numeric_value: float
    is_integer: bool
    unit: str | None = None


@dataclass
class VerifierVerdict:
    """The outcome of the Number Verifier check."""

    passed: bool
    verdict: str  # "PASS" | "FAIL"
    diff: dict[str, Any] = field(default_factory=dict)
    rejected_tokens: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)


class NumberVerifier:
    """Deterministic validation engine cross-referencing model prose against ground-truth facts."""

    def __init__(self, tolerance_pct: float = 0.02, pct_point_tolerance: float = 1.0) -> None:
        """Initialize verifier with acceptable rounding tolerances."""
        self.tolerance_pct = tolerance_pct
        self.pct_point_tolerance = pct_point_tolerance

    def extract_quantities(self, text: str) -> list[ExtractedQuantity]:
        """Extract all numbers and associated units from prose."""
        quantities: list[ExtractedQuantity] = []
        for match in NUMBER_TOKEN_PATTERN.finditer(text):
            num_str = match.group("number").replace(",", "")
            unit_str = match.group("unit")

            try:
                val = float(num_str)
            except ValueError:
                continue

            is_int = ("." not in num_str) and (float(int(val)) == val)
            quantities.append(
                ExtractedQuantity(
                    raw_text=match.group(0),
                    numeric_value=val,
                    is_integer=is_int,
                    unit=unit_str.lower() if unit_str else None,
                )
            )
        return quantities

    def _match_quantity_against_facts(
        self, qty: ExtractedQuantity, facts: list[NarrativeFact]
    ) -> bool:
        """Verify whether an extracted quantity is backed by an authorized fact in the bundle."""
        val = qty.numeric_value
        unit = qty.unit

        for fact in facts:
            fact_val = fact.value
            fact_unit = (fact.unit or "").lower()

            # Handle integer count matching
            if qty.is_integer and isinstance(fact_val, int | float):
                if int(val) == int(fact_val):
                    return True
                # Allow matching year tokens if present in date facts
                if 2000 <= val <= 2030 and (
                    str(int(val)) in str(fact_val) or (fact.days is not None and val == fact.days)
                ):
                    return True

            # Handle floating point number / area matching
            if isinstance(fact_val, int | float):
                # 1. Direct unit-less comparison
                if abs(val - float(fact_val)) <= max(1e-4, float(fact_val) * self.tolerance_pct):
                    return True

                # 2. Unit conversion matching (e.g. m² to ha)
                if unit in AREA_CONVERSIONS_TO_M2 and fact_unit in AREA_CONVERSIONS_TO_M2:
                    val_in_m2 = val * AREA_CONVERSIONS_TO_M2[unit]
                    fact_in_m2 = float(fact_val) * AREA_CONVERSIONS_TO_M2[fact_unit]
                    relative_diff = abs(val_in_m2 - fact_in_m2) / max(fact_in_m2, 1.0)
                    if relative_diff <= self.tolerance_pct:
                        return True

            # Check if value matches formatted string in fact label (e.g. "18.43 ha")
            if fact.label and qty.raw_text.lower() in fact.label.lower():
                return True

            # Check day counts or duration intervals
            if fact.days is not None and abs(val - fact.days) <= 1.0:
                return True

        return False

    def verify(
        self,
        candidate_prose: str,
        facts: list[NarrativeFact],
        allowed_free_numbers: set[float] | None = None,
    ) -> VerifierVerdict:
        """Verify candidate prose against narrative ground truth facts.

        Every number in candidate prose must trace back to an authorized fact.
        Fabricated numbers cause an immediate FAIL verdict.
        """
        quantities = self.extract_quantities(candidate_prose)
        free_numbers = allowed_free_numbers or {1.0, 2.0, 3.0}  # Small cardinal words / windows

        rejected_tokens: list[str] = []
        reasons: list[str] = []

        for qty in quantities:
            # Allow common small references like "3 years" if 3 is window size
            if qty.numeric_value in free_numbers:
                continue

            if not self._match_quantity_against_facts(qty, facts):
                rejected_tokens.append(qty.raw_text)
                reasons.append(
                    f"Token '{qty.raw_text}' ({qty.numeric_value}) cannot be verified "
                    f"against any authorized measurement fact in bundle."
                )

        if rejected_tokens:
            log.warning(
                "Verifier FAIL: Model produced unverified numbers",
                extra={"rejected_tokens": rejected_tokens, "reasons": reasons},
            )
            return VerifierVerdict(
                passed=False,
                verdict="FAIL",
                diff={"unverified_tokens": rejected_tokens, "reasons": reasons},
                rejected_tokens=rejected_tokens,
                reasons=reasons,
            )

        return VerifierVerdict(
            passed=True,
            verdict="PASS",
            diff={},
            rejected_tokens=[],
            reasons=[],
        )
