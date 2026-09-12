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

    model_config = ConfigDict(extra="forbid")

    question: str
    aoi_id: str | None = None
    upload_id: str | None = None


class IntentMatch(BaseModel):
    """Classified user intent with similarity score."""

    model_config = ConfigDict(extra="ignore")

    id: str
    score: float
    matched_by: str = Field(description="'embedding' | 'regex' | 'fallback'")


class AnswerHighlights(BaseModel):
    """Spatial and object references highlighted on the map."""

    model_config = ConfigDict(extra="ignore")

    change_object_ids: list[str] = Field(default_factory=list)
    detection_ids: list[str] = Field(default_factory=list)
    focus_bbox_4326: list[float] | None = None


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
