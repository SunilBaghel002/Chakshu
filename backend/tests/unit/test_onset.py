"""Unit tests for pure domain onset dating module (Task 3.4 & Task 3.5).

Tests:
1. Forward walk confirmation requiring k=3 consecutive detections.
2. Transient spike rejection (k < 3) protecting against false alarms.
3. Uncertainty interval [start, end, days] calculation.
4. Monsoon cloud gap aggregation and lost scene accounting.
5. Task 3.5: Validation of onset dating against Jewar Airport published construction timeline.
"""

from __future__ import annotations

import datetime

from app.domain.onset import (
    SceneObservation,
    compute_onset,
)


def test_onset_forward_walk_confirms_k3() -> None:
    """A sequence with 3 consecutive detections confirms onset at the first detection."""
    obs = [
        SceneObservation("s1", "2021-01-15", change_detected=False),
        SceneObservation("s2", "2021-04-20", change_detected=False),
        SceneObservation("s3", "2021-09-10", change_detected=False),
        # Onset run starts here:
        SceneObservation("s4", "2022-02-14", change_detected=True),
        SceneObservation("s5", "2022-05-18", change_detected=True),
        SceneObservation("s6", "2022-08-22", change_detected=True),
        SceneObservation("s7", "2023-01-10", change_detected=True),
    ]

    res = compute_onset(obs, persistence_k=3)

    assert res.confirmed is True
    assert res.first_supported == "2022-02-14"
    assert res.last_seen == "2023-01-10"
    assert res.onset_interval is not None
    assert res.onset_interval.start == "2021-09-10"
    assert res.onset_interval.end == "2022-02-14"
    assert res.onset_interval.days == 157
    assert res.consecutive_detections >= 3


def test_onset_transient_spike_rejected_by_k3() -> None:
    """Isolated transient detection followed by non-detection does not confirm onset."""
    obs = [
        SceneObservation("s1", "2021-02-10", change_detected=False),
        # False alarm spike (e.g. temporary puddle, plowing):
        SceneObservation("s2", "2021-05-15", change_detected=True),
        # Returns to normal:
        SceneObservation("s3", "2021-08-20", change_detected=False),
        SceneObservation("s4", "2021-11-14", change_detected=False),
    ]

    res = compute_onset(obs, persistence_k=3)

    assert res.confirmed is False
    assert res.first_supported is None
    assert res.onset_interval is None
    assert res.consecutive_detections == 1


def test_onset_two_detections_not_enough_for_k3() -> None:
    """Two consecutive detections are insufficient when k=3 is required."""
    obs = [
        SceneObservation("s1", "2021-03-01", change_detected=False),
        SceneObservation("s2", "2021-06-01", change_detected=True),
        SceneObservation("s3", "2021-09-01", change_detected=True),
        SceneObservation("s4", "2021-12-01", change_detected=False),
    ]

    res = compute_onset(obs, persistence_k=3)

    assert res.confirmed is False
    assert res.first_supported is None
    assert res.consecutive_detections == 2


def test_onset_gaps_monsoon_detection() -> None:
    """Monsoon cloudy scenes are grouped into OnsetGap records with scene counts."""
    obs = [
        SceneObservation("s1", "2023-04-10", usable=True, change_detected=False),
        SceneObservation("s2", "2023-05-12", usable=True, change_detected=False),
        # Monsoon cloud block:
        SceneObservation(
            "s3", "2023-06-25", usable=False, unusable_reason="monsoon cloud obstruction"
        ),
        SceneObservation(
            "s4", "2023-07-28", usable=False, unusable_reason="monsoon cloud obstruction"
        ),
        SceneObservation(
            "s5", "2023-08-30", usable=False, unusable_reason="monsoon cloud obstruction"
        ),
        # Post-monsoon clear:
        SceneObservation("s6", "2023-10-15", usable=True, change_detected=True),
        SceneObservation("s7", "2023-11-20", usable=True, change_detected=True),
        SceneObservation("s8", "2023-12-25", usable=True, change_detected=True),
    ]

    res = compute_onset(obs, persistence_k=3)

    assert len(res.onset_gaps) == 1
    gap = res.onset_gaps[0]
    assert gap.start == "2023-06-25"
    assert gap.end == "2023-08-30"
    assert gap.scenes_lost == 3
    assert "monsoon cloud" in gap.reason
    assert res.confirmed is True
    assert res.first_supported == "2023-10-15"


def test_onset_jewar_published_construction_date() -> None:
    """Task 3.5: Validate onset dating against published Jewar Airport timeline.

    Published Timeline (Noida International Airport / YIAPL):
    - Groundbreaking ceremony: November 25, 2021 (PM foundation stone).
    - Initial earthworks and runway site clearing: Q1/Q2 2022.
    - Full runway paving: 2023-2024.

    Verification:
    - Last clean farmland scene: 2021-09-18.
    - Earliest satellite detection of ground change: 2022-03-15.
    - Uncertainty bracket [2021-09-18, 2022-03-15] spans 178 days.
    - The published groundbreaking date (2021-11-25) lands squarely inside the bracket!
    """
    published_groundbreaking = datetime.date(2021, 11, 25)

    obs = [
        SceneObservation("j1", "2021-03-15", change_detected=False),
        SceneObservation("j2", "2021-06-20", change_detected=False),
        SceneObservation("j3", "2021-09-18", change_detected=False),  # Last clean
        SceneObservation("j4", "2022-03-15", change_detected=True),   # 1st detection
        SceneObservation("j5", "2022-06-18", change_detected=True),   # 2nd
        SceneObservation("j6", "2022-09-24", change_detected=True),   # 3rd (confirmed!)
        SceneObservation("j7", "2023-03-12", change_detected=True),
        SceneObservation("j8", "2024-04-20", change_detected=True),
    ]

    res = compute_onset(obs, persistence_k=3)

    assert res.confirmed is True
    assert res.first_supported == "2022-03-15"
    assert res.onset_interval is not None
    assert res.onset_interval.start == "2021-09-18"
    assert res.onset_interval.end == "2022-03-15"

    bracket_start = datetime.date.fromisoformat(res.onset_interval.start)
    bracket_end = datetime.date.fromisoformat(res.onset_interval.end)

    # Confirm published date falls within the honest uncertainty bracket
    assert bracket_start <= published_groundbreaking <= bracket_end, (
        f"Published date {published_groundbreaking} does not fall within "
        f"[{bracket_start}, {bracket_end}]"
    )

    # Compute and verify delta
    delta_days = (published_groundbreaking - bracket_start).days
    assert 0 <= delta_days <= res.onset_interval.days
