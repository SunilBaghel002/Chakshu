"""Pure domain module for spectral indices and optical remote-sensing mathematics.

Calculates:
- NDVI (Normalized Difference Vegetation Index) - Rouse et al. 1974
- NDWI (Normalized Difference Water Index) - McFeeters 1996
- NDBI (Normalized Difference Built-up Index) - Zha et al. 2003
- NDSI (Normalized Difference Snow Index) - Hall et al. 1995

Enforces:
1. Sentinel-2 L2A scale factor awareness (10000.0).
2. Explicit nodata masking (PRD 5 §8).
3. Zero-division and NaN protection.
4. Output value range clamping [-1.0, 1.0].
5. Architecture purity: zero framework, I/O, network, or DB dependencies.
"""

from __future__ import annotations

import enum
from typing import Any

import numpy as np

try:
    from app.domain.constants import (
        NDBI_BUILT_THRESHOLD,
        NDSI_SNOW_THRESHOLD,
        NDVI_BARE_MAX,
        NDVI_BUILT_MAX,
        NDVI_VEGETATION_THRESHOLD,
        NDWI_WATER_THRESHOLD,
        SCALE_FACTOR_S2_L2A,
    )
except ImportError:
    from .constants import (
        NDBI_BUILT_THRESHOLD,
        NDSI_SNOW_THRESHOLD,
        NDVI_BARE_MAX,
        NDVI_BUILT_MAX,
        NDVI_VEGETATION_THRESHOLD,
        NDWI_WATER_THRESHOLD,
        SCALE_FACTOR_S2_L2A,
    )


class LandCoverClass(enum.StrEnum):
    """Discrete optical land-cover classes derived from spectral indices."""

    WATER = "WATER"
    SNOW = "SNOW"
    VEGETATION = "VEGETATION"
    BUILT = "BUILT"
    BARE_SOIL = "BARE_SOIL"
    UNKNOWN = "UNKNOWN"


def _prepare_band(
    arr: np.ndarray[Any, Any],
    scale_factor: float = SCALE_FACTOR_S2_L2A,
    nodata: float | int | None = None,
) -> tuple[np.ndarray[Any, Any], np.ndarray[Any, Any]]:
    """Convert band array to float32, apply scale factor if uint16, and extract valid mask.

    Returns:
        (band_float, valid_mask) where valid_mask is True for uncorrupted pixels.

    """
    valid = np.ones(arr.shape, dtype=bool)

    if nodata is not None:
        valid &= arr != nodata

    if np.issubdtype(arr.dtype, np.floating):
        valid &= ~np.isnan(arr)
        arr_f = arr.astype(np.float32)
        # If floats are already in [0, 1] or reflectances, don't divide unless maximum > 100
        if scale_factor > 1.0 and np.nanmax(arr_f) > 100.0:
            arr_f = arr_f / float(scale_factor)
    elif np.issubdtype(arr.dtype, np.integer):
        # Raw Sentinel-2 L2A is uint16 scaled by 10000
        arr_f = arr.astype(np.float32)
        if nodata is None:
            # S2 typically reserves 0 for nodata in raw integer products
            valid &= arr != 0
        if scale_factor > 1.0:
            arr_f = arr_f / float(scale_factor)
    else:
        arr_f = arr.astype(np.float32)

    return arr_f, valid


def compute_normalized_difference(
    band_a: np.ndarray[Any, Any],
    band_b: np.ndarray[Any, Any],
    scale_factor: float = SCALE_FACTOR_S2_L2A,
    nodata: float | int | None = None,
) -> np.ndarray[Any, Any]:
    """Compute normalized difference index: (band_a - band_b) / (band_a + band_b).

    Args:
        band_a: First spectral band array.
        band_b: Second spectral band array.
        scale_factor: Scale factor to divide raw uint16 integers by (default 10000.0).
        nodata: Optional pixel value representing missing data.

    Returns:
        float32 array of shape band_a.shape with values clamped in [-1.0, 1.0].
        Invalid or zero-division pixels are filled with np.nan.

    """
    if band_a.shape != band_b.shape:
        raise ValueError(
            f"Shape mismatch in normalized difference: {band_a.shape} vs {band_b.shape}"
        )

    a, mask_a = _prepare_band(band_a, scale_factor=scale_factor, nodata=nodata)
    b, mask_b = _prepare_band(band_b, scale_factor=scale_factor, nodata=nodata)

    valid_mask = mask_a & mask_b
    numerator = a - b
    denominator = a + b

    # Guard against division by zero and near-zero noise
    safe_denom_mask = valid_mask & (np.abs(denominator) > 1e-7)

    result = np.full(band_a.shape, np.nan, dtype=np.float32)

    with np.errstate(divide="ignore", invalid="ignore"):
        np.divide(
            numerator,
            denominator,
            out=result,
            where=safe_denom_mask,
        )

    # Strictly clamp valid values to physical bounds [-1.0, 1.0]
    np.clip(result, -1.0, 1.0, out=result, where=safe_denom_mask)
    return result


def compute_ndvi(
    nir: np.ndarray[Any, Any],
    red: np.ndarray[Any, Any],
    scale_factor: float = SCALE_FACTOR_S2_L2A,
    nodata: float | int | None = None,
) -> np.ndarray[Any, Any]:
    """Compute NDVI = (NIR - Red) / (NIR + Red) (Rouse et al. 1974).

    On Sentinel-2: NIR = Band 8 (B08), Red = Band 4 (B04).
    """
    return compute_normalized_difference(
        band_a=nir,
        band_b=red,
        scale_factor=scale_factor,
        nodata=nodata,
    )


def compute_ndwi(
    green: np.ndarray[Any, Any],
    nir: np.ndarray[Any, Any],
    scale_factor: float = SCALE_FACTOR_S2_L2A,
    nodata: float | int | None = None,
) -> np.ndarray[Any, Any]:
    """Compute NDWI = (Green - NIR) / (Green + NIR) (McFeeters 1996).

    On Sentinel-2: Green = Band 3 (B03), NIR = Band 8 (B08).
    """
    return compute_normalized_difference(
        band_a=green,
        band_b=nir,
        scale_factor=scale_factor,
        nodata=nodata,
    )


def compute_ndbi(
    swir: np.ndarray[Any, Any],
    nir: np.ndarray[Any, Any],
    scale_factor: float = SCALE_FACTOR_S2_L2A,
    nodata: float | int | None = None,
) -> np.ndarray[Any, Any]:
    """Compute NDBI = (SWIR - NIR) / (SWIR + NIR) (Zha et al. 2003).

    On Sentinel-2: SWIR = Band 11 (B11), NIR = Band 8 (B08).
    Note: If B11 is 20m and B08 is 10m, B11 must be upsampled prior to calling.
    """
    return compute_normalized_difference(
        band_a=swir,
        band_b=nir,
        scale_factor=scale_factor,
        nodata=nodata,
    )


def compute_ndsi(
    green: np.ndarray[Any, Any],
    swir: np.ndarray[Any, Any],
    scale_factor: float = SCALE_FACTOR_S2_L2A,
    nodata: float | int | None = None,
) -> np.ndarray[Any, Any]:
    """Compute NDSI = (Green - SWIR) / (Green + SWIR) (Hall et al. 1995).

    On Sentinel-2: Green = Band 3 (B03), SWIR = Band 11 (B11).
    """
    return compute_normalized_difference(
        band_a=green,
        band_b=swir,
        scale_factor=scale_factor,
        nodata=nodata,
    )


def resample_2x(arr: np.ndarray[Any, Any]) -> np.ndarray[Any, Any]:
    """Resample a 2D array by a factor of 2 (e.g. 20m band B11 to 10m grid).

    Uses nearest-neighbor replication for pure NumPy operation.
    """
    if arr.ndim != 2:
        raise ValueError(f"resample_2x expects a 2D array, got shape {arr.shape}")
    return np.repeat(np.repeat(arr, 2, axis=0), 2, axis=1)


def classify_land_cover(
    ndvi: np.ndarray[Any, Any],
    ndwi: np.ndarray[Any, Any],
    ndbi: np.ndarray[Any, Any],
    ndsi: np.ndarray[Any, Any] | None = None,
    valid_mask: np.ndarray[Any, Any] | None = None,
) -> np.ndarray[Any, Any]:
    """Classify pixels into discrete LandCoverClass values using standard decision gates.

    Priority hierarchy (PRD 2 §6 Track 1):
    1. Water: NDWI > 0.15
    2. Snow: NDSI > 0.40 (if NDSI supplied)
    3. Vegetation: NDVI >= 0.40
    4. Built-up: NDBI > 0.05 and NDVI <= 0.25
    5. Bare Soil: NDVI <= 0.20 and NDBI <= 0.05
    """
    shape = ndvi.shape
    classification = np.full(shape, LandCoverClass.UNKNOWN.value, dtype=object)

    if valid_mask is None:
        valid = ~np.isnan(ndvi) & ~np.isnan(ndwi) & ~np.isnan(ndbi)
    else:
        valid = valid_mask & ~np.isnan(ndvi) & ~np.isnan(ndwi) & ~np.isnan(ndbi)

    # 1. Water
    is_water = valid & (ndwi > NDWI_WATER_THRESHOLD)
    classification[is_water] = LandCoverClass.WATER.value

    # 2. Snow (optional / evaluated after water)
    if ndsi is not None:
        is_snow = valid & ~is_water & (ndsi > NDSI_SNOW_THRESHOLD)
        classification[is_snow] = LandCoverClass.SNOW.value
    else:
        is_snow = np.zeros(shape, dtype=bool)

    # 3. Vegetation
    remaining = valid & ~is_water & ~is_snow
    is_veg = remaining & (ndvi >= NDVI_VEGETATION_THRESHOLD)
    classification[is_veg] = LandCoverClass.VEGETATION.value

    # 4. Built-up infrastructure
    remaining = remaining & ~is_veg
    is_built = remaining & (ndbi > NDBI_BUILT_THRESHOLD) & (ndvi <= NDVI_BUILT_MAX)
    classification[is_built] = LandCoverClass.BUILT.value

    # 5. Bare soil / open ground
    remaining = remaining & ~is_built
    is_bare = remaining & (ndvi <= NDVI_BARE_MAX)
    classification[is_bare] = LandCoverClass.BARE_SOIL.value

    return classification
