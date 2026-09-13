"""Pure domain temporal polygon merging module.

Implements Task 3.7 per PRD 2 §6, PRD 3 §B8 step 4, and PRD 7 §3.7.
Pure Python module with zero framework/DB imports (enforced by test_purity.py).

Merges independent polygon detections across consecutive temporal scene pairs into
unified, persistent change tracks with lifespans, area growth histories, and trends.

Algorithm (PRD 3 §B8 step 4):
1. Sort all detections chronologically by acquisition date.
2. For each detection d in order:
     find an open change track c where:
       IoU(c.latest_geom, d.geom) >= MERGE_IOU_THRESHOLD (0.30)
       AND c.change_type == d.change_type
       AND (d.scene_date - c.last_seen) <= max_gap_days
     if found:
       append d to c.area_series
       update c.latest_geom, c.last_seen, c.area_m2, c.max_area_m2
     else:
       open a new change track
3. Determine trend: 'expanding', 'contracting', 'stable', 'appeared', 'disappeared'.
"""

from __future__ import annotations

import datetime
import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field

from shapely.geometry import Polygon

from app.domain.constants import MERGE_IOU_THRESHOLD
from app.schemas.common import ChangeType


@dataclass(frozen=True)
class TemporalPolygonDetection:
    """A polygon detection from a specific temporal observation/pair."""

    detection_id: str
    geom: Polygon
    change_type: ChangeType
    scene_date: str  # ISO YYYY-MM-DD
    area_m2: float
    confidence: float = 0.85


@dataclass
class AreaSeriesRecord:
    """Point in an area time series."""

    date: str
    area_m2: float


@dataclass
class MergedChangeTrack:
    """A persistent change entity tracked across multi-temporal scene observations."""

    track_id: str
    change_type: ChangeType
    first_supported: str
    last_seen: str
    area_m2: float
    max_area_m2: float
    latest_geom: Polygon
    area_series: list[AreaSeriesRecord] = field(default_factory=list)
    trend: str = "stable"
    observations_count: int = 1


def _parse_date(date_str: str) -> datetime.date:
    """Parse ISO date string into datetime.date."""
    return datetime.date.fromisoformat(date_str[:10])


def compute_polygon_iou(poly1: Polygon, poly2: Polygon) -> float:
    """Compute planar Intersection-over-Union between two shapely Polygons."""
    if not poly1.is_valid:
        poly1 = poly1.buffer(0)
    if not poly2.is_valid:
        poly2 = poly2.buffer(0)

    if poly1.is_empty or poly2.is_empty:
        return 0.0

    intersection_area = poly1.intersection(poly2).area
    if intersection_area <= 0.0:
        return 0.0

    union_area = poly1.union(poly2).area
    if union_area <= 0.0:
        return 0.0

    return float(intersection_area / union_area)


def _derive_track_trend(area_series: list[AreaSeriesRecord]) -> str:
    """Derive growth trend from multi-temporal area series.

    Returns:
        'appeared': If observed in only 1 time step.
        'expanding': If latest area > initial area by >= 10%.
        'contracting': If latest area < initial area by >= 10%.
        'stable': If latest area is within 10% of initial area.

    """
    if len(area_series) <= 1:
        return "appeared"

    initial_area = area_series[0].area_m2
    latest_area = area_series[-1].area_m2

    if initial_area <= 0.0:
        return "expanding" if latest_area > 0.0 else "stable"

    ratio = latest_area / initial_area
    if ratio >= 1.10:
        return "expanding"
    if ratio <= 0.90:
        return "contracting"
    return "stable"


def merge_temporal_polygons(
    detections: Sequence[TemporalPolygonDetection],
    iou_threshold: float = MERGE_IOU_THRESHOLD,
    max_gap_days: int = 180,
) -> list[MergedChangeTrack]:
    """Merge temporal polygon detections into persistent change tracks.

    Args:
        detections: Sequence of detections across multiple observation dates.
        iou_threshold: Minimum spatial overlap IoU required to associate detections.
        max_gap_days: Maximum elapsed days allowed between consecutive observations.

    Returns:
        List of MergedChangeTrack entities with lifespans, area histories, and trends.

    """
    if not detections:
        return []

    # 1. Sort detections chronologically by acquisition date
    sorted_detections = sorted(detections, key=lambda d: _parse_date(d.scene_date))

    open_tracks: list[MergedChangeTrack] = []

    for d in sorted_detections:
        d_date = _parse_date(d.scene_date)
        best_match: MergedChangeTrack | None = None
        best_iou = 0.0

        for track in open_tracks:
            # Check change_type match
            if track.change_type != d.change_type:
                continue

            # Check temporal proximity (elapsed days <= max_gap_days)
            track_last_date = _parse_date(track.last_seen)
            gap_days = (d_date - track_last_date).days
            if gap_days < 0 or gap_days > max_gap_days:
                continue

            # Check spatial overlap IoU
            iou = compute_polygon_iou(track.latest_geom, d.geom)
            if iou >= iou_threshold and iou > best_iou:
                best_iou = iou
                best_match = track

        if best_match is not None:
            # Associate with existing track
            best_match.area_series.append(
                AreaSeriesRecord(date=d.scene_date[:10], area_m2=d.area_m2)
            )
            best_match.latest_geom = d.geom
            best_match.last_seen = d.scene_date[:10]
            best_match.area_m2 = d.area_m2
            best_match.max_area_m2 = max(best_match.max_area_m2, d.area_m2)
            best_match.observations_count += 1
            best_match.trend = _derive_track_trend(best_match.area_series)
        else:
            # Open new track
            new_track = MergedChangeTrack(
                track_id=str(uuid.uuid4()),
                change_type=d.change_type,
                first_supported=d.scene_date[:10],
                last_seen=d.scene_date[:10],
                area_m2=d.area_m2,
                max_area_m2=d.area_m2,
                latest_geom=d.geom,
                area_series=[AreaSeriesRecord(date=d.scene_date[:10], area_m2=d.area_m2)],
                trend="appeared",
                observations_count=1,
            )
            open_tracks.append(new_track)

    return open_tracks
