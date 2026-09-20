"""Unit tests for pure domain temporal polygon merge module.

Validates Task 3.7 per PRD 2 §6 and PRD 3 §B8 step 4.
"""

from shapely.geometry import Polygon

from app.domain.merge import (
    TemporalPolygonDetection,
    compute_polygon_iou,
    merge_temporal_polygons,
)
from app.schemas.common import ChangeType


def test_compute_polygon_iou() -> None:
    """Verify planar IoU computation between shapely polygons."""
    poly_a = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
    # Identical polygons -> IoU = 1.0
    assert compute_polygon_iou(poly_a, poly_a) == 1.0

    # Disjoint polygons -> IoU = 0.0
    poly_disjoint = Polygon([(20, 20), (30, 20), (30, 30), (20, 30)])
    assert compute_polygon_iou(poly_a, poly_disjoint) == 0.0

    # Partial overlap: poly_a is 10x10=100. poly_b is from (5,0) to (15,10) = 100.
    # Intersection = 5x10=50. Union = 150. IoU = 50/150 = 1/3 ~ 0.3333.
    poly_b = Polygon([(5, 0), (15, 0), (15, 10), (5, 10)])
    iou = compute_polygon_iou(poly_a, poly_b)
    assert abs(iou - 1.0 / 3.0) < 1e-4


def test_merge_temporal_polygons_expanding_track() -> None:
    """Consecutive overlapping detections merge into an expanding track."""
    poly1 = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
    poly2 = Polygon([(0, 0), (12, 0), (12, 12), (0, 12)])  # Area increases from 100 to 144

    d1 = TemporalPolygonDetection(
        detection_id="d1",
        geom=poly1,
        change_type=ChangeType.CONSTRUCTION,
        scene_date="2021-10-01",
        area_m2=1000.0,
    )
    d2 = TemporalPolygonDetection(
        detection_id="d2",
        geom=poly2,
        change_type=ChangeType.CONSTRUCTION,
        scene_date="2021-11-15",
        area_m2=1440.0,
    )

    tracks = merge_temporal_polygons([d1, d2])
    assert len(tracks) == 1
    track = tracks[0]
    assert track.change_type == ChangeType.CONSTRUCTION
    assert track.first_supported == "2021-10-01"
    assert track.last_seen == "2021-11-15"
    assert track.observations_count == 2
    assert track.trend == "expanding"
    assert track.area_m2 == 1440.0
    assert track.max_area_m2 == 1440.0
    assert len(track.area_series) == 2


def test_merge_temporal_polygons_disjoint_creates_distinct_tracks() -> None:
    """Spatially disjoint polygons create separate tracks even with same type."""
    poly1 = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
    poly2 = Polygon([(100, 100), (110, 100), (110, 110), (100, 110)])

    d1 = TemporalPolygonDetection(
        detection_id="d1",
        geom=poly1,
        change_type=ChangeType.CONSTRUCTION,
        scene_date="2021-10-01",
        area_m2=1000.0,
    )
    d2 = TemporalPolygonDetection(
        detection_id="d2",
        geom=poly2,
        change_type=ChangeType.CONSTRUCTION,
        scene_date="2021-10-15",
        area_m2=1000.0,
    )

    tracks = merge_temporal_polygons([d1, d2])
    assert len(tracks) == 2
    assert tracks[0].trend == "appeared"
    assert tracks[1].trend == "appeared"


def test_merge_temporal_polygons_different_types_do_not_merge() -> None:
    """Overlapping polygons with differing change types do not merge."""
    poly = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])

    d1 = TemporalPolygonDetection(
        detection_id="d1",
        geom=poly,
        change_type=ChangeType.WATER_GAIN,
        scene_date="2021-10-01",
        area_m2=1000.0,
    )
    d2 = TemporalPolygonDetection(
        detection_id="d2",
        geom=poly,
        change_type=ChangeType.CONSTRUCTION,
        scene_date="2021-10-15",
        area_m2=1000.0,
    )

    tracks = merge_temporal_polygons([d1, d2])
    assert len(tracks) == 2
    types = {t.change_type for t in tracks}
    assert types == {ChangeType.WATER_GAIN, ChangeType.CONSTRUCTION}


def test_merge_temporal_polygons_temporal_gap_exceeded() -> None:
    """Overlapping detections separated by > max_gap_days open a new track."""
    poly = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])

    d1 = TemporalPolygonDetection(
        detection_id="d1",
        geom=poly,
        change_type=ChangeType.CONSTRUCTION,
        scene_date="2021-01-01",
        area_m2=1000.0,
    )
    d2 = TemporalPolygonDetection(
        detection_id="d2",
        geom=poly,
        change_type=ChangeType.CONSTRUCTION,
        scene_date="2021-11-01",  # ~304 days gap > 180 max_gap_days
        area_m2=1200.0,
    )

    tracks = merge_temporal_polygons([d1, d2], max_gap_days=180)
    assert len(tracks) == 2


def test_merge_temporal_polygons_contracting_and_stable_trends() -> None:
    """Verify contracting and stable trends."""
    poly = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])

    # Contracting
    d1 = TemporalPolygonDetection("c1", poly, ChangeType.WATER_LOSS, "2022-01-01", 1000.0)
    d2 = TemporalPolygonDetection("c2", poly, ChangeType.WATER_LOSS, "2022-02-01", 800.0)
    tracks = merge_temporal_polygons([d1, d2])
    assert len(tracks) == 1
    assert tracks[0].trend == "contracting"

    # Stable (< 10% change)
    d3 = TemporalPolygonDetection("s1", poly, ChangeType.CLEARANCE, "2022-01-01", 1000.0)
    d4 = TemporalPolygonDetection("s2", poly, ChangeType.CLEARANCE, "2022-02-01", 1040.0)
    stable_tracks = merge_temporal_polygons([d3, d4])
    assert len(stable_tracks) == 1
    assert stable_tracks[0].trend == "stable"


def test_merge_temporal_polygons_empty() -> None:
    """Empty detections list returns empty tracks."""
    assert merge_temporal_polygons([]) == []
