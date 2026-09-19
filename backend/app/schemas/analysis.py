"""Pydantic contracts for evidence-grounded satellite imagery analysis.

Conforms to SIH26167 §§22, 34, 35:
- All spatial evidence originates from verified computer vision results.
- Unambiguous distinction between image pixel coordinates and geographic coordinates.
- Explicit validation flags and mask-polygon consistency tracking.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AnalysisTask(str, Enum):
    """Supported analysis operations."""

    SCENE_UNDERSTANDING = "scene_understanding"
    BUILDING_DETECTION = "building_detection"
    WATER_SEGMENTATION = "water_segmentation"
    VEGETATION_SEGMENTATION = "vegetation_segmentation"
    SNOW_SEGMENTATION = "snow_segmentation"
    LANDCOVER_CLASSIFICATION = "landcover_classification"
    CHANGE_DETECTION = "change_detection"
    REFUSAL_RESOLUTION = "refusal_resolution"
    UNSUPPORTED = "unsupported"


class RouterOutput(BaseModel):
    """Structured output from deterministic query router (§6)."""

    model_config = ConfigDict(extra="ignore")

    task: AnalysisTask
    target: str | None = None
    requires_spatial_evidence: bool = True
    requires_polygon: bool = True
    requires_measurement: bool = False
    requires_temporal: bool = False
    reason: str | None = None


class ValidationMetadata(BaseModel):
    """Verification results for geometric evidence (§12, §13)."""

    model_config = ConfigDict(extra="ignore")

    geometry_valid: bool = True
    mask_overlap_iou: float | None = None
    closed_ring: bool = True
    no_self_intersection: bool = True
    inside_bounds: bool = True
    repair_attempted: bool = False
    rejection_reason: str | None = None


class EvidenceObject(BaseModel):
    """Common internal evidence format (§22).

    Serves as contract between CV pipeline -> backend -> Gemini -> frontend.
    """

    model_config = ConfigDict(extra="ignore")

    evidence_id: str
    task: str
    class_label: str
    confidence: float
    mask_available: bool = False
    polygon_available: bool = False
    bbox_available: bool = False
    geometry_source: str = "segmentation_mask"  # "segmentation_mask" | "cv_detector" | "change_map"
    pixel_area: float = 0.0
    physical_area_m2: float | None = None
    physical_area_ha: float | None = None
    coordinate_space: str = "image_pixels"  # "image_pixels" | "EPSG:4326"
    geom_px: dict[str, Any] | None = None  # GeoJSON Polygon in pixel space
    bbox_px: list[int] | None = None  # [ymin, xmin, ymax, xmax] in pixel space
    validation: dict[str, Any] = Field(default_factory=dict)
    raw_score: float | None = None
    note: str | None = None


class OverlayCollection(BaseModel):
    """Collection of validated visual overlays for UI display (§23, §34)."""

    model_config = ConfigDict(extra="ignore")

    masks: list[dict[str, Any]] = Field(default_factory=list)
    polygons: list[dict[str, Any]] = Field(default_factory=list)
    boxes: list[dict[str, Any]] = Field(default_factory=list)
    changes: list[dict[str, Any]] = Field(default_factory=list)
    mask_url: str | None = None


class ImageMetadata(BaseModel):
    """Metadata describing analyzed image (§7, §8, §34, §35)."""

    model_config = ConfigDict(extra="ignore")

    image_width: int
    image_height: int
    gsd_m: float | None = None
    gsd_source: str | None = None
    modality: str = "optical"  # "optical" | "sar" | "unknown"
    coordinate_system: str = "image_pixels"  # "image_pixels" | "EPSG:4326"
    is_georeferenced: bool = False
    bounds_4326: list[float] | None = None
    band_count: int = 3


class AnalysisRequest(BaseModel):
    """Input payload for query-driven image analysis."""

    model_config = ConfigDict(extra="forbid")

    query: str
    upload_id: str
    comparison_upload_id: str | None = None


class AnalysisResponse(BaseModel):
    """Output contract to frontend and API callers (§34)."""

    model_config = ConfigDict(extra="ignore")

    query: str
    task: AnalysisTask
    target: str | None = None
    answer: str
    evidence: list[EvidenceObject] = Field(default_factory=list)
    overlays: OverlayCollection = Field(default_factory=OverlayCollection)
    metadata: ImageMetadata
    warnings: list[str] = Field(default_factory=list)
    status: str = "completed"  # "completed" | "insufficient_evidence" | "refused" | "error"
    execution_time_ms: float | None = None
