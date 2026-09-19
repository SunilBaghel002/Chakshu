"""Computer-vision-based deterministic detection service for Chakshu.

Provides pixel-grounded object and feature detection using classical
OpenCV methods. Every polygon and bounding box originates from actual
image contours and connected components — never from LLM text output.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import numpy as np
from PIL import Image

try:
    import cv2  # type: ignore[import-untyped]
except ImportError:
    cv2 = None

from app.services.cv_utils import (
    MIN_CONTOUR_AREA_PX,
    bbox_iou,
    compute_confidence,
    contour_to_geojson,
    describe_roi,
    simplify_contour,
)

log = logging.getLogger(__name__)

HSV_WATER_RANGES: list[tuple[str, tuple[int, int, int], tuple[int, int, int]]] = [
    ("water", (90, 25, 20), (140, 255, 200)),
    ("water", (85, 15, 10), (105, 255, 180)),
]

HSV_VEGETATION_RANGES: list[tuple[str, tuple[int, int, int], tuple[int, int, int]]] = [
    ("vegetation", (30, 30, 30), (90, 255, 230)),
]

HSV_BUILT_RANGES: list[tuple[str, tuple[int, int, int], tuple[int, int, int]]] = [
    ("built", (0, 0, 120), (180, 40, 255)),
]


@dataclass
class CVDetection:
    """A single detection from the CV pipeline with pixel-grounded geometry."""

    label: str
    contour_px: np.ndarray
    bbox_px: tuple[int, int, int, int]
    area_px: float
    score: float
    score_source: str = "cv_classical"
    method: str = "color_segmentation"
    evidence: str = ""
    polygon_geojson: dict[str, Any] = field(default_factory=dict)


class CVDetector:
    """Deterministic feature detector using classical computer vision."""

    def __init__(self) -> None:
        """Initialize CV detector, verifying OpenCV availability."""
        if cv2 is None:
            log.warning("OpenCV not available; CV detector will use fallback PIL methods")
        self._cv2_available = cv2 is not None

    def detect_features(
        self,
        img: Image.Image,
        target_classes: list[str] | None = None,
        min_area_px: int = MIN_CONTOUR_AREA_PX,
        max_detections: int = 30,
    ) -> list[CVDetection]:
        """Run full detection pipeline on an image."""
        if not self._cv2_available:
            return self._fallback_detection(img, target_classes, min_area_px, max_detections)

        rgb_arr = np.array(img.convert("RGB"))
        bgr_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)

        detections: list[CVDetection] = []
        classes = target_classes or ["water", "vegetation", "built", "building"]

        if "water" in classes:
            detections.extend(self._segment_hsv(bgr_arr, HSV_WATER_RANGES, min_area_px))
        if "vegetation" in classes:
            detections.extend(self._segment_hsv(bgr_arr, HSV_VEGETATION_RANGES, min_area_px))
        if "built" in classes:
            detections.extend(self._segment_hsv(bgr_arr, HSV_BUILT_RANGES, min_area_px))
        if "building" in classes or "built" in classes:
            detections.extend(self._detect_edges(bgr_arr, min_area_px))

        detections = self._deduplicate(detections, iou_threshold=0.4)
        for det in detections:
            if not det.polygon_geojson:
                det.polygon_geojson = contour_to_geojson(det.contour_px)

        detections.sort(key=lambda d: d.score, reverse=True)
        return detections[:max_detections]

    def _segment_hsv(
        self,
        bgr_img: np.ndarray,
        ranges: list[tuple[str, tuple[int, int, int], tuple[int, int, int]]],
        min_area_px: int,
    ) -> list[CVDetection]:
        """Segment image by HSV color ranges."""
        hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
        detections: list[CVDetection] = []

        for label, lower, upper in ranges:
            lower_np = np.array(lower, dtype=np.uint8)
            upper_np = np.array(upper, dtype=np.uint8)
            mask = cv2.inRange(hsv, lower_np, upper_np)

            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)

            dets = self._extract_detections_from_mask(mask, bgr_img, label, min_area_px)
            detections.extend(dets)

        return detections

    def _detect_edges(self, bgr_img: np.ndarray, min_area_px: int) -> list[CVDetection]:
        """Detect structural features (buildings, tanks) via Canny edges."""
        gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.bilateralFilter(gray, 9, 75, 75)
        edges = cv2.Canny(blurred, 50, 150)

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges = cv2.dilate(edges, kernel, iterations=1)

        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        detections: list[CVDetection] = []

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area_px * 2:
                continue

            rect = cv2.minAreaRect(cnt)
            rect_area = rect[1][0] * rect[1][1]
            if rect_area == 0:
                continue
            rectangularity = area / rect_area

            if rectangularity > 0.6:
                label = "building"
                score = min(0.9, 0.5 + rectangularity * 0.3)
            elif rectangularity > 0.75:
                perimeter = cv2.arcLength(cnt, True)
                circularity = (4 * np.pi * area) / (perimeter * perimeter) if perimeter > 0 else 0
                if circularity > 0.7:
                    label = "storage_tank"
                    score = min(0.85, 0.5 + circularity * 0.3)
                else:
                    continue
            else:
                continue

            x, y, w, h = cv2.boundingRect(cnt)
            simplified = simplify_contour(cnt)

            detections.append(CVDetection(
                label=label,
                contour_px=simplified,
                bbox_px=(x, y, x + w, y + h),
                area_px=float(area),
                score=score,
                method="edge_structure",
                evidence=f"Detected via edge analysis, rectangularity={rectangularity:.2f}",
            ))

        return detections

    def _extract_detections_from_mask(
        self,
        mask: np.ndarray,
        bgr_img: np.ndarray,
        class_name: str,
        min_area_px: int,
    ) -> list[CVDetection]:
        """Extract individual detections from a binary mask using contour analysis."""
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        detections: list[CVDetection] = []
        h_img, w_img = bgr_img.shape[:2]
        total_pixels = h_img * w_img

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area_px:
                continue

            score = compute_confidence(cnt, mask, bgr_img, class_name, area, total_pixels)
            if score < 0.3:
                continue

            x, y, w, h = cv2.boundingRect(cnt)
            simplified = simplify_contour(cnt)
            roi = bgr_img[max(0, y):min(h_img, y + h), max(0, x):min(w_img, x + w)]
            evidence = describe_roi(roi, class_name, area)

            detections.append(CVDetection(
                label=class_name,
                contour_px=simplified,
                bbox_px=(x, y, x + w, y + h),
                area_px=float(area),
                score=round(score, 3),
                method="color_segmentation",
                evidence=evidence,
            ))

        return detections

    def _deduplicate(self, detections: list[CVDetection], iou_threshold: float = 0.5) -> list[CVDetection]:
        """Remove overlapping detections using bounding-box IoU."""
        if len(detections) <= 1:
            return detections

        detections.sort(key=lambda d: d.score, reverse=True)
        keep: list[CVDetection] = []

        for det in detections:
            if not any(bbox_iou(det.bbox_px, kept.bbox_px) > iou_threshold for kept in keep):
                keep.append(det)

        return keep

    def _fallback_detection(
        self,
        img: Image.Image,
        target_classes: list[str] | None,
        min_area_px: int,
        max_detections: int,
    ) -> list[CVDetection]:
        """Pure NumPy fallback when OpenCV is not available."""
        from scipy import ndimage

        arr = np.array(img.convert("RGB"), dtype=np.float32) / 255.0
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        h_img, w_img = arr.shape[:2]

        detections: list[CVDetection] = []
        classes = target_classes or ["water", "vegetation", "built"]

        for cls in classes:
            if cls == "water":
                mask = (b > r + 0.05) & (b > g) & (np.mean(arr, axis=2) < 0.45)
            elif cls == "vegetation":
                mask = (2 * g - r - b) > 0.08
            elif cls == "built":
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                sat = np.max(arr, axis=2) - np.min(arr, axis=2)
                mask = (sat < 0.15) & (lum > 0.25) & (lum < 0.85)
            else:
                continue

            labeled, n_features = ndimage.label(mask.astype(np.uint8))
            for idx in range(1, min(n_features + 1, max_detections + 1)):
                component = labeled == idx
                area = int(np.count_nonzero(component))
                if area < min_area_px:
                    continue

                ys, xs = np.where(component)
                x1, x2 = int(np.min(xs)), int(np.max(xs))
                y1, y2 = int(np.min(ys)), int(np.max(ys))
                contour = np.array([[x1, y1], [x2, y1], [x2, y2], [x1, y2]])
                area_ratio = area / (h_img * w_img)
                score = max(0.3, min(0.8, 0.5 + (1.0 - abs(area_ratio - 0.1)) * 0.3))

                detections.append(CVDetection(
                    label=cls,
                    contour_px=contour,
                    bbox_px=(x1, y1, x2, y2),
                    area_px=float(area),
                    score=round(score, 3),
                    method="fallback_numpy",
                    evidence=f"{cls} region, {area} px², fallback detection",
                ))

        detections.sort(key=lambda d: d.score, reverse=True)
        return detections[:max_detections]
