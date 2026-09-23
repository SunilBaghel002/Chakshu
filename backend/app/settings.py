"""Application configuration settings for Chakshu.

Single source of configuration using pydantic-settings.
All environment variables are parsed here and injected downstream.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Configuration settings loaded from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ROOT_DIR: Path = ROOT_DIR

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://chakshu:chakshu@localhost:5432/chakshu",
        description="Postgres connection string with PostGIS and pgvector support.",
    )

    # Air-gapped / Offline Mode
    OFFLINE: int = Field(
        default=0,
        description="1 = No outbound network calls. Adapters degrade or raise OfflineError.",
    )

    # Gemini (Tier 2 phrasing & Tier 3 detection)
    GEMINI_ENABLED: int = Field(
        default=0,
        description="1 = Tier 2 and Tier 3 Gemini calls enabled (requires OFFLINE=0).",
    )
    GEMINI_API_KEY: str = Field(
        default="",
        description="Google Gemini API key.",
    )
    GEMINI_MODEL: str = Field(
        default="gemini-3.6-flash",
        description="Pinned Gemini model identifier.",
    )
    GEMINI_BBOX_ORDER: str = Field(
        default="yxyx",
        description="Bbox coordinate order: 'yxyx' or 'xyxy'.",
    )

    # Upload Limits
    UPLOAD_MAX_MB_GEO: int = Field(
        default=500,
        description="Maximum file size in MB for GeoTIFF uploads.",
    )
    UPLOAD_MAX_MB_RGB: int = Field(
        default=25,
        description="Maximum file size in MB for standard RGB imagery (PNG/JPG).",
    )

    # Model & Feature Flags
    CLIP_MODEL: str = Field(
        default="ViT-B-32",
        description="OpenCLIP model architecture for tile embeddings.",
    )
    TINYCD_ENABLED: int = Field(
        default=0,
        description="1 = Run TinyCD as optional corroborating change detector.",
    )
    DETECTION_SCORE_MIN: float = Field(
        default=0.50,
        description="Minimum score threshold for retaining object detections.",
    )
    DETECTION_NMS_IOU: float = Field(
        default=0.50,
        description="Non-maximum suppression IoU threshold for overlapping boxes.",
    )
    MERGE_IOU_THRESHOLD: float = Field(
        default=0.30,
        description="Spatial IoU threshold to merge polygons across observation dates.",
    )
    INTENT_MATCH_THRESHOLD: float = Field(
        default=0.72,
        description="Minimum cosine similarity threshold for intent routing in Tier 1.",
    )

    # Storage Paths
    DATA_DIR: Path = Field(
        default=Path("data"),
        description="Base storage directory for raw and processed imagery.",
    )
    CACHE_DIR: Path = Field(
        default=Path("data/cache"),
        description="Cache directory for derived artifacts keyed by sha256.",
    )
    UPLOADS_DIR: Path = Field(
        default=Path("data/uploads"),
        description="Storage directory for user-uploaded images.",
    )
    SCENES_DIR: Path = Field(
        default=Path("data/scenes"),
        description="Storage directory for downloaded Sentinel-2 COGs.",
    )
    MASKS_DIR: Path = Field(
        default=Path("data/masks"),
        description="Storage directory for generated change masks.",
    )
    TILES_DIR: Path = Field(
        default=Path("data/tiles"),
        description="Storage directory for rendered raster PNG tiles.",
    )

    # Identity & Telemetry (PRD 14 §2, PRD 15 §7)
    ENV: str = Field(
        default="dev",
        description="Environment: 'dev' or 'prod'. Secure cookie enabled in prod.",
    )
    SERVER_SECRET: str = Field(
        default="dev-secret-key-chakshu-2026",
        description="Secret key used for HMAC-SHA256 IP address hashing.",
    )
    GEOIP_DB_PATH: Path = Field(
        default=Path("data/geoip/GeoLite2-City.mmdb"),
        description="Path to offline MaxMind GeoLite2 City MMDB file.",
    )
    TELEMETRY_IGNORE_IPS: list[str] = Field(
        default_factory=list,
        description="IP addresses filtered from telemetry collection (self/testing traffic).",
    )
    TELEMETRY_RETENTION_DAYS: int = Field(
        default=90,
        description="Event retention period in days before pruning.",
    )
    ADMIN_EMAIL: str = Field(
        default="admin@chakshu.internal",
        description="Default administrator email address.",
    )
    ADMIN_PASSWORD: str = Field(
        default="Admin@12345",
        description="Default administrator password for login.",
    )


settings = Settings()
