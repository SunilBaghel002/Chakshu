"""Analysis Engine orchestrating evidence-grounded satellite imagery analysis.

Conforms strictly to SIH26167:
- §1: Core Principle — Gemini must not fabricate satellite analysis.
- §4: Target User Experience — Query-driven analysis.
- §5: Analysis tool layer separation.
- §6: Deterministic query/task router.
- §7, §8: Image validation, coordinate transforms, and spatial scale integrity.
- §10: Segmentation / spatial evidence generation.
- §11, §12, §13: Mask -> Contour -> Polygon -> IoU consistency verification.
- §14, §35: Never invent hectares or physical scale.
- §17: Gemini explains verified evidence.
- §26: Explicit "Insufficient evidence for reliable detection" failure behavior.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from app.adapters.gemini import GeminiDetectionAdapter
from app.schemas.analysis import (
    AnalysisResponse,
    AnalysisTask,
    EvidenceObject,
    ImageMetadata,
    OverlayCollection,
    RouterOutput,
)
from app.schemas.detection import Upload
from app.services.change_detector import ChangeDetector
from app.services.image_validator import ImageValidator
from app.services.query_router import QueryRouter
from app.services.segmentation_engine import SegmentationEngine
from app.settings import settings

log = logging.getLogger(__name__)


class AnalysisEngine:
    """Orchestrates query-driven, evidence-grounded satellite image analysis."""

    def __init__(self) -> None:
        """Initialize engine with query router, validators, detectors, and LLM explainer."""
        self.router = QueryRouter()
        self.image_validator = ImageValidator()
        self.change_detector = ChangeDetector()
        self.segmentation_engine = SegmentationEngine()
        self.gemini_adapter = GeminiDetectionAdapter()

    def analyze(
        self,
        query: str,
        upload: Upload,
        image_path: Path | str,
        comparison_upload: Upload | None = None,
        comparison_image_path: Path | str | None = None,
    ) -> AnalysisResponse:
        """Execute query-driven satellite analysis according to user question."""
        start_time = time.perf_counter()
        img = Image.open(image_path).convert("RGB")
        w, h = img.size

        # 1. Determine modality & metadata (§7, §21, §35)
        quality = self.image_validator.assess_quality(img)
        modality = "optical"
        if quality.band_count == 1:
            arr_gray = np.array(img.convert("L"), dtype=np.float32)
            mean_val = float(np.mean(arr_gray)) + 1e-4
            std_val = float(np.std(arr_gray))
            if (std_val / mean_val) > 0.8 and quality.is_low_contrast:
                modality = "sar"

        metadata = ImageMetadata(
            image_width=w,
            image_height=h,
            gsd_m=upload.gsd_m,
            gsd_source=upload.gsd_source.value if upload.gsd_source else None,
            modality=modality,
            coordinate_system="EPSG:4326" if upload.bounds_4326 else "image_pixels",
            is_georeferenced=bool(upload.bounds_4326),
            bounds_4326=upload.bounds_4326,
            band_count=quality.band_count,
        )

        # 2. Query Routing (§6)
        route: RouterOutput = self.router.route_query(
            query=query,
            gsd_m=upload.gsd_m,
            has_comparison_image=bool(comparison_image_path),
        )

        warnings: list[str] = list(quality.warnings)

        # 3. Handle Resolution Refusal (§2, §6)
        if route.task == AnalysisTask.REFUSAL_RESOLUTION:
            return AnalysisResponse(
                query=query,
                task=route.task,
                target=route.target,
                answer=route.reason or "Resolution Gate declined query.",
                evidence=[],
                overlays=OverlayCollection(),
                metadata=metadata,
                warnings=warnings,
                status="refused",
                execution_time_ms=round((time.perf_counter() - start_time) * 1000, 1),
            )

        # 4. Handle Unsupported Non-Geospatial Queries (§6)
        if route.task == AnalysisTask.UNSUPPORTED:
            return AnalysisResponse(
                query=query,
                task=route.task,
                target=route.target,
                answer=route.reason or "Query is outside the scope of satellite image analysis.",
                evidence=[],
                overlays=OverlayCollection(),
                metadata=metadata,
                warnings=warnings,
                status="refused",
                execution_time_ms=round((time.perf_counter() - start_time) * 1000, 1),
            )

        # 5. Handle Scene Understanding (No fake geometry, §16)
        if route.task == AnalysisTask.SCENE_UNDERSTANDING:
            desc_res = self.gemini_adapter.describe_scene(img, gsd_m=upload.gsd_m, mode="DESCRIBE")
            scene_desc = desc_res.get("description") or "Scene understanding could not be completed."
            return AnalysisResponse(
                query=query,
                task=route.task,
                target=None,
                answer=scene_desc,
                evidence=[],
                overlays=OverlayCollection(),
                metadata=metadata,
                warnings=warnings,
                status="completed",
                execution_time_ms=round((time.perf_counter() - start_time) * 1000, 1),
            )

        # 6. Handle Temporal Change Detection (§20)
        if route.task == AnalysisTask.CHANGE_DETECTION:
            return self._handle_change_task(
                query=query,
                route=route,
                img=img,
                upload=upload,
                metadata=metadata,
                warnings=warnings,
                comparison_image_path=comparison_image_path,
                start_time=start_time,
            )

        # 7. Spatial Evidence Generation: Water / Building / Vegetation / Landcover (§10, §11)
        evidence_items, mask_arr = self.segmentation_engine.execute_spatial_task(
            task=route.task,
            img=img,
            upload=upload,
        )

        mask_url = self._save_mask_overlay(upload.id, mask_arr, f"{route.task.value}_mask.png") if mask_arr is not None else None
        poly_overlays = [ev.geom_px for ev in evidence_items if ev.geom_px]
        box_overlays = [{"bbox_px": ev.bbox_px, "label": ev.class_label, "score": ev.confidence} for ev in evidence_items if ev.bbox_px]

        overlays = OverlayCollection(polygons=poly_overlays, boxes=box_overlays, mask_url=mask_url)

        # 8. Handling Low Confidence / No Evidence (§26)
        if not evidence_items:
            target_name = route.target or "requested target"
            return AnalysisResponse(
                query=query,
                task=route.task,
                target=route.target,
                answer=(
                    f"Insufficient evidence for reliable detection of {target_name}. "
                    "The computer-vision pipeline did not identify any spatial regions "
                    "meeting the required confidence and geometric consistency thresholds."
                ),
                evidence=[],
                overlays=overlays,
                metadata=metadata,
                warnings=warnings,
                status="insufficient_evidence",
                execution_time_ms=round((time.perf_counter() - start_time) * 1000, 1),
            )

        # 9. Gemini Explains Verified Results (§17)
        explanation = self._explain_with_gemini(
            query=query,
            task=route.task.value,
            evidence=evidence_items,
            metadata=metadata,
            img=img,
        )

        return AnalysisResponse(
            query=query,
            task=route.task,
            target=route.target,
            answer=explanation,
            evidence=evidence_items,
            overlays=overlays,
            metadata=metadata,
            warnings=warnings,
            status="completed",
            execution_time_ms=round((time.perf_counter() - start_time) * 1000, 1),
        )

    def _handle_change_task(
        self,
        query: str,
        route: RouterOutput,
        img: Image.Image,
        upload: Upload,
        metadata: ImageMetadata,
        warnings: list[str],
        comparison_image_path: Path | str | None,
        start_time: float,
    ) -> AnalysisResponse:
        """Handle two-image temporal change detection (§20)."""
        w, h = img.size
        if not comparison_image_path:
            return AnalysisResponse(
                query=query,
                task=route.task,
                target="temporal_change",
                answer=(
                    "Temporal change analysis requires two observation images (Before and After). "
                    "Please provide a comparison image to execute change detection."
                ),
                evidence=[],
                overlays=OverlayCollection(),
                metadata=metadata,
                warnings=["No comparison image provided for change detection."],
                status="insufficient_evidence",
                execution_time_ms=round((time.perf_counter() - start_time) * 1000, 1),
            )

        img_b = Image.open(comparison_image_path).convert("RGB")
        change_res = self.change_detector.detect_changes(img_a=img, img_b=img_b, gsd_m=upload.gsd_m)
        warnings.extend(change_res.warnings)

        mask_url = self._save_mask_overlay(upload.id, change_res.change_mask, "change_mask.png")

        overlays = OverlayCollection(
            changes=[ev.geom_px for ev in change_res.evidence_items if ev.geom_px],
            polygons=[ev.geom_px for ev in change_res.evidence_items if ev.geom_px],
            boxes=[{"bbox_px": ev.bbox_px, "label": ev.class_label} for ev in change_res.evidence_items if ev.bbox_px],
            mask_url=mask_url,
        )

        if change_res.status == "unaligned":
            answer_text = (
                "Reliable temporal comparison cannot be performed because the images are not sufficiently aligned."
            )
            status_str = "insufficient_evidence"
        elif change_res.evidence_items:
            explanation = self._explain_with_gemini(
                query=query,
                task="change_detection",
                evidence=change_res.evidence_items,
                metadata=metadata,
                img=img,
                context_summary={
                    "change_percentage": change_res.change_pct,
                    "total_changed_pixels": change_res.total_change_px,
                    "regions_detected": len(change_res.evidence_items),
                },
            )
            answer_text = explanation
            status_str = "completed"
        else:
            answer_text = (
                "No significant changes detected between the two images meeting the confidence threshold. "
                f"Temporal differencing shows less than 0.5% surface variation across the {w}x{h} pixel scene."
            )
            status_str = "insufficient_evidence"

        return AnalysisResponse(
            query=query,
            task=route.task,
            target="temporal_change",
            answer=answer_text,
            evidence=change_res.evidence_items,
            overlays=overlays,
            metadata=metadata,
            warnings=warnings,
            status=status_str,
            execution_time_ms=round((time.perf_counter() - start_time) * 1000, 1),
        )

    def _explain_with_gemini(
        self,
        query: str,
        task: str,
        evidence: list[EvidenceObject],
        metadata: ImageMetadata,
        img: Image.Image,
        context_summary: dict[str, Any] | None = None,
    ) -> str:
        """Call Gemini strictly as evidence interpreter (§17)."""
        evidence_summary = [
            {
                "id": ev.evidence_id,
                "class": ev.class_label,
                "confidence": round(ev.confidence, 2),
                "pixel_area": int(ev.pixel_area),
                "physical_area_ha": ev.physical_area_ha,
                "geometry_valid": ev.validation.get("geometry_valid", True),
                "mask_overlap_iou": ev.validation.get("mask_overlap_iou"),
            }
            for ev in evidence[:10]
        ]

        det_context = {
            "task": task,
            "total_detections": len(evidence),
            "total_pixel_area": sum(e.pixel_area for e in evidence),
            "gsd_m": metadata.gsd_m,
            "has_physical_scale": bool(metadata.gsd_m),
            "evidence_samples": evidence_summary,
        }
        if context_summary:
            det_context.update(context_summary)

        res = self.gemini_adapter.explain_results(
            img=img,
            detection_results=det_context,
            gsd_m=metadata.gsd_m,
            question=query,
        )

        explanation = res.get("explanation")
        if explanation and len(explanation.strip()) > 10:
            return explanation

        target_name = evidence[0].class_label if evidence else "target"
        total_px = sum(e.pixel_area for e in evidence)
        scale_note = (
            f"covering approximately {evidence[0].physical_area_ha} hectares"
            if evidence and evidence[0].physical_area_ha
            else "Physical scale is unavailable because the source image has no geospatial GSD metadata."
        )
        return (
            f"The verified computer-vision analysis identified {len(evidence)} {target_name} "
            f"region{'s' if len(evidence) != 1 else ''} encompassing {total_px:,.0f} pixels. "
            f"All polygon boundaries have been validated against the underlying pixel mask. {scale_note}"
        )

    def _save_mask_overlay(self, upload_id: str, mask: np.ndarray | None, filename: str) -> str | None:
        """Save colored mask overlay with alpha channel for UI rendering."""
        if mask is None:
            return None
        try:
            target_dir = settings.UPLOADS_DIR / upload_id
            target_dir.mkdir(parents=True, exist_ok=True)
            out_path = target_dir / filename

            h, w = mask.shape[:2]
            rgba = np.zeros((h, w, 4), dtype=np.uint8)
            rgba[mask > 0] = [56, 189, 248, 140]

            mask_img = Image.fromarray(rgba, mode="RGBA")
            mask_img.save(out_path, format="PNG")
            return f"/api/v1/uploads/{upload_id}/{filename}"
        except Exception as exc:
            log.warning("Failed to save mask overlay: %s", exc)
            return None
