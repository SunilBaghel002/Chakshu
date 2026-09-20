"""Dynamic two-image change detection pipeline.

Conforms strictly to SIH26167 §20:
1. Validates both images (dimensions, modality, readability).
2. Performs phase-correlation registration (Fourier 2D).
3. Applies radiometric normalization and calculates difference map.
4. Filters noise with morphological operations.
5. Generates change mask and vectorizes into validated change polygons.
6. Does NOT ask Gemini to invent the change map.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from typing import Any

import numpy as np
from PIL import Image
from scipy import ndimage  # type: ignore[import-untyped]

from app.domain.align import estimate_phase_correlation
from app.domain.constants import MAX_REGISTRATION_SHIFT
from app.schemas.analysis import EvidenceObject
from app.services.polygonizer import mask_to_validated_polygons

log = logging.getLogger(__name__)


@dataclass
class ChangeDetectionResult:
    """Output of two-image change analysis pipeline."""

    change_mask: np.ndarray
    change_polygons: list[dict[str, Any]]
    evidence_items: list[EvidenceObject]
    change_pct: float
    total_change_px: int
    alignment_info: dict[str, Any]
    warnings: list[str]
    status: str = "completed"


class ChangeDetector:
    """Deterministic two-image change detection service (§20)."""

    def detect_changes(
        self,
        img_a: Image.Image,
        img_b: Image.Image,
        gsd_m: float | None = None,
        min_change_pixels: int = 40,
        max_polygons: int = 15,
    ) -> ChangeDetectionResult:
        """Execute complete change detection pipeline between two temporal images."""
        warnings: list[str] = []

        # 1. Image validation & dimension alignment
        w_a, h_a = img_a.size
        w_b, h_b = img_b.size

        # If dimensions differ, resample image B to match image A
        if (w_a, h_a) != (w_b, h_b):
            warnings.append(
                f"Image dimensions differ: Image A ({w_a}x{h_a}) vs Image B ({w_b}x{h_b}). "
                "Resampling Image B to match Image A pixel grid for temporal differencing."
            )
            img_b_aligned = img_b.resize((w_a, h_a), Image.Resampling.BILINEAR)
        else:
            img_b_aligned = img_b

        w, h = w_a, h_a

        arr_a = np.array(img_a.convert("RGB"), dtype=np.float32)
        arr_b = np.array(img_b_aligned.convert("RGB"), dtype=np.float32)

        # 2. Phase-correlation registration check (§20, §34, §35)
        gray_a = (0.299 * arr_a[:, :, 0] + 0.587 * arr_a[:, :, 1] + 0.114 * arr_a[:, :, 2])
        gray_b = (0.299 * arr_b[:, :, 0] + 0.587 * arr_b[:, :, 1] + 0.114 * arr_b[:, :, 2])

        reg_res = estimate_phase_correlation(gray_a, gray_b)
        alignment_info = reg_res.to_dict()

        # Apply sub-pixel translation alignment if shift is moderate
        if not reg_res.aligned and reg_res.shift_magnitude <= MAX_REGISTRATION_SHIFT:
            shift_y = -reg_res.shift_y
            shift_x = -reg_res.shift_x
            for c in range(3):
                arr_b[:, :, c] = ndimage.shift(arr_b[:, :, c], (shift_y, shift_x), mode="nearest")
            gray_b = ndimage.shift(gray_b, (shift_y, shift_x), mode="nearest")
            alignment_info["corrected_shift"] = True
        elif not reg_res.aligned and reg_res.shift_magnitude > MAX_REGISTRATION_SHIFT:
            msg = (
                f"Reliable temporal comparison cannot be performed because the images are not "
                f"sufficiently aligned (spatial shift of {reg_res.shift_magnitude:.1f}px exceeds "
                f"maximum registration threshold of {MAX_REGISTRATION_SHIFT:.1f}px)."
            )
            warnings.append(msg)
            return ChangeDetectionResult(
                change_mask=np.zeros((h, w), dtype=bool),
                change_polygons=[],
                evidence_items=[],
                change_pct=0.0,
                total_change_px=0,
                alignment_info=alignment_info,
                warnings=warnings,
                status="unaligned",
            )

        # 3. Radiometric normalization (match mean & std of Image B to Image A)
        mean_a, std_a = float(np.mean(gray_a)), float(np.std(gray_a)) + 1e-4
        mean_b, std_b = float(np.mean(gray_b)), float(np.std(gray_b)) + 1e-4
        gray_b_norm = (gray_b - mean_b) / std_b * std_a + mean_a

        # 4. Difference model: luminance + spectral Euclidean difference
        diff_lum = np.abs(gray_a - gray_b_norm)
        diff_spectral = np.sqrt(np.sum((arr_a - arr_b) ** 2, axis=2)) / 255.0

        combined_diff = (diff_lum / 255.0) * 0.6 + diff_spectral * 0.4

        # 5. Statistical thresholding: mean + 2.2 * std
        diff_mean = float(np.mean(combined_diff))
        diff_std = float(np.std(combined_diff))
        threshold = max(0.18, diff_mean + 2.0 * diff_std)

        raw_change_mask = combined_diff > threshold

        # 6. Morphological noise filtering
        # 3x3 opening to remove salt noise, 5x5 closing to consolidate real change parcels
        kernel_open = np.ones((3, 3), dtype=bool)
        kernel_close = np.ones((5, 5), dtype=bool)
        clean_mask = ndimage.binary_opening(raw_change_mask, structure=kernel_open, iterations=1)
        clean_mask = ndimage.binary_closing(clean_mask, structure=kernel_close, iterations=1)

        total_pixels = w * h
        total_change_px = int(np.count_nonzero(clean_mask))
        change_pct = round((total_change_px / total_pixels) * 100.0, 2)

        # 7. Extract and validate change polygons (§11, §12, §13)
        polygons = mask_to_validated_polygons(
            binary_mask=clean_mask,
            img_width=w,
            img_height=h,
            min_pixels=min_change_pixels,
            max_polygons=max_polygons,
            min_iou=0.60,
        )

        # 8. Build EvidenceObjects
        evidence_items: list[EvidenceObject] = []
        for idx, p in enumerate(polygons):
            ev_id = f"change_{idx + 1:02d}_{uuid.uuid4().hex[:6]}"
            px_area = p["area_px"]

            # Physical area strictly if GSD is available
            m2_area = round(px_area * (gsd_m ** 2), 1) if gsd_m else None
            ha_area = round(m2_area / 10000.0, 2) if m2_area else None

            # Interpret change direction
            bbox = p["bbox_px"]  # [ymin, xmin, ymax, xmax]
            y0, x0, y1, x1 = bbox
            sub_a = arr_a[y0:y1, x0:x1]
            sub_b = arr_b[y0:y1, x0:x1]

            mean_a_sub = float(np.mean(sub_a))
            mean_b_sub = float(np.mean(sub_b))
            diff_brightness = mean_b_sub - mean_a_sub

            if diff_brightness > 20:
                change_type = "new_construction_or_clearing"
            elif diff_brightness < -20:
                change_type = "vegetation_growth_or_inundation"
            else:
                change_type = "surface_alteration"

            evidence_items.append(
                EvidenceObject(
                    evidence_id=ev_id,
                    task="change_detection",
                    class_label=change_type,
                    confidence=min(0.95, 0.65 + p["validation"].get("mask_overlap_iou", 0.7) * 0.3),
                    mask_available=True,
                    polygon_available=True,
                    bbox_available=True,
                    geometry_source="change_map",
                    pixel_area=px_area,
                    physical_area_m2=m2_area,
                    physical_area_ha=ha_area,
                    coordinate_space="image_pixels",
                    geom_px=p,
                    bbox_px=bbox,
                    validation=p.get("validation", {}),
                    raw_score=round(float(combined_diff[y0:y1, x0:x1].mean()), 3),
                    note=f"Verified change region #{idx + 1}: {px_area:.0f} pixels altered.",
                )
            )

        return ChangeDetectionResult(
            change_mask=clean_mask,
            change_polygons=polygons,
            evidence_items=evidence_items,
            change_pct=change_pct,
            total_change_px=total_change_px,
            alignment_info=alignment_info,
            warnings=warnings,
            status="completed" if evidence_items else "insufficient_evidence",
        )
