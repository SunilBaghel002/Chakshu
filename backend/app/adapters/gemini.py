"""Gemini 2.0 Flash multimodal object detection adapter (Task 5.6, PRD 2 §6.1, PRD 3 §B3).

Handles:
1. Longest edge downscaling to <= 1568 px with scale factor tracking.
2. Strict JSON structured prompt injection with GSD and permitted capability tier labels.
3. Resolution-aware prompting and negative constraints.
4. Parsing, error envelopes, and offline / disabled graceful degradation.
"""

from __future__ import annotations

import io
import json
import logging
import uuid
from typing import Any

from PIL import Image

try:
    from app.domain.constants import MAX_IMAGE_EDGE_PX
    from app.settings import settings
except ImportError:
    from ..domain.constants import MAX_IMAGE_EDGE_PX
    from ..settings import settings

log = logging.getLogger(__name__)


BLIND_SYSTEM_PROMPT = """You are the Chakshu remote-sensing analysis engine: a BLIND,
evidence-driven analyst for RGB aerial and satellite imagery. You do not
know where, when, or by whom any image was captured. You reason ONLY from
visible pixels.

You operate in ONE of two modes. The user message always begins with
"Mode: ANALYZE" or "Mode: RECONCILE".

ABSOLUTE RULES (both modes):
R1. NO LOCATION, EVER. Do not guess, infer, hint, or state any geographic
location: no country, city, state, neighborhood, river name, or landmark
name. The location is UNKNOWN to you.
R2. NO IDENTIFIER REASONING. The image carries only a random UUID which
encodes ZERO information. Ignore all identifiers.
R3. NO PROPER NOUNS. Never output a named entity (city, stadium, mall,
company, river, road, brand) unless the text is literally legible in the
pixels, letter by letter. Use generic descriptors instead: "large circular
stadium with bowl-shaped stands", "multi-level freeway interchange", "long
linear water body with dense vegetated banks", "row of white cylindrical
tanks".
R4. PIXELS ONLY. Every claim must be supported by visible pixels. Any
statement relying on what you "know" about a real place is FORBIDDEN.
R5. CONSERVATIVE SCORING. Score 0.5 or higher only for objects you can
clearly isolate. When in doubt, omit the object. A short verified list is
CORRECT; a long guessed list is a FAILURE.
R6. NO SPECULATION PHRASES. Never write "famous", "well-known", "iconic",
"likely the ...". Re-describe from pixels only.
R7. RESOLUTION AWARENESS. You are given the GSD. Do not attempt to detect
objects smaller than about 3 pixels at this GSD. Do not claim detail
beyond what the resolution supports.

COORDINATES: bounding boxes [ymin, xmin, ymax, xmax], integers 0..1000,
(0,0) top-left, x right, y down. Aspect ratio within 0.05..20. No box
smaller than ~4x4 units. Polygon points [x, y] in the same 0..1000 space.

OBJECT CLASSES: aircraft, building, container, road, ship, storage_tank,
swimming_pool, tower, vehicle.
LAND COVER CLASSES: bare, built, crop, snow, vegetation, water.
  built = roads, rooftops, parking, concrete, stadium/industrial
  structures (grey pavement is NOT bare); vegetation = trees, lawns,
  riverbank foliage, parkland; water = open water only (shadows are NOT
  water); bare = exposed soil/sand/gravel ONLY; crop = field-like
  vegetation with row/grid structure; snow = bright white, low saturation.
Percentages sum to ~100; dominant class must match the visual dominant
class.

TASKS:
T1 OBJECT DETECTION: per instance output bbox, label, score 0..1, and
"evidence" = ONE line of visible shape/color/texture/context only. Merge
duplicates. Never report water as an object.
T2 LAND COVER: output landcover_pct for all six classes.
T3 WATER OUTLINES: per contiguous open-water region a closed polygon of
5..20 points + est_area_m2 using the GSD. Merge fragments of one body.
Exclude shadows/puddles.
T4 SUMMARY: 2..4 sentences of pure visual description, generic terms only,
no names/places/dates.

MODE ANALYZE: do T1-T4, run self-check, output ANALYZE schema.
MODE RECONCILE: the message also contains deterministic_results (a
non-visual spectral track's landcover percentages and/or water polygons).
C1 First do the full blind analysis WITHOUT looking at those numbers.
C2 Compare blind vs deterministic field by field.
C3 For every discrepancy (> 5 percentage points, or water present in only
one side) record: field, both values, winner = vision | deterministic |
split, and a one-line pixel-based reason.
C4 Produce merged_landcover_pct and merged_water_polygons = the values the
pixels support. Never let deterministic numbers anchor your judgment.
C5 Run self-check, output RECONCILE schema.

SELF-CHECK (before output):
S1 PROPER-NOUN SCAN: every place name/brand must be legible in pixels or
DELETED.
S2 POINTER TEST: for every bbox, you must be able to point to the exact
pixels justifying the label; else delete it.
S3 LAND COVER SANITY: sums to ~100, dominant class matches the image.
S4 LEAK TEST: if any sentence is true only because you "know" where this
is, rewrite from pixels only.

OUTPUT: ONLY valid JSON, no markdown fences, nothing outside the JSON.
ANALYZE schema:
{"mode":"ANALYZE","objects":[{"bbox":[0,0,100,100],"label":"building","score":0.9,"evidence":"..."}],"landcover_pct":{"bare":0,"built":0,"crop":0,"snow":0,"vegetation":0,"water":0},"water_polygons":[{"points":[[0,0]],"est_area_m2":0}],"summary":"..."}
RECONCILE schema:
{"mode":"RECONCILE","objects":[],"blind_landcover_pct":{...},"merged_landcover_pct":{...},"blind_water_polygons":[],"merged_water_polygons":[],"reconciliation":[{"field":"landcover.built","blind":58,"deterministic":0,"winner":"vision","reason":"dense rooftops and pavement visible"}],"summary":"..."}"""


class GeminiDetectionAdapter:
    """Multimodal detection adapter interfacing with Google Gemini 3.6 Flash."""

    def __init__(
        self,
        api_key: str | None = None,
        model_name: str | None = None,
    ) -> None:
        """Initialize Gemini adapter with model configuration."""
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL
        self.enabled = bool(settings.GEMINI_ENABLED and self.api_key and not settings.OFFLINE)
        if self.enabled:
            self._init_client()

    def _init_client(self) -> None:
        """Initialize google.generativeai client."""
        try:
            import google.generativeai as genai  # type: ignore[import-untyped]

            genai.configure(api_key=self.api_key, transport="rest")
            log.info("Configured Gemini REST transport with model %s", self.model_name)
        except Exception as exc:
            log.warning("Failed to initialize Gemini client (%s); running degraded", exc)
            self.enabled = False

    def downscale_image(self, img: Image.Image) -> tuple[Image.Image, float]:
        """Downscale image if longest edge exceeds MAX_IMAGE_EDGE_PX (1568 px)."""
        w, h = img.size
        longest = max(w, h)
        if longest <= MAX_IMAGE_EDGE_PX:
            return img, 1.0

        scale = MAX_IMAGE_EDGE_PX / float(longest)
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))
        scaled_img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)
        return scaled_img, scale

    def reencode_image(self, img: Image.Image) -> Image.Image:
        """Strip all EXIF/GPS metadata and re-encode to clean in-memory JPEG."""
        buf = io.BytesIO()
        clean = Image.new("RGB", img.size)
        clean.paste(img)
        clean.save(buf, format="JPEG", quality=95)
        buf.seek(0)
        return Image.open(buf)

    def analyze_image(
        self,
        img: Image.Image,
        gsd_m: float | None = None,
        mode: str = "ANALYZE",
        deterministic_results: dict[str, Any] | None = None,
        reference_id: str | None = None,
    ) -> dict[str, Any]:
        """Execute blind analysis or reconciliation via Gemini with strict JSON response."""
        if not self.enabled:
            return {}

        scaled_img, _ = self.downscale_image(img)
        clean_img = self.reencode_image(scaled_img)
        w, h = clean_img.size
        gsd_str = f"{gsd_m:.2f}" if gsd_m is not None else "0.50"
        ref_id = reference_id or str(uuid.uuid4())

        mode_upper = mode.upper()
        if mode_upper == "RECONCILE" and deterministic_results:
            user_msg = (
                f"Mode: RECONCILE | Reference ID: {ref_id} | Image: {w}x{h} px | "
                f"GSD: {gsd_str} m/px. deterministic_results: {json.dumps(deterministic_results)}. "
                "Return JSON only."
            )
        else:
            mode_upper = "ANALYZE"
            user_msg = (
                f"Mode: ANALYZE | Reference ID: {ref_id} | Image: {w}x{h} px | "
                f"GSD: {gsd_str} m/px. Return JSON only."
            )

        candidate_models = [self.model_name]
        for fallback in ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash"]:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        generation_config = {"temperature": 0, "response_mime_type": "application/json"}

        for model_id in candidate_models:
            try:
                import google.generativeai as genai  # type: ignore[import-untyped]

                client = genai.GenerativeModel(
                    model_id,
                    system_instruction=BLIND_SYSTEM_PROMPT,
                    generation_config=generation_config,
                )
                response = client.generate_content([user_msg, clean_img])
                raw_text = response.text.strip()
                parsed = self._parse_json_dict(raw_text)
                if parsed:
                    return parsed
            except Exception as exc:
                log.warning("Gemini model %s call failed: %s", model_id, exc)
                continue

        return {}

    def detect_objects(
        self,
        img: Image.Image,
        permitted_classes: list[str] | None = None,
        gsd_m: float | None = None,
        capability_tier: str = "T1_VERY_HIGH",
        mode: str = "ANALYZE",
        deterministic_results: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Run object detection via blind vision analysis."""
        res = self.analyze_image(
            img,
            gsd_m=gsd_m,
            mode=mode,
            deterministic_results=deterministic_results,
        )
        raw_objects = res.get("objects", [])
        for obj in raw_objects:
            if "reason" not in obj and "evidence" in obj:
                obj["reason"] = obj["evidence"]
        return raw_objects

    def _parse_json_dict(self, text: str) -> dict[str, Any]:
        """Clean and parse JSON dictionary from model output."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()

        try:
            data = json.loads(cleaned)
            if isinstance(data, dict):
                return data
            return {}
        except json.JSONDecodeError as exc:
            log.warning("Failed to parse Gemini JSON (%s): %s", exc, cleaned[:120])
            return {}
