"""Bounding-box normalization, validation, and label aliasing for Chakshu.

Pure functions only (no I/O, no network, no framework).
Implements defensive bounding-box coordinate decoding per PRD 4 §7
and canonical label alias mapping per PRD 3 §B3.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

REASON_INVALID_LENGTH: str = "invalid_length"
REASON_NON_FINITE: str = "non_finite_values"
REASON_OUT_OF_RANGE: str = "coordinates_out_of_range"
REASON_DEGENERATE: str = "degenerate_zero_or_negative_area"
REASON_CLAMP_TOO_LARGE: str = "box_significantly_outside_image"
REASON_TOO_SMALL: str = "area_below_minimum_threshold"
REASON_ASPECT_RATIO: str = "aspect_ratio_out_of_bounds"


@dataclass(frozen=True)
class PixelBox:
    """Decoded bounding box in pixel space [x1, y1, x2, y2] with origin top-left."""

    x1: float
    y1: float
    x2: float
    y2: float
    width: float
    height: float
    area_px: float
    order_used: str

    @property
    def coords_list(self) -> list[float]:
        """Return [x1, y1, x2, y2]."""
        return [self.x1, self.y1, self.x2, self.y2]

    def to_geojson_polygon(self) -> dict[str, object]:
        """Convert bounding box to GeoJSON Polygon representation."""
        return {
            "type": "Polygon",
            "coordinates": [
                [
                    [self.x1, self.y1],
                    [self.x2, self.y1],
                    [self.x2, self.y2],
                    [self.x1, self.y2],
                    [self.x1, self.y1],
                ]
            ],
        }


@dataclass(frozen=True)
class BboxReject:
    """Typed rejection explaining why a candidate box was discarded."""

    reason: str
    raw: list[float]
    detail: str


# Canonical label alias table per PRD 3 §B3
CANONICAL_ALIASES: dict[str, str] = {
    # Building
    "house": "building",
    "structure": "building",
    "residential building": "building",
    "commercial building": "building",
    "edifice": "building",
    "building": "building",
    # Building Cluster
    "buildings": "building_cluster",
    "urban area": "building_cluster",
    "settlement": "building_cluster",
    "built-up area": "building_cluster",
    "town": "building_cluster",
    "building_cluster": "building_cluster",
    # Vehicle
    "car": "vehicle",
    "truck": "vehicle",
    "bus": "vehicle",
    "van": "vehicle",
    "automobile": "vehicle",
    "vehicle": "vehicle",
    # Aircraft
    "airplane": "aircraft",
    "plane": "aircraft",
    "jet": "aircraft",
    "airliner": "aircraft",
    "aircraft": "aircraft",
    # Ship
    "boat": "ship",
    "vessel": "ship",
    "barge": "ship",
    "ferry": "ship",
    "ship": "ship",
    # Large Ship
    "large vessel": "ship_large",
    "cargo ship": "ship_large",
    "container ship": "ship_large",
    "ship_large": "ship_large",
    # Storage Tank
    "oil tank": "storage_tank",
    "water tank": "storage_tank",
    "fuel tank": "storage_tank",
    "silo": "storage_tank",
    "storage_tank": "storage_tank",
    # Swimming Pool
    "pool": "swimming_pool",
    "swimming_pool": "swimming_pool",
    # Tower
    "pylon": "tower",
    "antenna": "tower",
    "mast": "tower",
    "communications tower": "tower",
    "minaret": "tower",
    "tower": "tower",
    # Container
    "shipping container": "container",
    "container stack": "container",
    "container": "container",
    # Road
    "highway": "road",
    "street": "road",
    "runway": "road",
    "taxiway": "road",
    "path": "road",
    "road": "road",
}


def normalize_label(raw_label: str) -> str | None:
    """Map a raw model label to its canonical ObjectClass if accepted."""
    cleaned = raw_label.strip().lower()
    return CANONICAL_ALIASES.get(cleaned)


def calculate_iou(box_a: PixelBox, box_b: PixelBox) -> float:
    """Calculate Intersection-over-Union (IoU) between two pixel boxes."""
    x_left = max(box_a.x1, box_b.x1)
    y_top = max(box_a.y1, box_b.y1)
    x_right = min(box_a.x2, box_b.x2)
    y_bottom = min(box_a.y2, box_b.y2)

    if x_right <= x_left or y_bottom <= y_top:
        return 0.0

    intersection_area = (x_right - x_left) * (y_bottom - y_top)
    union_area = box_a.area_px + box_b.area_px - intersection_area
    if union_area <= 0:
        return 0.0
    return intersection_area / union_area


def normalise_bbox(
    raw: list[float],
    img_w: int,
    img_h: int,
    bbox_order: str = "yxyx",
) -> PixelBox | BboxReject:
    """Convert a model-returned bbox to pixel coordinates [x1, y1, x2, y2].

    Follows the 6-step protocol defined in PRD 4 §7.
    """
    # 1. Validate length == 4 and all values finite
    if len(raw) != 4:
        return BboxReject(
            reason=REASON_INVALID_LENGTH,
            raw=raw,
            detail=f"Expected 4 values, got {len(raw)}",
        )

    for val in raw:
        if not math.isfinite(val):
            return BboxReject(
                reason=REASON_NON_FINITE,
                raw=raw,
                detail="Coordinates contain NaN or infinite value",
            )

    # 2. Detect the normalisation scale: 0-1 vs 0-1000
    max_val = max(raw)
    min_val = min(raw)
    if min_val < -0.05:
        return BboxReject(
            reason=REASON_OUT_OF_RANGE,
            raw=raw,
            detail=f"Coordinate value {min_val} is negative",
        )

    scale: float
    if max_val <= 1.05:
        scale = 1.0
    elif max_val <= 1050.0:
        scale = 1000.0
    else:
        return BboxReject(
            reason=REASON_OUT_OF_RANGE,
            raw=raw,
            detail=f"Max coordinate {max_val} exceeds 1000 normalisation scale",
        )

    # 3 & 4. Axis order detection
    def parse_with_order(order: str) -> tuple[float, float, float, float]:
        if order == "yxyx":
            ymin, xmin, ymax, xmax = raw
        else:  # xyxy
            xmin, ymin, xmax, ymax = raw
        # Denormalise against width / height
        px_x1 = (xmin / scale) * img_w
        px_y1 = (ymin / scale) * img_h
        px_x2 = (xmax / scale) * img_w
        px_y2 = (ymax / scale) * img_h
        return px_x1, px_y1, px_x2, px_y2

    x1, y1, x2, y2 = parse_with_order(bbox_order)
    order_used = bbox_order

    # If coordinates are inverted (e.g., ymax < ymin), normalize min and max
    if x2 < x1:
        x1, x2 = x2, x1
    if y2 < y1:
        y1, y2 = y2, y1

    if x2 <= x1 or y2 <= y1:
        return BboxReject(
            reason=REASON_DEGENERATE,
            raw=raw,
            detail="Box degenerate: zero width or height",
        )

    unclamped_area = (x2 - x1) * (y2 - y1)

    # 5. Clamp to [0, img_w] / [0, img_h]
    clamped_x1 = max(0.0, min(float(img_w), x1))
    clamped_y1 = max(0.0, min(float(img_h), y1))
    clamped_x2 = max(0.0, min(float(img_w), x2))
    clamped_y2 = max(0.0, min(float(img_h), y2))

    clamped_area = max(0.0, (clamped_x2 - clamped_x1) * (clamped_y2 - clamped_y1))

    # 6. Reject if clamping changed the box by more than 2% of its area
    area_delta = abs(unclamped_area - clamped_area)
    if unclamped_area > 0 and (area_delta / unclamped_area) > 0.02:
        return BboxReject(
            reason=REASON_CLAMP_TOO_LARGE,
            raw=raw,
            detail=f"Box exceeds image bounds by {area_delta / unclamped_area:.1%}",
        )

    width = clamped_x2 - clamped_x1
    height = clamped_y2 - clamped_y1

    return PixelBox(
        x1=clamped_x1,
        y1=clamped_y1,
        x2=clamped_x2,
        y2=clamped_y2,
        width=width,
        height=height,
        area_px=clamped_area,
        order_used=order_used,
    )


def apply_class_nms(
    proposals: list[tuple[PixelBox, float, str, str, str]],
    iou_threshold: float = 0.50,
) -> tuple[list[tuple[PixelBox, float, str, str, str]], list[tuple[str, str, str]]]:
    """Apply class-aware non-maximum suppression across proposals.

    Args:
        proposals: List of (box, score, canonical_label, raw_label, reason).
        iou_threshold: IoU overlap threshold above which candidate is suppressed.

    Returns:
        Tuple of (surviving_proposals, list of (raw_label, reason, detail) for suppressed).
    """
    survivors: list[tuple[PixelBox, float, str, str, str]] = []
    rejections: list[tuple[str, str, str]] = []

    by_class: dict[str, list[tuple[PixelBox, float, str, str, str]]] = {}
    for prop in proposals:
        by_class.setdefault(prop[2], []).append(prop)

    for _, class_props in by_class.items():
        class_props.sort(key=lambda item: item[1], reverse=True)
        kept: list[tuple[PixelBox, float, str, str, str]] = []

        for candidate in class_props:
            cand_box = candidate[0]
            suppressed = False
            for active in kept:
                iou = calculate_iou(cand_box, active[0])
                if iou > iou_threshold:
                    suppressed = True
                    rejections.append(
                        (
                            candidate[3],
                            "nms_duplicate",
                            f"Suppressed by box with score {active[1]:.2f} (IoU={iou:.2f})",
                        )
                    )
                    break
            if not suppressed:
                kept.append(candidate)

        survivors.extend(kept)

    return survivors, rejections
