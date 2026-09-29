"""Map Annotation and Grounded Visual Evidence Service for Chakshu Ask AI.

Strictly enforces SIH26167:
- §7-§9: Real evidence IDs and controlled map action contracts.
- §16-§19: Dynamic compact labels, clutter reduction, and semantic palette.
- §20: Geometry validation gate (no arbitrary/hallucinated polygons).
- §21: Answer count and map annotations strictly derived from the same evidence.
"""

from __future__ import annotations

import logging
from typing import Any

from app.schemas.ask import AnnotationIntent, MapActionItem
from app.schemas.common import DecisionStatus
from app.schemas.evidence import Evidence
from app.schemas.summary import NarrativeFact

log = logging.getLogger(__name__)

# Centralized Semantic Palette (§18)
SEMANTIC_COLORS: dict[str, str] = {
    "water": "#38BDF8",           # Sky/Blue
    "water_bodies": "#38BDF8",
    "building": "#F97316",        # Orange
    "buildings": "#F97316",
    "new_buildings": "#F97316",   # Orange
    "vegetation": "#22C55E",      # Green
    "vegetation_gain": "#22C55E", # Green
    "vegetation_loss": "#EF4444", # Red
    "construction": "#F59E0B",    # Amber
    "bare_land": "#D97706",       # Tan/Brown
    "roads": "#94A3B8",           # Neutral/Gray
    "road": "#94A3B8",
    "changed_area": "#EC4899",    # Magenta/Hot Pink
    "selected_object": "#F5C15C", # Amber Hot
    "current_region": "#38BDF8",
}

CLASS_PREFIXES: dict[str, str] = {
    "water": "W",
    "water_bodies": "W",
    "building": "B",
    "buildings": "B",
    "new_buildings": "NB",
    "vegetation": "V",
    "vegetation_gain": "VG",
    "vegetation_loss": "VL",
    "construction": "C",
    "bare_land": "BL",
    "roads": "R",
    "road": "R",
    "changed_area": "CH",
    "selected_object": "T",
}

PLURAL_TARGET_NAMES: dict[str, str] = {
    "water": "water bodies",
    "water_bodies": "water bodies",
    "building": "buildings",
    "buildings": "buildings",
    "new_buildings": "new buildings",
    "vegetation": "vegetation zones",
    "vegetation_gain": "vegetation gain zones",
    "vegetation_loss": "vegetation loss areas",
    "construction": "construction zones",
    "bare_land": "bare land areas",
    "roads": "transport corridors",
    "road": "transport corridors",
    "changed_area": "change regions",
    "selected_object": "selected target",
    "current_region": "current region",
}


def validate_evidence_geometry(ev: Evidence, aoi_id: str | None = None) -> bool:
    """Validate spatial geometry strictly before allowing map rendering (SIH26167 §20)."""
    # 1. Verification of status
    if getattr(ev, "status", None) == DecisionStatus.REJECTED:
        return False

    # 2. Check confidence threshold
    conf = getattr(getattr(ev, "confidence", None), "overall", 1.0)
    if conf < 0.60:
        return False

    # 3. Check geometry presence
    meas = getattr(ev, "measurement", None)
    if not meas or not meas.geom_4326:
        return False

    geom = meas.geom_4326
    g_type = geom.get("type")
    coords = geom.get("coordinates")
    if not coords or g_type not in ("Polygon", "MultiPolygon"):
        return False

    # 4. Ring closure and valid bounds validation
    rings = coords if g_type == "Polygon" else (coords[0] if coords else [])
    if not rings or not isinstance(rings[0], list) or len(rings[0]) < 4:
        return False

    exterior = rings[0]
    # Check ring closure: exterior[0] approx exterior[-1]
    if exterior[0] != exterior[-1]:
        return False

    # Check coordinate bounds (EPSG:4326)
    for pt in exterior:
        if not (isinstance(pt, (list, tuple)) and len(pt) >= 2):
            return False
        lon, lat = pt[0], pt[1]
        if not (-180.0 <= lon <= 180.0 and -90.0 <= lat <= 90.0):
            return False

    return True


class MapAnnotationService:
    """Orchestrates dynamic spatial evidence retrieval and map action generation."""

    def filter_evidence_by_target(
        self,
        target: str,
        all_evidence: list[Evidence],
        date_a: str,
        date_b: str,
        selected_id: str | None = None,
    ) -> list[Evidence]:
        """Filter authoritative evidence for target semantic class (SIH26167 §7, §11, §14)."""
        target = target.lower()

        if target == "selected_object":
            if selected_id:
                return [e for e in all_evidence if e.change_object_id == selected_id]
            return all_evidence[:1] if all_evidence else []

        if target in ("water", "water_bodies"):
            return [
                e for e in all_evidence
                if str(getattr(getattr(e, "classification", None), "change_type", "")).lower() in ("water_gain", "water")
                or any(w in str(getattr(getattr(e, "measurement", None), "measured_by", "")).lower() for w in ["water", "reservoir", "basin", "pond"])
            ]

        if target == "new_buildings":
            blds = [
                e for e in all_evidence
                if str(getattr(getattr(e, "classification", None), "change_type", "")).lower() in ("construction", "built")
                and any(w in str(getattr(getattr(e, "measurement", None), "measured_by", "")).lower() for w in ["terminal", "tower", "cargo", "fuel", "aocc", "building", "complex"])
            ]
            # Filter temporal: appeared between date_a and date_b
            matched = []
            for e in blds:
                onset = getattr(getattr(e, "temporal", None), "first_supported", None)
                if onset and onset >= date_a:
                    matched.append(e)
                elif not onset:
                    matched.append(e)
            return matched or blds

        if target in ("buildings", "building"):
            return [
                e for e in all_evidence
                if str(getattr(getattr(e, "classification", None), "change_type", "")).lower() in ("construction", "built")
                and any(w in str(getattr(getattr(e, "measurement", None), "measured_by", "")).lower() for w in ["terminal", "tower", "cargo", "fuel", "aocc", "building", "complex"])
            ]

        if target == "vegetation_loss":
            return [
                e for e in all_evidence
                if str(getattr(getattr(e, "classification", None), "change_type", "")).lower() in ("vegetation_loss", "clearance")
                or "clearance" in str(getattr(getattr(e, "measurement", None), "measured_by", "")).lower()
                or "cropland to" in str(getattr(getattr(e, "measurement", None), "measured_by", "")).lower()
            ]

        if target == "vegetation_gain":
            return [
                e for e in all_evidence
                if str(getattr(getattr(e, "classification", None), "change_type", "")).lower() == "vegetation_gain"
                or "green belt" in str(getattr(getattr(e, "measurement", None), "measured_by", "")).lower()
            ]

        if target in ("vegetation", "forest", "green"):
            return [
                e for e in all_evidence
                if "vegetation" in str(getattr(getattr(e, "classification", None), "change_type", "")).lower()
                or any(w in str(getattr(getattr(e, "measurement", None), "measured_by", "")).lower() for w in ["green", "buffer", "grass", "vegetation"])
            ]

        if target in ("construction", "earthworks"):
            return [
                e for e in all_evidence
                if str(getattr(getattr(e, "classification", None), "change_type", "")).lower() == "construction"
                or "construction" in str(getattr(getattr(e, "measurement", None), "measured_by", "")).lower()
            ]

        if target in ("bare_land", "bare"):
            return [
                e for e in all_evidence
                if str(getattr(getattr(e, "classification", None), "change_type", "")).lower() == "clearance"
                or any(w in str(getattr(getattr(e, "measurement", None), "measured_by", "")).lower() for w in ["earthworks", "boundary", "soil"])
            ]

        if target in ("roads", "road", "runway"):
            return [
                e for e in all_evidence
                if any(w in str(getattr(getattr(e, "measurement", None), "measured_by", "")).lower() for w in ["runway", "taxiway", "road", "apron"])
            ]

        # Default: all changes
        return all_evidence

    def apply_filters(self, evidence_list: list[Evidence], filter_dict: dict[str, Any] | None) -> list[Evidence]:
        """Apply deterministic filters to candidate evidence (SIH26167 §24)."""
        if not filter_dict or not evidence_list:
            return evidence_list

        f_type = filter_dict.get("type")
        if f_type == "largest":
            sorted_by_area = sorted(
                evidence_list,
                key=lambda e: getattr(getattr(e, "measurement", None), "area_m2", 0.0),
                reverse=True,
            )
            return [sorted_by_area[0]] if sorted_by_area else []

        if f_type == "min_area":
            min_m2 = float(filter_dict.get("min_area_m2", 0.0))
            return [e for e in evidence_list if getattr(getattr(e, "measurement", None), "area_m2", 0.0) >= min_m2]

        return evidence_list

    def process_annotation(
        self,
        intent: AnnotationIntent,
        all_evidence: list[Evidence],
        date_a: str,
        date_b: str,
        map_context: dict[str, Any] | None = None,
        language: str = "english",
    ) -> tuple[list[str], list[MapActionItem], dict[str, str], str, list[NarrativeFact], list[float] | None]:
        """Produce validated evidence IDs, controlled map actions, dynamic labels, and answer."""
        map_ctx = map_context or {}
        selected_id = map_ctx.get("selected_evidence_id")
        if not selected_id and map_ctx.get("selected_target"):
            selected_id = map_ctx.get("selected_target", {}).get("id") or map_ctx.get("selected_target", {}).get("target_id")

        # 1. Handle Clear Operation (§27)
        if intent.operation == "clear" or "clear" in intent.operations:
            text = "Map annotations clear kar diye gaye hain." if language == "hinglish" else "Map annotations have been cleared."
            return [], [MapActionItem(action="clear_annotations", evidence_ids=[])], {}, text, [], None

        # 2. Filter Candidate Evidence by Semantic Target
        candidates = self.filter_evidence_by_target(intent.target, all_evidence, date_a, date_b, selected_id)

        # 3. Geometry Validation Gate (§20)
        validated = [e for e in candidates if validate_evidence_geometry(e)]

        # 4. Apply Natural Language Filters (§24)
        filtered = self.apply_filters(validated, intent.filter)

        # 5. Handle Zero Evidence / Low-Confidence (§30)
        if not filtered:
            msg = (
                "Is request ke liye reliable spatial evidence uplabdh nahi hai."
                if language == "hinglish"
                else "Reliable spatial evidence is not available for this request."
            )
            return [], [MapActionItem(action="clear_annotations", evidence_ids=[])], {}, msg, [], None

        evidence_ids = [e.change_object_id for e in filtered]
        color = intent.color_override or SEMANTIC_COLORS.get(intent.target, "#38BDF8")
        prefix = CLASS_PREFIXES.get(intent.target, "OBJ")

        # 6. Generate Dynamic Evidence Labels (§16, §17)
        label_dict: dict[str, str] = {}
        for idx, e in enumerate(filtered, start=1):
            compact_id = f"{prefix}-{idx:02d}"
            meas = getattr(e, "measurement", None)
            area_m2 = getattr(meas, "area_m2", 0.0) if meas else 0.0
            area_ha = area_m2 / 10000.0

            if intent.label_mode == "with_area":
                label_dict[e.change_object_id] = f"{compact_id} · {area_ha:.2f} ha"
            else:
                label_dict[e.change_object_id] = compact_id

        # 7. Construct Controlled Map Actions (§8, §9)
        map_actions: list[MapActionItem] = [
            MapActionItem(
                action="highlight_evidence",
                evidence_ids=evidence_ids,
                params={"color": color, "fillOpacity": 0.25, "target": intent.target},
            )
        ]

        if intent.label_mode in ("requested", "with_area", "compact") or "label" in intent.operations:
            map_actions.append(
                MapActionItem(
                    action="show_labels",
                    evidence_ids=evidence_ids,
                    params={"labels": label_dict, "mode": intent.label_mode, "color": color},
                )
            )

        # 8. Compute Combined Bounding Box for Focus/Zoom (§28)
        bboxes = [e.measurement.bbox_4326 for e in filtered if e.measurement and e.measurement.bbox_4326]
        focus_bbox: list[float] | None = None
        if bboxes:
            min_x = min(b[0] for b in bboxes)
            min_y = min(b[1] for b in bboxes)
            max_x = max(b[2] for b in bboxes)
            max_y = max(b[3] for b in bboxes)
            focus_bbox = [min_x, min_y, max_x, max_y]

        if "zoom" in intent.operations or (intent.filter and intent.filter.get("type") == "largest") or intent.target == "selected_object":
            map_actions.append(
                MapActionItem(
                    action="zoom_to_evidence",
                    evidence_ids=evidence_ids,
                    params={"bbox": focus_bbox},
                )
            )

        if "compare" in intent.operations:
            map_actions.append(MapActionItem(action="compare_before_after", evidence_ids=evidence_ids))

        # 9. Format Consistent Answer & Narrative Facts (SIH26167 §21)
        count = len(filtered)
        total_ha = sum(getattr(getattr(e, "measurement", None), "area_m2", 0.0) / 10000.0 for e in filtered)
        target_name = PLURAL_TARGET_NAMES.get(intent.target, intent.target.replace("_", " "))

        facts: list[NarrativeFact] = [
            NarrativeFact(fact_id=f"f_ann_cnt", kind="count", value=count, unit="objects", label=str(count), type=f"{intent.target}_count"),
            NarrativeFact(fact_id=f"f_ann_ha", kind="area", value=round(total_ha, 2), unit="ha", label=f"{total_ha:.2f} ha", type=f"{intent.target}_area"),
        ]

        if intent.filter and intent.filter.get("type") == "largest":
            first_label = label_dict.get(filtered[0].change_object_id, prefix)
            if language == "hinglish":
                answer_text = f"Sabse bada validated {target_name} ({first_label}) map par highlight kiya gaya hai ({total_ha:.2f} ha)."
            else:
                answer_text = f"Showing the largest detected {target_name} ({first_label}), covering {total_ha:.2f} ha."
        elif intent.label_mode == "with_area":
            if language == "hinglish":
                answer_text = f"Map par {count} validated {target_name} unke measured area ke saath highlight kiye gaye hain (total: {total_ha:.2f} ha)."
            else:
                answer_text = f"{count} validated {target_name} were detected and highlighted with area notation tags, spanning {total_ha:.2f} ha."
        elif intent.label_mode == "requested" or "label" in intent.operations:
            labels_str = ", ".join(list(label_dict.values())[:5])
            if language == "hinglish":
                answer_text = f"Map par {count} {target_name} notation ke saath highlight kiye gaye hain ({labels_str})."
            else:
                answer_text = f"{count} {target_name} were detected and highlighted with compact notation tags ({labels_str})."
        else:
            if language == "hinglish":
                answer_text = f"Map par {count} validated {target_name} highlight kar diye gaye hain."
            else:
                answer_text = f"{count} validated {target_name} were detected and highlighted on the map."

        return evidence_ids, map_actions, label_dict, answer_text, facts, focus_bbox
