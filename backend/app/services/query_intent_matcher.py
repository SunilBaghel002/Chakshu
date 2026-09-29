"""Semantic intent matching rules across English, Hindi, and Hinglish for Chakshu."""

from __future__ import annotations

from typing import Any

from app.services.query_intent_catalog import IntentResolution


def match_semantic_intents(
    norm_q: str, slots: dict[str, Any], has_comparison: bool
) -> IntentResolution | None:
    """Evaluate deterministic semantic rules for satellite analysis intents."""
    # Single-image segmentation without comparison
    if not has_comparison:
        if any(w in norm_q for w in ["snow", "ice", "barf", "baraf"]):
            slots["target_class"] = "snow"
            return IntentResolution(
                intent_id="snow_segmentation", score=0.98, matched_by="class_segmentation", slots=slots
            )
        if any(w in norm_q for w in ["road", "roads", "highway", "street", "sadak", "rasta"]):
            slots["target_class"] = "road"
            return IntentResolution(
                intent_id="road_extraction", score=0.95, matched_by="class_segmentation", slots=slots
            )

    # 1. MULTI-INTENT (COUNT + AREA) (§8, §14)
    tokens = set(norm_q.split())
    has_count_q = any(w in norm_q for w in ["kitne", "kitni", "how many", "count", "total kitne", "total kitni", "number of"])
    has_area_q = any(w in norm_q for w in ["area", "extent", "size", "kitna area", "kitne area", "how much area", "hectare", "sqm"]) or "ha" in tokens
    has_conjunction = any(w in norm_q for w in ["aur", "and", "plus", "along with", "sath"]) or (has_count_q and has_area_q)

    is_water_query = any(w in norm_q for w in ["water", "pani", "jal", "lake", "reservoir", "talab", "pond", "waterbody", "waterbodies", "water bodies"])
    is_building_query = any(w in norm_q for w in ["building", "buildings", "imarat", "imaratein", "structure", "structures", "complexes"])

    if has_count_q and has_area_q and has_conjunction:
        if is_water_query:
            slots["target_class"] = "water"
            slots["requires_measurement"] = True
            return IntentResolution(
                intent_id="multi_intent",
                score=0.99,
                matched_by="semantic_multi_intent",
                slots=slots,
                sub_intents=["water_count", "water_area"],
            )
        if is_building_query:
            slots["target_class"] = "building"
            slots["requires_measurement"] = True
            return IntentResolution(
                intent_id="multi_intent",
                score=0.99,
                matched_by="semantic_multi_intent",
                slots=slots,
                sub_intents=["building_count", "building_area"],
            )

    # 2. WATER SPECIFIC QUERIES (§5, §11, §12, §13, §19, §20)
    if is_water_query:
        slots["target_class"] = "water"
        # 2a. Water location ("water bodies kahan hain?", "where is the water?")
        if any(w in norm_q for w in ["where", "kahan", "kidhar", "locate", "show", "dikhao", "location"]):
            slots["requires_geometry"] = True
            return IntentResolution(
                intent_id="water_location", score=0.98, matched_by="semantic_rules", slots=slots
            )
        # 2b. Water count ("kitni water bodies hain?", "how many water bodies?", "kitni water bodies bani")
        if (
            has_count_q
            or any(w in norm_q for w in ["kitni", "kitne", "how many", "count", "total water bodies"])
        ) and not ("total area" in norm_q or "kitna area" in norm_q):
            slots["requires_measurement"] = True
            return IntentResolution(
                intent_id="water_count", score=0.98, matched_by="semantic_rules", slots=slots
            )
        # 2c. Water area ("water bodies ka total area?", "how much area is covered by water?")
        if has_area_q or any(w in norm_q for w in ["how much water", "kitna pani"]):
            slots["requires_measurement"] = True
            return IntentResolution(
                intent_id="water_area", score=0.98, matched_by="semantic_rules", slots=slots
            )
        # 2d. Water temporal change ("water bodies kab bani?", "water bodies me kya change hua?")
        if any(w in norm_q for w in ["change", "badla", "badli", "badlav", "kab", "when", "develop", "grow", "badha"]):
            slots["requires_temporal_comparison"] = True
            return IntentResolution(
                intent_id="water_temporal_change", score=0.97, matched_by="semantic_rules", slots=slots
            )
        # 2e. Default water inquiry
        slots["requires_measurement"] = True
        return IntentResolution(
            intent_id="water_area", score=0.92, matched_by="semantic_rules", slots=slots
        )

    # 3. BUILDING SPECIFIC QUERIES
    if is_building_query:
        slots["target_class"] = "building"
        # 3a. Building location ("where are the buildings?", "buildings kahan hain?")
        if any(w in norm_q for w in ["where", "kahan", "kidhar", "locate", "show", "dikhao", "location"]):
            slots["requires_geometry"] = True
            return IntentResolution(
                intent_id="building_location", score=0.98, matched_by="semantic_rules", slots=slots
            )
        # 3b. Building count ("how many buildings were detected?", "kitne new buildings bane?")
        if has_count_q or any(w in norm_q for w in ["kitni", "kitne", "how many", "count", "detections"]):
            slots["requires_measurement"] = True
            return IntentResolution(
                intent_id="building_count", score=0.98, matched_by="semantic_rules", slots=slots
            )
        # 3c. Building area ("building area kitna hai?", "how much area do buildings cover?")
        if has_area_q:
            slots["requires_measurement"] = True
            return IntentResolution(
                intent_id="building_area", score=0.97, matched_by="semantic_rules", slots=slots
            )
        slots["requires_measurement"] = True
        return IntentResolution(
            intent_id="building_count", score=0.92, matched_by="semantic_rules", slots=slots
        )

    # 4. RUNWAY & AIRPORT INFRASTRUCTURE ("What is runway area?", "Runway kitna bada hai?")
    if any(w in norm_q for w in ["runway", "taxiway", "airstrip", "patti"]):
        slots["target_class"] = "runway"
        slots["requires_measurement"] = True
        return IntentResolution(
            intent_id="runway_analysis", score=0.95, matched_by="semantic_rules", slots=slots
        )

    # 5. VEGETATION ANALYSIS ("Vegetation kitni kam hui?", "How much vegetation?")
    if any(w in norm_q for w in ["vegetation", "hariyali", "ped", "paudhe", "forest", "greenery", "green belt"]):
        slots["target_class"] = "vegetation"
        slots["requires_measurement"] = True
        if any(w in norm_q for w in ["kam", "ghat", "loss", "decrease", "change", "badlav", "badla"]):
            slots["requires_temporal_comparison"] = True
            return IntentResolution(
                intent_id="vegetation_change", score=0.97, matched_by="semantic_rules", slots=slots
            )
        return IntentResolution(
            intent_id="vegetation_area", score=0.95, matched_by="semantic_rules", slots=slots
        )

    # 6. LAND CONVERSION ("Kitni zameen construction me gayi?", "How much land was converted?")
    if (
        (any(w in norm_q for w in ["convert", "converted", "conversion", "gayi", "gaya"]) and any(w in norm_q for w in ["construction", "built", "zameen", "land", "khet", "infrastructure"]))
        or "kitna land clear hua" in norm_q
        or "how much land was converted" in norm_q
        or "kitna land construction" in norm_q
        or "kitni zameen construction" in norm_q
    ):
        slots["requires_measurement"] = True
        slots["requires_spatial_evidence"] = True
        return IntentResolution(
            intent_id="land_conversion", score=0.97, matched_by="semantic_rules", slots=slots
        )

    # 7. HISTORICAL BASELINE ("What was here before?", "Pehle yahan kya tha?")
    if (
        (any(w in norm_q for w in ["pehle", "before", "earlier", "purana", "purani"]) and any(w in norm_q for w in ["kya", "what", "tha", "thi", "land", "zameen", "state"]))
        or norm_q in ("pehle kya tha", "pehle kya", "what was here before", "what was here", "what was before")
    ):
        slots["requires_temporal_comparison"] = True
        return IntentResolution(
            intent_id="what_was_before", score=0.96, matched_by="semantic_rules", slots=slots
        )

    # 8. CURRENT STATE ("What is here now?", "Ab yahan kya hai?")
    if (
        (any(w in norm_q for w in ["now", "current", "ab", "abhi", "present"]) and any(w in norm_q for w in ["kya", "what", "hai", "land", "state", "region", "cover"]))
        or norm_q in ("ab kya hai", "what is here now", "what is this now", "ab kya", "current state")
    ):
        return IntentResolution(
            intent_id="what_is_now", score=0.96, matched_by="semantic_rules", slots=slots
        )

    # 9. NEW STRUCTURES ("Yaha kya bana?", "What was built here?")
    if any(phrase in norm_q for phrase in ["yaha kya bana", "yahan kya bana", "what was built", "what appeared", "new structures", "naye structure", "new buildings", "kya bana", "what was constructed"]):
        slots["target_class"] = "building"
        slots["requires_spatial_evidence"] = True
        return IntentResolution(
            intent_id="new_structures", score=0.95, matched_by="semantic_rules", slots=slots
        )

    # 10. CONSTRUCTION DURATION ("Kitne time mein bana?", "When was it built?")
    if (
        (any(w in norm_q for w in ["kitne time", "how long", "how much time", "kitna time", "duration", "exact date"]) and any(w in norm_q for w in ["bana", "bani", "build", "construction", "banne"]))
        or "exact construction date" in norm_q
        or "kitne time me bana" in norm_q
    ):
        slots["requires_temporal_comparison"] = True
        return IntentResolution(
            intent_id="construction_duration", score=0.95, matched_by="semantic_rules", slots=slots
        )

    # 11. OVERALL CHANGE AREA ("Kitna area change hua?", "How much area changed?")
    if (
        ("area" in norm_q or "zameen" in norm_q or "kitna" in norm_q or "kitni" in norm_q or "how much" in norm_q)
        and any(w in norm_q for w in ["change", "changed", "badla", "badli", "converted", "difference", "parivartan"])
    ) or any(
        phrase in norm_q
        for phrase in [
            "kitna area change",
            "how much area changed",
            "total changed area",
            "what is the changed area",
            "kitni zameen badli",
            "how much land changed",
            "kitna badlav hua",
            "kitna change hua",
        ]
    ):
        slots["requires_measurement"] = True
        slots["requires_spatial_evidence"] = True
        return IntentResolution(
            intent_id="change_area", score=0.98, matched_by="semantic_rules", slots=slots
        )

    # 12. OVERALL CHANGE LOCATION ("Where did change happen?", "Kahan change hua?", "Show me changed region")
    if (
        norm_q in ("where", "kahan", "kidhar", "where is it", "show region", "show the region")
        or (
            any(w in norm_q for w in ["where", "kahan", "kidhar", "which region", "show", "dikhao", "locate"])
            and any(w in norm_q for w in ["change", "changed", "badlav", "badla", "cleared", "happened"])
        )
        or any(
            phrase in norm_q
            for phrase in [
                "where did the change happen",
                "kahan change hua",
                "which region changed",
                "show me the changed region",
                "show the changed regions",
                "show me the changed area",
                "give me the coordinates",
            ]
        )
    ):
        slots["requires_geometry"] = True
        slots["requires_spatial_evidence"] = True
        return IntentResolution(
            intent_id="change_location", score=0.98, matched_by="semantic_rules", slots=slots
        )

    # 13. OVERALL CHANGE TYPE ("What type of land changed?", "What changed?", "Kis type ka badlav?")
    if (
        norm_q in ("what type", "type", "which type", "kis type", "kis tarah", "kis tarah ka")
        or (
            any(w in norm_q for w in ["what type", "which type", "kis type", "kis tarah", "transition", "converted"])
            and any(w in norm_q for w in ["change", "changed", "land", "zameen", "badlav"])
        )
        or any(
            phrase in norm_q
            for phrase in [
                "what type of change",
                "what type of land changed",
                "kis type ka change",
                "kis type ka badlav",
            ]
        )
    ):
        slots["requires_spatial_evidence"] = True
        return IntentResolution(
            intent_id="change_type", score=0.96, matched_by="semantic_rules", slots=slots
        )

    # 14. CHANGE TIMELINE ("When did change happen?", "Kab badla?", "Timeline of change")
    if (
        any(w in norm_q for w in ["when", "kab", "timeline", "date", "dates", "timing"])
        and any(w in norm_q for w in ["change", "changed", "badla", "happened", "cleared"])
    ) or any(phrase in norm_q for phrase in ["when did the change happen", "when did it change", "kab change hua"]):
        return IntentResolution(
            intent_id="change_timeline", score=0.95, matched_by="semantic_rules", slots=slots
        )

    # 15. AOI CHANGE SUMMARY
    if (
        "airport" in norm_q
        or "aoi" in norm_q
        or "window_years" in slots
        or "year_a" in slots
        or "3 years" in norm_q
        or "what changed" in norm_q
    ):
        return IntentResolution(
            intent_id="aoi_change_summary", score=0.91, matched_by="semantic_rules", slots=slots
        )

    return None
