import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { UploadTelemetryTab } from './UploadTelemetryTab';
import type { DetectionStats, CountsSummary, CoverageSummary } from '../lib/types';

describe('UploadTelemetryTab', () => {
  it('renders N/A for null m2/ha without throwing', () => {
    const statsWithoutGsd: DetectionStats = {
      total_objects: 2,
      objects_by_class: { building: 2 },
      total_area_m2: null,
      landcover_area: {
        built: { pct: 48.5, m2: null, ha: null },
        vegetation: { pct: 51.5, m2: null, ha: null },
      },
    };

    const { container } = render(<UploadTelemetryTab stats={statsWithoutGsd} />);

    // Assert it did not throw and rendered container
    expect(container).toBeTruthy();

    // Total area should show N/A
    expect(screen.getByText(/Total Area: N\/A/i)).toBeTruthy();

    // Class percentages should be rendered
    expect(screen.getByText('48.5%')).toBeTruthy();
    expect(screen.getByText('51.5%')).toBeTruthy();

    // All null ha/m2 fields should render N/A
    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThanOrEqual(2);
  });

  it('renders bars, percentages, object counts, and stats from live-shaped response', () => {
    const liveStats: DetectionStats = {
      total_objects: 5,
      objects_by_class: { building: 4, vehicle: 1 },
      total_area_m2: 250000,
      landcover_area: {
        built: { pct: 40.0, m2: 100000, ha: 10.0 },
        vegetation: { pct: 35.0, m2: 87500, ha: 8.8 },
        water: { pct: 25.0, m2: 62500, ha: 6.3 },
      },
    };

    const liveCounts: CountsSummary = {
      total_object_detections: 5,
      total_landcover_detections: 18,
      by_label: { building: 4, vehicle: 1 },
      source: 'live_pipeline',
    };

    render(<UploadTelemetryTab stats={liveStats} counts={liveCounts} />);

    // Check header
    expect(screen.getByText(/Land-Cover Breakdown/i)).toBeTruthy();

    // Check percentages
    expect(screen.getByText('40.0%')).toBeTruthy();
    expect(screen.getByText('35.0%')).toBeTruthy();
    expect(screen.getByText('25.0%')).toBeTruthy();

    // Check ha values
    expect(screen.getByText('10.0 ha')).toBeTruthy();
    expect(screen.getByText('8.8 ha')).toBeTruthy();
    expect(screen.getByText('6.3 ha')).toBeTruthy();

    // Check counts card
    expect(screen.getByText('Discrete Objects')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('Landcover Polygons')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
  });

  it('renders deterministic optical coverage fallback when lcStats is absent', () => {
    const coverage: CoverageSummary = {
      source_track: 'landcover_index',
      total_px: 100000,
      sum_check_pct: 100.0,
      by_class: [
        { label: 'built', px: 60000, pct: 60.0, area_m2: null },
        { label: 'vegetation', px: 40000, pct: 40.0, area_m2: null },
      ],
    };

    render(<UploadTelemetryTab coverage={coverage} />);

    expect(screen.getByText(/Deterministic Optical Land-Cover Classification/i)).toBeTruthy();
    expect(screen.getByText('60.0%')).toBeTruthy();
    expect(screen.getByText('40.0%')).toBeTruthy();
  });
});
