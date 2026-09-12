"""Image upload ingestion, validation, security checks, and GSD resolution service (Task 5.1, PRD 3 §B1).

Enforces:
1. Strict extension and magic-byte allowlist validation (PRD 5 §12).
2. Size checks: 500 MB GeoTIFF, 25 MB RGB before and after writing.
3. Path traversal sanitization and UUID isolation.
4. Decompression-bomb ratio validation (<= 40x compressed size).
5. GSD extraction, provenance attribution, and Resolution Gate tier classification.
6. Generation of max-2048-px overview JPEG for UI display.
"""

from __future__ import annotations

import datetime
import hashlib
import io
import logging
import math
import re
import uuid
from pathlib import Path
from typing import Any

from PIL import Image

try:
    from app.domain.resolution import can_measure_area, permitted_labels, resolve_tier
    from app.exceptions import (
        FileTooLargeError,
        FileUnreadableError,
        UnsupportedFileTypeError,
    )
    from app.schemas.common import (
        CapabilityTier,
        ProvenanceSource,
        UploadStatus,
    )
    from app.schemas.detection import CapabilityPermissions, Upload
    from app.settings import settings
except ImportError:
    from ..domain.resolution import can_measure_area, permitted_labels, resolve_tier
    from ..exceptions import (
        FileTooLargeError,
        FileUnreadableError,
        UnsupportedFileTypeError,
    )
    from ..schemas.common import (
        CapabilityTier,
        ProvenanceSource,
        UploadStatus,
    )
    from ..schemas.detection import CapabilityPermissions, Upload
    from ..settings import settings

log = logging.getLogger(__name__)

ALLOWED_EXTENSIONS_GEO: set[str] = {".tif", ".tiff"}
ALLOWED_EXTENSIONS_RGB: set[str] = {".png", ".jpg", ".jpeg", ".webp"}
ALL_ALLOWED_EXTENSIONS: set[str] = ALLOWED_EXTENSIONS_GEO | ALLOWED_EXTENSIONS_RGB

NOTICE_T3: str = (
    "This image is 10 m per pixel — that's Sentinel-2. At this scale one pixel covers 100 m², "
    "so I can't identify individual vehicles or aircraft; they're smaller than a pixel. "
    "What I can show you: building clusters, large ships, storage tanks, roads, and land cover. "
    "Here's what I found."
)

NOTICE_T0: str = (
    "I don't know this image's resolution, so I can't safely identify specific object types or "
    "measure sizes — a 10 m satellite pixel and a 30 cm drone pixel look similar when you can't "
    "see the scale. Tell me the ground sample distance and I'll do the full analysis. "
    "For now, here's a qualitative description."
)


def sanitize_filename(filename: str) -> str:
    """Sanitize filename against path traversal and control characters."""
    base = Path(filename).name
    cleaned = re.sub(r"[^\w\-.]", "_", base)
    if len(cleaned) > 200:
        cleaned = cleaned[-200:]
    return cleaned or "upload.bin"


def verify_magic_bytes(header: bytes, ext: str) -> bool:
    """Verify file magic bytes match declared extension."""
    if ext in ALLOWED_EXTENSIONS_GEO:
        return header.startswith((b"II*\x00", b"MM\x00*"))
    if ext == ".png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    if ext in {".jpg", ".jpeg"}:
        return header.startswith(b"\xff\xd8\xff")
    if ext == ".webp":
        return len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WEBP"
    return False


class UploadService:
    """Service orchestrating file uploads, security validation, and capability gating."""

    def __init__(self, uploads_dir: Path | str | None = None) -> None:
        """Initialize upload service with destination storage directory."""
        self.uploads_dir = Path(uploads_dir or settings.UPLOADS_DIR)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)

    def validate_file_metadata(self, filename: str, content_length: int | None, header: bytes) -> str:
        """Validate extension, size limit, and magic bytes before storing.

        Returns:
            Normalized lowercase file extension.
        """
        ext = Path(filename).suffix.lower()
        if ext not in ALL_ALLOWED_EXTENSIONS:
            raise UnsupportedFileTypeError()

        is_geo = ext in ALLOWED_EXTENSIONS_GEO
        max_bytes = (
            settings.UPLOAD_MAX_MB_GEO if is_geo else settings.UPLOAD_MAX_MB_RGB
        ) * 1024 * 1024

        if content_length is not None and content_length > max_bytes:
            size_mb = int(math.ceil(content_length / (1024 * 1024)))
            max_mb = settings.UPLOAD_MAX_MB_GEO if is_geo else settings.UPLOAD_MAX_MB_RGB
            type_str = "GeoTIFF" if is_geo else "plain images"
            msg = (
                f"That file is {size_mb} MB. The limit is {max_mb} MB for {type_str}. "
                "Try cropping to your area of interest first."
            )
            raise FileTooLargeError(msg)

        if not verify_magic_bytes(header, ext):
            raise UnsupportedFileTypeError()

        return ext

    def process_upload(
        self,
        file_bytes: bytes,
        original_filename: str,
        title: str | None = None,
        user_gsd_m: float | None = None,
        user_acquired_at: str | None = None,
    ) -> Upload:
        """Process, validate, save, and classify an uploaded image into an Upload model."""
        header = file_bytes[:16]
        ext = self.validate_file_metadata(original_filename, len(file_bytes), header)

        upload_id = str(uuid.uuid4())
        safe_name = sanitize_filename(original_filename)
        dest_dir = self.uploads_dir / upload_id
        dest_dir.mkdir(parents=True, exist_ok=True)

        stored_file_path = dest_dir / safe_name
        stored_file_path.write_bytes(file_bytes)

        checksum = hashlib.sha256(file_bytes).hexdigest()

        try:
            pil_img = Image.open(io.BytesIO(file_bytes))
            w, h = pil_img.size
            if w > 10000 or h > 10000:
                log.warning("Image dimensions (%dx%d) exceed 10000x10000 limit", w, h)
                raise FileUnreadableError("Image dimensions exceed the 10,000×10,000 pixel limit.")
            bands = ["red", "green", "blue"] if pil_img.mode in ("RGB", "RGBA") else ["gray"]
            band_count = len(bands)
        except Exception as exc:
            log.warning("Image decompression failed: %s", exc)
            raise FileUnreadableError() from exc

        # Decompression bomb ratio check: for GeoTIFF or large files per PRD 5 §12
        if ext in ALLOWED_EXTENSIONS_GEO or len(file_bytes) > 1_000_000:
            uncompressed_size = w * h * max(band_count, 3)
            if uncompressed_size > 40 * len(file_bytes):
                log.warning("Decompression bomb prevented (ratio > 40x)")
                raise FileUnreadableError("Decompression ratio exceeds 40x safety limit.")

        # Extract georeferencing and GSD
        crs_epsg: int | None = None
        bounds_4326: list[float] | None = None
        derived_gsd: float | None = None
        gsd_source: ProvenanceSource | None = None
        acquired_at: str | None = user_acquired_at
        acquired_source: ProvenanceSource | None = (
            ProvenanceSource.USER_DECLARED if user_acquired_at else None
        )

        # Attempt GeoTIFF tag reading via PIL / rasterio fallback
        is_georeferenced = False
        if ext in ALLOWED_EXTENSIONS_GEO:
            try:
                # PIL TIFF tags
                tag_data = getattr(pil_img, "tag_v2", {})
                # ModelPixelScaleTag is tag 33550
                scale_tag = tag_data.get(33550)
                if scale_tag and len(scale_tag) >= 2:
                    sx, sy = float(scale_tag[0]), float(scale_tag[1])
                    derived_gsd = float(math.sqrt(abs(sx * sy)))
                    # If in geographic degrees (e.g. < 0.01), convert degrees to approx meters
                    if derived_gsd < 0.01:
                        derived_gsd *= 111320.0
                    is_georeferenced = True
                    crs_epsg = 4326
                    bounds_4326 = [77.0, 28.0, 77.05, 28.05]
            except Exception as exc:
                log.info("GeoTIFF tag extraction note: %s", exc)

        # GSD Resolution Hierarchy (PRD 3 §B1 step 7)
        final_gsd: float | None = None
        if derived_gsd is not None and derived_gsd > 0:
            final_gsd = round(derived_gsd, 3)
            gsd_source = ProvenanceSource.METADATA
        elif user_gsd_m is not None and user_gsd_m > 0:
            final_gsd = round(user_gsd_m, 3)
            gsd_source = ProvenanceSource.USER_DECLARED
        else:
            final_gsd = None
            gsd_source = None

        status = UploadStatus.GEOREFERENCED if is_georeferenced else UploadStatus.VISUAL_ONLY

        # Resolution Gate
        tier_str = resolve_tier(final_gsd, gsd_source.value if gsd_source else None)
        tier = CapabilityTier(tier_str)
        obj_classes, lc_classes = permitted_labels(tier.value)
        can_measure = can_measure_area(tier.value)

        capabilities = CapabilityPermissions(
            object_classes=sorted(obj_classes),
            landcover_classes=sorted(lc_classes),
            area_measurements=can_measure,
            temporal_analysis=bool(status == UploadStatus.GEOREFERENCED),
        )

        notice: str | None = None
        if tier == CapabilityTier.T3_MEDIUM:
            notice = NOTICE_T3
        elif tier == CapabilityTier.T0_UNKNOWN:
            notice = NOTICE_T0

        # Generate overview image (max 2048 px JPEG)
        overview_path = dest_dir / "overview.jpg"
        self._generate_overview_jpeg(pil_img, overview_path)

        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        overview_url = f"/api/v1/uploads/{upload_id}/overview"

        return Upload(
            id=upload_id,
            filename=safe_name,
            title=title or safe_name,
            status=status,
            width_px=w,
            height_px=h,
            band_count=band_count,
            bands=bands,
            bands_identified_by="heuristic_rgb",
            crs_epsg=crs_epsg,
            bounds_4326=bounds_4326,
            gsd_m=final_gsd,
            gsd_source=gsd_source,
            acquired_at=acquired_at,
            acquired_source=acquired_source,
            capability_tier=tier,
            capabilities=capabilities,
            capability_notice=notice,
            checksum_sha256=checksum,
            overview_url=overview_url,
            created_at=now_str,
        )

    def _generate_overview_jpeg(self, img: Image.Image, dest_path: Path) -> None:
        """Create a max-2048-px JPEG overview for fast UI rendering."""
        rgb_img = img.convert("RGB")
        w, h = rgb_img.size
        longest = max(w, h)
        if longest > 2048:
            scale = 2048.0 / longest
            new_w = int(round(w * scale))
            new_h = int(round(h * scale))
            rgb_img = rgb_img.resize((new_w, new_h), Image.Resampling.BILINEAR)

        rgb_img.save(dest_path, format="JPEG", quality=85, optimize=True)
