"""AOI, Scene, and Job schemas for Chakshu.

Frozen data contracts defined in PRD 2 §4, PRD 4 §4, §6.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AoiCreate(BaseModel):
    """Payload for creating a new Area of Interest."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(description="Descriptive name of the Area of Interest.")
    geom: dict[str, Any] = Field(description="GeoJSON Polygon geometry in EPSG:4326.")
    utm_epsg: int | None = Field(
        default=None,
        description="UTM EPSG code for spatial measurements. Derived from centroid if omitted.",
    )


class Aoi(BaseModel):
    """Area of Interest entity."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(description="Unique UUID string for the AOI.")
    name: str = Field(description="Descriptive name of the Area of Interest.")
    geom: dict[str, Any] = Field(description="GeoJSON Polygon geometry in EPSG:4326.")
    utm_epsg: int = Field(description="UTM EPSG code for spatial measurements.")
    created_at: str = Field(description="ISO 8601 creation timestamp in UTC.")


class AoiListResponse(BaseModel):
    """List envelope for AOIs."""

    model_config = ConfigDict(extra="forbid")

    items: list[Aoi]
    total: int


class Scene(BaseModel):
    """Sentinel-2 multispectral archive observation scene."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(description="Sentinel-2 product name (e.g. S2B_43RCU_20240609_0_L2A).")
    aoi_id: str = Field(description="UUID string of the enclosing AOI.")
    acquired_at: str = Field(description="Acquisition date (YYYY-MM-DD).")
    cloud_cover_pct: float = Field(description="SCL cloud cover percentage [0, 100].")
    usable: bool = Field(description="Whether the scene is cloud/shadow-free enough for analysis.")
    unusable_reason: str | None = Field(
        default=None,
        description="Explanation if scene is marked unusable.",
    )
    cog_path: str = Field(description="Local or S3 path to Cloud-Optimized GeoTIFF.")
    checksum_sha256: str = Field(description="SHA-256 cryptographic provenance digest.")
    sensor: str = Field(default="sentinel-2-l2a", description="Sensor identifier.")
    gsd_m: float = Field(default=10.0, description="Ground sample distance in metres.")


class SceneListResponse(BaseModel):
    """List envelope for Scenes."""

    model_config = ConfigDict(extra="forbid")

    items: list[Scene]
    total: int


class JobResponse(BaseModel):
    """Asynchronous job execution state and progress representation."""

    model_config = ConfigDict(extra="forbid")

    job_id: str = Field(description="Unique identifier for the asynchronous job.")
    state: str = Field(description="Execution state: queued, running, succeeded, or failed.")
    progress: float = Field(
        ge=0.0,
        le=1.0,
        description="Fractional completion progress from 0.0 to 1.0.",
    )
    result: dict[str, Any] | None = Field(
        default=None,
        description="Payload returned upon successful job completion.",
    )
    error: dict[str, Any] | None = Field(
        default=None,
        description="Structured error envelope if job failed.",
    )


class JobListResponse(BaseModel):
    """List envelope for Jobs."""

    model_config = ConfigDict(extra="forbid")

    items: list[JobResponse]
    total: int
