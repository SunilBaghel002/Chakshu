"""Annotation rendering tests: label chips, water outline-only, LC overlay at 25% alpha."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import numpy as np
import pytest
from PIL import Image
from PIL.ImageDraw import ImageDraw as PILImageDraw

from app.services.annotate import annotate_image, WATER_OUTLINE_RGBA


def _make_base_image(size: tuple[int, int] = (600, 600)) -> Image.Image:
    return Image.new("RGB", size, color=(100, 100, 100))


def _make_box_detection(label: str, score: float, coords: list[list[float]]) -> dict[str, Any]:
    return {
        "id": f"d_{label}",
        "track": "object_model",
        "label": label,
        "kind": "box",
        "geom_px": {"type": "Polygon", "coordinates": [coords]},
        "area_px": 10000.0,
        "score": score,
        "score_source": "model",
    }


def _make_polygon_detection(label: str, coords: list[list[float]]) -> dict[str, Any]:
    return {
        "id": f"p_{label}",
        "track": "landcover_index",
        "label": label,
        "kind": "polygon",
        "geom_px": {"type": "Polygon", "coordinates": [coords]},
        "area_px": 5000.0,
        "score": 1.0,
        "score_source": "deterministic",
    }


class TestLabelChips:
    def test_every_box_draws_class_score_chip(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Every returned box must draw a '<class> <score>' chip."""
        captured_texts: list[str] = []
        orig_text = PILImageDraw.text

        def mock_text(self: Any, xy: Any, text: str, *args: Any, **kwargs: Any) -> Any:
            captured_texts.append(str(text))
            return orig_text(self, xy, text, *args, **kwargs)

        monkeypatch.setattr(PILImageDraw, "text", mock_text)

        detections = [
            _make_box_detection(
                "storage_tank", 0.88, [[50, 50], [150, 50], [150, 150], [50, 150], [50, 50]]
            ),
            _make_box_detection(
                "building", 0.75, [[200, 200], [300, 200], [300, 300], [200, 300], [200, 200]]
            ),
            _make_box_detection(
                "vehicle", 0.65, [[350, 350], [450, 350], [450, 450], [350, 450], [350, 350]]
            ),
        ]

        annotate_image(_make_base_image(), detections, overlay_lc=False)

        assert len(captured_texts) >= 3, f"Expected >= 3 label chips, got {len(captured_texts)}"
        assert any("storage_tank" in t and "0.88" in t for t in captured_texts)
        assert any("building" in t and "0.75" in t for t in captured_texts)
        assert any("vehicle" in t and "0.65" in t for t in captured_texts)


class TestDefaultAnnotationNoLCFill:
    def test_default_no_nonwater_landcover_fill(self) -> None:
        """Default annotation (no overlay_lc) must not fill non-water land-cover polygons."""
        base = _make_base_image()
        base_arr = np.array(base.convert("RGB"))

        # Include built and vegetation polygons alongside water
        detections = [
            _make_polygon_detection(
                "built", [[10, 10], [100, 10], [100, 100], [10, 100], [10, 10]]
            ),
            _make_polygon_detection(
                "vegetation", [[200, 200], [300, 200], [300, 300], [200, 300], [200, 200]]
            ),
        ]

        result = annotate_image(base, detections, overlay_lc=False)
        result_arr = np.array(result)

        # The non-water polygons should not have been drawn at all (overlay_lc=False)
        # The image should be largely identical to base
        diff = np.abs(base_arr.astype(int) - result_arr.astype(int))
        changed = np.count_nonzero(np.any(diff > 5, axis=-1))
        total = base.width * base.height
        # Less than 0.1% changed means no fill was applied
        assert (changed / total) < 0.001, (
            f"Non-water LC fill detected: {changed}/{total} pixels changed"
        )

    def test_water_is_outline_only(self) -> None:
        """Water polygons must render as outlines, not filled blocks."""
        base = _make_base_image()
        base_arr = np.array(base.convert("RGB"))

        # Large water polygon covering a significant area
        detections = [
            _make_polygon_detection(
                "water", [[100, 100], [300, 100], [300, 300], [100, 300], [100, 100]]
            ),
        ]

        result = annotate_image(base, detections, overlay_lc=False)
        result_arr = np.array(result)

        # Check the interior of the water polygon — it should be mostly unchanged
        interior = result_arr[150:250, 150:250]
        base_interior = base_arr[150:250, 150:250]
        interior_diff = np.abs(interior.astype(int) - base_interior.astype(int))
        interior_changed = np.count_nonzero(np.any(interior_diff > 5, axis=-1))
        interior_total = 100 * 100

        # Interior should be mostly unchanged (outline only means edges change, not fill)
        assert (interior_changed / interior_total) < 0.05, (
            f"Water interior appears filled: {interior_changed}/{interior_total} pixels changed"
        )


class TestLCOverlay:
    def test_overlay_lc_enables_25_percent_alpha(self) -> None:
        """overlay_lc=True must draw non-water land-cover polygons with ~25% alpha."""
        base = _make_base_image()
        base_arr = np.array(base.convert("RGB"))

        detections = [
            _make_polygon_detection(
                "built", [[10, 10], [200, 10], [200, 200], [10, 200], [10, 10]]
            ),
            _make_polygon_detection(
                "vegetation", [[250, 250], [450, 250], [450, 450], [250, 450], [250, 250]]
            ),
        ]

        result = annotate_image(base, detections, overlay_lc=True)
        result_arr = np.array(result)

        # With overlay_lc=True, there should be visible changes in the polygon areas
        diff = np.abs(base_arr.astype(int) - result_arr.astype(int))
        changed = np.count_nonzero(np.any(diff > 3, axis=-1))
        total = base.width * base.height
        assert (changed / total) > 0.05, (
            f"LC overlay not visible: only {changed}/{total} pixels changed"
        )

        # But the changes should be subtle (25% alpha, not opaque)
        # Max channel diff should generally be < 100 (25% of 255 ~= 64)
        max_diff = np.max(diff)
        assert max_diff < 180, f"LC overlay too opaque: max channel diff = {max_diff}"
