"""Unit tests for domain/resolution.py.

Asserts capability tier assignment and Resolution Gate invariants.
"""

from app.domain.resolution import (
    can_measure_area,
    permitted_labels,
    resolve_tier,
)


def test_tier_blocks_vehicle_detection_at_10m() -> None:
    """A 10 m Sentinel-2 image cannot support vehicle detection."""
    tier = resolve_tier(10.0, gsd_source="metadata")
    assert tier == "T3_MEDIUM"

    objects, landcover = permitted_labels(tier)
    assert "vehicle" not in objects
    assert "aircraft" not in objects
    assert "building_cluster" in objects
    assert "road" in objects
    assert "water" in landcover


def test_resolve_tier_sub_meter_allows_vehicles() -> None:
    """Sub-metre imagery (Cartosat-2S, WorldView) permits vehicles and individual buildings."""
    tier = resolve_tier(0.65, gsd_source="metadata")
    assert tier == "T1_VERY_HIGH"

    objects, _ = permitted_labels(tier)
    assert "vehicle" in objects
    assert "building" in objects
    assert "aircraft" in objects
    assert can_measure_area(tier) is True


def test_resolve_tier_assumed_capped_at_t3() -> None:
    """An assumed GSD can never yield better than T3_MEDIUM (PRD 2 §5 rule 1)."""
    tier = resolve_tier(0.3, gsd_source="assumed")
    assert tier == "T3_MEDIUM"

    tier2 = resolve_tier(3.0, gsd_source="assumed")
    assert tier2 == "T3_MEDIUM"

    objects, _ = permitted_labels(tier)
    assert "vehicle" not in objects


def test_resolve_tier_unknown_disallows_objects_and_areas() -> None:
    """Ungeoreferenced images with unknown GSD land in T0_UNKNOWN."""
    tier = resolve_tier(None, gsd_source=None)
    assert tier == "T0_UNKNOWN"

    objects, landcover = permitted_labels(tier)
    assert len(objects) == 0
    assert len(landcover) == 0
    assert can_measure_area(tier) is False


def test_resolve_tier_coarse_disallows_objects_but_permits_landcover() -> None:
    """Coarse imagery (> 15 m, Landsat 30 m) allows land-cover only."""
    tier = resolve_tier(30.0, gsd_source="metadata")
    assert tier == "T4_COARSE"

    objects, landcover = permitted_labels(tier)
    assert len(objects) == 0
    assert "water" in landcover
    assert "built" in landcover
    assert can_measure_area(tier) is True
