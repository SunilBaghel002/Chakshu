"""Deterministic Intent and Slot Router for Chakshu (Tasks 6.1, 6.2, 6.9, 6.10, PRD 2 §7, SIH26167).

Implements the Tier-1 deterministic query understanding and routing layer:
1. Normalises text (English, Hindi transliteration, Hinglish contractions, punctuation cleanup).
2. Extracts slots: dates, temporal windows, classes, measurement flags, spatial evidence flags.
3. Resolves conversational anaphora ("Where?", "How much?", "What type?") from history.
4. Matches against canonical satellite analysis intents with strict allowlist.
5. Enforces Resolution Gate refusals (vehicles/aircraft at 10m GSD) and out-of-scope rejections.
6. Emits structured IntentResolution containing matched intent, score, and extracted slots.
"""

from __future__ import annotations

from pathlib import Path
import re
from typing import Any

from app.schemas.analysis import AnalysisTask, RouterOutput
from app.services.query_intent_catalog import (
    CLASS_ALIASES,
    CONTRACTIONS,
    IntentResolution,
    OUT_OF_SCOPE_WORDS,
    REFUSAL_WORDS,
)
from app.services.map_annotation_parser import parse_annotation_intent
from app.services.query_intent_matcher import match_semantic_intents

__all__ = ["IntentResolution", "QueryRouter"]


class QueryRouter:
    """Deterministic intent classifier and slot extractor (Tasks 6.1-6.10, SIH26167 §5-§7)."""

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
                elif in_ex and (
                    s.startswith("template:") or s.startswith("handler:") or s.startswith("slots:")
                ):
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
        """Step 2: Extract structured slots (temporal windows, dates, classes, thresholds)."""
        slots: dict[str, Any] = {}

        # Temporal interval context flag
        if any(
            phrase in norm_text
            for phrase in [
                "time interval",
                "interval mein",
                "samay mein",
                "in dates",
                "these dates",
                "selected dates",
                "between dates",
                "during this time",
                "is dauran",
                "is beech",
            ]
        ):
            slots["uses_current_date_context"] = True

        # Temporal window
        yr_match = re.search(r"\b(?:last|past|in)?\s*(\d+(?:\.\d+)?)\s*years?\b", norm_text)
        if yr_match:
            slots["window_years"] = float(yr_match.group(1))
        elif "since 2022" in norm_text:
            slots["window_years"] = 4.0
        elif "since 2023" in norm_text:
            slots["window_years"] = 3.0

        # Specific year extraction
        year_matches = re.findall(r"\b(20\d\d)\b", norm_text)
        if len(year_matches) >= 2:
            slots["year_a"] = year_matches[0]
            slots["year_b"] = year_matches[1]

        # Target class matching
        for token, canonical in CLASS_ALIASES.items():
            if re.search(rf"\b{re.escape(token)}\b", norm_text):
                slots["target_class"] = canonical
                break

        # Area threshold
        area_m = re.search(r"(\d+(?:\.\d+)?)\s*(m2|m²|sqm|ha|hectares?)", norm_text)
        if area_m:
            num = float(area_m.group(1))
            unit = area_m.group(2)
            slots["min_area_m2"] = num * 10000.0 if "ha" in unit else num

        # Dates extraction
        dates = re.findall(r"\b\d{4}-\d{2}-\d{2}\b", norm_text)
        if len(dates) >= 2:
            slots["before_date"], slots["after_date"] = dates[0], dates[1]

        return slots

    def resolve_intent(
        self,
        query: str,
        gsd_m: float | None = 10.0,
        has_comparison: bool = False,
        conversation_history: list[dict[str, Any]] | None = None,
        map_context: dict[str, Any] | None = None,
    ) -> IntentResolution:
        """Resolve natural-language query to canonical intent with score and slots."""
        norm_q = self.normalise(query)
        slots = self.extract_slots(query, norm_q)

        # 0. Language detection (Hinglish vs English)
        hinglish_tokens = [
            "kitna", "kitni", "kitne", "kahan", "kidhar", "kab", "yaha", "yahan",
            "pehle", "ab", "kya", "bana", "bani", "badla", "badli", "badlav",
            "hua", "hui", "hai", "hain", "paani", "pani", "zameen", "mein", "se", "tak"
        ]
        slots["language"] = "hinglish" if any(w in norm_q.split() for w in hinglish_tokens) else "english"

        # 0b. Explicit Target-Referencing Check (§6, §28)
        selected_target = map_context.get("selected_target") if map_context else None
        if selected_target:
            slots["selected_target"] = selected_target
            slots["target_id"] = selected_target.get("id")
            # ONLY trigger selected_target intent if the query explicitly refers to the selected object/target
            is_explicit_target_q = any(
                w in norm_q for w in ["iska", "iski", "iske", "is object", "is target", "selected target", "selected object", "this object", "this polygon", "selected polygon", "is target ka", "is object ka", "ye target"]
            )
            if is_explicit_target_q:
                if any(w in norm_q for w in ["area", "size", "kitna", "kitni", "how large", "extent"]):
                    slots["requires_measurement"] = True
                    return IntentResolution(intent_id="selected_target_area", score=0.99, matched_by="explicit_target_query", slots=slots)
                if any(w in norm_q for w in ["what is this", "ye kya", "kya bana", "what is here", "what appeared", "ab kya"]):
                    return IntentResolution(intent_id="selected_target_identity", score=0.99, matched_by="explicit_target_query", slots=slots)
                if any(w in norm_q for w in ["pehle", "before", "earlier", "purana"]):
                    return IntentResolution(intent_id="selected_target_before", score=0.99, matched_by="explicit_target_query", slots=slots)
                if any(w in norm_q for w in ["when", "kab", "timeline", "duration", "kitne time"]):
                    return IntentResolution(intent_id="selected_target_timeline", score=0.99, matched_by="explicit_target_query", slots=slots)

        # 1. Out-of-scope non-geospatial queries (§7 unsupported)
        if any(w in norm_q for w in OUT_OF_SCOPE_WORDS):
            return IntentResolution(
                intent_id="unsupported", score=0.15, matched_by="domain_filter", slots=slots
            )

        # 2. Resolution Gate refusal (§2, §5)
        for w in REFUSAL_WORDS:
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

        # 3. Dynamic Visual Annotation Intent (SIH26167 §1-§6, §22-§26)
        ann_intent = parse_annotation_intent(norm_q, slots, map_context, conversation_history)
        if ann_intent is not None:
            slots["annotation_intent"] = ann_intent.model_dump()
            slots["target_class"] = ann_intent.target
            slots["operations"] = ann_intent.operations
            return IntentResolution(
                intent_id="map_annotation",
                score=0.99,
                matched_by="annotation_intent_parser",
                slots=slots,
            )

        # 4. Multilingual Semantic Intent Matching (PRIORITY 1: USER QUERY)
        semantic_res = match_semantic_intents(norm_q, slots, has_comparison)
        if semantic_res is not None:
            return semantic_res

        # 4. Ultra-Short Queries on Selected Target (§9, §37)
        # If semantic matcher did not match, but a target is selected and query is ultra-short without class/sector words
        has_class_word = any(
            w in norm_q for w in ["water", "pani", "jal", "lake", "reservoir", "talab", "pond", "building", "structure", "runway", "vegetation", "hariyali", "forest", "crop", "road", "zameen", "land", "sector", "total", "overall", "all"]
        )
        if selected_target and not has_class_word and len(norm_q.split()) <= 3:
            if any(w in norm_q for w in ["area", "kitna", "kitni", "size", "extent", "how big"]):
                slots["requires_measurement"] = True
                return IntentResolution(intent_id="selected_target_area", score=0.98, matched_by="target_anaphora", slots=slots)
            if any(w in norm_q for w in ["kya", "what", "identity"]):
                return IntentResolution(intent_id="selected_target_identity", score=0.98, matched_by="target_anaphora", slots=slots)
            if any(w in norm_q for w in ["pehle", "before"]):
                return IntentResolution(intent_id="selected_target_before", score=0.98, matched_by="target_anaphora", slots=slots)
            if any(w in norm_q for w in ["kab", "when"]):
                return IntentResolution(intent_id="selected_target_timeline", score=0.98, matched_by="target_anaphora", slots=slots)

        # 5. Conversational Anaphora & Follow-up Resolution (§9)
        if conversation_history and len(norm_q.split()) <= 4:
            last_intent = None
            last_target = None
            for msg in reversed(conversation_history):
                if msg.get("intent"):
                    last_intent = msg.get("intent")
                    last_target = msg.get("target_class")
                    break
                content = str(msg.get("content") or msg.get("text") or "").lower()
                if "building" in content:
                    last_target = "building"
                elif "runway" in content:
                    last_target = "runway"
                elif "water" in content:
                    last_target = "water"

            if True:
                if any(w in norm_q for w in ["where", "kahan", "kidhar", "show", "region"]):
                    slots["is_follow_up"] = True
                    slots["requires_geometry"] = True
                    slots["target_class"] = last_target or "change"
                    return IntentResolution(
                        intent_id="change_location", score=0.95, matched_by="conversation_context", slots=slots
                    )
                if any(w in norm_q for w in ["how much", "kitna", "kitni", "size", "extent", "area"]):
                    slots["is_follow_up"] = True
                    slots["requires_measurement"] = True
                    slots["target_class"] = last_target or "change"
                    return IntentResolution(
                        intent_id="change_area", score=0.95, matched_by="conversation_context", slots=slots
                    )
                if any(w in norm_q for w in ["type", "tarah", "kind", "class", "what changed"]):
                    slots["is_follow_up"] = True
                    slots["target_class"] = last_target or "change"
                    return IntentResolution(
                        intent_id="change_type", score=0.95, matched_by="conversation_context", slots=slots
                    )
                if any(w in norm_q for w in ["pehle", "before"]):
                    slots["is_follow_up"] = True
                    return IntentResolution(
                        intent_id="what_was_before", score=0.95, matched_by="conversation_context", slots=slots
                    )
                if any(w in norm_q for w in ["ab", "now"]):
                    slots["is_follow_up"] = True
                    return IntentResolution(
                        intent_id="what_is_now", score=0.95, matched_by="conversation_context", slots=slots
                    )
                if any(w in norm_q for w in ["when", "kab", "dates", "timing"]):
                    slots["is_follow_up"] = True
                    return IntentResolution(
                        intent_id="change_timeline", score=0.95, matched_by="conversation_context", slots=slots
                    )

        # 5. Fast keyword & example matching against intents.yml
        best_intent = "unsupported"
        best_score = 0.0

        for item in self._intents_cache:
            i_id = item.get("id", "")
            examples = [self.normalise(e) for e in item.get("examples", [])]

            if norm_q in examples:
                return IntentResolution(intent_id=i_id, score=1.0, matched_by="exact_example", slots=slots)

            for ex in examples:
                ex_words = set(ex.split())
                q_words = set(norm_q.split())
                overlap = len(ex_words & q_words) / max(len(ex_words), len(q_words), 1)
                if overlap > best_score:
                    best_score = overlap
                    best_intent = i_id

        if best_score >= 0.35:
            return IntentResolution(intent_id=best_intent, score=best_score, matched_by="token_overlap", slots=slots)

        return IntentResolution(intent_id="unsupported", score=0.0, matched_by="fallback", slots=slots)

    def route_query(
        self,
        query: str,
        gsd_m: float | None = None,
        has_comparison: bool = False,
        has_comparison_image: bool | None = None,
        conversation_history: list[dict[str, Any]] | None = None,
        map_context: dict[str, Any] | None = None,
    ) -> RouterOutput:
        """Map user query to AnalysisTask with extracted parameters."""
        if has_comparison_image is not None:
            has_comparison = has_comparison_image

        res = self.resolve_intent(
            query,
            gsd_m=gsd_m,
            has_comparison=has_comparison,
            conversation_history=conversation_history,
            map_context=map_context,
        )
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
        if res.intent_id == "map_annotation":
            t = str(res.slots.get("target_class", "")).lower()
            if "water" in t:
                return RouterOutput(task=AnalysisTask.WATER_SEGMENTATION, target="water")
            if "vegetation" in t:
                return RouterOutput(task=AnalysisTask.VEGETATION_SEGMENTATION, target="vegetation")
            if "building" in t:
                return RouterOutput(task=AnalysisTask.BUILDING_DETECTION, target="building")
            if "snow" in t:
                return RouterOutput(task=AnalysisTask.SNOW_SEGMENTATION, target="snow")
            return RouterOutput(task=AnalysisTask.CHANGE_DETECTION, target="temporal_change")
        if res.intent_id in (
            "aoi_change_summary", "compare_two_dates", "change_detection",
            "change_area", "change_location", "change_type", "change_timeline",
            "what_was_before", "what_is_now", "new_structures",
            "construction_duration", "land_conversion", "selected_target_area",
            "selected_target_identity", "selected_target_before", "selected_target_timeline",
        ):
            return RouterOutput(task=AnalysisTask.CHANGE_DETECTION, target="temporal_change")
        if res.intent_id in ("describe_image", "caption_image"):
            return RouterOutput(task=AnalysisTask.SCENE_UNDERSTANDING, target=None)

        norm_q = self.normalise(query)
        target_cls = res.slots.get("target_class")
        if not target_cls:
            if any(
                w in norm_q
                for w in ["what is in", "what is visible", "describe", "overview", "what features"]
            ):
                return RouterOutput(task=AnalysisTask.SCENE_UNDERSTANDING, target=None)
            return RouterOutput(
                task=AnalysisTask.UNSUPPORTED,
                target=None,
                reason="Target class is not supported for satellite imagery detection.",
            )

        if target_cls == "water":
            return RouterOutput(task=AnalysisTask.WATER_SEGMENTATION, target="water")
        if target_cls in ("vegetation", "crop", "forest"):
            return RouterOutput(task=AnalysisTask.VEGETATION_SEGMENTATION, target="vegetation")
        if target_cls in ("building", "structure"):
            return RouterOutput(task=AnalysisTask.BUILDING_DETECTION, target="building")
        if target_cls == "snow":
            return RouterOutput(task=AnalysisTask.SNOW_SEGMENTATION, target="snow")
        return RouterOutput(task=AnalysisTask.SCENE_UNDERSTANDING, target=None)
