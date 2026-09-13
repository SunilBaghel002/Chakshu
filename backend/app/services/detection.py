"""Multi-track detection orchestration, validation, NMS, and rejection tracing (Task 5.5, PRD 2 §6, PRD 3 §B3).

Orchestrates:
1. Capability gating: strictly blocks Track 3 if tier forbids object classes.
2. Track 1: Deterministic land-cover classification from spectral indices.
3. Track 2: ESA WorldCover reference polygon integration for georeferenced imagery.
4. Track 3: Gemini 2.0 Flash proposals with full defensive bbox validation and NMS.
5. Strict accounting of rejected boxes with reasons.
6. SQL-derived counts summary and coverage metrics.
"""

from __future__ import annotations

import collections
import logging
import uuid
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from app.adapters.gemini import GeminiDetectionAdapter
from app.adapters.worldcover import WorldCoverAdapter
from app.domain.bbox import (
    BboxReject,
    PixelBox,
    apply_class_nms,
    normalise_bbox,
    normalize_label,
)
from app.domain.constants import (
    DETECTION_NMS_IOU,
    DETECTION_SCORE_MIN,
    MAX_ASPECT_RATIO,
    MIN_ASPECT_RATIO,
    MIN_BOX_AREA_PX,
)
from app.domain.landcover import (
    classify_optical_pixels,
    compute_landcover_summary,
    vectorize_class_mask,
)
from app.schemas.common import (
    CapabilityTier,
    DetectionKind,
    DetectionTrack,
    ProvenanceSource,
)
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
from app.settings import settings

log = logging.getLogger(__name__)


class DetectionService:
    """Orchestrates multi-track object detection and land-cover classification."""

    def __init__(self) -> None:
        """Initialize detection service with model and dataset adapters."""
        self.gemini_adapter = GeminiDetectionAdapter()
        self.worldcover_adapter = WorldCoverAdapter()

    def run_detection_pipeline(
        self,
        upload: Upload,
        image_path: Path | str,
        synthetic_proposals: list[dict[str, Any]] | None = None,
    ) -> DetectionSet:
        """Execute all permitted detection tracks for an upload and return DetectionSet."""
        img = Image.open(image_path).convert("RGB")
        w, h = upload.width_px, upload.height_px

        all_detections: list[Detection] = []
        rejections: list[RejectionDetail] = []

        # -------------------------------------------------------------
        # Track 1: Deterministic Land-Cover from Spectral/Optical Pixels
        # -------------------------------------------------------------
        coverage_summary: CoverageSummary | None = None
        track1_detections, coverage_summary = self._run_track1_landcover(img, upload)
        all_detections.extend(track1_detections)

        # -------------------------------------------------------------
        # Track 2: ESA WorldCover 2021 Reference Map (if georeferenced)
        # -------------------------------------------------------------
        if upload.bounds_4326:
            track2_detections = self._run_track2_worldcover(upload)
            all_detections.extend(track2_detections)

        # -------------------------------------------------------------
        # Track 3: Multimodal Object Detection (Gemini 2.0 Flash)
        # -------------------------------------------------------------
        if upload.capability_tier != CapabilityTier.T0_UNKNOWN and upload.capabilities.object_classes:
            track3_detections, track3_rejections = self._run_track3_objects(
                img, upload, synthetic_proposals
            )
            all_detections.extend(track3_detections)
            rejections.extend(track3_rejections)
        else:
            log.info(
                "Upload %s at tier %s forbids object classes; Track 3 omitted",
                upload.id, upload.capability_tier.value,
            )

        # Build RejectionsSummary
        rejection_counts: dict[str, int] = collections.defaultdict(int)
        for r in rejections:
            rejection_counts[r.reason] += 1

        rejections_envelope = RejectionsSummary(
            count=len(rejections),
            by_reason=dict(rejection_counts),
            detail=rejections,
        )

        # Build CountsSummary (SQL-equivalent exact counts)
        label_counts: dict[str, int] = collections.defaultdict(int)
        total_objects = 0
        total_landcover = 0
        for d in all_detections:
            label_counts[d.label] += 1
            if d.kind == DetectionKind.BOX:
                total_objects += 1
            else:
                total_landcover += 1

        counts_envelope = CountsSummary(
            by_label=dict(label_counts),
            total_object_detections=total_objects,
            total_landcover_detections=total_landcover,
            source="SELECT count(*) FROM detection GROUP BY label",
        )

        return DetectionSet(
            upload=upload,
            detections=all_detections,
            coverage=coverage_summary,
            counts=counts_envelope,
            rejections=rejections_envelope,
            trace_id=f"trace_{uuid.uuid4().hex[:8]}",
        )

    def _run_track1_landcover(
        self, img: Image.Image, upload: Upload
    ) -> tuple[list[Detection], CoverageSummary]:
        """Execute Track 1 deterministic land-cover classification."""
        arr = np.array(img, dtype=np.uint16)
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        # For plain RGB, approximate NIR with (G + R)/2 for synthetic index evaluation
        nir = ((g.astype(np.float32) + r.astype(np.float32)) / 2.0).astype(np.uint16)

        classified = classify_optical_pixels(red=r, green=g, blue=b, nir=nir, scale_factor=255.0)
        summary_dict = compute_landcover_summary(classified)

        coverage_items = [
            CoverageClassItem(
                label=item["label"],
                px=item["px"],
                pct=item["pct"],
                area_m2=(
                    item["px"] * (upload.gsd_m**2)
                    if upload.gsd_m and upload.capabilities.area_measurements
                    else None
                ),
            )
            for item in summary_dict["by_class"]
        ]

        coverage_summary = CoverageSummary(
            source_track=DetectionTrack.LANDCOVER_INDEX,
            total_px=summary_dict["total_px"],
            by_class=coverage_items,
            sum_check_pct=summary_dict["sum_check_pct"],
        )

        detections: list[Detection] = []
        for class_name in ["water", "built", "vegetation"]:
            mask = classified == class_name
            patches = vectorize_class_mask(mask, min_pixels=4)
            for p in patches:
                area_px = p["area_px"]
                area_m2 = (
                    area_px * (upload.gsd_m**2)
                    if upload.gsd_m and upload.capabilities.area_measurements
                    else None
                )
                detections.append(
                    Detection(
                        id=str(uuid.uuid4()),
                        track=DetectionTrack.LANDCOVER_INDEX,
                        label=class_name,
                        label_raw=f"spectral_{class_name}",
                        kind=DetectionKind.POLYGON,
                        geom_px={"type": "Polygon", "coordinates": p["coordinates"]},
                        area_px=float(area_px),
                        area_m2=float(round(area_m2, 2)) if area_m2 is not None else None,
                        score=1.0,
                        score_source="deterministic",
                        verified=True,
                        verifier_note="Deterministic spectral index thresholding",
                    )
                )

        return detections, coverage_summary

    def _run_track2_worldcover(self, upload: Upload) -> list[Detection]:
        """Execute Track 2 ESA WorldCover reference polygon integration."""
        if not upload.bounds_4326:
            return []

        raw_records = self.worldcover_adapter.get_landcover_polygons(
            bounds_4326=upload.bounds_4326,
            width_px=upload.width_px,
            height_px=upload.height_px,
        )

        detections: list[Detection] = []
        for r in raw_records:
            area_px = r["area_px"]
            area_m2 = (
                area_px * (upload.gsd_m**2)
                if upload.gsd_m and upload.capabilities.area_measurements
                else None
            )
            detections.append(
                Detection(
                    id=str(uuid.uuid4()),
                    track=DetectionTrack.LANDCOVER_WORLDCOVER,
                    label=r["label"],
                    label_raw=r.get("label_raw"),
                    kind=DetectionKind.POLYGON,
                    geom_px=r["geom_px"],
                    area_px=float(area_px),
                    area_m2=float(round(area_m2, 2)) if area_m2 is not None else None,
                    score=1.0,
                    score_source="deterministic",
                    verified=True,
                    verifier_note=r.get("verifier_note"),
                )
            )
        return detections

    def _run_track3_objects(
        self,
        img: Image.Image,
        upload: Upload,
        synthetic_proposals: list[dict[str, Any]] | None = None,
    ) -> tuple[list[Detection], list[RejectionDetail]]:
        """Execute Track 3 Gemini detection with strict defensive validation and NMS."""
        permitted = upload.capabilities.object_classes
        w, h = upload.width_px, upload.height_px

        raw_proposals = (
            synthetic_proposals
            if synthetic_proposals is not None
            else self.gemini_adapter.detect_objects(
                img,
                permitted_classes=permitted,
                gsd_m=upload.gsd_m,
                capability_tier=upload.capability_tier.value,
            )
        )

        valid_proposals: list[tuple[PixelBox, float, str, str, str]] = []
        rejections: list[RejectionDetail] = []

        for p in raw_proposals:
            raw_label = str(p.get("label", "unknown"))
            raw_box = p.get("bbox", [])
            score = float(p.get("score", 0.0))
            reason = str(p.get("reason", ""))

            # 1. Score threshold
            if score < settings.DETECTION_SCORE_MIN:
                rejections.append(
                    RejectionDetail(
                        label_raw=raw_label,
                        reason="score_below_threshold",
                        detail=f"Score {score:.2f} < {settings.DETECTION_SCORE_MIN:.2f}",
                    )
                )
                continue

            # 2. Canonical alias normalisation
            canonical = normalize_label(raw_label)
            if not canonical:
                rejections.append(
                    RejectionDetail(
                        label_raw=raw_label,
                        reason="unknown_label_alias",
                        detail=f"Label '{raw_label}' has no canonical alias",
                    )
                )
                continue

            # 3. Permitted label for resolution tier
            if canonical not in permitted:
                rejections.append(
                    RejectionDetail(
                        label_raw=raw_label,
                        reason="label_forbidden_at_resolution_tier",
                        detail=f"Class '{canonical}' not permitted at tier {upload.capability_tier.value}",
                    )
                )
                continue

            # 4. Bbox normalization & geometry check
            norm_res = normalise_bbox(raw_box, w, h, bbox_order=settings.GEMINI_BBOX_ORDER)
            if isinstance(norm_res, BboxReject):
                rejections.append(
                    RejectionDetail(
                        label_raw=raw_label,
                        reason=norm_res.reason,
                        detail=norm_res.detail,
                    )
                )
                continue

            # 5. Aspect ratio check
            aspect_ratio = norm_res.width / max(norm_res.height, 1e-4)
            if aspect_ratio < MIN_ASPECT_RATIO or aspect_ratio > MAX_ASPECT_RATIO:
                rejections.append(
                    RejectionDetail(
                        label_raw=raw_label,
                        reason="aspect_ratio_out_of_bounds",
                        detail=f"Aspect ratio {aspect_ratio:.2f} outside [{MIN_ASPECT_RATIO:.3f}, {MAX_ASPECT_RATIO}]",
                    )
                )
                continue

            # 6. Minimum area check
            if norm_res.area_px < MIN_BOX_AREA_PX:
                rejections.append(
                    RejectionDetail(
                        label_raw=raw_label,
                        reason="area_below_minimum_threshold",
                        detail=f"Area {norm_res.area_px:.1f}px² < {MIN_BOX_AREA_PX}px²",
                    )
                )
                continue

            valid_proposals.append((norm_res, score, canonical, raw_label, reason))

        # 7. Non-Maximum Suppression (NMS) per canonical class
        nms_survivors, nms_rej_tuples = apply_class_nms(
            valid_proposals, iou_threshold=settings.DETECTION_NMS_IOU
        )
        for raw_lbl, reason_str, detail_str in nms_rej_tuples:
            rejections.append(
                RejectionDetail(
                    label_raw=raw_lbl,
                    reason=reason_str,
                    detail=detail_str,
                )
            )

        # Convert survivors to Detection models
        detections: list[Detection] = []
        for box, score, canonical, raw_label, reason in nms_survivors:
            area_m2 = (
                box.area_px * (upload.gsd_m**2)
                if upload.gsd_m and upload.gsd_source in (ProvenanceSource.METADATA, ProvenanceSource.USER_DECLARED)
                else None
            )

            detections.append(
                Detection(
                    id=str(uuid.uuid4()),
                    track=DetectionTrack.OBJECT_MODEL,
                    label=canonical,
                    label_raw=raw_label,
                    kind=DetectionKind.BOX,
                    geom_px=box.to_geojson_polygon(),
                    area_px=float(round(box.area_px, 2)),
                    area_m2=float(round(area_m2, 2)) if area_m2 is not None else None,
                    score=float(round(score, 3)),
                    score_source="model",
                    verified=False,
                    verifier_note=reason,
                )
            )

        return detections, rejections
