"""Unit tests for calibration calculation and reliability bins (Tasks 3.8 and 3.9)."""

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT))

from scripts.label_session import compute_calibration, get_standard_validation_dataset


def test_calibration_ten_bins_and_count_sum() -> None:
    """Ensure calibration generates exactly 10 bins and bin counts sum to N."""
    labels, confs = get_standard_validation_dataset()
    report = compute_calibration(labels, confs, aoi_id="test-aoi-1")

    assert report.aoi_id == "test-aoi-1"
    assert report.samples_count == len(labels)
    assert len(report.bins) == 10

    total_in_bins = sum(b.count for b in report.bins)
    assert total_in_bins == report.samples_count
    assert total_in_bins >= 100  # PRD requires >= 100 polygons


def test_perfectly_calibrated_produces_zero_ece() -> None:
    """When confidence matches empirical accuracy in each bin, ECE is zero."""
    # 10 samples: 5 negative at conf 0.0, 5 positive at conf 1.0
    labels = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]
    confs = [0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0]

    report = compute_calibration(labels, confs)
    # Bin 1 has mean_conf=0.0, acc=0.0 -> gap=0
    # Bin 10 has mean_conf=1.0, acc=1.0 -> gap=0
    assert abs(report.expected_calibration_error) < 1e-6


def test_calibration_schema_conformance() -> None:
    """Test report.to_dict() matches data-contracts.md §6 schema."""
    labels, confs = get_standard_validation_dataset()
    report = compute_calibration(labels, confs)
    d = report.to_dict()

    assert "aoi_id" in d
    assert "expected_calibration_error" in d
    assert "samples_count" in d
    assert "bins" in d
    assert len(d["bins"]) == 10

    first_bin = d["bins"][0]
    assert first_bin["bin_index"] == 1
    assert first_bin["confidence_range"] == [0.0, 0.1]
    assert "mean_confidence" in first_bin
    assert "accuracy" in first_bin
    assert "count" in first_bin
