"""Blind Gemini adapter. It never substitutes a local or canned response."""
from __future__ import annotations

import base64
import io
import json
import logging
import urllib.error
import urllib.request
import uuid
from typing import Any

from PIL import Image

from app.adapters.gemini_prompt import BLIND_SYSTEM_PROMPT
from app.domain.constants import MAX_IMAGE_EDGE_PX
from app.settings import settings

log = logging.getLogger(__name__)


class GeminiDetectionAdapter:
    """Calls Gemini with a deliberately minimal, metadata-free payload."""

    def __init__(self, api_key: str | None = None, model_name: str | None = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL
        self.enabled = bool(settings.GEMINI_ENABLED and self.api_key and not settings.OFFLINE)

    def downscale_image(self, img: Image.Image) -> tuple[Image.Image, float]:
        longest = max(img.size)
        if longest <= MAX_IMAGE_EDGE_PX:
            return img, 1.0
        scale = MAX_IMAGE_EDGE_PX / longest
        return img.resize((round(img.width * scale), round(img.height * scale)), Image.Resampling.BILINEAR), scale

    def reencode_image(self, img: Image.Image) -> Image.Image:
        """Return a fresh RGB JPEG decoded from bytes, with no source EXIF retained."""
        out = io.BytesIO()
        img.convert("RGB").save(out, format="JPEG", quality=90, optimize=True)
        out.seek(0)
        decoded = Image.open(out)
        decoded.load()
        return decoded

    def detect(self, img: Image.Image, *, gsd_m: float | None, pixel_summary: dict[str, Any]) -> dict[str, Any]:
        """Return a proposal object or a safe failure envelope; never a fabricated result."""
        if not self.enabled:
            return {"status": "detection_failed", "error": "Gemini object analysis is unavailable"}
        scaled, _ = self.downscale_image(img)
        clean = self.reencode_image(scaled)
        prompt = self._prompt(clean.size, gsd_m, pixel_summary)
        try:
            result = self._call_rest_api(self.model_name, prompt, self._encode_image(clean))
        except Exception as exc:
            log.warning("Gemini rejection: %s (%s)", type(exc).__name__, exc)
            return {"status": "detection_failed", "error": f"Gemini request failed: {type(exc).__name__}"}
        if not result:
            return {"status": "detection_failed", "error": "Gemini returned no valid detection response"}
        return {"status": "completed", **result}

    def _prompt(self, size: tuple[int, int], gsd_m: float | None, pixel_summary: dict[str, Any]) -> str:
        """Serialize only values that arise from pixels or the approved upload geometry."""
        return json.dumps({
            "reference_id": str(uuid.uuid4()),
            "image_dimensions_px": {"width": size[0], "height": size[1]},
            "gsd_m": gsd_m,
            "pixel_summary": pixel_summary,
            "instruction": "Return the required JSON object only.",
        }, separators=(",", ":"))

    def _encode_image(self, img: Image.Image) -> str:
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="JPEG", quality=90, optimize=True)
        return base64.b64encode(buf.getvalue()).decode("ascii")

    def _call_rest_api(self, model: str, prompt: str, img_b64: str) -> dict[str, Any] | None:
        clean_model = model.removeprefix("models/")
        payload = {
            "systemInstruction": {"parts": [{"text": BLIND_SYSTEM_PROMPT}]},
            "contents": [{"parts": [{"text": prompt}, {"inlineData": {"mimeType": "image/jpeg", "data": img_b64}}]}],
            "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
        }
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={self.api_key}"
        try:
            request = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(request, timeout=5) as response:
                body = json.loads(response.read().decode("utf-8"))
            candidates = body.get("candidates")
            if not candidates:
                log.warning("Gemini rejection: missing_candidates")
                return None
            parts = candidates[0].get("content", {}).get("parts", [])
            text = "".join(part.get("text", "") for part in parts).strip()
            parsed = json.loads(text)
            return parsed if isinstance(parsed, dict) else None
        except (TimeoutError, urllib.error.URLError, urllib.error.HTTPError) as exc:
            log.warning("Gemini rejection: transport_failure (%s)", type(exc).__name__)
        except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError) as exc:
            log.warning("Gemini rejection: invalid_json (%s)", type(exc).__name__)
        except Exception as exc:
            log.warning("Gemini rejection: request_failure (%s)", type(exc).__name__)
        return None

    # Compatibility for query analysis: failures remain failures, never prose.
    def describe_scene(self, img: Image.Image, gsd_m: float | None = None, detection_results: dict[str, Any] | None = None, mode: str = "DESCRIBE") -> dict[str, Any]:
        return self.detect(img, gsd_m=gsd_m, pixel_summary=detection_results or {})

    def explain_results(self, img: Image.Image, detection_results: dict[str, Any], gsd_m: float | None = None, question: str | None = None) -> dict[str, Any]:
        return self.detect(img, gsd_m=gsd_m, pixel_summary=detection_results)
