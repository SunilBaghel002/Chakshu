"""The Evidence data contract for Chakshu.

Attached to every detected change object.
Matches PRD 4 §3 byte-for-byte.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import ChangeType, DecisionStatus, ValueKind


class MeasurementSubObject(BaseModel):
    """Deterministic spatial measurements in UTM."""

    model_config = ConfigDict(extra="ignore")

    area_m2: float
    area_label: str
    perimeter_m: float
    centroid: list[float] = Field(description="[lon, lat]")
    bbox_4326: list[float] = Field(description="[min_lon, min_lat, max_lon, max_lat]")
    utm_epsg: int
    geom_4326: dict[str, Any] = Field(description="GeoJSON geometry object")
    measured_by: str
    kind: ValueKind = ValueKind.MEASURED


class RuleTraceItem(BaseModel):
    """Single rule evaluation step in the classification decision table."""

    model_config = ConfigDict(extra="ignore")

    rule: str
    field: str
    value: Any
    threshold: Any | None = None
    expected: Any | None = None
    fired: bool


class ClassificationAlternative(BaseModel):
    """Alternative candidate class considered with rationale."""

    model_config = ConfigDict(extra="ignore")

    change_type: ChangeType
    score: float
    reason: str


class ClassificationSubObject(BaseModel):
    """Rule-based change classification with full explainability trace."""

    model_config = ConfigDict(extra="ignore")

    change_type: ChangeType
    rule_trace: list[RuleTraceItem]
    alternatives: list[ClassificationAlternative] = Field(default_factory=list)
    kind: ValueKind = ValueKind.INFERRED


class OnsetInterval(BaseModel):
    """Honest uncertainty window for change onset."""

    model_config = ConfigDict(extra="ignore")

    start: str
    end: str
    days: int


class OnsetGap(BaseModel):
    """Temporal gap in scene coverage due to clouds or sensor anomalies."""

    model_config = ConfigDict(extra="ignore")

    start: str
    end: str
    reason: str
    scenes_lost: int | None = None


class AreaSeriesPoint(BaseModel):
    """Area measurement at a specific observation date."""

    model_config = ConfigDict(extra="ignore")

    date: str
    area_m2: float


class TemporalSubObject(BaseModel):
    """Temporal tracking, onset dating, and observation persistence."""

    model_config = ConfigDict(extra="ignore")

    first_supported: str | None = None
    last_seen: str | None = None
    onset_interval: OnsetInterval | None = None
    onset_gaps: list[OnsetGap] = Field(default_factory=list)
    persistence_k: int = 3
    area_series: list[AreaSeriesPoint] = Field(default_factory=list)
    trend: str | None = None
    kind: ValueKind = ValueKind.MEASURED


class ConfidenceParts(BaseModel):
    """Five constituent components of the geometric mean confidence score."""

    model_config = ConfigDict(extra="ignore")

    detector_agreement: float
    image_quality: float
    registration: float
    classification_margin: float
    temporal_persistence: float


class ConfidenceSubObject(BaseModel):
    """Calibrated confidence score and component breakdown."""

    model_config = ConfigDict(extra="ignore")

    overall: float
    parts: ConfidenceParts
    method: str = "geometric_mean"
    calibrated: bool = True
    calibration_ece: float | None = None
    calibration_n: int | None = None
    kind: ValueKind = ValueKind.INFERRED


class SuppressionContextSubObject(BaseModel):
    """Quantification of suppressed candidates and rejection causes."""

    model_config = ConfigDict(extra="ignore")

    candidates_generated: int
    candidates_suppressed: int
    candidates_retained: int
    by_reason: dict[str, int] = Field(default_factory=dict)


class SceneSource(BaseModel):
    """Satellite scene provenance details."""

    model_config = ConfigDict(extra="ignore")

    scene_id: str
    acquired_at: str
    checksum_sha256: str
    cloud_cover_pct: float
    sensor: str = "sentinel-2-l2a"


class SourcesSubObject(BaseModel):
    """Input raster sources, change mask path, and display triptych endpoints."""

    model_config = ConfigDict(extra="ignore")

    before: SceneSource
    after: SceneSource
    mask_path: str
    triptych_urls: dict[str, str] = Field(
        description="Keys: before, mask, after pointing to tile endpoints"
    )


class ModelUsed(BaseModel):
    """Provenance entry for models and prior datasets."""

    model_config = ConfigDict(extra="ignore")

    name: str
    version: str
    role: str
    licence: str
    source: str | None = None
    enabled: bool = True


class ProcessingStep(BaseModel):
    """Step in the deterministic pipeline processing history."""

    model_config = ConfigDict(extra="ignore")

    step: int
    op: str
    detail: str


class AnalystDecision(BaseModel):
    """Human analyst review decision state."""

    model_config = ConfigDict(extra="ignore")

    note: str | None = None
    decided_at: str | None = None
    actor: str | None = None


class Evidence(BaseModel):
    """The complete Evidence contract for a change object."""

    model_config = ConfigDict(extra="ignore")

    change_object_id: str
    aoi_id: str
    change_type: ChangeType
    status: DecisionStatus = DecisionStatus.PENDING

    measurement: MeasurementSubObject
    classification: ClassificationSubObject
    temporal: TemporalSubObject
    confidence: ConfidenceSubObject
    suppression_context: SuppressionContextSubObject
    sources: SourcesSubObject
    models_used: list[ModelUsed]
    processing_history: list[ProcessingStep]
    analyst: AnalystDecision = Field(default_factory=AnalystDecision)
