"""Image annotation service for Chakshu detection engine (Task T-3).

Draws bounding boxes with class-specific colors and labels, and alpha-blended
water polygons onto overview images.
"""

from __future__ import annotations

from typing import Any
from PIL import Image, ImageDraw, ImageFont


CLASS_STYLE: dict[str, dict[str, tuple[int, int, int, int]]] = {
    "water": {
        "fill": (37, 99, 235, 85),  # translucent blue ~33%
        "stroke": (30, 64, 175, 255),  # dark rich navy blue
    },
    "building": {
        "fill": (
            239,
            68,
            68,
            88,
        ),  # translucent red ~35% (changed from orange per user instruction)
        "stroke": (185, 28, 28, 255),  # dark red stroke
    },
    "vegetation": {
        "fill": (34, 197, 94, 88),  # translucent green ~35%
        "stroke": (15, 95, 45, 255),  # dark forest green
    },
    "bare": {
        "fill": (180, 130, 80, 75),  # translucent tan/brown ~30%
        "stroke": (120, 75, 30, 255),  # dark earthy brown
    },
    "road": {
        "fill": (156, 163, 175, 80),  # neutral gray ~31%
        "stroke": (55, 65, 81, 255),  # dark charcoal slate
    },
    "built": {
        "fill": (239, 68, 68, 88),  # translucent red ~35%
        "stroke": (185, 28, 28, 255),  # dark red stroke
    },
    "crop": {
        "fill": (132, 204, 22, 85),  # translucent lime ~33%
        "stroke": (63, 98, 18, 255),  # dark olive/lime
    },
    "change": {
        "fill": (217, 70, 239, 88),  # translucent magenta ~35%
        "stroke": (162, 28, 175, 255),  # dark magenta
    },
}

CLASS_COLORS: dict[str, tuple[int, int, int]] = {
    "building": (239, 68, 68),  # red (switched from orange)
    "road": (156, 163, 175),  # grey
    "vehicle": (249, 115, 22),  # orange
    "aircraft": (168, 85, 247),  # purple
    "ship": (59, 130, 246),  # blue
    "storage_tank": (6, 182, 212),  # cyan
    "swimming_pool": (56, 189, 248),  # lightblue
    "container": (234, 179, 8),  # yellow
    "tower": (217, 70, 239),  # magenta
    "water": (37, 99, 235),  # blue
    "vegetation": (34, 197, 94),  # green
    "bare": (180, 130, 80),  # tan/brown
    "crop": (132, 204, 22),  # lime
}
DEFAULT_COLOR: tuple[int, int, int] = (16, 185, 129)

WATER_OUTLINE_RGBA: tuple[int, int, int, int] = (30, 64, 175, 255)  # dark rich navy blue


def get_class_color(label: str) -> tuple[int, int, int]:
    """Retrieve color tuple for a canonical object class."""
    return CLASS_COLORS.get(label.lower(), DEFAULT_COLOR)


def annotate_image(
    base_image: Image.Image,
    detections: list[dict[str, Any]],
    overlay_lc: bool = False,
    orig_width: int | None = None,
    orig_height: int | None = None,
) -> Image.Image:
    """Render detection boxes and polygons on base overview image.

    Args:
        base_image: Input PIL Image (RGB or RGBA).
        detections: List of detection dictionaries (Detection schema or raw proposals).
        overlay_lc: Whether to draw landcover overlay filled at ~25% alpha.
        orig_width: Full-scale image width for scaling coordinates.
        orig_height: Full-scale image height for scaling coordinates.

    Returns:
        Annotated PIL Image in RGB mode.
    """
    img = base_image.convert("RGBA")
    w, h = img.size
    src_w = float(orig_width or w)
    src_h = float(orig_height or h)

    scale_x = w / src_w if src_w > 0 else 1.0
    scale_y = h / src_h if src_h > 0 else 1.0

    # Create transparent overlay for alpha drawing (polygons)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay, "RGBA")

    # Pass 1: Draw water polygons, building polygons, and optional landcover polygons
    # Sort largest area first so finer features (buildings, water) layer cleanly on top
    poly_candidates = [
        d
        for d in detections
        if d.get("kind") == "polygon"
        or "points" in d
        or ("coordinates" in d and d.get("kind") != "box")
    ]
    poly_candidates.sort(key=lambda d: float(d.get("area_px") or 0.0), reverse=True)

    for det in poly_candidates:
        label = str(det.get("label", "")).lower()
        is_water = label == "water"
        is_building = label in ("building", "built_structure")

        if not is_water and not is_building and not overlay_lc:
            continue

        pts = _extract_polygon_points(det, scale_x, scale_y, w, h)
        if len(pts) >= 3:
            style = CLASS_STYLE.get(
                label,
                {
                    "fill": (16, 185, 129, 64),
                    "stroke": (16, 185, 129, 230),
                },
            )
            if overlay_lc:
                # Semi-transparent filled polygon with class-specific outline
                overlay_draw.polygon(pts, fill=style["fill"], outline=style["stroke"], width=2)
            elif is_water:
                # Evidence outline only when overlay_lc is False
                overlay_draw.line(pts + [pts[0]], fill=WATER_OUTLINE_RGBA, width=2, joint="curve")
            elif is_building:
                # Building structure outline
                overlay_draw.line(pts + [pts[0]], fill=style["stroke"], width=2, joint="curve")

    # Composite alpha polygons
    img = Image.alpha_composite(img, overlay)

    # Pass 2: Draw object bounding boxes and labels
    draw = ImageDraw.Draw(img)
    font_size = max(11, int(w / 45))
    try:
        font = ImageFont.load_default(size=font_size)
    except Exception:
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except Exception:
            font = ImageFont.load_default()

    for det in detections:
        kind = det.get("kind")
        if kind == "polygon":
            continue

        bbox = _extract_bbox(det, scale_x, scale_y, w, h)
        if not bbox:
            continue

        x1, y1, x2, y2 = bbox
        label = str(det.get("label", "object")).lower()
        score = float(det.get("score", 1.0))
        color = get_class_color(label)

        # Draw 2-3px bounding box
        for offset in range(2):
            draw.rectangle([x1 - offset, y1 - offset, x2 + offset, y2 + offset], outline=color)

        # Draw label chip with dark background (rgba(0,0,0,0.65))
        label_text = f"{label} {score:.2f}"
        _draw_label_tag(draw, label_text, x1, y1, color, font, w, h)

    return img.convert("RGB")


def _extract_polygon_points(
    det: dict[str, Any], scale_x: float, scale_y: float, img_w: int, img_h: int
) -> list[tuple[float, float]]:
    """Extract and scale polygon coordinates from GeoJSON or raw points."""
    raw_pts: list[Any] = []
    geom = det.get("geom_px") or det.get("geom")
    is_normalized = False
    if isinstance(geom, dict) and "coordinates" in geom:
        coords = geom["coordinates"]
        if coords and isinstance(coords[0], list):
            raw_pts = coords[0]
    elif "points" in det:
        raw_pts = det["points"]
        is_normalized = True
    elif "coordinates" in det:
        raw_pts = det["coordinates"]

    scaled_pts: list[tuple[float, float]] = []
    for pt in raw_pts:
        if isinstance(pt, (list, tuple)) and len(pt) >= 2:
            px, py = float(pt[0]), float(pt[1])
            if is_normalized or det.get("normalized") is True:
                px = (px / 1000.0) * img_w
                py = (py / 1000.0) * img_h
            else:
                px = px * scale_x
                py = py * scale_y
            scaled_pts.append((max(0.0, min(float(img_w), px)), max(0.0, min(float(img_h), py))))
    return scaled_pts


def _extract_bbox(
    det: dict[str, Any], scale_x: float, scale_y: float, img_w: int, img_h: int
) -> tuple[float, float, float, float] | None:
    """Extract and scale bounding box coordinates [x1, y1, x2, y2]."""
    if "bbox" in det:
        raw = det["bbox"]
        if isinstance(raw, (list, tuple)) and len(raw) == 4:
            # Model outputs [ymin, xmin, ymax, xmax] in 0..1000 space
            ymin, xmin, ymax, xmax = (float(v) for v in raw)
            x1 = (xmin / 1000.0) * img_w
            y1 = (ymin / 1000.0) * img_h
            x2 = (xmax / 1000.0) * img_w
            y2 = (ymax / 1000.0) * img_h
            return min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)

    geom = det.get("geom_px") or det.get("geom")
    if isinstance(geom, dict) and "coordinates" in geom:
        coords = geom["coordinates"]
        if coords and isinstance(coords[0], list):
            ring = coords[0]
            xs = [float(p[0]) * scale_x for p in ring if len(p) >= 2]
            ys = [float(p[1]) * scale_y for p in ring if len(p) >= 2]
            if xs and ys:
                return min(xs), min(ys), max(xs), max(ys)

    return None


def _draw_label_tag(
    draw: ImageDraw.ImageDraw,
    text: str,
    x: float,
    y: float,
    border_color: tuple[int, int, int],
    font: Any,
    img_w: int,
    img_h: int,
) -> None:
    """Draw text tag with dark background (rgba(0,0,0,0.65)) on top edge of bounding box."""
    if font and hasattr(draw, "textbbox"):
        tbox = draw.textbbox((0, 0), text, font=font)
        tw = tbox[2] - tbox[0]
        th = tbox[3] - tbox[1]
    else:
        fsize = getattr(font, "size", 12) if font else 12
        tw = len(text) * fsize * 0.6
        th = fsize

    pad = 4.0
    chip_w = tw + pad * 2.0
    chip_h = th + pad * 2.0

    bg_x1 = max(0.0, min(float(img_w - chip_w), x))
    bg_y1 = y - chip_h
    if bg_y1 < 0.0:
        bg_y1 = min(float(img_h - chip_h), y + 2.0)
    bg_y1 = max(0.0, bg_y1)
    bg_x2 = min(float(img_w), bg_x1 + chip_w)
    bg_y2 = min(float(img_h), bg_y1 + chip_h)

    # Dark chip rgba(0, 0, 0, 0.65) -> (0, 0, 0, 166)
    draw.rectangle([bg_x1, bg_y1, bg_x2, bg_y2], fill=(0, 0, 0, 166), outline=border_color)
    draw.text((bg_x1 + pad, bg_y1 + pad), text, fill=(255, 255, 255), font=font)
