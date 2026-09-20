"""Optional ESA WorldCover adapter.

There is intentionally no coordinate-derived fallback.  A real source may be
added behind this adapter; until then Track 2 reports unavailable and emits no
geometry.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from app.settings import settings


class WorldCoverAdapter:
    """Placeholder for a configured, licensed WorldCover raster source."""

    def __init__(self, cache_dir: Path | str | None = None) -> None:
        self.cache_dir = Path(cache_dir or settings.CACHE_DIR / "worldcover")

    def get_landcover_polygons(self, bounds_4326: list[float], width_px: int, height_px: int) -> list[dict[str, Any]]:
        """Return no data when no genuine configured WorldCover source exists."""
        return []
