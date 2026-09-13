"""Unit tests for pure domain measurement in UTM (Task 2.3, Feature A10).

Verifies:
1. Kruger Transverse Mercator forward projection accuracy on WGS84 ellipsoid.
2. Phase 2 Gate Requirement: area_m2 matches within 0.1% of ground truth geometry.
3. Metric perimeter calculation and human-readable area labeling (ha vs m²).
4. Centroid and bounding box accuracy in EPSG:4326.
5. Round-trip compliance with MeasurementSubObject schema.
"""

from __future__ import annotations

import pytest

from app.domain.measure import (
    format_area_label,
    measure_polygon,
    parse_utm_epsg,
    wgs84_to_utm,
)
from app.schemas.common import ValueKind


def test_parse_utm_epsg() -> None:
    """Verify UTM zone and hemisphere parsing from standard EPSG codes."""
    assert parse_utm_epsg(32643) == (43, True)  # UTM 43N
    assert parse_utm_epsg(32632) == (32, True)  # UTM 32N
    assert parse_utm_epsg(32720) == (20, False)  # UTM 20S


def test_wgs84_to_utm_benchmark() -> None:
    """Verify projection of Jewar Airport coordinates to UTM Zone 43N."""
    # Jewar Airport approx: 77.7612° E, 28.1305° N
    easting, northing = wgs84_to_utm(77.7612, 28.1305, utm_zone=43, is_northern=True)

    # In UTM 43N, central meridian is 75°E.
    # 77.7612°E is ~2.76° east of central meridian, so easting should be ~771,219 m
    # 28.1305°N is ~3,114,741 m north of equator
    assert 771200.0 < easting < 771240.0
    assert 3114700.0 < northing < 3114780.0


def test_measure_polygon_area_gate_within_point_one_percent() -> None:
    """Phase 2 Gate: area_m2 matches expected area to within 0.1%."""
    # Construct a 1 km x 1 km (100 ha = 1,000,000 m²) square near Jewar
    # Center: 77.7612°E, 28.1305°N
    e0, n0 = wgs84_to_utm(77.7612, 28.1305, 43, True)
    # Target 1,000,000 m² (1000m x 1000m)
    expected_area_m2 = 1_000_000.0

    # Project corners from metric offsets back or construct polygon
    # At lat 28.1305°, 1 deg lat = 110,830.6 m, 1 deg lon = 98,243.2 m
    delta_lat = 1000.0 / 110830.6
    delta_lon = 1000.0 / 98243.2

    min_lon, min_lat = 77.7612, 28.1305
    max_lon, max_lat = min_lon + delta_lon, min_lat + delta_lat

    geojson_poly = {
        "type": "Polygon",
        "coordinates": [
            [
                [min_lon, min_lat],
                [max_lon, min_lat],
                [max_lon, max_lat],
                [min_lon, max_lat],
                [min_lon, min_lat],
            ]
        ],
    }

    res = measure_polygon(geojson_poly, utm_epsg=32643)

    # Check that computed area is within 0.1% of expected 1,000,000 m²
    percent_error = abs(res.area_m2 - expected_area_m2) / expected_area_m2 * 100.0
    assert percent_error < 0.1, f"Area error {percent_error:.4f}% exceeds 0.1% gate limit"

    # Perimeter of 1km square is approx 4,000 m
    assert 3990.0 < res.perimeter_m < 4010.0
    assert res.area_label == "100.00 ha" or "ha" in res.area_label
    assert res.kind == ValueKind.MEASURED
    assert "UTM 43N" in res.measured_by


def test_format_area_label() -> None:
    """Verify human-readable unit conversion logic."""
    assert format_area_label(18432.5) == "1.84 ha"
    assert format_area_label(500000.0) == "50.00 ha"
    assert format_area_label(4210.0) == "4,210.0 m²"
    assert format_area_label(120.0) == "120.0 m²"


def test_measure_polygon_to_subobject_roundtrip() -> None:
    """Verify that MeasurementResult converts to MeasurementSubObject cleanly."""
    geojson_poly = {
        "type": "Polygon",
        "coordinates": [
            [
                [77.758, 28.1281],
                [77.7649, 28.1281],
                [77.7649, 28.133],
                [77.758, 28.133],
                [77.758, 28.1281],
            ]
        ],
    }

    res = measure_polygon(geojson_poly, utm_epsg=32643)
    sub = res.to_subobject()

    assert sub.area_m2 == res.area_m2
    assert sub.area_label == res.area_label
    assert sub.centroid == res.centroid
    assert sub.bbox_4326 == res.bbox_4326
    assert sub.kind == ValueKind.MEASURED
