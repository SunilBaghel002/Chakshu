"""Segmentation Engine for water, vegetation, building, and landcover extraction.

Conforms strictly to SIH26167:
- §10: Grounded CV segmentation.
- §11, §12, §13: Mask -> Contour -> Validated Polygons with IoU consistency.
- §14, §35: Respects spatial scale, never invents hectares.
"""

from __future__ import annotations

import uuid
from typing import Any

import numpy as np
from PIL import Image
from scipy import ndimage  # type: ignore[import-untyped]

from app.domain.landcover import compute_landcover_summary
from app.domain.models import SatelliteSegmentationModel
from app.schemas.analysis import AnalysisTask, EvidenceObject
from app.schemas.detection import Upload
from app.services.polygonizer import mask_to_validated_polygons


class SegmentationEngine:
    """Extracts grounded pixel masks and validated polygons for satellite targets (§10)."""

    def __init__(self) -> None:
        self.model = SatelliteSegmentationModel()

    def execute_spatial_task(
        self,
        task: AnalysisTask,
        img: Image.Image,
        upload: Upload,
    ) -> tuple[list[EvidenceObject], np.ndarray | None]:
        """Execute CV segmentation and polygonization for specific spatial task."""
        w, h = upload.width_px, upload.height_px
        seg = self.model.predict(img)

        mask: np.ndarray | None = None
        target_class = "unknown"

        if task == AnalysisTask.WATER_SEGMENTATION:
            target_class = "water"
            mask = seg.get_mask("water")

        elif task == AnalysisTask.VEGETATION_SEGMENTATION:
            target_class = "vegetation"
            mask = seg.get_mask("vegetation")

        elif task == AnalysisTask.BUILDING_DETECTION:
            target_class = "building"
            mask = seg.get_isolated_building_footprints(min_area=150, max_area=40000)

        elif task == AnalysisTask.SNOW_SEGMENTATION:
            target_class = "snow"
            raw_snow = seg.get_mask("snow")
            total_px = w * h
            px_count = int(np.count_nonzero(raw_snow))
            # Must satisfy minimum scene presence (>= 0.05% of scene and >= 100px) (§41)
            if px_count >= 100 and (px_count / float(total_px)) >= 0.0005:
                mask = raw_snow
            else:
                return [], None

        elif task == AnalysisTask.LANDCOVER_CLASSIFICATION:
            classified = seg.classified_raster
            if classified is None:
                return [], None
            summary = compute_landcover_summary(classified)
            evidence_items: list[EvidenceObject] = []
            for item in summary["by_class"]:
                c_lbl = item["label"]
                if item["pct"] < 1.0 or c_lbl == "unclassified":
                    continue
                c_mask = classified == c_lbl
                polys = mask_to_validated_polygons(
                    c_mask, img_width=w, img_height=h, min_pixels=50, max_polygons=5, min_iou=0.60
                )
                for p in polys:
                    m2_val = round(p["area_px"] * (upload.gsd_m**2), 1) if upload.gsd_m else None
                    ha_val = round(m2_val / 10000.0, 2) if m2_val else None
                    evidence_items.append(
                        EvidenceObject(
                            evidence_id=f"lc_{c_lbl}_{uuid.uuid4().hex[:6]}",
                            task="landcover_classification",
                            class_label=c_lbl,
                            confidence=0.90,
                            mask_available=True,
                            polygon_available=True,
                            bbox_available=True,
                            geometry_source="segmentation_mask",
                            pixel_area=p["area_px"],
                            physical_area_m2=m2_val,
                            physical_area_ha=ha_val,
                            coordinate_space="image_pixels",
                            geom_px=p,
                            bbox_px=p["bbox_px"],
                            validation=p["validation"],
                            note=f"Classified {c_lbl}: {item['pct']:.1f}% scene coverage.",
                        )
                    )
            return evidence_items, (classified != "unclassified")

        if mask is None or not np.any(mask):
            return [], None

        polygons = mask_to_validated_polygons(
            binary_mask=mask,
            img_width=w,
            img_height=h,
            min_pixels=35,
            max_polygons=20,
            min_iou=0.65,
        )

        evidence_items = []
        for idx, p in enumerate(polygons):
            ev_id = f"{target_class}_{idx + 1:02d}_{uuid.uuid4().hex[:6]}"
            px_area = p["area_px"]

            m2_area = round(px_area * (upload.gsd_m**2), 1) if upload.gsd_m else None
            ha_area = round(m2_area / 10000.0, 2) if m2_area else None

            evidence_items.append(
                EvidenceObject(
                    evidence_id=ev_id,
                    task=task.value,
                    class_label=target_class,
                    confidence=min(
                        0.98, 0.70 + p["validation"].get("mask_overlap_iou", 0.7) * 0.28
                    ),
                    mask_available=True,
                    polygon_available=True,
                    bbox_available=True,
                    geometry_source="segmentation_mask",
                    pixel_area=px_area,
                    physical_area_m2=m2_area,
                    physical_area_ha=ha_area,
                    coordinate_space="image_pixels",
                    geom_px=p,
                    bbox_px=p["bbox_px"],
                    validation=p.get("validation", {}),
                    note=f"Verified {target_class} region #{idx + 1}: {px_area:.0f} pixels.",
                )
            )

        return evidence_items, mask
