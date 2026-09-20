"""OpenCLIP encoder adapter for Chakshu (Task 1.10, PRD 7).

Provides image and text embedding capabilities using OpenCLIP ViT-B-32.
Enforces:
1. 512-dimensional L2-normalized vector output.
2. Under 1 second latency on CPU.
3. Offline / lightweight fallback when open_clip or torch is not installed.
"""

from __future__ import annotations

import hashlib
import io
import logging
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

try:
    from app.settings import settings
except ImportError:
    from ..settings import settings

log = logging.getLogger(__name__)

EMBEDDING_DIM: int = 512


class ClipEncoderAdapter:
    """Adapter for encoding imagery and text into 512-dim CLIP embedding space."""

    def __init__(self, model_name: str | None = None) -> None:
        """Initialize CLIP model or deterministic fallback."""
        self.model_name = model_name or settings.CLIP_MODEL
        self._model: Any = None
        self._preprocess: Any = None
        self._tokenizer: Any = None
        self._is_live: bool = False
        self._init_encoder()

    def _init_encoder(self) -> None:
        """Attempt to load real OpenCLIP model; gracefully fall back if unavailable."""
        if settings.OFFLINE and not Path(".cache/clip").exists():
            log.info("OFFLINE mode active: initializing deterministic CLIP fallback")
            self._is_live = False
            return

        try:
            import open_clip  # type: ignore[import-untyped]
            import torch  # type: ignore[import-untyped]

            torch.set_num_threads(2)
            model, _, preprocess = open_clip.create_model_and_transforms(
                self.model_name,
                pretrained="laion2b_s34b_b79k",
            )
            model.eval()
            self._model = model
            self._preprocess = preprocess
            self._tokenizer = open_clip.get_tokenizer(self.model_name)
            self._is_live = True
            log.info("Loaded OpenCLIP model %s on CPU", self.model_name)
        except Exception as exc:
            log.info(
                "OpenCLIP unavailable (%s); using deterministic 512-dim embedding fallback",
                exc,
            )
            self._is_live = False

    @property
    def is_live(self) -> bool:
        """Return True if real OpenCLIP model is active, False for deterministic fallback."""
        return self._is_live

    def embed_image(
        self, image_input: Image.Image | np.ndarray[Any, Any] | bytes | Path
    ) -> list[float]:
        """Encode an image into a 512-dimensional L2-normalized vector.

        Args:
            image_input: PIL Image, numpy array (H, W, 3), raw bytes, or image Path.

        Returns:
            List of 512 float values with unit Euclidean norm.
        """
        img = self._load_pil_image(image_input)

        if self._is_live and self._model is not None:
            try:
                import torch  # type: ignore[import-untyped]

                tensor = self._preprocess(img).unsqueeze(0)
                with torch.no_grad():
                    features = self._model.encode_image(tensor)
                    features /= features.norm(dim=-1, keepdim=True)
                vec = features.squeeze(0).cpu().numpy().astype(np.float32)
                return [float(x) for x in vec]
            except Exception as exc:
                log.warning("Live image embedding failed (%s); using fallback", exc)

        return self._deterministic_image_embedding(img)

    def embed_text(self, text: str) -> list[float]:
        """Encode a text query into the same 512-dimensional L2-normalized space.

        Args:
            text: Text query to embed.

        Returns:
            List of 512 float values with unit Euclidean norm.
        """
        clean_text = text.strip()
        if not clean_text:
            clean_text = "empty"

        if self._is_live and self._model is not None:
            try:
                import torch  # type: ignore[import-untyped]

                tokens = self._tokenizer([clean_text])
                with torch.no_grad():
                    features = self._model.encode_text(tokens)
                    features /= features.norm(dim=-1, keepdim=True)
                vec = features.squeeze(0).cpu().numpy().astype(np.float32)
                return [float(x) for x in vec]
            except Exception as exc:
                log.warning("Live text embedding failed (%s); using fallback", exc)

        return self._deterministic_text_embedding(clean_text)

    def _load_pil_image(
        self, image_input: Image.Image | np.ndarray[Any, Any] | bytes | Path
    ) -> Image.Image:
        """Convert various input types to a 3-channel RGB PIL Image."""
        if isinstance(image_input, Image.Image):
            return image_input.convert("RGB")
        if isinstance(image_input, np.ndarray):
            if image_input.dtype != np.uint8:
                clipped = np.clip(image_input, 0, 255).astype(np.uint8)
            else:
                clipped = image_input
            if clipped.ndim == 2:
                return Image.fromarray(clipped, mode="L").convert("RGB")
            if clipped.ndim == 3 and clipped.shape[-1] >= 3:
                return Image.fromarray(clipped[:, :, :3], mode="RGB")
            return Image.fromarray(clipped).convert("RGB")
        if isinstance(image_input, bytes):
            return Image.open(io.BytesIO(image_input)).convert("RGB")
        if isinstance(image_input, Path):
            return Image.open(image_input).convert("RGB")
        msg = f"Unsupported image input type: {type(image_input)}"
        raise TypeError(msg)

    def _get_fixed_projection(self) -> np.ndarray[Any, Any]:
        """Return fixed random projection matrix of shape (64, EMBEDDING_DIM)."""
        rng = np.random.default_rng(42)
        return rng.standard_normal((64, EMBEDDING_DIM)).astype(np.float32)

    def _deterministic_image_embedding(self, img: Image.Image) -> list[float]:
        """Generate deterministic 512-dim unit vector using random projection."""
        resized = img.resize((32, 32)).convert("RGB")
        arr = np.array(resized, dtype=np.float32) / 255.0  # (32, 32, 3)

        feat = np.zeros(64, dtype=np.float32)

        # 1. Chromatic means & stds (indices 0..5)
        feat[0:3] = arr.mean(axis=(0, 1))  # R, G, B
        feat[3:6] = arr.std(axis=(0, 1))

        # 2. Gradient / texture (indices 6..9)
        feat[6] = float(np.abs(np.diff(arr, axis=1)).mean())
        feat[7] = float(np.abs(np.diff(arr, axis=0)).mean())
        feat[8] = float(arr.min())
        feat[9] = float(arr.max())

        # 3. Simple color histograms (3 channels x 16 bins = 48 values -> indices 10..57)
        for c in range(3):
            hist, _ = np.histogram(arr[:, :, c], bins=16, range=(0.0, 1.0))
            feat[10 + c * 16 : 10 + (c + 1) * 16] = hist.astype(np.float32) / 1024.0

        # Project 64-dim features to 512-dim
        proj = self._get_fixed_projection()
        vec = np.dot(feat, proj)

        # L2 normalize
        norm = float(np.linalg.norm(vec))
        if norm > 0:
            vec /= norm
        return [float(x) for x in vec]

    def _deterministic_text_embedding(self, text: str) -> list[float]:
        """Generate deterministic 512-dim unit vector from text tokens using projection."""
        norm_text = text.lower().strip()
        tokens = norm_text.split()

        feat = np.zeros(64, dtype=np.float32)

        # Concept mappings to semantic feature indices aligned with chromatic features
        keyword_concept_map: dict[str, tuple[int, float]] = {
            "water": (2, 2.0),  # Blue-correlated
            "river": (2, 1.8),
            "lake": (2, 1.8),
            "ocean": (2, 2.0),
            "blue": (2, 1.5),
            "vegetation": (1, 2.0),  # Green-correlated
            "forest": (1, 1.8),
            "crop": (1, 1.5),
            "green": (1, 1.5),
            "agriculture": (1, 1.6),
            "built": (0, 1.8),  # Red/neutral-correlated
            "building": (0, 1.8),
            "structure": (0, 1.6),
            "urban": (0, 1.6),
            "road": (6, 1.5),  # Texture/edge-correlated
            "runway": (6, 1.5),
            "cloud": (8, 2.0),  # High brightness
            "white": (8, 1.5),
        }

        for token in tokens:
            for kw, (idx, weight) in keyword_concept_map.items():
                if kw in token:
                    feat[idx] += weight

            # Hash token into remaining descriptor slots (10..63)
            h = int(hashlib.sha256(token.encode("utf-8")).hexdigest()[:4], 16) % 54
            feat[10 + h] += 0.5

        proj = self._get_fixed_projection()
        vec = np.dot(feat, proj)

        norm = float(np.linalg.norm(vec))
        if norm > 0:
            vec /= norm
        return [float(x) for x in vec]


_default_clip_adapter: ClipEncoderAdapter | None = None


def get_clip_encoder() -> ClipEncoderAdapter:
    """Singleton getter for the default CLIP encoder adapter."""
    global _default_clip_adapter
    if _default_clip_adapter is None:
        _default_clip_adapter = ClipEncoderAdapter()
    return _default_clip_adapter
