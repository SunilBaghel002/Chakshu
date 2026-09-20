"""Multi-year ChangeSummary data contract for Chakshu.

Supports feature B8: multi-year change queries on an uploaded image paired with archive scenes.
Matches PRD 4 §5 byte-for-byte.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import ChangeType


class WindowSpec(BaseModel):
    """Temporal analysis window parameters and source attribution."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    from_date: str = Field(alias="from")
    to_date: str = Field(alias="to")
    years: float
    from_source: str
    to_source: str


class SceneGap(BaseModel):
    """Observation outage window."""

    model_config = ConfigDict(extra="ignore")

    start: str
    end: str
    days: int
    reason: str
    scenes_lost: int


class SceneStats(BaseModel):
    """Summary of scene availability and quality within the window."""

    model_config = ConfigDict(extra="ignore")

    total: int
    usable: int
    unusable: int
    unusable_reasons: dict[str, int] = Field(default_factory=dict)
    gaps: list[SceneGap] = Field(default_factory=list)
    median_interval_days: int


class ChangeByTypeItem(BaseModel):
    """Aggregated change statistics for a single change type."""

    model_config = ConfigDict(extra="ignore")

    change_type: ChangeType
    count: int
    net_area_m2: float
    net_area_label: str
    gross_gain_m2: float
    gross_loss_m2: float
    earliest_onset: str | None = None
    latest_onset: str | None = None
    still_active: int = 0
    note: str | None = None


class NarrativeFact(BaseModel):
    """Atomic ground-truth measurement token verified by Number Verifier."""

    model_config = ConfigDict(extra="ignore")

    fact_id: str
    kind: str = Field(description="'count' | 'area' | 'onset' | 'gap' | 'percentage'")
    value: Any
    unit: str | None = None
    label: str | None = None
    type: str | None = None
    days: int | None = None
    reason: str | None = None


class ChangeSummary(BaseModel):
    """Complete multi-year change synthesis object."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    summary_id: str
    aoi_id: str
    upload_id: str | None = None
    window: WindowSpec
    scenes: SceneStats
    by_type: list[ChangeByTypeItem] = Field(default_factory=list)
    change_object_ids: list[str] = Field(default_factory=list)
    suppression: dict[str, Any] = Field(default_factory=dict)
    narrative_facts: list[NarrativeFact] = Field(default_factory=list)
    answer: dict[str, Any] | None = None
    trace_id: str
    generated_at: str
