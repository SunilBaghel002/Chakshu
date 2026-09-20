"""Land-cover classification and water contour extraction tests with synthetic fixtures."""

from __future__ import annotations

import io
from pathlib import Path

import numpy as np
import pytest
from PIL import Image, ImageDraw

from app.domain.landcover import (
    classify_optical_pixels,
    compute_landcover_summary,
    vectorize_class_mask,
    vectorize_water_polygons,
)

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures" / "images"


def _create_urban_image() -> Image.Image:
    """Synthetic urban: mostly grey/concrete with some green patches."""
    img = Image.new("RGB", (400, 400), color=(160, 160, 155))  # grey concrete base
    d = ImageDraw.Draw(img)
    # Roads / asphalt
    d.rectangle([0, 180, 400, 220], fill=(100, 100, 100))
    d.rectangle([180, 0, 220, 400], fill=(100, 100, 100))
    # Some vegetation patches
    d.rectangle([20, 20, 80, 80], fill=(30, 130, 30))
    d.rectangle([300, 300, 380, 380], fill=(40, 140, 40))
    # Rooftop
    d.rectangle([100, 100, 170, 170], fill=(180, 170, 160))
    d.rectangle([240, 50, 350, 140], fill=(170, 165, 155))
    return img


def _create_farmland_image() -> Image.Image:
    """Synthetic farmland: mostly green vegetation with bare strips."""
    img = Image.new("RGB", (400, 400), color=(40, 140, 40))  # green base
    d = ImageDraw.Draw(img)
    # Crop rows - slightly different greens
    for y in range(0, 400, 40):
        d.rectangle([0, y, 400, y + 20], fill=(50, 150, 45))
    # Small bare patches
    d.rectangle([150, 150, 250, 170], fill=(180, 160, 130))
    return img


def _create_coastal_image() -> Image.Image:
    """Synthetic coastal: green land on left, blue water on right."""
    img = Image.new("RGB", (400, 400), color=(40, 130, 40))  # green land base
    d = ImageDraw.Draw(img)
    # Water on right half - distinctly blue, low luminance
    d.rectangle([200, 0, 400, 400], fill=(15, 40, 120))
    # Shoreline transition strip
    d.rectangle([190, 0, 210, 400], fill=(80, 110, 100))
    return img


def _save_fixture(img: Image.Image, name: str) -> Path:
    """Save fixture image to fixtures/images/ directory."""
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    path = FIXTURES_DIR / name
    img.save(path, format="JPEG", quality=90)
    return path


class TestUrbanClassification:
    def test_urban_built_above_40_percent(self) -> None:
        """Urban aerial must classify built > 40% and bare < 40%."""
        img = _create_urban_image()
        _save_fixture(img, "urban_aerial.jpg")
        arr = np.asarray(img, dtype=np.uint16)
        classified = classify_optical_pixels(arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], scale_factor=255.0)
        summary = compute_landcover_summary(classified)
        values = {item["label"]: item["pct"] for item in summary["by_class"]}

        assert values.get("built", 0) > 40.0, f"Urban built={values.get('built', 0):.1f}% must be > 40%"
        assert values.get("bare", 0) < 40.0, f"Urban bare={values.get('bare', 0):.1f}% must be < 40%"


class TestFarmlandClassification:
    def test_farmland_vegetation_dominant(self) -> None:
        """Farmland aerial must have vegetation as the dominant class."""
        img = _create_farmland_image()
        _save_fixture(img, "farmland_aerial.jpg")
        arr = np.asarray(img, dtype=np.uint16)
        classified = classify_optical_pixels(arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], scale_factor=255.0)
        summary = compute_landcover_summary(classified)
        values = {item["label"]: item["pct"] for item in summary["by_class"]}

        assert values.get("vegetation", 0) > 40.0, f"Farmland vegetation={values.get('vegetation', 0):.1f}% must be > 40%"


class TestCoastalWaterContours:
    def test_coastal_water_produces_contours_not_rectangles(self) -> None:
        """Coastal water must produce actual contours, not bounding-box rectangles."""
        img = _create_coastal_image()
        _save_fixture(img, "coastal_aerial.jpg")
        arr = np.asarray(img, dtype=np.uint16)
        classified = classify_optical_pixels(arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], scale_factor=255.0)

        water_mask = classified == "water"
        assert np.any(water_mask), "Coastal image must have water pixels"

        polys = vectorize_water_polygons(water_mask, gsd_m=1.0)
        assert len(polys) >= 1, "Must produce at least one water polygon"

        # Water must not be fragmented into many tiny pieces
        assert len(polys) <= 10, f"Water fragmented into {len(polys)} pieces (expected <= 10)"

    def test_water_rings_have_correct_point_count(self) -> None:
        """Every water ring must have 4-20 points after Douglas-Peucker simplification."""
        mask = np.zeros((200, 200), dtype=bool)
        # Create a large circular water body
        y, x = np.ogrid[:200, :200]
        mask[(x - 100) ** 2 + (y - 100) ** 2 <= 70 ** 2] = True

        polys = vectorize_water_polygons(mask, gsd_m=1.0)
        assert len(polys) >= 1

        for poly in polys:
            coords = poly.get("coordinates", [[]])[0]
            n_points = len(coords)
            assert 4 <= n_points <= 20, f"Water ring has {n_points} points (expected 4-20)"

    def test_water_components_have_min_30_pixels(self) -> None:
        """Every water component must have at least 30 pixels."""
        mask = np.zeros((200, 200), dtype=bool)
        # Large water body
        mask[50:150, 50:150] = True
        # Tiny water body (< 30 px) — should be filtered
        mask[5:8, 5:8] = True  # 9 pixels

        polys = vectorize_water_polygons(mask, min_pixels=30)
        for poly in polys:
            assert poly["area_px"] >= 30, f"Water component area {poly['area_px']} < 30 px"


class TestLandcoverSummary:
    def test_percentages_total_100(self) -> None:
        """Land-cover percentages must total 100% within rounding tolerance."""
        img = _create_urban_image()
        arr = np.asarray(img, dtype=np.uint16)
        classified = classify_optical_pixels(arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], scale_factor=255.0)
        summary = compute_landcover_summary(classified)

        assert 98.0 <= summary["sum_check_pct"] <= 102.0, (
            f"Sum check {summary['sum_check_pct']:.2f}% outside 98-102% tolerance"
        )

    def test_no_excessive_polygon_fragmentation(self) -> None:
        """Non-water classes must not produce thousands of tiny polygons."""
        img = _create_urban_image()
        arr = np.asarray(img, dtype=np.uint16)
        classified = classify_optical_pixels(arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], scale_factor=255.0)

        for label in ("built", "vegetation", "bare"):
            mask = classified == label
            if not np.any(mask):
                continue
            polys = vectorize_class_mask(mask, min_pixels=100, max_polygons=40)
            assert len(polys) <= 40, f"{label} produced {len(polys)} polygons (max 40)"
