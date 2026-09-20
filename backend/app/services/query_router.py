"""Deterministic Intent and Slot Router for Chakshu (Tasks 6.1, 6.2, 6.9, 6.10, PRD 2 §7).

Implements the Tier-1 deterministic router:
1. Normalises text (lowercase, whitespace collapse, expand common contractions).
2. Extracts slots: dates, numbers, units, classes, "how many", "when", "bigger than", "last N years".
3. Matches question against canonical examples in intents.yml (threshold 0.72).
4. Enforces Resolution Gate refusals (vehicles/aircraft at 10m GSD) and out-of-scope rejections.
5. Emits structured IntentResolution containing matched intent, score, and extracted slots.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import re
from typing import Any

from app.schemas.analysis import AnalysisTask, RouterOutput

# Common contractions dictionary for normalization
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
    "built-up": "built",
    "built": "built",
    "water": "water",
    "lake": "water",
    "lakes": "water",
    "river": "water",
    "rivers": "water",
    "reservoir": "water",
    "pond": "water",
    "ponds": "water",
    "waterbody": "water",
    "vegetation": "vegetation",
    "forest": "vegetation",
    "forests": "vegetation",
    "trees": "vegetation",
    "tree": "vegetation",
    "greenery": "vegetation",
    "crop": "crop",
    "crops": "crop",
    "field": "crop",
    "bare": "bare",
    "bare soil": "bare",
    "sand": "bare",
    "dirt": "bare",
    "road": "road",
    "roads": "road",
    "highway": "road",
    "street": "road",
    "storage tank": "storage_tank",
    "tank": "storage_tank",
    "tanks": "storage_tank",
    "car": "vehicle",
    "cars": "vehicle",
    "vehicle": "vehicle",
    "vehicles": "vehicle",
    "truck": "vehicle",
    "trucks": "vehicle",
    "aircraft": "aircraft",
    "airplane": "aircraft",
    "plane": "aircraft",
    "snow": "snow",
    "ice": "snow",
}


@dataclass
class IntentResolution:
    """Outcome of intent routing and slot extraction."""

    intent_id: str
    score: float
    matched_by: str
    slots: dict[str, Any] = field(default_factory=dict)
    is_refusal: bool = False
    refusal_reason: str | None = None


class QueryRouter:
    """Deterministic intent classifier and slot extractor (§6, §7)."""

    def __init__(self, intents_path: Path | None = None) -> None:
        self.intents_file = intents_path or Path(__file__).resolve().parent.parent / "intents.yml"
        self._intents_cache: list[dict[str, Any]] = self._load_intents()

    def _load_intents(self) -> list[dict[str, Any]]:
        """Load intents from YAML file."""
        if not self.intents_file.exists():
            return []
        try:
            import yaml

            with open(self.intents_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                return data.get("intents", []) if isinstance(data, dict) else []
        except (ImportError, ModuleNotFoundError):
            intents: list[dict[str, Any]] = []
            curr: dict[str, Any] | None = None
            in_ex = False
            for line in self.intents_file.read_text(encoding="utf-8").splitlines():
                s = line.strip()
                if s.startswith("- id:"):
                    curr = {"id": s.split(":", 1)[1].strip(), "examples": []}
                    intents.append(curr)
                    in_ex = False
                elif s.startswith("examples:"):
                    in_ex = True
                elif in_ex and s.startswith("- "):
                    ex = s[2:].strip().strip("\"'")
                    if curr is not None:
                        curr["examples"].append(ex)
                elif in_ex and (s.startswith("template:") or s.startswith("handler:") or s.startswith("slots:")):
                    in_ex = False
            return intents
        except Exception:
            return []

    def normalise(self, text: str) -> str:
        """Step 1: Normalise text (lowercase, expand contractions, clean punctuation)."""
        clean = text.strip().lower()
        for k, v in CONTRACTIONS.items():
            clean = re.sub(rf"\b{re.escape(k)}\b", v, clean)
        clean = re.sub(r"[^\w\s\-\.\/]", " ", clean)
        return " ".join(clean.split())

    def extract_slots(self, text: str, norm_text: str) -> dict[str, Any]:
        """Step 2: Extract structured slots (numbers, time windows, classes, thresholds)."""
        slots: dict[str, Any] = {}

        # Temporal window (e.g. "3 years", "last 2 years", "past 24 months")
        yr_match = re.search(r"\b(?:last|past|in)?\s*(\d+(?:\.\d+)?)\s*years?\b", norm_text)
        if yr_match:
            slots["window_years"] = float(yr_match.group(1))
        elif "since 2022" in norm_text:
            slots["window_years"] = 4.0
        elif "since 2023" in norm_text:
            slots["window_years"] = 3.0

        # Target class matching
        for token, canonical in CLASS_ALIASES.items():
            if re.search(rf"\b{re.escape(token)}\b", norm_text):
                slots["target_class"] = canonical
                break

        # Area threshold (e.g. "500 m2", "1 ha")
        area_m = re.search(r"(\d+(?:\.\d+)?)\s*(m2|m²|sqm|ha|hectares?)", norm_text)
        if area_m:
            num = float(area_m.group(1))
            unit = area_m.group(2)
            slots["min_area_m2"] = num * 10000.0 if "ha" in unit else num

        # Dates extraction (YYYY-MM-DD)
        dates = re.findall(r"\b\d{4}-\d{2}-\d{2}\b", norm_text)
        if len(dates) >= 2:
            slots["before_date"], slots["after_date"] = dates[0], dates[1]

        return slots

    def resolve_intent(
        self,
        query: str,
        gsd_m: float | None = 10.0,
        has_comparison: bool = False,
    ) -> IntentResolution:
        """Resolve query to canonical intent with score and slots."""
        norm_q = self.normalise(query)
        slots = self.extract_slots(query, norm_q)

        # 1. Out-of-scope non-geospatial queries (§7 unsupported)
        out_of_scope = [
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
        ]
        if any(w in norm_q for w in out_of_scope):
            return IntentResolution(
                intent_id="unsupported", score=0.15, matched_by="domain_filter", slots=slots
            )

        # 2. Resolution Gate refusal (§2, §5)
        refusal_words = [
            "car",
            "cars",
            "vehicle",
            "vehicles",
            "truck",
            "trucks",
            "aircraft",
            "airplane",
            "plane",
        ]
        for w in refusal_words:
            if re.search(rf"\b{re.escape(w)}\b", norm_q):
                if gsd_m is None or gsd_m >= 5.0:
                    return IntentResolution(
                        intent_id="refusal_resolution",
                        score=0.99,
                        matched_by="resolution_gate",
                        slots={"target_class": w, "gsd_m": gsd_m or 10.0},
                        is_refusal=True,
                        refusal_reason=(
                            f"Vehicles and aircraft cannot be resolved in 10-meter Sentinel-2 imagery "
                            f"(minimum required: 0.5m GSD). The resolution gate has declined this query "
                            f"to prevent fabricated detections."
                        ),
                    )

        # 3. Fast keyword & example matching against intents.yml
        best_intent = "unsupported"
        best_score = 0.0

        for item in self._intents_cache:
            i_id = item.get("id", "")
            examples = [self.normalise(e) for e in item.get("examples", [])]

            # Exact match with example
            if norm_q in examples:
                return IntentResolution(
                    intent_id=i_id, score=1.0, matched_by="exact_example", slots=slots
                )

            # Jaccard / token overlap scoring
            q_tokens = set(norm_q.split())
            for ex in examples:
                ex_tokens = set(ex.split())
                overlap = len(q_tokens & ex_tokens)
                union = len(q_tokens | ex_tokens)
                sim = overlap / union if union > 0 else 0.0
                if sim > best_score:
                    best_score = sim
                    best_intent = i_id

        # Structural query shape heuristics (§B5)
        if norm_q.startswith("how many") or norm_q.startswith("count "):
            best_intent, best_score = "count_by_type", max(best_score, 0.88)
        elif norm_q.startswith("how big") or "area of" in norm_q:
            best_intent, best_score = "area_of", max(best_score, 0.87)
        elif "when" in norm_q and any(w in norm_q for w in ["start", "built", "appear"]):
            best_intent, best_score = "onset_of", max(best_score, 0.86)
        elif norm_q.startswith("show me") or norm_q.startswith("where "):
            best_intent, best_score = "locate_class", max(best_score, 0.89)
        elif "caption" in norm_q:
            best_intent, best_score = "caption_image", max(best_score, 0.89)
        elif any(w in norm_q for w in ["what is in", "what is visible", "describe", "overview", "what does this", "what features"]):
            best_intent, best_score = "describe_image", max(best_score, 0.88)
        elif "suppress" in norm_q or "filter" in norm_q and "out" in norm_q:
            best_intent, best_score = "explain_suppression", max(best_score, 0.85)
        elif "confidence" in norm_q:
            best_intent, best_score = "explain_confidence", max(best_score, 0.85)
        elif "similar" in norm_q:
            best_intent, best_score = "similar_tiles", max(best_score, 0.85)
        elif has_comparison or any(w in norm_q for w in ["change", "changes", "difference"]):
            if (
                "window_years" in slots
                or "since" in norm_q
                or "in this area" in norm_q
                or "3 years" in norm_q
            ):
                best_intent, best_score = "aoi_change_summary", max(best_score, 0.91)
            elif "before" in norm_q and "after" in norm_q or "compare" in norm_q:
                best_intent, best_score = "compare_two_dates", max(best_score, 0.86)

        # Threshold check: 0.72 cutoff per PRD 2 §7
        if best_score < 0.72:
            return IntentResolution(
                intent_id="unsupported", score=best_score, matched_by="router_cutoff", slots=slots
            )

        return IntentResolution(
            intent_id=best_intent, score=best_score, matched_by="heuristic_similarity", slots=slots
        )

    def route_query(
        self,
        query: str,
        gsd_m: float | None = None,
        has_comparison_image: bool = False,
    ) -> RouterOutput:
        """Legacy CV AnalysisTask compatibility wrapper."""
        res = self.resolve_intent(query, gsd_m=gsd_m, has_comparison=has_comparison_image)
        if res.is_refusal:
            return RouterOutput(
                task=AnalysisTask.REFUSAL_RESOLUTION,
                target=res.slots.get("target_class", "vehicle"),
                reason=res.refusal_reason or "Resolution gate decline.",
            )
        if res.intent_id == "unsupported":
            return RouterOutput(
                task=AnalysisTask.UNSUPPORTED,
                target=None,
                reason="Query is outside satellite imagery and geospatial analysis scope.",
            )
        if res.intent_id in ("aoi_change_summary", "compare_two_dates"):
            return RouterOutput(task=AnalysisTask.CHANGE_DETECTION, target="temporal_change")
        if res.intent_id in ("describe_image", "caption_image"):
            return RouterOutput(task=AnalysisTask.SCENE_UNDERSTANDING, target=None)

        norm_q = self.normalise(query)
        target_cls = res.slots.get("target_class")
        if not target_cls:
            if any(w in norm_q for w in ["what is in", "what is visible", "describe", "overview", "what features"]):
                return RouterOutput(task=AnalysisTask.SCENE_UNDERSTANDING, target=None)
            return RouterOutput(
                task=AnalysisTask.UNSUPPORTED,
                target=None,
                reason="Target class is not supported for satellite imagery detection.",
            )

        if target_cls == "water":
            return RouterOutput(task=AnalysisTask.WATER_SEGMENTATION, target="water")
        if target_cls == "vegetation":
            return RouterOutput(task=AnalysisTask.VEGETATION_SEGMENTATION, target="vegetation")
        if target_cls == "building":
            return RouterOutput(task=AnalysisTask.BUILDING_DETECTION, target="building")
        if target_cls == "snow":
            return RouterOutput(task=AnalysisTask.SNOW_SEGMENTATION, target="snow")
        return RouterOutput(task=AnalysisTask.SCENE_UNDERSTANDING, target=None)
