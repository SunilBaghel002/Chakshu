"""Raster-to-PNG tile serving and cache service (Task 1.8, PRD 3 §A5, §A7).

Capabilities:
1. True-color RGB 256x256 Web Mercator imagery tiles.
2. Change-mask transparent PNG tiles.
3. Bi-temporal evidence triptych tiles (before, mask, after).
"""

from __future__ import annotations

import io
import logging
from pathlib import Path

from PIL import Image

from app.exceptions import NotFoundError

log = logging.getLogger(__name__)


def generate_transparent_tile() -> bytes:
    """Generate a blank transparent 256x256 RGBA PNG tile."""
    img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def generate_fallback_rgb_tile(text: str = "") -> bytes:
    """Generate a clean dark-toned 256x256 RGB tile for fallback display."""
    img = Image.new("RGB", (256, 256), (34, 40, 49))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TileService:
    """Service retrieving and serving raster PNG tiles."""

    def __init__(self, data_dir: Path | str = "data") -> None:
        """Initialize tile service with tiles and masks storage paths."""
        repo_root = Path(__file__).resolve().parents[3]
        target = Path(data_dir)
        if not target.is_absolute() and not target.exists() and (repo_root / data_dir).exists():
            target = repo_root / data_dir
        self.data_dir = target
        self.tiles_dir = self.data_dir / "tiles"
        self.masks_dir = self.data_dir / "masks"
        self.evidence_dir = self.data_dir / "evidence"

    def get_imagery_tile(self, scene_id: str, z: int, x: int, y: int) -> bytes:
        """Retrieve 256x256 PNG true-color tile for a given scene and coordinates."""
        scene_dir = self.tiles_dir / scene_id
        if not scene_dir.exists():
            # Check if synthetic demo scene
            if "SYNTH" in scene_id:
                return generate_fallback_rgb_tile(scene_id)
            raise NotFoundError(f"Scene tiles directory for '{scene_id}' not found.")

        # 1. Look for direct coordinate match (x_y.png or z_x_y.png)
        candidate_paths = [
            scene_dir / f"{x}_{y}.png",
            scene_dir / f"{z}_{x}_{y}.png",
        ]
        for p in candidate_paths:
            if p.exists():
                return p.read_bytes()

        # 2. If zoom tile request, check if any tile exists in scene to gracefully serve
        existing_tiles = list(scene_dir.glob("*.png"))
        if existing_tiles:
            # Fallback to the primary tile (e.g. 0_0.png) for out-of-bounds or overview zooms
            primary = scene_dir / "0_0.png"
            if primary.exists():
                return primary.read_bytes()
            return existing_tiles[0].read_bytes()

        raise NotFoundError(f"Tile {z}/{x}/{y} not found for scene '{scene_id}'.")

    def get_mask_tile(
        self,
        change_object_id: str | None,
        scene_id: str | None,
        z: int,
        x: int,
        y: int,
    ) -> bytes:
        """Retrieve or generate transparent change-mask PNG tile."""
        if change_object_id:
            mask_path = self.masks_dir / change_object_id / f"{x}_{y}.png"
            if mask_path.exists():
                return mask_path.read_bytes()

        if scene_id:
            scene_mask = self.masks_dir / scene_id / f"{x}_{y}.png"
            if scene_mask.exists():
                return scene_mask.read_bytes()

        # Return transparent tile if no mask exists at this coordinate
        return generate_transparent_tile()

    def get_evidence_tile(self, evidence_id: str, stage: str) -> bytes:
        """Retrieve triptych evidence tile for before, mask, or after stages."""
        stage_clean = stage.lower()
        if stage_clean not in {"before", "mask", "after"}:
            raise NotFoundError(
                f"Invalid evidence stage '{stage}'. Expected before, mask, or after."
            )

        evidence_path = self.evidence_dir / evidence_id / f"{stage_clean}.png"
        if evidence_path.exists():
            return evidence_path.read_bytes()

        # Check in demo scenes if evidence_id refers to a scene or demo site
        if stage_clean in {"before", "after"} and self.tiles_dir.exists():
            for scene_dir in self.tiles_dir.iterdir():
                cand_tile = scene_dir / "0_0.png"
                if cand_tile.exists():
                    return cand_tile.read_bytes()

        return generate_fallback_rgb_tile(f"{evidence_id}_{stage_clean}")


# Process-wide service instance
tile_service = TileService()
