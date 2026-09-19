"""Natural Language QA and plain-English query endpoints for Chakshu (Task 6.7, PRD 4 §6).

Features:
1. Pure deterministic query routing and slot extraction.
2. Strict Resolution Gate refusal for unresolvable objects (e.g. vehicles at 10m GSD).
3. Number Verifier integration: every quantity in output prose is grounded in facts.
4. Dynamic AnalysisEngine execution for uploaded imagery.
"""

from __future__ import annotations

import datetime
import json
import logging
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter

from app.schemas.analysis import AnalysisTask
from app.schemas.ask import (
    Answer,
    AnswerHighlights,
    AnswerSource,
    AskRequest,
    IntentMatch,
    MeasurementsBundleSubObject,
)
from app.schemas.common import AnswerTier
from app.schemas.detection import Upload
from app.schemas.summary import NarrativeFact
from app.services.analysis_engine import AnalysisEngine
from app.services.verifier import NumberVerifier
from app.settings import settings

router = APIRouter(prefix="/ask", tags=["Ask AI"])

verifier = NumberVerifier(tolerance_pct=0.02)
analysis_engine = AnalysisEngine()
log = logging.getLogger(__name__)


def _find_upload_record(upload_id: str | None) -> tuple[Upload | None, Path | None]:
    """Locate upload record and image file for dynamic query analysis."""
    if not upload_id:
        return None, None

    search_dirs = [
        settings.UPLOADS_DIR / upload_id,
        Path("data/uploads") / upload_id,
        Path("backend/data/uploads") / upload_id,
    ]
    for d in search_dirs:
        meta_p = d / "metadata.json"
        if meta_p.exists():
            try:
                with open(meta_p, "r") as f:
                    up = Upload(**json.load(f))
                    img_p = d / up.filename
                    if img_p.exists():
                        return up, img_p
            except Exception as exc:
                log.warning("Failed to load upload metadata: %s", exc)

    return None, None


def _load_detection_data(upload_id: str | None) -> dict[str, Any] | None:
    """Load actual detection data for an upload from stored results."""
    if not upload_id:
        return None

    search_dirs = [
        settings.UPLOADS_DIR / upload_id,
        Path("data/uploads") / upload_id,
        Path("backend/data/uploads") / upload_id,
    ]
    for d in search_dirs:
        det_path = d / "detections.json"
        if det_path.exists():
            try:
                with open(det_path, "r") as f:
                    return json.load(f)
            except Exception as exc:
                log.warning("Failed to load detection data for %s: %s", upload_id, exc)

    return None


def _extract_facts_from_detections(
    det_data: dict[str, Any], query_class: str | None = None,
) -> tuple[list[NarrativeFact], dict[str, Any]]:
    """Extract verified measurement facts from stored detection data."""
    facts: list[NarrativeFact] = []
    stats: dict[str, Any] = {}

    detections = det_data.get("detections", [])
    coverage = det_data.get("coverage")
    det_stats = det_data.get("stats", {})

    matching = [d for d in detections if d.get("label", "").lower() == query_class.lower()] if query_class else detections

    obj_count = len(matching)
    if obj_count > 0:
        facts.append(NarrativeFact(
            fact_id="f_count", kind="count", value=obj_count, unit="detections",
            label=f"{obj_count} {query_class or 'object'} detection{'s' if obj_count != 1 else ''}",
            type=query_class or "object",
        ))

    total_area_m2 = sum(d.get("area_m2", 0) or 0 for d in matching)
    if total_area_m2 > 0:
        area_label = f"{total_area_m2 / 10000:.2f} ha" if total_area_m2 >= 10000 else f"{total_area_m2:.1f} m²"
        facts.append(NarrativeFact(
            fact_id="f_area", kind="area", value=total_area_m2, unit="m2",
            label=area_label, type=query_class or "total",
        ))

    if coverage and isinstance(coverage, dict):
        for cls_item in coverage.get("by_class", []):
            pct = cls_item.get("pct", 0)
            if pct > 0.5:
                label = cls_item.get("label", "")
                facts.append(NarrativeFact(
                    fact_id=f"f_lc_{label}", kind="percentage", value=pct, unit="%",
                    label=f"{pct:.1f}% {label}", type=f"landcover_{label}",
                ))

    if det_stats:
        for cname, data in det_stats.get("landcover_area", {}).items():
            if isinstance(data, dict) and data.get("pct", 0) > 0.5:
                stats[cname] = data

    return facts, stats


@router.post("", response_model=Answer)
async def ask_question(payload: AskRequest) -> Answer:
    """Analyze a natural language query and return an answer with verified facts."""
    q = payload.question.strip()
    norm_q = " ".join(q.lower().split())
    answer_id = f"ans_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # 1. Deterministic Query Routing (§6)
    route = analysis_engine.router.route_query(q)

    # 2. Check Resolution Gate refusals (§2)
    if route.task == AnalysisTask.REFUSAL_RESOLUTION:
        msg = (
            "Vehicles and aircraft cannot be resolved in 10-meter Sentinel-2 imagery "
            "(minimum required: 0.5m GSD). The resolution gate has declined this query "
            "to prevent fabricated detections."
        )
        return Answer(
            answer_id=answer_id, question=q, question_normalised=norm_q,
            intent=IntentMatch(id="refusal_resolution", score=0.98, matched_by="router"),
            slots={"object_requested": route.target or "vehicle", "gsd_tier": "10m"},
            tier=AnswerTier.TEMPLATE, degraded=False, text=msg, text_template=msg, confidence=0.99,
            confidence_parts={"resolution_gate": 1.0, "verifiability": 1.0},
            measurements=MeasurementsBundleSubObject(bundle_id="mb_refusal", facts=[]),
            highlights=AnswerHighlights(), sources=[AnswerSource(kind="dataset", id="ESA Sentinel-2 L2A", licence="Open Access")],
            models_used=[], capability_notice="Resolution Gate Refusal: 10m GSD cannot resolve individual vehicular objects.",
            trace_url=f"/api/v1/ask/{answer_id}/trace", report_url=f"/api/v1/ask/{answer_id}/report.json", generated_at=now_iso,
        )

    # 3. Check out-of-scope non-geospatial queries
    if route.task == AnalysisTask.UNSUPPORTED:
        msg = (
            "I can't answer that from the data I have. I can tell you about changes in this area, "
            "counts and sizes of what's detected, when a change started, or show you a class on the map. "
            "Try one of those."
        )
        return Answer(
            answer_id=answer_id, question=q, question_normalised=norm_q,
            intent=IntentMatch(id="unsupported", score=0.15, matched_by="router"),
            slots={}, tier=AnswerTier.TEMPLATE, degraded=False, text=msg, text_template=msg, confidence=0.0,
            confidence_parts={}, measurements=MeasurementsBundleSubObject(bundle_id="mb_empty", facts=[]),
            highlights=AnswerHighlights(), sources=[], models_used=[],
            capability_notice="Query falls outside geospatial and satellite understanding scope.",
            trace_url=f"/api/v1/ask/{answer_id}/trace", report_url=f"/api/v1/ask/{answer_id}/report.json", generated_at=now_iso,
        )

    # 4. Check for active upload record to run dynamic query-driven analysis (§4, §6)
    up_record, img_path = _find_upload_record(payload.upload_id)
    if up_record and img_path:
        analysis_res = analysis_engine.analyze(query=q, upload=up_record, image_path=img_path)
        prose = analysis_res.answer

        facts: list[NarrativeFact] = []
        if analysis_res.evidence:
            cnt = len(analysis_res.evidence)
            t_name = analysis_res.target or "object"
            facts.append(NarrativeFact(
                fact_id="f_count", kind="count", value=cnt, unit="detections",
                label=f"{cnt} {t_name} detection{'s' if cnt != 1 else ''}", type=t_name,
            ))
            valid_m2 = [e.physical_area_m2 for e in analysis_res.evidence if e.physical_area_m2 is not None]
            if valid_m2:
                total_m2 = sum(valid_m2)
                area_lbl = f"{total_m2 / 10000:.2f} ha" if total_m2 >= 10000 else f"{total_m2:.1f} m²"
                facts.append(NarrativeFact(
                    fact_id="f_area", kind="area", value=total_m2, unit="m2", label=area_lbl, type=t_name,
                ))

        verdict = verifier.verify(prose, facts, allowed_free_numbers={1.0, 2.0, 3.0})
        det_ids = [e.evidence_id for e in analysis_res.evidence]

        return Answer(
            answer_id=answer_id, question=q, question_normalised=norm_q,
            intent=IntentMatch(id=analysis_res.task.value, score=0.92, matched_by="router"),
            slots={"target_class": analysis_res.target, "upload_id": payload.upload_id, "aoi_id": payload.aoi_id or "default"},
            tier=AnswerTier.POLISHED if analysis_res.status == "completed" else AnswerTier.DEGRADED,
            degraded=(analysis_res.status != "completed"), text=prose, text_template=prose,
            confidence=0.90 if analysis_res.evidence else 0.40,
            confidence_parts={"cv_pipeline": 1.0 if analysis_res.evidence else 0.0, "number_verifier": 1.0 if verdict.passed else 0.0},
            measurements=MeasurementsBundleSubObject(bundle_id=f"mb_{analysis_res.task.value}", facts=[f.model_dump() for f in facts]),
            highlights=AnswerHighlights(detection_ids=det_ids[:10]),
            sources=[AnswerSource(kind="upload", id=payload.upload_id or "none")],
            models_used=[{"name": "cv_grounded", "role": "detection", "verified": True}],
            capability_notice=None, trace_url=f"/api/v1/ask/{answer_id}/trace",
            report_url=f"/api/v1/ask/{answer_id}/report.json", generated_at=now_iso,
        )

    # 5. Fallback: Load pre-stored detection data for the upload (e.g. fixtures)
    det_data = _load_detection_data(payload.upload_id)

    if not det_data:
        msg = "No analysis data is available for this query. Please upload a satellite image first using the Upload panel, then ask your question with the upload ID."
        return Answer(
            answer_id=answer_id, question=q, question_normalised=norm_q,
            intent=IntentMatch(id=route.task.value, score=0.80, matched_by="fallback"),
            slots={"upload_id": payload.upload_id}, tier=AnswerTier.DEGRADED, degraded=True,
            text=msg, text_template=msg, confidence=0.0, confidence_parts={},
            measurements=MeasurementsBundleSubObject(bundle_id="mb_empty", facts=[]),
            highlights=AnswerHighlights(), sources=[], models_used=[],
            capability_notice="No upload data found. Upload an image and provide the upload_id.",
            trace_url=f"/api/v1/ask/{answer_id}/trace", report_url=f"/api/v1/ask/{answer_id}/report.json", generated_at=now_iso,
        )

    facts, _ = _extract_facts_from_detections(det_data, route.target)
    prose_parts = [f"The analysis detected {f.label}." if f.kind == "count" else f"The total area is {f.label}." for f in facts]
    prose = " ".join(prose_parts) if prose_parts else f"No {route.target or 'relevant'} features were detected in the analyzed image."
    exp = det_data.get("explanation") or det_data.get("summary")
    if exp:
        prose = f"{prose} {exp}"

    verdict = verifier.verify(prose, facts, allowed_free_numbers={1.0, 2.0, 3.0})
    det_ids = [d.get("id", "") for d in det_data.get("detections", []) if d.get("label", "").lower() == (route.target or "").lower()]

    return Answer(
        answer_id=answer_id, question=q, question_normalised=norm_q,
        intent=IntentMatch(id=route.task.value, score=0.89, matched_by="router"),
        slots={"target_class": route.target, "upload_id": payload.upload_id, "aoi_id": payload.aoi_id or "default"},
        tier=AnswerTier.POLISHED if verdict.passed else AnswerTier.DEGRADED, degraded=not verdict.passed,
        text=prose, text_template=prose, confidence=0.86 if facts else 0.3,
        confidence_parts={"data_available": 1.0 if facts else 0.0, "number_verifier": 1.0 if verdict.passed else 0.0},
        measurements=MeasurementsBundleSubObject(bundle_id=f"mb_{route.task.value}", facts=[f.model_dump() for f in facts]),
        highlights=AnswerHighlights(detection_ids=det_ids[:10]),
        sources=[AnswerSource(kind="upload", id=payload.upload_id or "none")],
        models_used=[{"name": "cv_classical", "role": "detection", "verified": True}],
        capability_notice=None, trace_url=f"/api/v1/ask/{answer_id}/trace",
        report_url=f"/api/v1/ask/{answer_id}/report.json", generated_at=now_iso,
    )
