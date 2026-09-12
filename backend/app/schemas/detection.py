"""Upload and DetectionSet data contracts for Chakshu.

Supports SIH26167 single-image upload, capability gating, and detection tracks.
Matches PRD 4 §4 byte-for-byte.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import (
    CapabilityTier,
    DetectionKind,
    DetectionTrack,
    ProvenanceSource,
    UploadStatus,
)


class CapabilityPermissions(BaseModel):
    """Allowed detection categories governed by resolution tier."""

    model_config = ConfigDict(extra="ignore")

    object_classes: list[str]
    landcover_classes: list[str]
    area_measurements: bool
    temporal_analysis: bool = False


class Upload(BaseModel):
    """Metadata and capability determination for an uploaded raster."""

    model_config = ConfigDict(extra="ignore")

    id: str
    filename: str
    title: str | None = None
    status: UploadStatus
    width_px: int
    height_px: int
    band_count: int
    bands: list[str] = Field(default_factory=list)
    bands_identified_by: str | None = None
    crs_epsg: int | None = None
    bounds_4326: list[float] | None = Field(
        default=None, description="[min_lon, min_lat, max_lon, max_lat]"
    )
    gsd_m: float | None = None
    gsd_source: ProvenanceSource | None = None
    acquired_at: str | None = None
    acquired_source: ProvenanceSource | None = None
    aoi_id: str | None = None
    aoi_name: str | None = None
    capability_tier: CapabilityTier
    capabilities: CapabilityPermissions
    capability_notice: str | None = None
    checksum_sha256: str
    overview_url: str
    created_at: str


class Detection(BaseModel):
    """Single discrete object box or continuous land-cover polygon."""

    model_config = ConfigDict(extra="ignore")

    id: str
    track: DetectionTrack
    label: str
    label_raw: str | None = None
    kind: DetectionKind
    geom_px: dict[str, Any] = Field(description="Pixel-space GeoJSON geometry, y down")
    geom_4326: dict[str, Any] | None = Field(
        default=None, description="EPSG:4326 GeoJSON geometry, null if ungeoreferenced"
    )
    area_px: float
    area_m2: float | None = Field(
        default=None, description="Surface area in m2; null unless GSD is trusted"
    )
    area_label: str | None = None
    score: float
    score_source: str = Field(description="'model' | 'deterministic' | 'agreement'")
    verified: bool = False
    verifier_note: str | None = None


class CoverageClassItem(BaseModel):
    """Pixel count and area contribution for a land-cover class."""

    model_config = ConfigDict(extra="ignore")

    label: str
    px: int
    pct: float
    area_m2: float | None = None


class CoverageSummary(BaseModel):
    """Full-scene land-cover pixel distribution summary."""

    model_config = ConfigDict(extra="ignore")

    source_track: DetectionTrack
    total_px: int
    by_class: list[CoverageClassItem]
    sum_check_pct: float = 100.0


class CountsSummary(BaseModel):
    """SQL-derived label frequencies across detections."""

    model_config = ConfigDict(extra="ignore")

    by_label: dict[str, int] = Field(default_factory=dict)
    total_object_detections: int
    total_landcover_detections: int
    source: str = "SELECT count(*) FROM detection GROUP BY label"


class RejectionDetail(BaseModel):
    """Audit record for a discarded box proposal."""

    model_config = ConfigDict(extra="ignore")

    label_raw: str
    reason: str
    detail: str


class RejectionsSummary(BaseModel):
    """Transparent accounting of filtered or rejected detection proposals."""

    model_config = ConfigDict(extra="ignore")

    count: int
    by_reason: dict[str, int] = Field(default_factory=dict)
    detail: list[RejectionDetail] = Field(default_factory=list)


class DetectionSet(BaseModel):
    """Complete response envelope for an upload's detection results."""

    model_config = ConfigDict(extra="ignore")

    upload: Upload
    detections: list[Detection]
    coverage: CoverageSummary | None = None
    counts: CountsSummary
    rejections: RejectionsSummary
    job_id: str | None = None
    trace_id: str | None = None
