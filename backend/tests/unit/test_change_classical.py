"""Unit tests for pure classical change detection (Task 2.1).

Verifies:
1. CDA index difference arithmetic and Euclidean CVA magnitude.
2. Otsu thresholding convergence and variance maximization on bimodal distributions.
3. 3x3 morphological opening speckle elimination.
4. Connected components filtering below 4 pixels.
5. End-to-end detect_change_classical output contracts.
"""

from __future__ import annotations

import numpy as np
import pytest

from app.domain.change_classical import (
    apply_morphological_filtering,
    compute_index_cda,
    compute_otsu_threshold,
    detect_change_classical,
    filter_connected_components,
)


def test_compute_index_cda_exact_math() -> None:
    """Verify exact index difference and Euclidean vector magnitude calculation."""
    # Before: NDVI=0.8, NDBI=-0.2, NDWI=0.1
    # After:  NDVI=0.2, NDBI=0.4,  NDWI=0.1
    # d_ndvi = -0.6, d_ndbi = +0.6, d_ndwi = 0.0
    # magnitude = sqrt((-0.6)^2 + 0.6^2 + 0^2) = sqrt(0.72) = 0.848528...
    shape = (2, 2)
    ndvi_before = np.full(shape, 0.8, dtype=np.float32)
    ndvi_after = np.full(shape, 0.2, dtype=np.float32)
    ndbi_before = np.full(shape, -0.2, dtype=np.float32)
    ndbi_after = np.full(shape, 0.4, dtype=np.float32)
    ndwi_before = np.full(shape, 0.1, dtype=np.float32)
    ndwi_after = np.full(shape, 0.1, dtype=np.float32)

    mag, d_ndvi, d_ndbi, d_ndwi = compute_index_cda(
        ndvi_before, ndvi_after, ndbi_before, ndbi_after, ndwi_before, ndwi_after
    )

    assert np.allclose(d_ndvi, -0.6, atol=1e-5)
    assert np.allclose(d_ndbi, 0.6, atol=1e-5)
    assert np.allclose(d_ndwi, 0.0, atol=1e-5)
    assert np.allclose(mag, np.sqrt(0.72), atol=1e-5)


def test_compute_index_cda_handles_nans() -> None:
    """Verify that pixels with NaN values propagate NaNs rather than raising errors."""
    b = np.array([[0.5, np.nan]], dtype=np.float32)
    a = np.array([[0.1, 0.2]], dtype=np.float32)
    zero = np.zeros_like(b)

    mag, d_ndvi, _, _ = compute_index_cda(b, a, zero, zero, zero, zero)
    assert np.isclose(d_ndvi[0, 0], -0.4, atol=1e-5)
    assert np.isnan(d_ndvi[0, 1])
    assert np.isnan(mag[0, 1])


def test_otsu_thresholding_bimodal() -> None:
    """Verify Otsu finds the valley between two clearly separated distributions."""
    np.random.seed(42)
    # Background cluster centered at 0.1, changed cluster centered at 0.8
    cluster_a = np.random.normal(loc=0.1, scale=0.02, size=1000)
    cluster_b = np.random.normal(loc=0.8, scale=0.02, size=500)
    values = np.concatenate([cluster_a, cluster_b]).astype(np.float32)

    thresh = compute_otsu_threshold(values)
    # Threshold should lie cleanly between the clusters (around 0.35 - 0.55)
    assert 0.30 <= thresh <= 0.60


def test_otsu_thresholding_uniform_and_edge_cases() -> None:
    """Verify Otsu handles uniform and empty arrays gracefully."""
    uniform = np.full((10, 10), 0.5, dtype=np.float32)
    assert compute_otsu_threshold(uniform) == pytest.approx(0.5)

    empty = np.array([], dtype=np.float32)
    assert compute_otsu_threshold(empty) == 0.0

    all_nan = np.full((5, 5), np.nan, dtype=np.float32)
    assert compute_otsu_threshold(all_nan) == 0.0


def test_morphological_opening_removes_speckle() -> None:
    """Verify isolated single-pixel noise is removed while clusters are kept."""
    mask = np.zeros((10, 10), dtype=bool)
    # Isolated 1-pixel noise
    mask[1, 1] = True
    mask[8, 8] = True
    # Solid 3x3 block
    mask[3:6, 3:6] = True

    cleaned = apply_morphological_filtering(mask, kernel_size=3)

    assert not cleaned[1, 1]
    assert not cleaned[8, 8]
    assert cleaned[4, 4]  # Center of 3x3 remains True


def test_filter_connected_components_min_area() -> None:
    """Verify components with area < 4 px are discarded."""
    mask = np.zeros((10, 10), dtype=bool)
    # 2-pixel patch (should be dropped)
    mask[0, 0] = True
    mask[0, 1] = True
    # 5-pixel patch (should be retained)
    mask[5:7, 5:8] = True
    mask[6, 7] = False  # 2x3 - 1 = 5 pixels

    labeled, count, sizes = filter_connected_components(mask, min_pixels=4)

    assert count == 1
    assert labeled[0, 0] == 0
    assert labeled[0, 1] == 0
    assert np.all(labeled[5:7, 5:7] == 1)
    assert sizes[1] == 5


def test_detect_change_classical_end_to_end() -> None:
    """Verify full end-to-end classical detection pipeline."""
    h, w = 30, 30
    ndvi_b = np.full((h, w), 0.6, dtype=np.float32)
    ndvi_a = np.full((h, w), 0.6, dtype=np.float32)
    ndbi_b = np.full((h, w), -0.1, dtype=np.float32)
    ndbi_a = np.full((h, w), -0.1, dtype=np.float32)
    ndwi_b = np.full((h, w), 0.0, dtype=np.float32)
    ndwi_a = np.full((h, w), 0.0, dtype=np.float32)

    # Introduce a 6x6 construction change patch in the center
    # Significant drop in NDVI and rise in NDBI
    ndvi_a[10:16, 10:16] = 0.1
    ndbi_a[10:16, 10:16] = 0.5

    result = detect_change_classical(
        ndvi_before=ndvi_b,
        ndvi_after=ndvi_a,
        ndbi_before=ndbi_b,
        ndbi_after=ndbi_a,
        ndwi_before=ndwi_b,
        ndwi_after=ndwi_a,
        min_component_px=4,
    )

    assert result.component_count >= 1
    assert np.any(result.change_mask)
    assert result.change_mask[12, 12]  # Change detected in the center
    assert not result.change_mask[0, 0]  # No change in unchanged area
    assert result.d_ndvi[12, 12] < -0.4
    assert result.d_ndbi[12, 12] > 0.5
    assert result.otsu_threshold > 0.0
