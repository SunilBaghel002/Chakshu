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
from typing import Any

from PIL import Image

try:
    from app.domain.constants import MAX_IMAGE_EDGE_PX
    from app.settings import settings
except ImportError:
    from ..domain.constants import MAX_IMAGE_EDGE_PX
    from ..settings import settings

log = logging.getLogger(__name__)


class GeminiDetectionAdapter:
    """Multimodal detection adapter interfacing with Google Gemini 2.0 Flash."""

    def __init__(
        self,
        api_key: str | None = None,
        model_name: str | None = None,
    ) -> None:
        """Initialize Gemini adapter with model configuration."""
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL
        self.enabled = bool(settings.GEMINI_ENABLED and self.api_key and not settings.OFFLINE)
        self._client: Any = None
        if self.enabled:
            self._init_client()

    def _init_client(self) -> None:
        """Initialize google.generativeai client."""
        try:
            import google.generativeai as genai  # type: ignore[import-untyped]

            genai.configure(api_key=self.api_key, transport="rest")
            self._client = genai.GenerativeModel(self.model_name)
            log.info("Initialized Gemini client with model %s", self.model_name)
        except Exception as exc:
            log.warning("Failed to initialize Gemini client (%s); running degraded", exc)
            self._client = None
            self.enabled = False

    def downscale_image(self, img: Image.Image) -> tuple[Image.Image, float]:
        """Downscale image if longest edge exceeds MAX_IMAGE_EDGE_PX (1568 px).

        Returns:
            Tuple of (scaled_image, scale_factor).
        """
        w, h = img.size
        longest = max(w, h)
        if longest <= MAX_IMAGE_EDGE_PX:
            return img, 1.0

        scale = MAX_IMAGE_EDGE_PX / float(longest)
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))
        scaled_img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)
        log.info(
            "Downscaled image from (%d, %d) to (%d, %d) (scale: %.4f)",
            w, h, new_w, new_h, scale,
        )
        return scaled_img, scale

    def detect_objects(
        self,
        img: Image.Image,
        permitted_classes: list[str],
        gsd_m: float | None = None,
        capability_tier: str = "T1_VERY_HIGH",
    ) -> list[dict[str, Any]]:
        """Run multimodal object detection via Gemini with strict JSON response.

        Args:
            img: PIL Image to analyze.
            permitted_classes: List of allowed class names for this resolution tier.
            gsd_m: Ground sample distance in meters.
            capability_tier: Capability tier string (e.g. 'T1_VERY_HIGH', 'T2_HIGH').

        Returns:
            List of raw proposals: [{'label': str, 'bbox': [y1, x1, y2, x2], 'score': float, 'reason': str}]
        """
        if not permitted_classes:
            log.info("No permitted object classes for tier %s; skipping Gemini call", capability_tier)
            return []

        if not self.enabled or self._client is None:
            log.info("Gemini disabled or OFFLINE=1; skipping Track 3 network call")
            return []

        scaled_img, _ = self.downscale_image(img)
        prompt = self._build_prompt(permitted_classes, gsd_m, capability_tier)

        candidate_models = [self.model_name]
        for fallback in ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash"]:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        for model_id in candidate_models:
            try:
                import google.generativeai as genai  # type: ignore[import-untyped]

                client = genai.GenerativeModel(model_id)
                response = client.generate_content([prompt, scaled_img])
                raw_text = response.text.strip()
                return self._parse_json_response(raw_text)
            except Exception as exc:
                log.warning("Gemini model %s detection call failed: %s", model_id, exc)
                continue

        return []

    def _build_prompt(
        self,
        permitted_classes: list[str],
        gsd_m: float | None,
        capability_tier: str,
    ) -> str:
        """Construct strict JSON detection prompt injecting resolution and permitted classes."""
        classes_str = ", ".join(f'"{c}"' for c in permitted_classes)
        gsd_desc = f"{gsd_m:.2f} meters per pixel" if gsd_m is not None else "Unknown resolution"

        return f"""You are an expert satellite and aerial imagery analyst executing object detection.
IMAGE RESOLUTION: {gsd_desc} (Capability Tier: {capability_tier}).

STRICT CONSTRAINT: You may ONLY detect objects from this permitted list:
[{classes_str}]

RULES:
1. If an object is smaller than about 3 pixels across at this resolution, do NOT report it.
2. Do not report objects you cannot localise with a precise box.
3. If uncertain, omit the object rather than reporting at low score.
4. Bounding box coordinates MUST be normalized in [0, 1000] scale in [ymin, xmin, ymax, xmax] format.
5. Return STRICT JSON ONLY. No conversational markdown, no code blocks, no preamble.

Required JSON output format:
[
  {{
    "label": "aircraft",
    "bbox": [120, 340, 260, 480],
    "score": 0.92,
    "reason": "Clear commercial airliner silhouette on taxiway"
  }}
]"""

    def _parse_json_response(self, text: str) -> list[dict[str, Any]]:
        """Clean and parse JSON array from model output."""
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
            if isinstance(data, list):
                return [item for item in data if isinstance(item, dict)]
            if isinstance(data, dict) and "detections" in data:
                return [item for item in data["detections"] if isinstance(item, dict)]
            return []
        except json.JSONDecodeError as exc:
            log.warning("Failed to parse Gemini detection JSON (%s): %s", exc, cleaned[:120])
            return []
