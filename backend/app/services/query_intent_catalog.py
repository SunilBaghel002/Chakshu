"""Canonical intent definitions, contractions, and class aliases for Chakshu Query Router."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

CONTRACTIONS: dict[str, str] = {
    "what's": "what is",
    "there's": "there is",
    "can't": "cannot",
    "don't": "do not",
    "where's": "where is",
    "how's": "how is",
    "it's": "it is",
}

CLASS_ALIASES: dict[str, str] = {
    "building": "building",
    "buildings": "building",
    "structure": "building",
    "structures": "building",
    "house": "building",
    "houses": "building",
    "imarat": "building",
    "imaratein": "building",
    "makaan": "building",
    "ghar": "building",
    "dhancha": "building",
    "built-up": "built",
    "built": "built",
    "water": "water",
    "lake": "water",
    "lakes": "water",
    "river": "water",
    "rivers": "water",
    "reservoir": "water",
    "reservoirs": "water",
    "pond": "water",
    "ponds": "water",
    "waterbody": "water",
    "waterbodies": "water",
    "pani": "water",
    "jal": "water",
    "talab": "water",
    "nadi": "water",
    "vegetation": "vegetation",
    "forest": "vegetation",
    "forests": "vegetation",
    "trees": "vegetation",
    "tree": "vegetation",
    "greenery": "vegetation",
    "ped": "vegetation",
    "paudhe": "vegetation",
    "hariyali": "vegetation",
    "crop": "crop",
    "crops": "crop",
    "field": "crop",
    "khet": "crop",
    "fasal": "crop",
    "bare": "bare",
    "bare soil": "bare",
    "sand": "bare",
    "dirt": "bare",
    "zameen": "bare",
    "mitti": "bare",
    "ret": "bare",
    "road": "road",
    "roads": "road",
    "highway": "road",
    "street": "road",
    "sadak": "road",
    "rasta": "road",
    "runway": "runway",
    "runways": "runway",
    "taxiway": "runway",
    "airport": "airport",
    "aerodrome": "airport",
    "hawa adda": "airport",
    "storage tank": "storage_tank",
    "tank": "storage_tank",
    "tanks": "storage_tank",
    "car": "vehicle",
    "cars": "vehicle",
    "vehicle": "vehicle",
    "vehicles": "vehicle",
    "truck": "vehicle",
    "trucks": "vehicle",
    "gadi": "vehicle",
    "gaadi": "vehicle",
    "aircraft": "aircraft",
    "airplane": "aircraft",
    "plane": "aircraft",
    "aeroplane": "aircraft",
    "terminal": "building",
    "concourse": "building",
    "tower": "building",
    "construction": "construction",
    "earthworks": "construction",
    "snow": "snow",
    "ice": "snow",
    "barf": "snow",
    "baraf": "snow",
}

OUT_OF_SCOPE_WORDS: list[str] = [
    "who is the president",
    "president",
    "poem",
    "joke",
    "recipe",
    "python code",
    "stock price",
    "capital of",
    "who owns this land",
    "alien",
    "aliens",
    "ufo",
    "ufos",
    "monster",
    "ghost",
    "dinosaur",
    "zombie",
    "quicksort",
    "prime minister",
    "weather forecast",
]

REFUSAL_WORDS: list[str] = [
    "car",
    "cars",
    "vehicle",
    "vehicles",
    "truck",
    "trucks",
    "gadi",
    "gaadi",
    "aircraft",
    "airplane",
    "plane",
    "aeroplane",
]


@dataclass
class IntentResolution:
    """Outcome of intent routing and slot extraction."""

    intent_id: str
    score: float
    matched_by: str
    slots: dict[str, Any] = field(default_factory=dict)
    is_refusal: bool = False
    refusal_reason: str | None = None
    sub_intents: list[str] = field(default_factory=list)
