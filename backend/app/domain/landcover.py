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
    nir: np.ndarray[Any, Any],
    swir: np.ndarray[Any, Any] | None = None,
    scale_factor: float = 10000.0,
) -> np.ndarray[Any, Any]:
    """Classify 2D optical raster into discrete class codes per PRD 2 §6 Track 1.

    When SWIR is provided, uses standard satellite multispectral indices.
    When SWIR is None (e.g. RGB drone/aerial imagery), uses calibrated RGB optical rules.
    """
    shape = red.shape
    classified = np.full(shape, "unclassified", dtype=object)

    if swir is not None:
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

    # RGB-only calibrated optical decision tree
    r_norm = red.astype(np.float32) / scale_factor
    g_norm = green.astype(np.float32) / scale_factor
    b_norm = blue.astype(np.float32) / scale_factor

    lum = 0.299 * r_norm + 0.587 * g_norm + 0.114 * b_norm
    exg = 2.0 * g_norm - r_norm - b_norm
    eps = 1e-6
    rgb_ndwi = (g_norm - b_norm) / (g_norm + b_norm + eps)

    mean_lum = ndimage.uniform_filter(lum, size=8)
    mean_sq = ndimage.uniform_filter(lum**2, size=8)
    texture = np.sqrt(np.maximum(0.0, mean_sq - mean_lum**2))

    is_snow = (lum > 0.90) & (np.abs(r_norm - g_norm) < 0.04) & (np.abs(g_norm - b_norm) < 0.04)
    nir_est = (g_norm + r_norm) / 2.0
    spec_ndwi = (g_norm - nir_est) / (g_norm + nir_est + eps)
    is_water = ~is_snow & (spec_ndwi > 0.15) & (r_norm < 0.32) & (lum < 0.35)

    is_veg = ~is_snow & ~is_water & (exg > 0.08)
    is_built = ~is_snow & ~is_water & ~is_veg & (
        (lum > 0.45)
        | ((texture > 0.05) & (lum > 0.28))
        | ((np.abs(r_norm - b_norm) < 0.08) & (lum > 0.26))
    )
    is_crop = ~is_snow & ~is_water & ~is_veg & ~is_built & (exg > 0.02) & (texture > 0.03)
    is_bare = ~is_snow & ~is_water & ~is_veg & ~is_built & ~is_crop

    classified[is_snow] = "snow"
    classified[is_water] = "water"
    classified[is_veg] = "vegetation"
    classified[is_built] = "built"
    classified[is_crop] = "crop"
    classified[is_bare] = "bare"

    return classified


def vectorize_class_mask(
    mask: np.ndarray[Any, Any],
    min_pixels: int = MIN_CONNECTED_COMPONENTS_PX,
    is_water: bool = False,
    max_polygons: int | None = None,
) -> list[dict[str, Any]]:
    """Vectorize a binary mask into GeoJSON polygons using connected components."""
    if not np.any(mask):
        return []

    if is_water:
        # Binary closing with 7x7 structure to bridge gaps, then 3x3 opening to remove speckle
        closed = ndimage.binary_closing(mask, structure=np.ones((7, 7)), iterations=2)
        cleaned = ndimage.binary_opening(closed, structure=np.ones((3, 3)), iterations=1)
        effective_min = max(min_pixels, 30)
    else:
        structure = ndimage.generate_binary_structure(2, 1)
        cleaned = ndimage.binary_opening(mask, structure=structure, iterations=1)
        effective_min = min_pixels

    labeled, num_features = ndimage.label(cleaned)
    if num_features == 0:
        return []

    components_list: list[tuple[int, int]] = []
    for idx in range(1, num_features + 1):
        px = int(np.count_nonzero(labeled == idx))
        if px >= effective_min:
            components_list.append((idx, px))

    if is_water:
        components_list.sort(key=lambda item: item[1], reverse=True)
        if max_polygons is not None and len(components_list) > max_polygons:
            components_list = components_list[:max_polygons]

    polygons: list[dict[str, Any]] = []
    for label_idx, px_count in components_list:
        component_mask = (labeled == label_idx)
        ys, xs = np.where(component_mask)
        min_x, max_x = int(np.min(xs)), int(np.max(xs)) + 1
        min_y, max_y = int(np.min(ys)), int(np.max(ys)) + 1

        coords = [
            [
                [float(min_x), float(min_y)],
                [float(max_x), float(min_y)],
                [float(max_x), float(max_y)],
                [float(min_x), float(max_y)],
                [float(min_x), float(min_y)],
            ]
        ]
        polygons.append(
            {
                "type": "Polygon",
                "coordinates": coords,
                "area_px": float(px_count),
                "bbox_px": [float(min_x), float(min_y), float(max_x), float(max_y)],
            }
        )

    return polygons


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
