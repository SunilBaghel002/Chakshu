"""Pure domain onset dating module.

Implements Task 3.4 per PRD 2 §6, PRD 3 §A11, and PRD 4 §3.
Pure Python module with zero framework/DB imports (enforced by test_purity.py).

Guarantees:
1. Forward walk: Evaluates temporal observations chronologically.
2. Persistence k: Requires k (default 3) consecutive detections to confirm onset,
   discarding single-scene transient false alarms (clouds, shadows, tillage).
3. Onset interval: Calculates honest uncertainty bracket [start, end, days] between
   the last clean observation and the first confirmed change detection.
4. Onset gaps: Quantifies unusable observation periods (e.g. monsoon cloud obstruction)
   with start/end dates and lost scene counts.
"""

from __future__ import annotations

import datetime
from collections.abc import Sequence
from dataclasses import dataclass, field

from app.domain.constants import PERSISTENCE_K


@dataclass(frozen=True)
class SceneObservation:
    """A single temporal observation of a location or change polygon."""

    scene_id: str
    acquired_at: str  # ISO YYYY-MM-DD
    usable: bool = True
    change_detected: bool = False
    unusable_reason: str | None = None
    cloud_cover_pct: float = 0.0


@dataclass(frozen=True)
class OnsetIntervalResult:
    """Honest uncertainty window for change onset."""

    start: str
    end: str
    days: int


@dataclass(frozen=True)
class OnsetGapResult:
    """A contiguous period of missing or unusable scenes."""

    start: str
    end: str
    reason: str
    scenes_lost: int = 1


@dataclass(frozen=True)
class OnsetResult:
    """Result of forward-walk onset dating over a multi-temporal sequence."""

    first_supported: str | None
    last_seen: str | None
    onset_interval: OnsetIntervalResult | None
    onset_gaps: list[OnsetGapResult] = field(default_factory=list)
    persistence_k: int = PERSISTENCE_K
    confirmed: bool = False
    consecutive_detections: int = 0


def _parse_date(date_str: str) -> datetime.date:
    """Parse ISO date string YYYY-MM-DD into datetime.date."""
    # Take first 10 chars to handle ISO timestamps like 2024-06-09T10:30:00Z
    clean_str = date_str[:10]
    return datetime.date.fromisoformat(clean_str)


def compute_onset(
    observations: Sequence[SceneObservation],
    persistence_k: int = PERSISTENCE_K,
    max_cloud_pct: float = 20.0,
) -> OnsetResult:
    """Execute forward-walk onset dating with k-persistence over observations.

    Args:
        observations: Chronological or unsorted sequence of SceneObservation instances.
        persistence_k: Number of consecutive detections required to confirm onset (PRD 3 §A11).
        max_cloud_pct: Cloud cover percentage threshold above which scene is deemed unusable.

    Returns:
        OnsetResult with first_supported, onset_interval bracket, and gap records.

    """
    if not observations:
        return OnsetResult(
            first_supported=None,
            last_seen=None,
            onset_interval=None,
            onset_gaps=[],
            persistence_k=persistence_k,
            confirmed=False,
            consecutive_detections=0,
        )

    # 1. Sort observations strictly chronologically
    sorted_obs = sorted(observations, key=lambda o: _parse_date(o.acquired_at))

    # 2. Detect and aggregate temporal gaps (unusable periods)
    gaps: list[OnsetGapResult] = []
    current_gap_start: str | None = None
    current_gap_end: str | None = None
    current_gap_reason: str = "unusable scene"
    current_gap_count = 0

    for obs in sorted_obs:
        is_unusable = (not obs.usable) or (obs.cloud_cover_pct > max_cloud_pct)
        if is_unusable:
            reason = obs.unusable_reason or (
                f"cloud cover {obs.cloud_cover_pct:.1f}% exceeds {max_cloud_pct:.0f}%"
            )
            if current_gap_start is None:
                current_gap_start = obs.acquired_at[:10]
                current_gap_end = obs.acquired_at[:10]
                current_gap_reason = reason
                current_gap_count = 1
            else:
                current_gap_end = obs.acquired_at[:10]
                current_gap_count += 1
        else:
            if current_gap_start is not None and current_gap_end is not None:
                gaps.append(
                    OnsetGapResult(
                        start=current_gap_start,
                        end=current_gap_end,
                        reason=current_gap_reason,
                        scenes_lost=current_gap_count,
                    )
                )
                current_gap_start = None
                current_gap_end = None
                current_gap_count = 0

    # Flush any trailing gap
    if current_gap_start is not None and current_gap_end is not None:
        gaps.append(
            OnsetGapResult(
                start=current_gap_start,
                end=current_gap_end,
                reason=current_gap_reason,
                scenes_lost=current_gap_count,
            )
        )

    # 3. Forward walk for k consecutive detections over usable observations
    usable_obs = [
        o for o in sorted_obs if o.usable and (o.cloud_cover_pct <= max_cloud_pct)
    ]

    last_clean_date: str | None = None
    first_supported_date: str | None = None
    last_seen_date: str | None = None
    consecutive_run: list[SceneObservation] = []
    confirmed = False
    max_consecutive = 0

    for obs in usable_obs:
        if obs.change_detected:
            consecutive_run.append(obs)
            last_seen_date = obs.acquired_at[:10]
            if len(consecutive_run) > max_consecutive:
                max_consecutive = len(consecutive_run)

            # Check if persistence threshold k is met
            if len(consecutive_run) == persistence_k and not confirmed:
                confirmed = True
                first_supported_date = consecutive_run[0].acquired_at[:10]
        else:
            # Change not detected: update last clean baseline and reset consecutive counter
            if not confirmed:
                last_clean_date = obs.acquired_at[:10]
                consecutive_run.clear()
            else:
                # If already confirmed, a subsequent non-detection might be an intermittent scene,
                # but onset date remains confirmed
                pass

    # 4. Formulate onset uncertainty interval if confirmed
    onset_interval: OnsetIntervalResult | None = None
    if confirmed and first_supported_date is not None:
        # Start of bracket is the last confirmed clean observation before first_supported
        # If no clean observation exists before, use the first available observation
        interval_start = last_clean_date or usable_obs[0].acquired_at[:10]
        start_d = _parse_date(interval_start)
        end_d = _parse_date(first_supported_date)
        days = max(0, (end_d - start_d).days)
        onset_interval = OnsetIntervalResult(
            start=interval_start,
            end=first_supported_date,
            days=days,
        )

    return OnsetResult(
        first_supported=first_supported_date,
        last_seen=last_seen_date,
        onset_interval=onset_interval,
        onset_gaps=gaps,
        persistence_k=persistence_k,
        confirmed=confirmed,
        consecutive_detections=max_consecutive,
    )
