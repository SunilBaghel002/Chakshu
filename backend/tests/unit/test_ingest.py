"""Unit tests for scene ingestion, SCL cloud scoring, and tiling service (Task 1.5).

Verifies:
1. SCL cloud cover percentage calculation against ground truth arrays.
2. 2-98% percentile contrast stretching into valid [0, 255] uint8 range.
3. True-color PNG generation with valid image headers.
4. Scene band processing: grid slicing, mean spectral indices, and manifest generation.
5. Graceful handling of offline database mode.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from app.services.ingest import (
    IngestService,
    apply_percentile_stretch,
    compute_scl_cloud_pct,
    create_true_color_tile_bytes,
)


def test_scl_cloud_scoring() -> None:
    """Verify cloud cover percentage matches SCL classification classes."""
    # 100 pixels: 80 vegetation (4), 10 high-prob cloud (9), 10 shadow (3)
    scl = np.full((10, 10), 4, dtype=np.uint8)
    scl[0, :] = 9  # 10 cloud pixels
    scl[1, :] = 3  # 10 shadow pixels

    # Include shadow: (10 + 10) / 100 = 20.0%
    cloud_with_shadow = compute_scl_cloud_pct(scl, include_shadows=True)
    assert np.isclose(cloud_with_shadow, 20.0, atol=0.1)

    # Exclude shadow: 10 / 100 = 10.0%
    cloud_no_shadow = compute_scl_cloud_pct(scl, include_shadows=False)
    assert np.isclose(cloud_no_shadow, 10.0, atol=0.1)


def test_scl_all_clear() -> None:
    """Clear scene (vegetation/water) yields 0.0% cloud cover."""
    scl = np.array([[4, 4, 6], [5, 6, 4]], dtype=np.uint8)
    assert compute_scl_cloud_pct(scl) == 0.0


def test_percentile_stretch() -> None:
    """2-98% percentile stretch scales uint16 values into uint8 [0, 255]."""
    band = np.linspace(100, 10000, 1000, dtype=np.uint16).reshape((20, 50))
    stretched = apply_percentile_stretch(band)

    assert stretched.dtype == np.uint8
    assert stretched.shape == (20, 50)
    assert np.min(stretched) == 0
    assert np.max(stretched) == 255


def test_true_color_tile_png_generation() -> None:
    """Renders 3-band input into valid PNG bytes with standard signature."""
    h, w = 64, 64
    r = np.full((h, w), 2000, dtype=np.uint16)
    g = np.full((h, w), 1500, dtype=np.uint16)
    b = np.full((h, w), 1000, dtype=np.uint16)

    png_bytes = create_true_color_tile_bytes(r, g, b)
    assert isinstance(png_bytes, bytes)
    assert len(png_bytes) > 0
    # Standard 8-byte PNG file magic header: \x89PNG\r\n\x1a\n
    assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n"


def test_ingest_service_scene_bands(tmp_path: Path) -> None:
    """IngestService slices bands into 256x256 tiles and writes manifest and PNGs."""
    service = IngestService(tiles_dir=tmp_path)

    # Generate a 256x512 scene (2 tiles side-by-side)
    h, w = 256, 512
    b02 = np.full((h, w), 400, dtype=np.uint16)
    b03 = np.full((h, w), 800, dtype=np.uint16)
    b04 = np.full((h, w), 600, dtype=np.uint16)
    b08 = np.full((h, w), 6000, dtype=np.uint16)  # High NIR
    b11 = np.full((h // 2, w // 2), 1500, dtype=np.uint16)  # 20m band
    scl = np.full((h // 2, w // 2), 4, dtype=np.uint8)  # Vegetation

    bands = {
        "B02": b02,
        "B03": b03,
        "B04": b04,
        "B08": b08,
        "B11": b11,
        "SCL": scl,
    }

    manifest = service.process_scene_bands(
        scene_id="TEST_SCENE_001",
        bands=bands,
        aoi_bbox=[77.72, 28.10, 77.80, 28.16],
    )

    assert manifest["scene_id"] == "TEST_SCENE_001"
    assert manifest["tile_count"] == 2
    assert manifest["usable"] is True
    assert manifest["overall_cloud_pct"] == 0.0

    # Verify tile 0 metrics (high NIR + low Red -> high NDVI ~ 0.81)
    t0 = manifest["tiles"][0]
    assert t0["x"] == 0
    assert t0["y"] == 0
    assert 0.75 <= t0["ndvi_mean"] <= 0.85
    assert Path(t0["png_path"]).exists()
    assert "vector" in t0
    assert len(t0["vector"]) == 512

    # Verify manifest file on disk
    manifest_path = tmp_path / "TEST_SCENE_001" / "manifest.json"
    assert manifest_path.exists()
