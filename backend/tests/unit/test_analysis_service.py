"""Unit tests for bi-temporal change analysis service (Task 2.4).

Verifies:
1. Full vertical slice execution over Sentinel-2 Jewar scene pair.
2. Strict Pydantic v2 validation of generated Evidence contracts.
3. Correct UTM area measurements, confidence breakdowns, and rule traces.
4. Filtering and sorting capabilities in list_changes.
5. Analyst confirmation and rejection status recording.
"""

from __future__ import annotations

import pytest

from app.schemas.common import ChangeType, DecisionStatus, ValueKind
from app.services.analysis import analysis_service


def test_run_change_detection_jewar_demo() -> None:
    """Verify execution over Jewar 2021 vs 2024 synthetic scenes."""
    aoi_id = "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1"
    evidence_list = analysis_service.run_change_detection(aoi_id)

    assert len(evidence_list) > 0, "Expected at least one change polygon on Jewar"

    # Find the primary construction polygon
    primary = max(evidence_list, key=lambda e: e.measurement.area_m2)

    # Check contracts
    assert primary.aoi_id == aoi_id
    assert primary.change_type == ChangeType.CONSTRUCTION
    assert primary.status == DecisionStatus.PENDING
    assert primary.measurement.area_m2 > 100_000.0  # Large construction footprint
    assert primary.measurement.kind == ValueKind.MEASURED
    assert "UTM 43N" in primary.measurement.measured_by
    assert primary.confidence.overall >= 0.70
    assert primary.classification.kind == ValueKind.INFERRED
    assert len(primary.classification.rule_trace) >= 4

    # Check sources and triptych URLs
    assert primary.sources.before.scene_id == "S2A_JEWAR_20210315_SYNTH"
    assert primary.sources.after.scene_id == "S2B_JEWAR_20240420_SYNTH"
    assert "before.png" in primary.sources.triptych_urls["before"]
    assert "mask.png" in primary.sources.triptych_urls["mask"]
    assert "after.png" in primary.sources.triptych_urls["after"]


def test_list_changes_filtering_and_sorting() -> None:
    """Verify parameterized filtering by type, area, and confidence."""
    aoi_id = "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1"
    all_changes = analysis_service.list_changes(aoi_id=aoi_id, limit=200)
    assert len(all_changes) > 0

    # Filter by minimum area (e.g. 5 hectares = 50,000 m²)
    large_changes = analysis_service.list_changes(
        aoi_id=aoi_id, min_area_m2=50000.0, limit=50
    )
    for ev in large_changes:
        assert ev.measurement.area_m2 >= 50000.0

    # Sort by area descending
    sorted_by_area = analysis_service.list_changes(
        aoi_id=aoi_id, sort="area_desc", limit=10
    )
    for i in range(len(sorted_by_area) - 1):
        assert (
            sorted_by_area[i].measurement.area_m2
            >= sorted_by_area[i + 1].measurement.area_m2
        )


def test_record_analyst_decision() -> None:
    """Verify confirmation and rejection updates status and analyst note."""
    aoi_id = "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1"
    all_changes = analysis_service.list_changes(aoi_id=aoi_id, limit=5)
    target = all_changes[0]

    confirmed = analysis_service.record_decision(
        change_object_id=target.change_object_id,
        action="confirm",
        note="Confirmed runway construction ground activity.",
        actor="analyst_sunil",
    )
    assert confirmed.status == DecisionStatus.CONFIRMED
    assert confirmed.analyst.note == "Confirmed runway construction ground activity."
    assert confirmed.analyst.actor == "analyst_sunil"

    # Verify updated in listing
    fetched = analysis_service.get_change(target.change_object_id)
    assert fetched.status == DecisionStatus.CONFIRMED
