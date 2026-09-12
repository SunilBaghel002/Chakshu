"""Unit tests for pure spectral index mathematics and classification (Task 1.3).

Verifies:
1. Exact hand-computed golden values for NDVI, NDWI, NDBI, NDSI.
2. Phase 1 Gate constraints:
   - Vegetated tile NDVI in [0.5, 0.9]
   - Urban tile NDVI in [-0.1, 0.3]
3. S2 uint16 scale factor handling (10000.0).
4. Division by zero, negative denom, and nodata masking robustness.
5. Land cover classification decision hierarchy.
"""

from __future__ import annotations

import numpy as np
import pytest

from app.domain.indices import (
    LandCoverClass,
    classify_land_cover,
    compute_ndbi,
    compute_ndsi,
    compute_ndvi,
    compute_ndwi,
    resample_2x,
)


def test_hand_computed_ndvi() -> None:
    """Verify NDVI against textbook hand calculation (Rouse 1974)."""
    # NIR = 0.7, Red = 0.1 -> (0.7 - 0.1) / (0.7 + 0.1) = 0.6 / 0.8 = 0.75
    nir = np.array([[0.7]], dtype=np.float32)
    red = np.array([[0.1]], dtype=np.float32)

    ndvi = compute_ndvi(nir, red, scale_factor=1.0)
    assert np.isclose(ndvi[0, 0], 0.75, atol=1e-4)


def test_hand_computed_ndwi() -> None:
    """Verify NDWI against textbook hand calculation (McFeeters 1996)."""
    # Green = 0.4, NIR = 0.1 -> (0.4 - 0.1) / (0.4 + 0.1) = 0.3 / 0.5 = 0.60
    green = np.array([[0.4]], dtype=np.float32)
    nir = np.array([[0.1]], dtype=np.float32)

    ndwi = compute_ndwi(green, nir, scale_factor=1.0)
    assert np.isclose(ndwi[0, 0], 0.60, atol=1e-4)


def test_hand_computed_ndbi() -> None:
    """Verify NDBI against textbook hand calculation (Zha 2003)."""
    # SWIR = 0.5, NIR = 0.3 -> (0.5 - 0.3) / (0.5 + 0.3) = 0.2 / 0.8 = 0.25
    swir = np.array([[0.5]], dtype=np.float32)
    nir = np.array([[0.3]], dtype=np.float32)

    ndbi = compute_ndbi(swir, nir, scale_factor=1.0)
    assert np.isclose(ndbi[0, 0], 0.25, atol=1e-4)


def test_hand_computed_ndsi() -> None:
    """Verify NDSI against textbook hand calculation (Hall 1995)."""
    # Green = 0.6, SWIR = 0.1 -> (0.6 - 0.1) / (0.6 + 0.1) = 0.5 / 0.7 = 0.714285...
    green = np.array([[0.6]], dtype=np.float32)
    swir = np.array([[0.1]], dtype=np.float32)

    ndsi = compute_ndsi(green, swir, scale_factor=1.0)
    assert np.isclose(ndsi[0, 0], 5.0 / 7.0, atol=1e-4)


def test_phase1_gate_ndvi_ranges() -> None:
    """Phase 1 Gate test:

    - Vegetated tile NDVI must be in [0.5, 0.9]
    - Urban tile NDVI must be in [-0.1, 0.3]
    """
    # Known vegetated scenario: dense canopy (NIR ~ 0.72, Red ~ 0.12)
    veg_nir = np.array([[0.72]], dtype=np.float32)
    veg_red = np.array([[0.12]], dtype=np.float32)
    veg_ndvi = compute_ndvi(veg_nir, veg_red, scale_factor=1.0)[0, 0]
    assert 0.5 <= veg_ndvi <= 0.9, f"Vegetation NDVI {veg_ndvi} out of gate range [0.5, 0.9]"

    # Known urban / concrete scenario: concrete/asphalt (NIR ~ 0.28, Red ~ 0.26)
    urban_nir = np.array([[0.28]], dtype=np.float32)
    urban_red = np.array([[0.26]], dtype=np.float32)
    urban_ndvi = compute_ndvi(urban_nir, urban_red, scale_factor=1.0)[0, 0]
    assert -0.1 <= urban_ndvi <= 0.3, f"Urban NDVI {urban_ndvi} out of gate range [-0.1, 0.3]"


def test_uint16_scale_factor() -> None:
    """Sentinel-2 raw uint16 values scaled by 10000.0 produce correct floating index."""
    # Raw integers: NIR=7000, Red=1000
    nir_u16 = np.array([[7000]], dtype=np.uint16)
    red_u16 = np.array([[1000]], dtype=np.uint16)

    ndvi = compute_ndvi(nir_u16, red_u16, scale_factor=10000.0)
    assert np.isclose(ndvi[0, 0], 0.75, atol=1e-4)


def test_division_by_zero_protection() -> None:
    """When both bands are zero, result is NaN rather than a runtime crash."""
    nir = np.array([[0.0]], dtype=np.float32)
    red = np.array([[0.0]], dtype=np.float32)

    ndvi = compute_ndvi(nir, red, scale_factor=1.0)
    assert np.isnan(ndvi[0, 0])


def test_nodata_masking() -> None:
    """Explicit nodata value propagates to NaN in the index output."""
    nir = np.array([[0.7, 0.8], [0.9, -9999.0]], dtype=np.float32)
    red = np.array([[0.1, 0.2], [-9999.0, 0.3]], dtype=np.float32)

    ndvi = compute_ndvi(nir, red, scale_factor=1.0, nodata=-9999.0)
    assert not np.isnan(ndvi[0, 0])
    assert not np.isnan(ndvi[0, 1])
    assert np.isnan(ndvi[1, 0])
    assert np.isnan(ndvi[1, 1])


def test_clamping_to_physical_bounds() -> None:
    """All computed index values are strictly clamped to [-1.0, 1.0]."""
    nir = np.array([[10.0, -1.0]], dtype=np.float32)
    red = np.array([[0.0, 2.0]], dtype=np.float32)

    ndvi = compute_ndvi(nir, red, scale_factor=1.0)
    valid_ndvi = ndvi[~np.isnan(ndvi)]
    assert np.all(valid_ndvi >= -1.0)
    assert np.all(valid_ndvi <= 1.0)


def test_resample_2x() -> None:
    """Verify 20m band upsampling doubles 2D grid dimensions."""
    arr = np.array([[1, 2], [3, 4]], dtype=np.float32)
    res = resample_2x(arr)
    assert res.shape == (4, 4)
    # Check replication
    assert np.array_equal(res[0:2, 0:2], np.full((2, 2), 1.0))
    assert np.array_equal(res[0:2, 2:4], np.full((2, 2), 2.0))


def test_land_cover_classification() -> None:
    """Verify decision tree categorizes water, vegetation, built, and bare soil."""
    # Water pixel: high NDWI
    ndvi_w = np.array([[-0.2]], dtype=np.float32)
    ndwi_w = np.array([[0.5]], dtype=np.float32)
    ndbi_w = np.array([[-0.4]], dtype=np.float32)
    assert classify_land_cover(ndvi_w, ndwi_w, ndbi_w)[0, 0] == LandCoverClass.WATER.value

    # Vegetation pixel: high NDVI
    ndvi_v = np.array([[0.65]], dtype=np.float32)
    ndwi_v = np.array([[-0.3]], dtype=np.float32)
    ndbi_v = np.array([[-0.2]], dtype=np.float32)
    assert classify_land_cover(ndvi_v, ndwi_v, ndbi_v)[0, 0] == LandCoverClass.VEGETATION.value

    # Built pixel: high NDBI, low NDVI
    ndvi_b = np.array([[0.15]], dtype=np.float32)
    ndwi_b = np.array([[-0.2]], dtype=np.float32)
    ndbi_b = np.array([[0.18]], dtype=np.float32)
    assert classify_land_cover(ndvi_b, ndwi_b, ndbi_b)[0, 0] == LandCoverClass.BUILT.value

    # Bare soil pixel: low NDVI, low NDBI
    ndvi_s = np.array([[0.12]], dtype=np.float32)
    ndwi_s = np.array([[-0.1]], dtype=np.float32)
    ndbi_s = np.array([[0.02]], dtype=np.float32)
    assert classify_land_cover(ndvi_s, ndwi_s, ndbi_s)[0, 0] == LandCoverClass.BARE_SOIL.value


def test_shape_mismatch_raises() -> None:
    """Mismatched band dimensions raise ValueError."""
    b1 = np.ones((10, 10), dtype=np.float32)
    b2 = np.ones((5, 5), dtype=np.float32)
    with pytest.raises(ValueError, match="Shape mismatch"):
        compute_ndvi(b1, b2)
