"""Unit tests for pure domain mask vectorization (Task 2.2).

Verifies:
1. Conversion of 2D binary raster mask into valid GeoJSON Polygons.
2. Interior ring creation for components with holes.
3. Coordinate transformation to WGS84 bounding box [min_lon, min_lat, max_lon, max_lat].
4. Area in square pixels exact match with component pixel count.
5. Filtering of sub-threshold components.
"""

from __future__ import annotations

import numpy as np
import pytest

from app.domain.vectorise import vectorise_mask


def test_vectorise_simple_rectangle() -> None:
    """Verify vectorization of a solid rectangular block."""
    mask = np.zeros((40, 40), dtype=bool)
    mask[10:20, 15:30] = True  # 10 rows x 15 cols = 150 pixels

    bounds = [77.0, 28.0, 77.4, 28.4]  # 40x40 grid, 0.01 deg per px
    polys = vectorise_mask(mask, bounds_4326=bounds, min_pixels=4)

    assert len(polys) == 1
    p = polys[0]
    assert p.area_px == 150.0
    assert p.bbox_px == [15.0, 10.0, 30.0, 20.0]
    assert p.geometry["type"] == "Polygon"
    assert len(p.geometry["coordinates"]) == 1  # 1 exterior ring, no holes

    # Check bounds orientation: lon min should be 77.0 + 15 * 0.01 = 77.15
    # lat max should be 28.4 - 10 * 0.01 = 28.30
    ring = p.geometry["coordinates"][0]
    lons = [pt[0] for pt in ring]
    lats = [pt[1] for pt in ring]
    assert min(lons) == pytest.approx(77.15, abs=1e-4)
    assert max(lons) == pytest.approx(77.30, abs=1e-4)
    assert min(lats) == pytest.approx(28.20, abs=1e-4)
    assert max(lats) == pytest.approx(28.30, abs=1e-4)


def test_vectorise_shape_with_hole() -> None:
    """Verify that a shape with an interior void produces an interior ring."""
    mask = np.zeros((50, 50), dtype=bool)
    # Outer block: 20x20 = 400 pixels
    mask[10:30, 10:30] = True
    # Hole: 6x6 = 36 pixels
    mask[17:23, 17:23] = False  # 400 - 36 = 364 pixels

    polys = vectorise_mask(mask, bounds_4326=None, min_pixels=4)

    assert len(polys) == 1
    p = polys[0]
    assert p.area_px == 364.0
    # Must have 2 rings: exterior and interior hole
    assert len(p.geometry["coordinates"]) == 2


def test_vectorise_empty_and_sub_threshold() -> None:
    """Verify empty mask and sub-threshold patches return empty list."""
    empty = np.zeros((30, 30), dtype=bool)
    assert vectorise_mask(empty) == []

    # 3-pixel patch with min_pixels=4
    small = np.zeros((30, 30), dtype=bool)
    small[5, 5:8] = True
    assert vectorise_mask(small, min_pixels=4) == []
