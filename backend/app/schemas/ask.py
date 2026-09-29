"""Answer and Natural Language Query contracts for Chakshu.

Supports the three-tier question-answering stack (C1, B5-B9).
Matches PRD 4 §6 byte-for-byte.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import AnswerTier


class AskRequest(BaseModel):
    """Payload for POST /api/v1/ask."""

    model_config = ConfigDict(extra="ignore")

    question: str
    aoi_id: str | None = None
    upload_id: str | None = None
    date_a: str | None = None
    date_b: str | None = None
    conversation_history: list[dict[str, Any]] = Field(default_factory=list)
    map_context: dict[str, Any] | None = None


class IntentMatch(BaseModel):
    """Classified user intent with similarity score."""

    model_config = ConfigDict(extra="ignore")

    id: str
    score: float
    matched_by: str = Field(description="'embedding' | 'regex' | 'fallback'")


class MapActionItem(BaseModel):
    """Controlled map action targeting validated evidence IDs (SIH26167 §8, §9)."""

    model_config = ConfigDict(extra="ignore")

    action: str = Field(description="Controlled action, e.g. 'highlight_evidence', 'show_labels', 'clear_annotations'")
    evidence_ids: list[str] = Field(default_factory=list)
    params: dict[str, Any] = Field(default_factory=dict)


class AnnotationIntent(BaseModel):
    """Structured intermediate representation of user annotation intent (SIH26167 §4)."""

    model_config = ConfigDict(extra="ignore")

    intent: str = "map_annotation"
    target: str = Field(description="e.g. 'water', 'new_buildings', 'buildings', 'vegetation_loss'")
    operation: str = "highlight"
    operations: list[str] = Field(default_factory=list)
    scope: str = "current_aoi"
    temporal_scope: str | None = None
    temporal_range: list[str] | None = None
    filter: dict[str, Any] | None = None
    label_mode: str = "none"
    measurement: str | None = None
    evidence_required: bool = True
    color_override: str | None = None


class AnswerHighlights(BaseModel):
    """Spatial and object references highlighted on the map."""

    model_config = ConfigDict(extra="ignore")

    change_object_ids: list[str] = Field(default_factory=list)
    detection_ids: list[str] = Field(default_factory=list)
    focus_bbox_4326: list[float] | None = None
    map_action: str | None = None
    evidence_titles: list[str] = Field(default_factory=list)
    map_actions: list[MapActionItem] = Field(default_factory=list)
    annotation_labels: dict[str, str] = Field(default_factory=dict)


class AnswerSource(BaseModel):
    """Source item cited in the answer."""

    model_config = ConfigDict(extra="ignore")

    kind: str = Field(description="'scene' | 'upload' | 'dataset'")
    id: str
    checksum: str | None = None
    licence: str | None = None


class MeasurementsBundleSubObject(BaseModel):
    """Ground truth bundle containing every measurement cited in text."""

    model_config = ConfigDict(extra="ignore")

    bundle_id: str
    facts: list[Any] = Field(default_factory=list)


class Answer(BaseModel):
    """Complete Answer object returned by Chakshu QA stack."""

    model_config = ConfigDict(extra="ignore")

    answer_id: str
    question: str
    question_normalised: str
    intent: IntentMatch
    slots: dict[str, Any] = Field(default_factory=dict)
    tier: AnswerTier
    degraded: bool = False
    text: str
    text_template: str
    confidence: float
    confidence_parts: dict[str, float] = Field(default_factory=dict)
    measurements: MeasurementsBundleSubObject
    highlights: AnswerHighlights = Field(default_factory=AnswerHighlights)
    sources: list[AnswerSource] = Field(default_factory=list)
    models_used: list[dict[str, Any]] = Field(default_factory=list)
    capability_notice: str | None = None
    trace_url: str
    report_url: str
    generated_at: str
    temporal: dict[str, Any] = Field(default_factory=dict)
    follow_ups: list[str] = Field(default_factory=list)
    annotation_intent: AnnotationIntent | None = None
    evidence_ids: list[str] = Field(default_factory=list)
    map_actions: list[MapActionItem] = Field(default_factory=list)
