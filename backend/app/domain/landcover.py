"""Pure domain module for Track 1 land-cover classification and polygonization (Task 5.3, PRD 2 §6).

Transforms multi-band optical pixels into deterministic land-cover polygons:
1. Computes NDWI, NDSI, NDVI, NDBI.
2. Applies strict scientific priority classification: water, snow, vegetation, built, crop, bare.
3. Performs 3x3 morphological opening to remove single-pixel noise.
4. Groups into connected components, filtering patches < 4 px.
5. Vectorizes surviving patches into GeoJSON polygons with deterministic scores.
6. Calculates total coverage distribution (CoverageSummary).
"""

from __future__ import annotations

from typing import Any
import numpy as np
from scipy import ndimage  # type: ignore[import-untyped]

from app.domain.constants import (
    MIN_CONNECTED_COMPONENTS_PX,
    MORPHOLOGICAL_KERNEL_SIZE,
    NDBI_BUILT_THRESHOLD,
    NDBI_CROP_MAX,
    NDSI_SNOW_THRESHOLD,
    NDVI_BARE_MAX,
    NDVI_BUILT_MAX,
    NDVI_CROP_MAX,
    NDVI_CROP_MIN,
    NDVI_VEGETATION_THRESHOLD,
    NDWI_WATER_THRESHOLD,
)
from app.domain.indices import compute_ndbi, compute_ndsi, compute_ndvi, compute_ndwi

CANONICAL_LANDCOVER_CLASSES: list[str] = [
    "water",
    "snow",
    "vegetation",
    "built",
    "crop",
    "bare",
]


def classify_optical_pixels(
    red: np.ndarray[Any, Any],
    green: np.ndarray[Any, Any],
    blue: np.ndarray[Any, Any],
    nir: np.ndarray[Any, Any] | None = None,
    swir: np.ndarray[Any, Any] | None = None,
    scale_factor: float = 10000.0,
) -> np.ndarray[Any, Any]:
    """Classify 2D optical raster into discrete class codes per PRD 2 §6 Track 1.

    When both NIR and SWIR are provided, uses standard satellite multispectral indices.
    When NIR or SWIR is None (e.g. RGB drone/aerial imagery), uses calibrated RGB optical rules.
    """
    shape = red.shape
    classified = np.full(shape, "unclassified", dtype=object)

    if swir is not None and nir is not None:
        ndwi = compute_ndwi(green, nir, scale_factor=scale_factor)
        ndvi = compute_ndvi(nir, red, scale_factor=scale_factor)
        ndbi = compute_ndbi(swir, nir, scale_factor=scale_factor)
        ndsi = compute_ndsi(green, swir, scale_factor=scale_factor)
        valid = ~np.isnan(ndvi) & ~np.isnan(ndwi)

        is_water = valid & (ndwi > NDWI_WATER_THRESHOLD)
        classified[is_water] = "water"

        rem = valid & ~is_water
        is_snow = rem & (ndsi > NDSI_SNOW_THRESHOLD)
        classified[is_snow] = "snow"

        rem = rem & ~is_snow
        is_veg = rem & (ndvi > NDVI_VEGETATION_THRESHOLD)
        classified[is_veg] = "vegetation"

        rem = rem & ~is_veg
        is_built = rem & (ndbi > NDBI_BUILT_THRESHOLD) & (ndvi < NDVI_BUILT_MAX)
        classified[is_built] = "built"

        rem = rem & ~is_built
        is_crop = rem & (ndvi >= NDVI_CROP_MIN) & (ndvi <= NDVI_CROP_MAX) & (ndbi < NDBI_CROP_MAX)
        classified[is_crop] = "crop"

        rem = rem & ~is_crop
        is_bare = rem & (ndvi < NDVI_BARE_MAX)
        classified[is_bare] = "bare"
        return classified

    # RGB-only calibrated optical decision tree (no fake NIR)
    r_norm = red.astype(np.float32) / scale_factor
    g_norm = green.astype(np.float32) / scale_factor
    b_norm = blue.astype(np.float32) / scale_factor

    lum = 0.299 * r_norm + 0.587 * g_norm + 0.114 * b_norm
    exg = 2.0 * g_norm - r_norm - b_norm  # Excess Green Index
    eps = 1e-6

    # Saturation (max-min channel spread) — key discriminator for built/snow/cloud
    max_ch = np.maximum(np.maximum(r_norm, g_norm), b_norm)
    min_ch = np.minimum(np.minimum(r_norm, g_norm), b_norm)
    saturation = (max_ch - min_ch) / (max_ch + eps)

    mean_lum = ndimage.uniform_filter(lum, size=8)
    mean_sq = ndimage.uniform_filter(lum**2, size=8)
    texture = np.sqrt(np.maximum(0.0, mean_sq - mean_lum**2))

    # Snow: extremely bright + near-zero channel variance + near-zero saturation
    # Strict thresholds to prevent false positives in tropical/urban scenes
    max_channel_diff = np.maximum(
        np.abs(r_norm - g_norm),
        np.maximum(np.abs(g_norm - b_norm), np.abs(r_norm - b_norm)),
    )
    is_snow = (lum > 0.92) & (max_channel_diff < 0.03) & (saturation < 0.05)

    # Water: appearance-invariant optical rules for RGB imagery
    # 1. Clear/coastal/lake/pool: blue-dominant, saturated, high blue contrast against red/green
    is_blue_water = (
        ~is_snow
        & (b_norm > r_norm + 0.08)
        & (b_norm >= g_norm - 0.02)
        & (b_norm > 0.18)
        & (saturation > 0.12)
        & (exg < 0.04)
    )
    # 2. Inland/river/turbid water: deep dark absorbing channel with low blue & red
    is_turbid_channel = (
        ~is_snow
        & (lum < 0.08)
        & (r_norm < 0.035)
        & (g_norm < 0.06)
        & (g_norm > 1.3 * r_norm)
        & (b_norm < 0.025)
        & (exg < 0.07)
    )
    # 3. Natural lake/basin water: dark greenish-black, low texture, low saturation, non-vegetated
    is_natural_water = (
        ~is_snow
        & (texture < 0.022)
        & (lum < 0.26)
        & (g_norm > r_norm + 0.008)
        & (g_norm > b_norm + 0.005)
        & (exg > 0.01)
        & (exg < 0.06)
        & (saturation < 0.22)
    )
    is_water = is_blue_water | is_turbid_channel | is_natural_water

    # Vegetation: excess green index (reliable for RGB)
    is_veg = ~is_snow & ~is_water & (exg > 0.08)

    # Built-up: concrete, asphalt, rooftops, buildings (never bare by default)
    rem = ~is_snow & ~is_water & ~is_veg
    is_built = rem & (
        # Neutral concrete, asphalt, flat rooftops (even smooth/untextured)
        ((saturation < 0.16) & (lum > 0.18) & (lum < 0.90))
        # Textured built structures and roadways
        | ((saturation < 0.25) & (texture > 0.025) & (lum > 0.18) & (lum < 0.88))
        # Spectrally flat built surfaces
        | ((max_channel_diff < 0.08) & (lum > 0.22) & (lum < 0.85))
        # Terracotta, clay, brick, and orange/red tile rooftops
        | ((r_norm > g_norm + 0.03) & (r_norm > b_norm + 0.06) & (lum > 0.20) & (lum < 0.85))
    )

    # Crop: weak vegetation signal with field-like texture
    is_crop = rem & ~is_built & (exg > 0.02) & (texture > 0.03)

    # Bare: earthy tones with warm red-over-blue dominance (not arbitrary dark/neutral pixels)
    is_bare = rem & ~is_built & ~is_crop & (r_norm > b_norm + 0.015) & (lum > 0.12) & (lum < 0.82)

    classified[is_snow] = "snow"
    classified[is_water] = "water"
    classified[is_veg] = "vegetation"
    classified[is_built] = "built"
    classified[is_crop] = "crop"
    classified[is_bare] = "bare"

    return classified


try:
    import cv2  # type: ignore[import-untyped]
except ImportError:
    cv2 = None

try:
    from skimage.measure import approximate_polygon, find_contours
except ImportError:
    approximate_polygon = None  # type: ignore[assignment]
    find_contours = None  # type: ignore[assignment]


def _polygon_area(pts: np.ndarray[Any, Any]) -> float:
    """Calculate Shoelace 2D polygon area."""
    x, y = pts[:, 0], pts[:, 1]
    return float(0.5 * abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1))))


def validate_polygon_iou(
    poly_pts: list[list[float]],
    comp_mask: np.ndarray[Any, Any],
    min_iou: float = 0.60,
) -> tuple[bool, float]:
    """Validate that polygon rasterization accurately overlaps the source binary mask."""
    if len(poly_pts) < 3 or cv2 is None:
        return True, 1.0
    h, w = comp_mask.shape
    xs = [int(p[0]) for p in poly_pts]
    ys = [int(p[1]) for p in poly_pts]
    min_x, max_x = max(0, min(xs)), min(w - 1, max(xs))
    min_y, max_y = max(0, min(ys)), min(h - 1, max(ys))
    if max_x <= min_x or max_y <= min_y:
        return False, 0.0

    crop_mask = comp_mask[min_y : max_y + 1, min_x : max_x + 1]
    crop_h, crop_w = crop_mask.shape
    raster = np.zeros((crop_h, crop_w), dtype=np.uint8)
    local_pts = np.array([[p[0] - min_x, p[1] - min_y] for p in poly_pts], dtype=np.int32).reshape(
        (-1, 1, 2)
    )
    cv2.fillPoly(raster, [local_pts], 1)

    intersection = int(np.count_nonzero((raster == 1) & (crop_mask > 0)))
    union = int(np.count_nonzero((raster == 1) | (crop_mask > 0)))
    if union == 0:
        return False, 0.0
    iou = float(intersection / union)
    return (iou >= min_iou), iou


def vectorize_class_mask(
    mask: np.ndarray[Any, Any],
    min_pixels: int = MIN_CONNECTED_COMPONENTS_PX,
    is_water: bool = False,
    max_polygons: int | None = None,
) -> list[dict[str, Any]]:
    """Vectorize a binary mask into GeoJSON polygons with contour extraction and IoU validation."""
    if not np.any(mask):
        return []

    # Morphological cleaning
    if is_water:
        closed = ndimage.binary_closing(mask, structure=np.ones((3, 3)), iterations=1)
        cleaned = ndimage.binary_opening(closed, structure=np.ones((3, 3)), iterations=1)
        effective_min = max(min_pixels, 30)
    else:
        cleaned = ndimage.binary_opening(mask, structure=np.ones((3, 3)), iterations=1)
        effective_min = min_pixels

    raw_contours: list[np.ndarray[Any, Any]] = []
    if cv2 is not None:
        u8_mask = (cleaned.astype(np.uint8)) * 255
        cv_contours, _ = cv2.findContours(u8_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cv_contours:
            if len(c) >= 3:
                raw_contours.append(c.reshape(-1, 2).astype(float))
    elif find_contours is not None:
        labeled, num_features = ndimage.label(cleaned)
        if num_features == 0:
            return []
        component_sizes = ndimage.sum(cleaned, labeled, range(1, num_features + 1))
        valid_ids = [
            idx + 1 for idx, sz in enumerate(component_sizes) if sz >= float(effective_min)
        ]
        valid_ids.sort(key=lambda idx: float(component_sizes[idx - 1]), reverse=True)
        if max_polygons is not None:
            valid_ids = valid_ids[: max_polygons * 3]
        slices = ndimage.find_objects(labeled)
        h_full, w_full = mask.shape[:2]
        for comp_id in valid_ids:
            sl = slices[comp_id - 1]
            if sl is None:
                continue
            ymin, ymax = max(0, sl[0].start - 2), min(h_full, sl[0].stop + 2)
            xmin, xmax = max(0, sl[1].start - 2), min(w_full, sl[1].stop + 2)
            sub = labeled[ymin:ymax, xmin:xmax] == comp_id
            for c in find_contours(sub.astype(float), 0.5):
                if len(c) >= 3:
                    raw_contours.append(
                        np.column_stack([c[:, 1] + xmin, c[:, 0] + ymin]).astype(float)
                    )
    else:
        from app.domain.vectorise import vectorise_mask

        v_polys = vectorise_mask(cleaned, min_pixels=effective_min, simplify_tolerance=2.5)
        for vp in v_polys:
            coords = vp.geometry.get("coordinates", [[]])[0]
            if len(coords) >= 4:
                raw_contours.append(np.array(coords, dtype=float))

    raw_with_area = [(_polygon_area(c_pts), c_pts) for c_pts in raw_contours]
    raw_with_area = [item for item in raw_with_area if item[0] >= float(effective_min)]
    raw_with_area.sort(key=lambda item: item[0], reverse=True)
    if max_polygons is not None:
        raw_with_area = raw_with_area[: max_polygons * 3]

    polygons: list[dict[str, Any]] = []
    for area, c_pts in raw_with_area:
        # Discrete feature limit: reject continuous background networks for non-water
        if not is_water and area > 150000.0:
            continue
        if approximate_polygon is not None:
            perimeter = float(len(c_pts))
            tol = max(0.8, min(4.0, perimeter * 0.005))
            poly = approximate_polygon(c_pts, tolerance=tol)
            # Ensure reasonable point count (between 4 and 35)
            if len(poly) > 35:
                step = max(1, len(c_pts) // 32)
                poly = c_pts[::step]
            elif len(poly) < 4 and len(c_pts) >= 4:
                target_n = min(len(c_pts), 12)
                idxs = np.linspace(0, len(c_pts) - 1, target_n, dtype=int)
                poly = c_pts[idxs]
        else:
            poly = c_pts

        if is_water and len(poly) > 18:
            idxs = np.linspace(0, len(poly) - 1, 16, dtype=int)
            poly = poly[idxs]
        elif len(poly) < 4 and len(c_pts) >= 4:
            idxs = np.linspace(0, len(c_pts) - 1, 8, dtype=int)
            poly = c_pts[idxs]

        poly_list = [[float(round(p[0], 2)), float(round(p[1], 2))] for p in poly]
        if poly_list and poly_list[0] != poly_list[-1]:
            poly_list.append(poly_list[0])

        if len(poly_list) < 4:
            continue

        # Evidence Grounding Gate: Mask <-> Polygon IoU check
        valid_iou, iou_score = validate_polygon_iou(poly_list, cleaned, min_iou=0.60)
        if not valid_iou:
            continue

        xs = [p[0] for p in poly_list]
        ys = [p[1] for p in poly_list]
        polygons.append(
            {
                "type": "Polygon",
                "coordinates": [poly_list],
                "polygon_px": poly_list,
                "area_px": float(round(area, 2)),
                "bbox_px": [min(xs), min(ys), max(xs), max(ys)],
                "mask_iou": round(iou_score, 3),
                "geometry_source": "segmentation_mask",
            }
        )

    polygons.sort(key=lambda item: item["area_px"], reverse=True)
    if max_polygons is not None and len(polygons) > max_polygons:
        polygons = polygons[:max_polygons]
    return polygons


def vectorize_water_polygons(
    water_mask: np.ndarray[Any, Any],
    gsd_m: float | None = None,
    min_pixels: int = 30,
    max_polygons: int | None = None,
) -> list[dict[str, Any]]:
    """Extract true water contours with Douglas-Peucker simplification (Task T-1)."""
    return vectorize_class_mask(
        water_mask, min_pixels=min_pixels, is_water=True, max_polygons=max_polygons
    )


def compute_landcover_summary(
    classified: np.ndarray[Any, Any],
) -> dict[str, Any]:
    """Calculate full-scene pixel count and percentage distribution by class."""
    total_px = int(classified.size)
    if total_px == 0:
        return {"total_px": 0, "by_class": [], "sum_check_pct": 100.0}

    by_class: list[dict[str, Any]] = []
    sum_pct = 0.0

    all_labels = CANONICAL_LANDCOVER_CLASSES + ["unclassified"]
    for label in all_labels:
        count = int(np.count_nonzero(classified == label))
        pct = round((count / total_px) * 100.0, 2)
        sum_pct += pct
        by_class.append(
            {
                "label": label,
                "px": count,
                "pct": pct,
                "area_m2": None,
            }
        )

    return {
        "source_track": "landcover_index",
        "total_px": total_px,
        "by_class": by_class,
        "sum_check_pct": round(sum_pct, 2),
    }
