"""Mask-to-polygon vectorization, geometric validation, and rasterized IoU consistency checks.

Conforms strictly to SIH26167:
- §11: CV model -> pixel mask -> connected components -> contours -> polygon -> simplification -> geometry validation.
- §12: Robust geometry validation (closed, >= 4 pts, no NaN/Inf, bounds check, non-self-intersecting, non-zero area).
- §13: Mask -> Polygon consistency check (rasterizes polygon back and verifies IoU >= min_iou).
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage  # type: ignore[import-untyped]
from shapely.geometry import Polygon as ShapelyPolygon  # type: ignore[import-untyped]
from shapely.validation import explain_validity  # type: ignore[import-untyped]

try:
    from skimage.measure import approximate_polygon, find_contours  # type: ignore[import-untyped]
except ImportError:
    approximate_polygon = None
    find_contours = None

log = logging.getLogger(__name__)

MIN_IOU_CONSISTENCY: float = 0.65  # Minimum overlap between rasterized polygon and source mask


def validate_polygon_geometry(
    coords: list[list[float]],
    img_width: int,
    img_height: int,
    min_area_px: float = 10.0,
) -> tuple[bool, str | None, ShapelyPolygon | None]:
    """Validate polygon geometry strictly using mathematical principles (§12).

    Returns:
        (is_valid, rejection_reason, shapely_polygon_or_none)
    """
    if len(coords) < 4:
        return False, "insufficient_vertices (must have >= 4 points)", None

    # Check closed ring
    if coords[0] != coords[-1]:
        coords = list(coords)
        coords.append(coords[0])

    # Check for NaN / Infinity and bounds
    for pt in coords:
        x, y = pt[0], pt[1]
        if not (np.isfinite(x) and np.isfinite(y)):
            return False, "coordinate_nan_or_inf", None
        if x < -0.5 or x > img_width + 0.5 or y < -0.5 or y > img_height + 0.5:
            return (
                False,
                f"coordinate_out_of_bounds: ({x}, {y}) outside [0..{img_width}, 0..{img_height}]",
                None,
            )

    try:
        poly = ShapelyPolygon(coords)
    except Exception as exc:
        return False, f"shapely_construction_error: {exc}", None

    if not poly.is_valid:
        return False, f"self_intersecting_or_invalid: {explain_validity(poly)}", None

    if poly.area < min_area_px:
        return False, f"area_below_minimum: {poly.area:.1f}px < {min_area_px}px", None

    return True, None, poly


def compute_mask_polygon_iou(
    poly: ShapelyPolygon,
    source_mask: np.ndarray,
    bbox_slice: tuple[int, int, int, int] | None = None,
) -> float:
    """Rasterize polygon back to binary mask and calculate IoU against source mask (§13).

    Args:
        poly: Shapely Polygon in pixel coordinates.
        source_mask: 2D binary numpy array.
        bbox_slice: Optional (ymin, xmin, ymax, xmax) bounding box for fast localized rasterization.

    Returns:
        IoU float between 0.0 and 1.0.
    """
    h, w = source_mask.shape[:2]

    # Use bounding box to limit rasterization memory and time
    minx, miny, maxx, maxy = poly.bounds
    x0 = max(0, int(np.floor(minx)))
    y0 = max(0, int(np.floor(miny)))
    x1 = min(w, int(np.ceil(maxx)) + 1)
    y1 = min(h, int(np.ceil(maxy)) + 1)

    if x1 <= x0 or y1 <= y0:
        return 0.0

    # Localized rasterization
    local_w = x1 - x0
    local_h = y1 - y0
    raster_img = Image.new("1", (local_w, local_h), 0)
    draw = ImageDraw.Draw(raster_img)

    # Shift coordinates to local origin
    exterior_pts = [(x - x0, y - y0) for x, y in poly.exterior.coords]
    draw.polygon(exterior_pts, outline=1, fill=1)

    # Cut out holes (interiors) if present
    for interior in poly.interiors:
        interior_pts = [(x - x0, y - y0) for x, y in interior.coords]
        draw.polygon(interior_pts, outline=0, fill=0)

    poly_raster = np.array(raster_img, dtype=bool)
    sub_mask = source_mask[y0:y1, x0:x1] > 0

    intersection = np.logical_and(sub_mask, poly_raster).sum()
    union = np.logical_or(sub_mask, poly_raster).sum()

    if union == 0:
        return 0.0

    return float(intersection / union)


def mask_to_validated_polygons(
    binary_mask: np.ndarray,
    img_width: int,
    img_height: int,
    min_pixels: int = 30,
    max_polygons: int = 25,
    min_iou: float = MIN_IOU_CONSISTENCY,
    simplify_tolerance: float = 1.0,
) -> list[dict[str, Any]]:
    """Convert binary mask into validated GeoJSON polygon dictionaries (§11, §12, §13).

    Pipeline:
    1. Binary morphological opening/closing to eliminate isolated single-pixel speckle.
    2. Connected component labeling.
    3. Contour extraction on component masks.
    4. Douglas-Peucker polygon approximation.
    5. Strict geometry validation (bounds, non-self-intersection, area).
    6. Mask-Polygon IoU consistency verification.

    Returns:
        List of polygon dictionaries with geometry, pixel area, and validation metadata.
    """
    if not np.any(binary_mask):
        return []

    # 1. Morphological cleanup: remove single-pixel speckle while preserving bulk bodies
    cleaned = ndimage.binary_opening(binary_mask, structure=np.ones((3, 3)), iterations=1)
    cleaned = ndimage.binary_closing(cleaned, structure=np.ones((3, 3)), iterations=1)

    if not np.any(cleaned):
        return []

    # 2. Connected components
    labeled, num_features = ndimage.label(cleaned)
    if num_features == 0:
        return []

    component_sizes = ndimage.sum(cleaned, labeled, range(1, num_features + 1))
    valid_component_ids = [idx + 1 for idx, sz in enumerate(component_sizes) if sz >= min_pixels]

    # Sort largest components first
    valid_component_ids.sort(key=lambda idx: float(component_sizes[idx - 1]), reverse=True)
    valid_component_ids = valid_component_ids[:max_polygons]

    surviving_polygons: list[dict[str, Any]] = []
    objs = ndimage.find_objects(labeled)

    for comp_id in valid_component_ids:
        sl = objs[comp_id - 1]
        if sl is None:
            continue

        ymin, ymax = max(0, sl[0].start - 2), min(img_height, sl[0].stop + 2)
        xmin, xmax = max(0, sl[1].start - 2), min(img_width, sl[1].stop + 2)
        sub_comp_mask = labeled[ymin:ymax, xmin:xmax] == comp_id

        # Extract contours on localized component bounding box
        raw_contours: list[np.ndarray] = []
        if find_contours is not None:
            sk_cnts = find_contours(sub_comp_mask.astype(float), 0.5)
            for cnt in sk_cnts:
                if len(cnt) >= 3:
                    raw_contours.append(np.column_stack([cnt[:, 1] + xmin, cnt[:, 0] + ymin]))
        else:
            # Fallback: simple perimeter tracing
            ys, xs = np.where(sub_comp_mask)
            min_x, max_x = float(np.min(xs) + xmin), float(np.max(xs) + xmin) + 1
            min_y, max_y = float(np.min(ys) + ymin), float(np.max(ys) + ymin) + 1
            raw_contours.append(
                np.array(
                    [[min_x, min_y], [max_x, min_y], [max_x, max_y], [min_x, max_y], [min_x, min_y]]
                )
            )

        comp_mask = labeled == comp_id

        for contour in raw_contours:
            if len(contour) < 3:
                continue

            # 4. Simplification via Douglas-Peucker (§13: conservative simplification, no forced tiny vertex limits)
            poly_coords = contour
            if approximate_polygon is not None and len(contour) > 8:
                poly_coords = approximate_polygon(contour, tolerance=simplify_tolerance)

            coords_list = [[float(round(pt[0], 2)), float(round(pt[1], 2))] for pt in poly_coords]
            if coords_list and coords_list[0] != coords_list[-1]:
                coords_list.append(coords_list[0])

            # 5. Geometry validation
            is_valid, reason, poly_obj = validate_polygon_geometry(
                coords_list,
                img_width=img_width,
                img_height=img_height,
                min_area_px=float(min_pixels),
            )
            if not is_valid or poly_obj is None:
                log.debug("Rejected invalid polygon geometry: %s", reason)
                continue

            # Update coords_list if polygon was repaired
            validated_coords = [[round(x, 2), round(y, 2)] for x, y in poly_obj.exterior.coords]

            # 6. Mask -> Polygon consistency check (§13)
            iou = compute_mask_polygon_iou(poly_obj, comp_mask)
            if iou < min_iou:
                log.debug("Rejected polygon with low mask overlap IoU=%.3f < %.3f", iou, min_iou)
                continue

            minx, miny, maxx, maxy = poly_obj.bounds
            surviving_polygons.append(
                {
                    "type": "Polygon",
                    "coordinates": [validated_coords],
                    "polygon_px": validated_coords,
                    "area_px": float(round(poly_obj.area, 2)),
                    "bbox_px": [
                        int(np.floor(miny)),
                        int(np.floor(minx)),
                        int(np.ceil(maxy)),
                        int(np.ceil(maxx)),
                    ],
                    "validation": {
                        "geometry_valid": True,
                        "mask_overlap_iou": round(iou, 3),
                        "vertex_count": len(validated_coords),
                        "closed_ring": True,
                        "no_self_intersection": True,
                    },
                }
            )

    surviving_polygons.sort(key=lambda item: item["area_px"], reverse=True)
    return surviving_polygons[:max_polygons]
