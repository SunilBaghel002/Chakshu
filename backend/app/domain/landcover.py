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
    """Classify 2D optical raster into discrete integer class codes per PRD 2 §6 Track 1.

    Returns:
        2D array of class strings: 'water', 'snow', 'vegetation', 'built', 'crop', 'bare', 'unclassified'.
    """
    ndwi = compute_ndwi(green, nir, scale_factor=scale_factor)
    ndvi = compute_ndvi(nir, red, scale_factor=scale_factor)
    ndbi = (
        compute_ndbi(swir, nir, scale_factor=scale_factor)
        if swir is not None
        else np.full(ndvi.shape, -1.0, dtype=np.float32)
    )
    ndsi = (
        compute_ndsi(green, swir, scale_factor=scale_factor)
        if swir is not None
        else np.full(ndvi.shape, -1.0, dtype=np.float32)
    )

    valid = ~np.isnan(ndvi) & ~np.isnan(ndwi)
    shape = ndvi.shape
    classified = np.full(shape, "unclassified", dtype=object)

    # 1. Water: NDWI > 0.15
    is_water = valid & (ndwi > NDWI_WATER_THRESHOLD)
    classified[is_water] = "water"

    # 2. Snow: NDSI > 0.40
    rem = valid & ~is_water
    is_snow = rem & (ndsi > NDSI_SNOW_THRESHOLD)
    classified[is_snow] = "snow"

    # 3. Vegetation: NDVI > 0.40
    rem = rem & ~is_snow
    is_veg = rem & (ndvi > NDVI_VEGETATION_THRESHOLD)
    classified[is_veg] = "vegetation"

    # 4. Built: NDBI > 0.05 and NDVI < 0.25
    rem = rem & ~is_veg
    is_built = rem & (ndbi > NDBI_BUILT_THRESHOLD) & (ndvi < NDVI_BUILT_MAX)
    classified[is_built] = "built"

    # 5. Crop: NDVI in [0.20, 0.40] and NDBI < 0.05
    rem = rem & ~is_built
    is_crop = rem & (ndvi >= NDVI_CROP_MIN) & (ndvi <= NDVI_CROP_MAX) & (ndbi < NDBI_CROP_MAX)
    classified[is_crop] = "crop"

    # 6. Bare: NDVI < 0.20
    rem = rem & ~is_crop
    is_bare = rem & (ndvi < NDVI_BARE_MAX)
    classified[is_bare] = "bare"

    return classified


def vectorize_class_mask(
    mask: np.ndarray[Any, Any],
    min_pixels: int = MIN_CONNECTED_COMPONENTS_PX,
) -> list[dict[str, Any]]:
    """Vectorize a binary mask into GeoJSON polygons using connected components."""
    if not np.any(mask):
        return []

    # Morphological opening with 3x3 kernel
    structure = ndimage.generate_binary_structure(2, 1)
    cleaned = ndimage.binary_opening(mask, structure=structure, iterations=1)

    labeled, num_features = ndimage.label(cleaned)
    if num_features == 0:
        return []

    polygons: list[dict[str, Any]] = []
    for label_idx in range(1, num_features + 1):
        component_mask = (labeled == label_idx)
        px_count = int(np.count_nonzero(component_mask))
        if px_count < min_pixels:
            continue

        ys, xs = np.where(component_mask)
        min_x, max_x = int(np.min(xs)), int(np.max(xs)) + 1
        min_y, max_y = int(np.min(ys)), int(np.max(ys)) + 1

        # Use bounding polygon or simplified patch geometry
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
