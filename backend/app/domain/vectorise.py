"""Pure domain module for raster mask vectorization to GeoJSON polygons (Task 2.2, PRD 3 §A7).

Converts 2D boolean or labeled raster masks into valid GeoJSON Polygons:
1. Groups contiguous pixels into connected components using 8-connectivity.
2. Constructs pixel-level geometries and performs topological union via Shapely.
3. Affine-transforms pixel space (col, row) into geographic WGS84 (lon, lat) space.
4. Preserves exterior boundaries and internal holes per GeoJSON RFC 7946.

Enforces:
- Pure domain layer (no DB, network, or framework imports).
- Deterministic geometric output.
- File size under 400 lines (PRD 5 §5).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from scipy import ndimage  # type: ignore[import-untyped]
from shapely.geometry import Polygon, box, polygon  # type: ignore[import-untyped]
from shapely.ops import unary_union  # type: ignore[import-untyped]

try:
    from app.domain.constants import MIN_CONNECTED_COMPONENTS_PX
except ImportError:
    from .constants import MIN_CONNECTED_COMPONENTS_PX


@dataclass(frozen=True)
class VectorizedPolygon:
    """A vector polygon extracted from a raster mask."""

    geometry: dict[str, Any]
    bbox_4326: list[float]
    bbox_px: list[float]
    area_px: float
    pixel_indices: tuple[np.ndarray[Any, Any], np.ndarray[Any, Any]]


def _transform_ring(
    coords: list[tuple[float, float]] | np.ndarray[Any, Any],
    bounds_4326: list[float] | None,
    width_px: int,
    height_px: int,
) -> list[list[float]]:
    """Transform a linear ring of coordinates from pixel space to WGS84 [lon, lat]."""
    if bounds_4326 is None:
        # Return pixel coordinates as [x, y]
        return [[float(x), float(y)] for x, y in coords]

    min_lon, min_lat, max_lon, max_lat = bounds_4326
    lon_scale = (max_lon - min_lon) / float(width_px)
    lat_scale = (max_lat - min_lat) / float(height_px)

    transformed: list[list[float]] = []
    for x, y in coords:
        # col x -> longitude (west to east)
        lon = min_lon + float(x) * lon_scale
        # row y -> latitude (top/north to bottom/south)
        lat = max_lat - float(y) * lat_scale
        transformed.append([round(lon, 7), round(lat, 7)])

    # Ensure ring is explicitly closed
    if transformed and (
        transformed[0][0] != transformed[-1][0] or transformed[0][1] != transformed[-1][1]
    ):
        transformed.append(list(transformed[0]))

    return transformed


def _shapely_to_geojson_rings(
    poly: Polygon,
    bounds_4326: list[float] | None,
    width_px: int,
    height_px: int,
) -> list[list[list[float]]]:
    """Convert a Shapely Polygon into GeoJSON coordinates with coordinate projection."""
    # Ensure standard orientation (exterior CCW, interior CW)
    oriented: Polygon = polygon.orient(poly, sign=1.0)

    # Exterior ring
    exterior_coords = list(oriented.exterior.coords)
    rings: list[list[list[float]]] = [
        _transform_ring(exterior_coords, bounds_4326, width_px, height_px)
    ]

    # Interior rings (holes)
    for interior in oriented.interiors:
        interior_coords = list(interior.coords)
        rings.append(_transform_ring(interior_coords, bounds_4326, width_px, height_px))

    return rings


def vectorise_mask(
    mask: np.ndarray[Any, Any],
    bounds_4326: list[float] | None = None,
    min_pixels: int = MIN_CONNECTED_COMPONENTS_PX,
    simplify_tolerance: float | None = None,
) -> list[VectorizedPolygon]:
    """Vectorize a binary or integer labeled mask into GeoJSON polygons (Task 2.2).

    Args:
        mask: 2D numpy array of shape (H, W). Can be bool or int.
        bounds_4326: [min_lon, min_lat, max_lon, max_lat] bounding box.
        min_pixels: Minimum pixel area threshold to keep.
        simplify_tolerance: Optional Douglas-Peucker simplification tolerance.

    Returns:
        List of VectorizedPolygon objects.

    """
    if not np.any(mask):
        return []

    height_px, width_px = mask.shape[:2]

    # If mask is boolean, label connected components
    if mask.dtype == bool:
        structure = ndimage.generate_binary_structure(2, 2)
        labeled, num_features = ndimage.label(mask, structure=structure)
    else:
        labeled = mask
        num_features = int(np.max(labeled))

    if num_features == 0:
        return []

    results: list[VectorizedPolygon] = []

    for label_id in range(1, num_features + 1):
        rows, cols = np.where(labeled == label_id)
        pixel_count = len(rows)
        if pixel_count < min_pixels:
            continue

        # Pixel bounding box [min_x, min_y, max_x, max_y]
        min_c, max_c = int(np.min(cols)), int(np.max(cols)) + 1
        min_r, max_r = int(np.min(rows)), int(np.max(rows)) + 1
        bbox_px = [float(min_c), float(min_r), float(max_c), float(max_r)]

        # Construct horizontal span boxes and merge them topologically
        boxes = []
        for r in np.unique(rows):
            r_cols = np.sort(cols[rows == r])
            diffs = np.diff(r_cols)
            splits = np.where(diffs > 1)[0] + 1
            for span in np.split(r_cols, splits):
                if len(span) > 0:
                    boxes.append(box(float(span[0]), float(r), float(span[-1] + 1), float(r + 1)))
        merged_geom = unary_union(boxes)

        if merged_geom.is_empty:
            continue

        if simplify_tolerance is not None and simplify_tolerance > 0.0:
            merged_geom = merged_geom.simplify(simplify_tolerance, preserve_topology=True)

        # Handle Polygon or MultiPolygon components
        polygons: list[Polygon] = (
            list(merged_geom.geoms) if hasattr(merged_geom, "geoms") else [merged_geom]
        )

        for poly_geom in polygons:
            if poly_geom.is_empty or poly_geom.area < 1e-4:
                continue

            rings = _shapely_to_geojson_rings(
                poly_geom, bounds_4326, width_px=width_px, height_px=height_px
            )
            geojson_poly = {
                "type": "Polygon",
                "coordinates": rings,
            }

            # Geographic bounding box
            if bounds_4326 is not None:
                all_lons = [pt[0] for ring in rings for pt in ring]
                all_lats = [pt[1] for ring in rings for pt in ring]
                bbox_4326 = [
                    round(min(all_lons), 7),
                    round(min(all_lats), 7),
                    round(max(all_lons), 7),
                    round(max(all_lats), 7),
                ]
            else:
                bbox_4326 = [float(min_c), float(min_r), float(max_c), float(max_r)]

            results.append(
                VectorizedPolygon(
                    geometry=geojson_poly,
                    bbox_4326=bbox_4326,
                    bbox_px=bbox_px,
                    area_px=float(pixel_count),
                    pixel_indices=(rows, cols),
                )
            )

    return results
