"""Classical computer vision utility functions for Chakshu CV detector.

Contains contour operations, polygon geometry conversions, ROI descriptors,
confidence estimators, and pure NumPy fallbacks.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from PIL import Image

try:
    import cv2  # type: ignore[import-untyped]
except ImportError:
    cv2 = None

log = logging.getLogger(__name__)

MIN_CONTOUR_AREA_PX: int = 64
MAX_POLYGON_VERTICES: int = 24
MIN_POLYGON_VERTICES: int = 4


def simplify_contour(contour: np.ndarray) -> np.ndarray:
    """Simplify contour using Douglas-Peucker, clamping to MAX_POLYGON_VERTICES."""
    if cv2 is None:
        return contour.reshape(-1, 2)
    epsilon = 0.01 * cv2.arcLength(contour, True)
    simplified = cv2.approxPolyDP(contour, epsilon, True)
    while len(simplified) > MAX_POLYGON_VERTICES and epsilon < 0.1 * cv2.arcLength(contour, True):
        epsilon *= 1.5
        simplified = cv2.approxPolyDP(contour, epsilon, True)
    return simplified.reshape(-1, 2)


def contour_to_geojson(contour_px: np.ndarray) -> dict[str, Any]:
    """Convert pixel contour coordinates to a GeoJSON Polygon."""
    if len(contour_px) < 3:
        return {"type": "Polygon", "coordinates": [[]]}
    coords = [[float(p[0]), float(p[1])] for p in contour_px]
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    return {"type": "Polygon", "coordinates": [coords]}


def describe_roi(roi: np.ndarray, class_name: str, area_px: float) -> str:
    """Generate pixel-based evidence description for an extracted ROI."""
    if roi.size == 0:
        return f"{class_name} region, {area_px:.0f} px²"

    mean_bgr = np.mean(roi.reshape(-1, 3), axis=0)
    b_mean, g_mean, r_mean = mean_bgr
    brightness = (0.299 * r_mean + 0.587 * g_mean + 0.114 * b_mean) / 255.0
    desc = "bright" if brightness > 0.6 else ("dark" if brightness < 0.3 else "medium-tone")

    if class_name == "water":
        return f"{desc} blue-shifted region, {area_px:.0f} px², mean RGB ({r_mean:.0f},{g_mean:.0f},{b_mean:.0f})"
    elif class_name == "vegetation":
        return f"{desc} green-dominant region, {area_px:.0f} px², mean RGB ({r_mean:.0f},{g_mean:.0f},{b_mean:.0f})"
    elif class_name == "built":
        return f"{desc} low-saturation textured region, {area_px:.0f} px²"
    elif class_name == "building":
        return f"Rectangular structure, {desc}, {area_px:.0f} px²"
    return f"{class_name} region, {area_px:.0f} px²"


def compute_confidence(
    contour: np.ndarray,
    mask: np.ndarray,
    bgr_img: np.ndarray,
    class_name: str,
    area: float,
    total_pixels: int,
) -> float:
    """Compute detection confidence from image features without LLM hallucination."""
    if cv2 is None:
        return 0.6

    score = 0.5
    area_ratio = area / max(total_pixels, 1)
    if area_ratio < 0.001:
        score -= 0.15
    elif area_ratio > 0.6:
        score -= 0.1

    perimeter = cv2.arcLength(contour, True)
    if perimeter > 0:
        circularity = (4 * np.pi * area) / (perimeter * perimeter)
        score += circularity * 0.15

    cnt_mask = np.zeros(mask.shape[:2], dtype=np.uint8)
    cv2.drawContours(cnt_mask, [contour], -1, 255, -1)
    if np.any(cnt_mask):
        roi_pixels = bgr_img[cnt_mask > 0]
        if len(roi_pixels) > 10:
            color_std = np.mean(np.std(roi_pixels, axis=0))
            if color_std < 30:
                score += 0.1
            elif color_std > 60:
                score -= 0.05

    dilated = cv2.dilate(cnt_mask, np.ones((5, 5), np.uint8), iterations=2)
    border_mask = cv2.subtract(dilated, cnt_mask)
    if np.any(border_mask) and np.any(cnt_mask):
        inner_mean = np.mean(bgr_img[cnt_mask > 0])
        outer_mean = np.mean(bgr_img[border_mask > 0])
        contrast = abs(inner_mean - outer_mean) / 255.0
        score += contrast * 0.2

    return max(0.0, min(1.0, score))


def bbox_iou(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> float:
    """Compute IoU between two (x1, y1, x2, y2) bounding boxes."""
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])
    x2, y2 = min(a[2], b[2]), min(a[3], b[3])
    if x2 <= x1 or y2 <= y1:
        return 0.0
    intersection = (x2 - x1) * (y2 - y1)
    area_a = (a[2] - a[0]) * (a[3] - a[1])
    area_b = (b[2] - b[0]) * (b[3] - b[1])
    return intersection / max(area_a + area_b - intersection, 1e-6)
