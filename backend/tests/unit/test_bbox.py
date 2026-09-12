"""Unit tests for domain/bbox.py.

Asserts bounding box coordinate normalization, scale auto-detection,
clamping rules, and the mandatory synthetic box overlap test (PRD 4 §7).
"""

from app.domain.bbox import (
    BboxReject,
    PixelBox,
    calculate_iou,
    normalise_bbox,
    normalize_label,
)


def test_normalise_bbox_1000_scale_yxyx() -> None:
    """Test standard Gemini 0-1000 yxyx normalised bounding box."""
    # Image size 1000x800. Box [ymin, xmin, ymax, xmax] = [200, 300, 400, 500] in 1000-scale
    raw = [200.0, 300.0, 400.0, 500.0]
    result = normalise_bbox(raw, img_w=1000, img_h=800, bbox_order="yxyx")

    assert isinstance(result, PixelBox)
    assert result.x1 == 300.0
    assert result.y1 == 160.0  # (200/1000)*800
    assert result.x2 == 500.0
    assert result.y2 == 320.0  # (400/1000)*800
    assert result.width == 200.0
    assert result.height == 160.0
    assert result.area_px == 32000.0


def test_normalise_bbox_unit_scale_xyxy() -> None:
    """Test 0.0-1.0 normalised box with xyxy order."""
    raw = [0.1, 0.2, 0.4, 0.6]
    result = normalise_bbox(raw, img_w=1000, img_h=1000, bbox_order="xyxy")

    assert isinstance(result, PixelBox)
    assert result.x1 == 100.0
    assert result.y1 == 200.0
    assert result.x2 == 400.0
    assert result.y2 == 600.0


def test_normalise_bbox_handles_inverted_coordinates() -> None:
    """If given inverted coordinates (e.g. ymax < ymin), normalizes min and max."""
    # ymin=400, xmin=100, ymax=300, xmax=200 (ymin > ymax)
    raw = [400.0, 100.0, 300.0, 200.0]
    result = normalise_bbox(raw, img_w=1000, img_h=1000, bbox_order="yxyx")

    assert isinstance(result, PixelBox)
    assert result.x1 == 100.0
    assert result.x2 == 200.0
    assert result.y1 == 300.0
    assert result.y2 == 400.0


def test_normalise_bbox_rejects_zero_width_degenerate() -> None:
    """Zero width or height box is rejected as degenerate."""
    raw = [100.0, 200.0, 100.0, 300.0]  # ymin == ymax
    result = normalise_bbox(raw, img_w=1000, img_h=1000, bbox_order="yxyx")
    assert isinstance(result, BboxReject)
    assert result.reason == "degenerate_zero_or_negative_area"


def test_normalise_bbox_rejects_out_of_range() -> None:
    """Rejects coordinates exceeding the 1000 scale limit."""
    raw = [100.0, 200.0, 300.0, 1500.0]
    result = normalise_bbox(raw, img_w=1000, img_h=1000)
    assert isinstance(result, BboxReject)
    assert result.reason == "coordinates_out_of_range"


def test_normalise_bbox_rejects_severe_clamping() -> None:
    """Rejects box that is significantly outside the image canvas."""
    # Box exceeds image boundary by 50% in unit scale
    raw = [0.1, 0.95, 0.2, 1.05]
    result = normalise_bbox(raw, img_w=1000, img_h=1000, bbox_order="yxyx")
    assert isinstance(result, BboxReject)
    assert result.reason == "box_significantly_outside_image"


def test_normalise_bbox_roundtrip_on_synthetic_image() -> None:
    """The mandatory synthetic box verification test from PRD 4 §7.

    Creates a synthetic 1000x800 image canvas with a known 100x100 square
    at pixel (300, 200). Assert the decoded box overlaps true square at IoU >= 0.7.
    """
    img_w, img_h = 1000, 800
    true_x1, true_y1 = 300.0, 200.0
    true_x2, true_y2 = 400.0, 300.0
    true_box = PixelBox(
        x1=true_x1,
        y1=true_y1,
        x2=true_x2,
        y2=true_y2,
        width=100.0,
        height=100.0,
        area_px=10000.0,
        order_used="truth",
    )

    # Simulated model output in 1000-normalised scale with slight perturbation (+-3 px)
    # ymin = (200 / 800) * 1000 = 250
    # xmin = (300 / 1000) * 1000 = 300
    # ymax = (300 / 800) * 1000 = 375
    # xmax = (400 / 1000) * 1000 = 400
    model_raw = [248.0, 302.0, 377.0, 398.0]  # in yxyx

    decoded = normalise_bbox(model_raw, img_w=img_w, img_h=img_h, bbox_order="yxyx")
    assert isinstance(decoded, PixelBox)

    iou = calculate_iou(decoded, true_box)
    assert iou >= 0.7, f"IoU {iou:.3f} was below required 0.7 threshold"


def test_label_alias_normalization() -> None:
    """Asserts canonical alias resolution per PRD 3 §B3."""
    assert normalize_label("house") == "building"
    assert normalize_label("urban area") == "building_cluster"
    assert normalize_label("cargo ship") == "ship_large"
    assert normalize_label("pylon") == "tower"
    assert normalize_label("unrecognized_alien_vessel") is None
