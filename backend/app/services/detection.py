"""Pixel-grounded detection orchestration for one uploaded image."""

from __future__ import annotations

import collections
import logging
import math
import uuid
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from app.adapters.gemini import GeminiDetectionAdapter
from app.adapters.worldcover import WorldCoverAdapter
from app.domain.bbox import BboxReject, PixelBox, apply_class_nms, normalise_bbox, normalize_label
from app.domain.constants import MAX_ASPECT_RATIO, MIN_ASPECT_RATIO, MIN_BOX_AREA_PX
from app.domain.landcover import compute_landcover_summary, vectorize_class_mask
from app.domain.models import SatelliteSegmentationModel
from app.schemas.common import CapabilityTier, DetectionKind, DetectionTrack, ProvenanceSource
from app.schemas.detection import (
    CoverageClassItem,
    CoverageSummary,
    CountsSummary,
    Detection,
    DetectionSet,
    RejectionDetail,
    RejectionsSummary,
    Upload,
)
from app.services.image_validator import ImageValidator

log = logging.getLogger(__name__)
ALLOWED_OBJECT_CLASSES = {
    "aircraft", "building", "container", "road", "ship",
    "storage_tank", "swimming_pool", "tower", "vehicle",
}
NOTABLE_BUILDING_TERMS = {
    "large", "isolated", "distinctive", "industrial", "infrastructure",
    "operational", "warehouse", "facility", "hangar", "plant", "terminal",
}



class DetectionService:
    """Runs deterministic pixel land-cover and an independent blind LLM object track."""

    def __init__(self) -> None:
        self.segmenter = SatelliteSegmentationModel()
        self.gemini_adapter = GeminiDetectionAdapter()
        self.worldcover_adapter = WorldCoverAdapter()
        self.image_validator = ImageValidator()

    def run_detection_pipeline(
        self, upload: Upload, image_path: Path | str, mode: str = "reconcile"
    ) -> DetectionSet:
        img = Image.open(image_path).convert("RGB")
        landcover, coverage = self._run_track1_landcover(img, upload)
        track_status: dict[str, str] = {"track_1": "completed", "track_2": "unavailable"}
        worldcover = self._run_track2_worldcover(upload)
        if worldcover:
            track_status["track_2"] = "completed"

        summary = self._pixel_summary(coverage)
        object_detections: list[Detection] = []
        rejections: list[RejectionDetail] = []
        error: str | None = None
        objects_allowed = (
            bool(set(upload.capabilities.object_classes) & ALLOWED_OBJECT_CLASSES)
            and upload.capability_tier != CapabilityTier.T0_UNKNOWN
        )
        if objects_allowed:
            llm = self.gemini_adapter.detect(img, gsd_m=upload.gsd_m, pixel_summary=summary)
            if llm.get("status") == "completed":
                object_detections, rejections = self._validate_proposals(llm.get("objects"), upload)
                explanation = self._valid_explanation(llm.get("explanation"))
                if explanation is None:
                    error = "Gemini returned an invalid explanation"
                    track_status["track_3"] = "failed"
                else:
                    track_status["track_3"] = "completed"
            else:
                explanation = None
                error = str(llm.get("error") or "Gemini object analysis failed")
                track_status["track_3"] = "failed"
        else:
            explanation = None
            track_status["track_3"] = "unavailable_at_resolution_tier"

        completed = error is None
        all_detections = landcover + worldcover + object_detections
        stats = self._stats(upload, coverage, object_detections)
        counts = self._counts(all_detections)
        rejection_counts = collections.Counter(item.reason for item in rejections)
        return DetectionSet(
            upload=upload,
            detections=all_detections,
            coverage=coverage,
            counts=counts,
            rejections=RejectionsSummary(
                count=len(rejections), by_reason=dict(rejection_counts), detail=rejections
            ),
            stats=stats,
            trace_id=f"trace_{uuid.uuid4().hex[:8]}",
            mode=mode.upper(),
            annotated_url=f"/api/v1/uploads/{upload.id}/annotated",
            explanation=explanation,
            status="completed" if completed else "detection_failed",
            error=error,
            merged_landcover_pct={item.label: item.pct for item in coverage.by_class},
            track_status=track_status,
        )

    def _run_track1_landcover(
        self, img: Image.Image, upload: Upload
    ) -> tuple[list[Detection], CoverageSummary]:
        seg_res = self.segmenter.predict(img)
        classified = (
            seg_res.classified_raster
            if seg_res.classified_raster is not None
            else np.full((img.height, img.width), "unclassified")
        )
        raw_summary = compute_landcover_summary(classified)
        coverage = CoverageSummary(
            source_track=DetectionTrack.LANDCOVER_INDEX,
            total_px=raw_summary["total_px"],
            sum_check_pct=raw_summary["sum_check_pct"],
            by_class=[
                CoverageClassItem(
                    label=x["label"],
                    px=x["px"],
                    pct=x["pct"],
                    area_m2=(x["px"] * upload.gsd_m**2 if self._has_gsd(upload) else None),
                )
                for x in raw_summary["by_class"]
            ],
        )
        detections: list[Detection] = []
        # The UI needs bounded, pixel-derived geometries, not every noisy component.
        for label in ("water", "built", "vegetation", "bare", "crop"):
            polygons = vectorize_class_mask(
                classified == label,
                min_pixels=30 if label == "water" else 100,
                is_water=label == "water",
                max_polygons=5 if label == "water" else 30,
            )
            for polygon in polygons:
                area_m2 = polygon["area_px"] * upload.gsd_m**2 if self._has_gsd(upload) else None
                detections.append(
                    Detection(
                        id=str(uuid.uuid4()),
                        track=DetectionTrack.LANDCOVER_INDEX,
                        label=label,
                        label_raw=f"rgb_{label}",
                        kind=DetectionKind.POLYGON,
                        geom_px={"type": "Polygon", "coordinates": polygon["coordinates"]},
                        area_px=float(polygon["area_px"]),
                        area_m2=area_m2,
                        score=1.0,
                        score_source="deterministic",
                        verified=True,
                        verifier_note=f"pixel-derived RGB land-cover (mask_iou={polygon.get('mask_iou', 1.0)})",
                    )
                )

        # Extract isolated building / structural footprints severed from linear road network (§11)
        candidate_mask = seg_res.get_isolated_building_footprints(min_area=150, max_area=40000)
        building_polys = vectorize_class_mask(
            candidate_mask, min_pixels=150, is_water=False, max_polygons=15
        )
        for polygon in building_polys:
            area_m2 = polygon["area_px"] * upload.gsd_m**2 if self._has_gsd(upload) else None
            detections.append(
                Detection(
                    id=str(uuid.uuid4()),
                    track=DetectionTrack.LANDCOVER_INDEX,
                    label="building",
                    label_raw="rgb_building",
                    kind=DetectionKind.POLYGON,
                    geom_px={"type": "Polygon", "coordinates": polygon["coordinates"]},
                    area_px=float(polygon["area_px"]),
                    area_m2=area_m2,
                    score=1.0,
                    score_source="deterministic",
                    verified=True,
                    verifier_note=f"pixel-derived building structure (mask_iou={polygon.get('mask_iou', 1.0)})",
                )
            )
        return detections, coverage

    def _run_track2_worldcover(self, upload: Upload) -> list[Detection]:
        """WorldCover is optional; the adapter returns nothing without a configured real source."""
        if not upload.bounds_4326:
            return []
        result: list[Detection] = []
        for item in self.worldcover_adapter.get_landcover_polygons(
            upload.bounds_4326, upload.width_px, upload.height_px
        ):
            result.append(
                Detection(
                    id=str(uuid.uuid4()),
                    track=DetectionTrack.LANDCOVER_WORLDCOVER,
                    label=item["label"],
                    label_raw=item.get("label_raw"),
                    kind=DetectionKind.POLYGON,
                    geom_px=item["geom_px"],
                    area_px=item["area_px"],
                    area_m2=None,
                    score=1.0,
                    score_source="reference",
                    verified=True,
                    verifier_note=item.get("verifier_note"),
                )
            )
        return result

    def _validate_proposals(
        self, raw_objects: Any, upload: Upload
    ) -> tuple[list[Detection], list[RejectionDetail]]:
        rejections: list[RejectionDetail] = []
        if not isinstance(raw_objects, list):
            return [], [
                RejectionDetail(
                    label_raw="unknown",
                    reason="invalid_objects_payload",
                    detail="objects must be an array",
                )
            ]
        permitted = ALLOWED_OBJECT_CLASSES & set(upload.capabilities.object_classes)
        candidates: list[tuple[PixelBox, float, str, str, str]] = []
        for raw in raw_objects:
            if not isinstance(raw, dict):
                rejections.append(
                    RejectionDetail(
                        label_raw="unknown",
                        reason="invalid_proposal",
                        detail="proposal is not an object",
                    )
                )
                continue
            raw_label = str(raw.get("label", "unknown"))
            label = normalize_label(raw_label)
            evidence = str(raw.get("visual_evidence", "")).strip()
            try:
                score = float(raw.get("score"))
            except (TypeError, ValueError):
                score = math.nan
            if label not in permitted:
                rejections.append(
                    RejectionDetail(
                        label_raw=raw_label,
                        reason="forbidden_label",
                        detail="label is not permitted",
                    )
                )
                continue
            threshold = 0.60 if label == "building" else 0.50
            if not math.isfinite(score) or score < threshold or score > 1:
                rejections.append(
                    RejectionDetail(
                        label_raw=raw_label,
                        reason="score_below_threshold",
                        detail=f"required score is {threshold:.2f}",
                    )
                )
                continue
            if label == "building" and not (
                set(evidence.lower().replace("-", " ").split()) & NOTABLE_BUILDING_TERMS
            ):
                rejections.append(
                    RejectionDetail(
                        label_raw=raw_label,
                        reason="ordinary_building",
                        detail="visual evidence does not establish notability",
                    )
                )
                continue
            bbox = raw.get("bbox")
            if not isinstance(bbox, list):
                rejections.append(
                    RejectionDetail(
                        label_raw=raw_label,
                        reason="invalid_bbox",
                        detail="bbox must be a four-value array",
                    )
                )
                continue
            box = normalise_bbox(bbox, upload.width_px, upload.height_px)
            if isinstance(box, BboxReject):
                rejections.append(
                    RejectionDetail(label_raw=raw_label, reason=box.reason, detail=box.detail)
                )
                continue
            ratio = box.width / max(box.height, 1e-6)
            if not MIN_ASPECT_RATIO <= ratio <= MAX_ASPECT_RATIO or box.area_px < MIN_BOX_AREA_PX:
                rejections.append(
                    RejectionDetail(
                        label_raw=raw_label,
                        reason="invalid_box_geometry",
                        detail="box area or aspect ratio is outside policy",
                    )
                )
                continue
            candidates.append((box, score, label, raw_label, evidence))
        survivors, nms = apply_class_nms(candidates)
        rejections.extend(RejectionDetail(label_raw=a, reason=b, detail=c) for a, b, c in nms)
        survivors.sort(key=lambda item: item[1], reverse=True)
        detections: list[Detection] = []
        buildings = 0
        for box, score, label, raw_label, evidence in survivors:
            if len(detections) == 15:
                rejections.append(RejectionDetail(label_raw=raw_label, reason="cap_reached", detail="maximum 15 objects"))
                continue
            if label == "building":
                if buildings == 10:
                    rejections.append(RejectionDetail(label_raw=raw_label, reason="cap_reached", detail="maximum 10 buildings"))
                    continue
                buildings += 1
            detections.append(
                Detection(
                    id=str(uuid.uuid4()),
                    track=DetectionTrack.OBJECT_MODEL,
                    label=label,
                    label_raw=raw_label,
                    kind=DetectionKind.BOX,
                    geom_px=box.to_geojson_polygon(),
                    area_px=box.area_px,
                    area_m2=(box.area_px * upload.gsd_m**2 if self._has_gsd(upload) else None),
                    score=round(score, 3),
                    score_source="model",
                    verified=False,
                    verifier_note=evidence,
                )
            )
        return detections, rejections

    @staticmethod
    def _valid_explanation(value: Any) -> str | None:
        if not isinstance(value, str):
            return None
        text = " ".join(value.split())
        return text if 80 <= len(text.split()) <= 120 else None

    @staticmethod
    def _has_gsd(upload: Upload) -> bool:
        return bool(upload.gsd_m and upload.gsd_m > 0 and upload.capabilities.area_measurements)

    def _pixel_summary(self, coverage: CoverageSummary) -> dict[str, float]:
        return {
            item.label: item.pct
            for item in coverage.by_class
            if item.label != "unclassified" and item.pct > 0
        }

    def _stats(
        self, upload: Upload, coverage: CoverageSummary, objects: list[Detection]
    ) -> dict[str, Any]:
        area = (
            upload.width_px * upload.height_px * upload.gsd_m**2 if self._has_gsd(upload) else None
        )
        values = {
            item.label: item.pct for item in coverage.by_class if item.label != "unclassified"
        }
        return {
            "total_objects": len(objects),
            "objects_by_class": dict(collections.Counter(x.label for x in objects)),
            "total_area_m2": round(area, 2) if area is not None else None,
            "landcover_area": {
                key: {
                    "pct": value,
                    "m2": round(area * value / 100, 2) if area is not None else None,
                    "ha": round(area * value / 1_000_000, 4) if area is not None else None,
                }
                for key, value in values.items()
            },
        }

    @staticmethod
    def _counts(detections: list[Detection]) -> CountsSummary:
        labels = collections.Counter(x.label for x in detections)
        return CountsSummary(
            by_label=dict(labels),
            total_object_detections=sum(x.kind == DetectionKind.BOX for x in detections),
            total_landcover_detections=sum(x.kind == DetectionKind.POLYGON for x in detections),
            source="computed from this upload",
        )
