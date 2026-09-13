"""Pure domain module for classical change detection (Task 2.1, PRD 3 §A7, PRD 7).

Orchestrates:
1. Δindex Change Difference Analysis (CDA) / Change Vector Analysis (CVA).
2. Dynamic Otsu thresholding computed per tile/scene pair.
3. 3x3 morphological opening to suppress isolated pixel noise.
4. Connected components grouping with minimum area filtering (>= 4 px).

Enforces:
- Pure domain layer (no DB, network, or framework imports).
- Vectorized numpy operations with strict NaN and nodata masking.
- File size under 400 lines (PRD 5 §5).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from scipy import ndimage  # type: ignore[import-untyped]

try:
    from app.domain.constants import (
        MIN_CONNECTED_COMPONENTS_PX,
        MORPHOLOGICAL_KERNEL_SIZE,
    )
except ImportError:
    from .constants import (
        MIN_CONNECTED_COMPONENTS_PX,
        MORPHOLOGICAL_KERNEL_SIZE,
    )


@dataclass(frozen=True)
class ClassicalChangeResult:
    """Output bundle of the classical change detection pipeline."""

    change_mask: np.ndarray[Any, Any]
    otsu_threshold: float
    magnitude: np.ndarray[Any, Any]
    d_ndvi: np.ndarray[Any, Any]
    d_ndbi: np.ndarray[Any, Any]
    d_ndwi: np.ndarray[Any, Any]
    labeled_mask: np.ndarray[Any, Any]
    component_count: int
    component_sizes: dict[int, int]


def compute_index_cda(
    ndvi_before: np.ndarray[Any, Any],
    ndvi_after: np.ndarray[Any, Any],
    ndbi_before: np.ndarray[Any, Any],
    ndbi_after: np.ndarray[Any, Any],
    ndwi_before: np.ndarray[Any, Any],
    ndwi_after: np.ndarray[Any, Any],
) -> tuple[
    np.ndarray[Any, Any],
    np.ndarray[Any, Any],
    np.ndarray[Any, Any],
    np.ndarray[Any, Any],
]:
    """Compute index differences and Euclidean change vector magnitude.

    Returns:
        (magnitude, d_ndvi, d_ndbi, d_ndwi)

    """
    d_ndvi = np.where(
        np.isnan(ndvi_before) | np.isnan(ndvi_after),
        np.nan,
        ndvi_after - ndvi_before,
    ).astype(np.float32)

    d_ndbi = np.where(
        np.isnan(ndbi_before) | np.isnan(ndbi_after),
        np.nan,
        ndbi_after - ndbi_before,
    ).astype(np.float32)

    d_ndwi = np.where(
        np.isnan(ndwi_before) | np.isnan(ndwi_after),
        np.nan,
        ndwi_after - ndwi_before,
    ).astype(np.float32)

    valid_mask = ~np.isnan(d_ndvi) & ~np.isnan(d_ndbi) & ~np.isnan(d_ndwi)

    # Change Vector Analysis (CVA) Euclidean magnitude in spectral index space
    sq_sum = np.zeros_like(d_ndvi, dtype=np.float32)
    np.add(d_ndvi**2, d_ndbi**2, out=sq_sum, where=valid_mask)
    np.add(sq_sum, d_ndwi**2, out=sq_sum, where=valid_mask)

    magnitude = np.where(valid_mask, np.sqrt(sq_sum), np.nan).astype(np.float32)
    return magnitude, d_ndvi, d_ndbi, d_ndwi


def compute_otsu_threshold(
    values: np.ndarray[Any, Any],
    num_bins: int = 256,
) -> float:
    """Compute optimal binarization threshold using Otsu's method (Otsu 1979).

    Maximizes between-class variance:
        sigma_b^2(t) = w0(t) * w1(t) * [mu0(t) - mu1(t)]^2
                     = [mu_total * w0(t) - mu(t)]^2 / [w0(t) * (1 - w0(t))]
    """
    valid = values[~np.isnan(values)]
    if valid.size == 0:
        return 0.0

    val_min = float(np.min(valid))
    val_max = float(np.max(valid))

    if np.isclose(val_min, val_max):
        return val_min

    counts, bin_edges = np.histogram(valid, bins=num_bins, range=(val_min, val_max))
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2.0

    total_pixels = float(valid.size)
    probabilities = counts.astype(np.float64) / total_pixels

    # Cumulative class probabilities
    w0 = np.cumsum(probabilities)
    w1 = 1.0 - w0

    # Cumulative class means
    mu_k = np.cumsum(probabilities * bin_centers)
    mu_total = mu_k[-1]

    # Mask valid thresholds where both classes have positive probability
    valid_idx = (w0 > 1e-9) & (w1 > 1e-9)
    if not np.any(valid_idx):
        return float((val_min + val_max) / 2.0)

    # Between-class variance
    numerator = (mu_total * w0[valid_idx] - mu_k[valid_idx]) ** 2
    denominator = w0[valid_idx] * w1[valid_idx]
    sigma_b_sq = numerator / denominator

    max_val = np.max(sigma_b_sq)
    # When there is an empty valley between clusters, take the center of the plateau
    plateau_indices = np.where(sigma_b_sq >= max_val - 1e-7)[0]
    mid_idx = plateau_indices[len(plateau_indices) // 2]
    return float(bin_centers[valid_idx][mid_idx])


def apply_morphological_filtering(
    binary_mask: np.ndarray[Any, Any],
    kernel_size: int = MORPHOLOGICAL_KERNEL_SIZE,
) -> np.ndarray[Any, Any]:
    """Perform morphological opening (erosion followed by dilation) to eliminate speckle."""
    if not np.any(binary_mask):
        return binary_mask.copy()

    structure = np.ones((kernel_size, kernel_size), dtype=bool)
    opened = ndimage.binary_opening(binary_mask, structure=structure, iterations=1)
    return opened.astype(bool)


def filter_connected_components(
    binary_mask: np.ndarray[Any, Any],
    min_pixels: int = MIN_CONNECTED_COMPONENTS_PX,
) -> tuple[np.ndarray[Any, Any], int, dict[int, int]]:
    """Label connected components using 8-connectivity and discard patches < min_pixels.

    Returns:
        (filtered_labeled_mask, retained_component_count, component_sizes)

    """
    if not np.any(binary_mask):
        return (
            np.zeros_like(binary_mask, dtype=np.int32),
            0,
            {},
        )

    # 8-connectivity structure
    structure = ndimage.generate_binary_structure(2, 2)
    labeled, num_features = ndimage.label(binary_mask, structure=structure)

    if num_features == 0:
        return (
            np.zeros_like(binary_mask, dtype=np.int32),
            0,
            {},
        )

    # Count pixels per label
    counts = np.bincount(labeled.ravel())

    filtered_mask = np.zeros_like(labeled, dtype=np.int32)
    sizes: dict[int, int] = {}
    new_label = 1

    for label_id in range(1, num_features + 1):
        c = int(counts[label_id])
        if c >= min_pixels:
            filtered_mask[labeled == label_id] = new_label
            sizes[new_label] = c
            new_label += 1

    retained_count = new_label - 1
    return filtered_mask, retained_count, sizes


def detect_change_classical(
    ndvi_before: np.ndarray[Any, Any],
    ndvi_after: np.ndarray[Any, Any],
    ndbi_before: np.ndarray[Any, Any],
    ndbi_after: np.ndarray[Any, Any],
    ndwi_before: np.ndarray[Any, Any],
    ndwi_after: np.ndarray[Any, Any],
    min_component_px: int = MIN_CONNECTED_COMPONENTS_PX,
    kernel_size: int = MORPHOLOGICAL_KERNEL_SIZE,
    manual_threshold: float | None = None,
) -> ClassicalChangeResult:
    """Execute complete classical change detection vertical slice (Task 2.1).

    Steps:
    1. Compute index differences (d_ndvi, d_ndbi, d_ndwi) and CVA magnitude.
    2. Dynamically determine Otsu threshold over magnitude (or use manual_threshold).
    3. Generate raw binary change mask.
    4. Apply 3x3 morphological opening to suppress isolated pixels.
    5. Label connected components and drop components smaller than min_component_px.
    """
    magnitude, d_ndvi, d_ndbi, d_ndwi = compute_index_cda(
        ndvi_before=ndvi_before,
        ndvi_after=ndvi_after,
        ndbi_before=ndbi_before,
        ndbi_after=ndbi_after,
        ndwi_before=ndwi_before,
        ndwi_after=ndwi_after,
    )

    if manual_threshold is not None:
        threshold = float(manual_threshold)
    else:
        threshold = compute_otsu_threshold(magnitude)

    raw_mask = (magnitude >= threshold) & ~np.isnan(magnitude)

    # Morphological opening (3x3)
    opened_mask = apply_morphological_filtering(raw_mask, kernel_size=kernel_size)

    # Connected component labeling & min-area filtering
    labeled_mask, retained_count, sizes = filter_connected_components(
        opened_mask, min_pixels=min_component_px
    )

    final_mask = labeled_mask > 0

    return ClassicalChangeResult(
        change_mask=final_mask,
        otsu_threshold=threshold,
        magnitude=magnitude,
        d_ndvi=d_ndvi,
        d_ndbi=d_ndbi,
        d_ndwi=d_ndwi,
        labeled_mask=labeled_mask,
        component_count=retained_count,
        component_sizes=sizes,
    )
