"""Semantic Annotation Intent Parser for Chakshu Ask AI (SIH26167 §1-§6, §22-§26).

Parses natural-language queries (English, Hindi, Hinglish, mixed) into structured
AnnotationIntent with distinct target, operations, scope, temporal range, filter,
and label modes.
"""

from __future__ import annotations

import re
from typing import Any

from app.schemas.ask import AnnotationIntent


TARGET_SYNONYMS: dict[str, list[str]] = {
    "water": [
        "water bodies", "water body", "waterbodies", "waterbody", "water",
        "paani wali jagah", "pani wali jagah", "paani", "pani", "jal",
        "talab", "reservoir", "reservoirs", "lake", "lakes", "pond", "ponds",
        "retention basin", "basin", "basins",
    ],
    "new_buildings": [
        "new buildings", "new building", "nayi buildings", "nayi building",
        "naye building", "naye buildings", "nayi imarat", "nayi imaratein",
        "naye structure", "new structures", "new structure", "jo new buildings",
        "jo buildings bani", "jo nayi buildings", "buildings that appeared",
        "recently built buildings", "recent buildings", "naya nirman",
    ],
    "buildings": [
        "buildings", "building", "imaratein", "imarat", "makaan",
        "structures", "structure", "dhancha", "complexes", "complex",
        "terminal", "tower", "cargo hub",
    ],
    "vegetation_loss": [
        "vegetation disappeared", "where vegetation disappeared",
        "vegetation loss", "loss of vegetation", "vegetation decreased",
        "vegetation decrease", "hariyali kam hui", "hariyali kahan kam hui",
        "ped kahan kate", "ped kate", "forest clearance", "trees removed",
        "cleared vegetation", "vegetation clearance",
    ],
    "vegetation_gain": [
        "vegetation gain", "vegetation increase", "green buffer", "green belt",
        "ecological buffer", "hariyali badhi", "nayi hariyali", "new vegetation",
    ],
    "vegetation": [
        "vegetation", "hariyali", "greenery", "forest", "plants", "ped", "paudhe",
    ],
    "changed_area": [
        "changed areas", "changed area", "changed region", "changed regions",
        "change area", "change areas", "change region", "badla hua area",
        "badlav wali jagah", "badli hui jagah", "parivartan wali jagah",
        "all changes", "change mask", "where change happened",
        "where did the change happen", "yaha ka changed area", "changed jagah",
    ],
    "construction": [
        "construction", "earthworks", "construction zone", "construction area",
        "nirman", "grading",
    ],
    "bare_land": [
        "bare land", "bare soil", "cleared land", "khali zameen", "mitti", "zameen",
    ],
    "roads": [
        "roads", "road", "sadak", "highway", "runway", "taxiway", "airstrip",
    ],
    "selected_object": [
        "this", "here", "isko", "ye", "is object", "is target",
        "selected target", "selected object", "this object", "this building",
        "this water body", "this polygon", "selected polygon", "yaha", "yahan",
    ],
}

OPERATION_SYNONYMS: dict[str, list[str]] = {
    "clear": [
        "clear", "clear annotations", "remove annotations", "hatao", "saaf karo",
        "reset annotations", "hide annotations", "delete annotations",
    ],
    "highlight": [
        "highlight", "highlight karo", "mark", "mark karo", "show", "dikhao",
        "outline", "fill", "locate", "display", "point out",
    ],
    "label": [
        "with notation", "notation ke saath", "notation ke sath", "notation",
        "label them", "label each", "with labels", "with label", "mark each one",
        "show their ids", "show id", "show ids", "with ids", "with id",
        "naam dikhao", "id ke saath", "labels",
    ],
    "measure": [
        "how much area", "kitna area", "area kitna", "measure", "extent", "size",
        "with area", "area ke saath", "area ke sath", "show their area", "show its area",
    ],
    "count": [
        "how many", "kitne", "kitni", "count", "number of", "total kitne",
    ],
    "zoom": [
        "zoom", "zoom there", "zoom karo", "fit", "focus", "center",
        "wahan zoom karo", "yahan zoom karo",
    ],
    "compare": [
        "compare", "show before and after", "before and after", "compare before after",
        "pehle aur abhi", "pehle aur baad",
    ],
}


def is_annotation_request(norm_q: str) -> bool:
    """Determine whether query explicitly or implicitly requests visual annotation or map action."""
    # Pure measurement questions without highlight/show/mark are not annotation requests (§3, §23)
    is_pure_measurement = any(
        norm_q.startswith(p)
        for p in [
            "how much area", "kitna area", "what is the area",
            "how much water area", "what area",
        ]
    ) and not any(
        op in norm_q for op in ["highlight", "mark", "show", "dikhao", "notation", "label"]
    )
    if is_pure_measurement:
        return False

    annotation_triggers = [
        "highlight", "mark", "show", "dikhao", "notation", "label",
        "outline", "fill", "clear", "zoom", "compare", "karo", "kar",
        "with notation", "with area", "only the largest", "sabse bada",
        "where are", "where is", "locate", "kahan hain", "kidhar hain",
    ]
    return any(trig in norm_q for trig in annotation_triggers)


def extract_target(norm_q: str, slots: dict[str, Any], map_context: dict[str, Any] | None) -> str:
    """Identify the target semantic class, prioritizing specific multi-word tokens."""
    # Priority 1: Check compound/specific targets first
    for target_key in ["new_buildings", "vegetation_loss", "vegetation_gain", "changed_area"]:
        for syn in TARGET_SYNONYMS[target_key]:
            if syn in norm_q:
                return target_key

    # Priority 2: Check explicit selected object reference if selected_target exists
    selected_target = (map_context or {}).get("selected_target") or slots.get("selected_target")
    selected_id = (map_context or {}).get("selected_evidence_id")
    has_selection = bool(selected_target or selected_id)

    has_selected_reference = any(
        re.search(rf"\b{re.escape(w)}\b", norm_q)
        for w in ["this", "here", "isko", "ye", "is object", "selected", "is polygon", "yaha"]
    )
    if has_selection and has_selected_reference:
        # If user explicitly references a class for the selected object (e.g. "yaha ke buildings"),
        # check if building was specified
        if any(w in norm_q for w in ["building", "buildings", "imarat", "imaratein"]):
            return "buildings"
        if any(w in norm_q for w in ["water", "pani", "talab", "reservoir"]):
            return "water"
        return "selected_object"

    # Priority 3: Check remaining general targets
    for target_key, syns in TARGET_SYNONYMS.items():
        if target_key in ("selected_object", "new_buildings", "vegetation_loss", "vegetation_gain", "changed_area"):
            continue
        for syn in syns:
            if re.search(rf"\b{re.escape(syn)}\b", norm_q):
                return target_key

    if has_selected_reference and has_selection:
        return "selected_object"

    return slots.get("target_class") or "changed_area"


def extract_operations(norm_q: str) -> list[str]:
    """Identify operations requested (highlight, label, zoom, clear, filter, etc.)."""
    ops: list[str] = []

    if any(w in norm_q for w in OPERATION_SYNONYMS["clear"]):
        return ["clear"]

    if any(w in norm_q for w in OPERATION_SYNONYMS["compare"]):
        ops.append("compare")

    if any(w in norm_q for w in OPERATION_SYNONYMS["label"]):
        ops.append("label")

    if any(w in norm_q for w in ["with area", "area ke saath", "area ke sath", "show their area"]):
        ops.append("label")
        ops.append("measure")

    if any(w in norm_q for w in OPERATION_SYNONYMS["zoom"]) or "where are" in norm_q or "where is" in norm_q or "kahan" in norm_q:
        ops.append("zoom")

    if any(w in norm_q for w in ["largest", "biggest", "sabse bada", "sabse badi", "larger than", "greater than", "only"]):
        ops.append("filter")

    if any(w in norm_q for w in OPERATION_SYNONYMS["count"]):
        ops.append("count")

    # Default visual operation is highlight if not clear
    if "clear" not in ops and "highlight" not in ops:
        ops.insert(0, "highlight")

    return ops


def extract_filter(norm_q: str) -> dict[str, Any] | None:
    """Extract filtering criteria such as largest, minimum area, or temporal range."""
    filt: dict[str, Any] = {}

    if any(w in norm_q for w in ["largest", "biggest", "sabse bada", "sabse badi", "only the largest", "only largest"]):
        filt["type"] = "largest"

    min_area_m = re.search(r"(?:larger than|greater than|more than|>|se bada)\s*(\d+(?:\.\d+)?)\s*(sqm|m2|m²|ha|hectares?)?", norm_q)
    if min_area_m:
        val = float(min_area_m.group(1))
        unit = min_area_m.group(2) or "m2"
        filt["type"] = "min_area"
        filt["min_area_m2"] = val * 10000.0 if "ha" in unit else val

    year_matches = re.findall(r"\b(20\d\d)\b", norm_q)
    if len(year_matches) >= 2:
        filt["temporal_range"] = [year_matches[0], year_matches[1]]

    return filt if filt else None


def extract_label_mode(norm_q: str, ops: list[str]) -> str:
    """Determine notation label mode."""
    if any(w in norm_q for w in ["with area", "area ke saath", "area ke sath", "show their area"]):
        return "with_area"
    if "label" in ops or any(w in norm_q for w in OPERATION_SYNONYMS["label"]):
        return "requested"
    return "none"


def extract_color_override(norm_q: str) -> str | None:
    """Extract explicit color override if requested by user (SIH26167 §18)."""
    for col in ["blue", "green", "red", "orange", "yellow", "amber", "cyan", "magenta"]:
        if f"in {col}" in norm_q or f"{col} color" in norm_q or f"{col} mein" in norm_q:
            return col
    return None


def parse_annotation_intent(
    norm_q: str,
    slots: dict[str, Any],
    map_context: dict[str, Any] | None = None,
    conversation_history: list[dict[str, Any]] | None = None,
) -> AnnotationIntent | None:
    """Parse query into structured AnnotationIntent or return None if not an annotation query."""
    map_ctx = map_context or {}

    # 1. Check for 'clear' command (§27)
    if norm_q.strip() in ("clear", "clear map", "clear annotations", "reset", "hatao", "saaf karo"):
        return AnnotationIntent(
            intent="map_annotation",
            target="current_region",
            operation="clear",
            operations=["clear"],
            scope="current_aoi",
            label_mode="none",
            evidence_required=False,
        )

    # 2. Check for conversational follow-ups (§26)
    if conversation_history and len(norm_q.split()) <= 4:
        last_target = None
        for msg in reversed(conversation_history):
            if msg.get("target_class"):
                last_target = msg.get("target_class")
                break
            if msg.get("annotation_target"):
                last_target = msg.get("annotation_target")
                break

        if norm_q in ("with area", "area ke saath", "area ke sath", "show their area", "show area"):
            target = last_target or "water"
            return AnnotationIntent(
                intent="map_annotation",
                target=target,
                operation="label",
                operations=["highlight", "label", "measure"],
                scope="current_aoi",
                label_mode="with_area",
                measurement="area",
                evidence_required=True,
            )

        if norm_q in ("only the largest one", "only the largest", "only largest", "sabse bada wala", "sabse bada"):
            target = last_target or "water"
            return AnnotationIntent(
                intent="map_annotation",
                target=target,
                operation="filter",
                operations=["highlight", "filter", "zoom"],
                scope="current_aoi",
                filter={"type": "largest"},
                label_mode="compact",
                evidence_required=True,
            )

        if norm_q in ("zoom there", "zoom karo", "wahan zoom karo", "focus there", "zoom"):
            target = last_target or "water"
            return AnnotationIntent(
                intent="map_annotation",
                target=target,
                operation="zoom",
                operations=["zoom"],
                scope="current_aoi",
                label_mode="none",
                evidence_required=True,
            )

    # 3. Check if query is an annotation request
    if not is_annotation_request(norm_q):
        return None

    target = extract_target(norm_q, slots, map_ctx)
    ops = extract_operations(norm_q)
    filt = extract_filter(norm_q)
    label_mode = extract_label_mode(norm_q, ops)
    color_override = extract_color_override(norm_q)

    # Temporal range detection
    temporal_range = filt.get("temporal_range") if filt else None
    if not temporal_range and slots.get("year_a") and slots.get("year_b"):
        temporal_range = [str(slots["year_a"]), str(slots["year_b"])]

    # Scope determination
    scope = "selected_object" if target == "selected_object" else "current_aoi"

    return AnnotationIntent(
        intent="map_annotation",
        target=target,
        operation=ops[0] if ops else "highlight",
        operations=ops,
        scope=scope,
        temporal_scope="temporal_delta" if (temporal_range or target in ("new_buildings", "vegetation_loss")) else "current",
        temporal_range=temporal_range,
        filter=filt,
        label_mode=label_mode,
        measurement="area" if "measure" in ops else ("count" if "count" in ops else None),
        evidence_required=True,
        color_override=color_override,
    )
