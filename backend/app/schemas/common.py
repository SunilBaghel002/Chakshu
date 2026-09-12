"""Common enums and error envelopes for Chakshu.

Frozen data contracts defined in PRD 4 §1, §2, §8.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ChangeType(StrEnum):
    """Categorisation of bi-temporal change."""

    CONSTRUCTION = "construction"
    DEMOLITION = "demolition"
    CLEARANCE = "clearance"
    VEGETATION_GAIN = "vegetation_gain"
    WATER_GAIN = "water_gain"
    WATER_LOSS = "water_loss"
    ROAD = "road"
    EXPANSION = "expansion"
    CONTRACTION = "contraction"
    OTHER = "other"


class DetectionTrack(StrEnum):
    """Origin track for single-image detections."""

    OBJECT_MODEL = "object_model"
    LANDCOVER_INDEX = "landcover_index"
    LANDCOVER_WORLDCOVER = "landcover_worldcover"


class DetectionKind(StrEnum):
    """Geometry representation for a detection."""

    BOX = "box"
    POLYGON = "polygon"


class ObjectClass(StrEnum):
    """Discrete object classes detectable in high/medium resolution imagery."""

    BUILDING = "building"
    BUILDING_CLUSTER = "building_cluster"
    VEHICLE = "vehicle"
    AIRCRAFT = "aircraft"
    SHIP = "ship"
    SHIP_LARGE = "ship_large"
    STORAGE_TANK = "storage_tank"
    SWIMMING_POOL = "swimming_pool"
    TOWER = "tower"
    CONTAINER = "container"
    ROAD = "road"


class LandCoverClass(StrEnum):
    """Continuous land-cover classes."""

    BUILT = "built"
    WATER = "water"
    VEGETATION = "vegetation"
    BARE = "bare"
    CROP = "crop"
    SNOW = "snow"
    UNCLASSIFIED = "unclassified"


class CapabilityTier(StrEnum):
    """Resolution-governed capability tiers per PRD 2 §5."""

    T1_VERY_HIGH = "T1_VERY_HIGH"  # <= 1 m
    T2_HIGH = "T2_HIGH"  # <= 5 m
    T3_MEDIUM = "T3_MEDIUM"  # <= 15 m (Sentinel-2)
    T4_COARSE = "T4_COARSE"  # > 15 m
    T0_UNKNOWN = "T0_UNKNOWN"  # no trustworthy GSD


class UploadStatus(StrEnum):
    """Processing and georeferencing status of an uploaded image."""

    GEOREFERENCED = "GEOREFERENCED"
    VISUAL_ONLY = "VISUAL_ONLY"
    REJECTED = "REJECTED"


class ProvenanceSource(StrEnum):
    """Source attribution for metadata fields."""

    METADATA = "metadata"
    USER_DECLARED = "user_declared"
    ASSUMED = "assumed"
    DERIVED = "derived"


class SuppressionReason(StrEnum):
    """Eight false-alarm suppression gates per PRD 3 §A9."""

    MIN_SIZE = "min_size"
    CLOUD = "cloud"
    CLOUD_SHADOW = "cloud_shadow"
    REGISTRATION = "registration"
    SEASONAL = "seasonal"
    ILLUMINATION = "illumination"
    SNOW_COVER = "snow_cover"
    LOW_CONFIDENCE = "low_confidence"


class DecisionStatus(StrEnum):
    """Analyst review status for change candidates."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class AnswerTier(StrEnum):
    """Execution tier utilized for generating an answer."""

    TEMPLATE = "template"
    POLISHED = "polished"
    DEGRADED = "degraded"


class JobState(StrEnum):
    """Asynchronous job execution status."""

    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class ValueKind(StrEnum):
    """Epistemic distinction between measured and inferred quantities."""

    MEASURED = "MEASURED"
    INFERRED = "INFERRED"


class ErrorDetail(BaseModel):
    """Inner error detail representation."""

    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
    trace_id: str


class ErrorEnvelope(BaseModel):
    """Standard API error envelope across all endpoints."""

    model_config = ConfigDict(extra="forbid")

    error: ErrorDetail
