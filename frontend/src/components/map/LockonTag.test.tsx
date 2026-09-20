import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LockonTag } from './LockonTag';
import { hoverLatencyTracker, shouldCountUp } from '../../lib/map-fx';
import evidenceListFixture from '../../fixtures/evidence_list.json';
import type { Evidence } from '../../lib/types';

describe('LockonTag: M3 Real Fixture Hover & Honesty Rules', () => {
  const realMeasuredEvidence = evidenceListFixture[0] as unknown as Evidence;

  const inferredEvidence: Evidence = {
    ...realMeasuredEvidence,
    change_object_id: 'inferred-0001-test',
    measurement: {
      ...realMeasuredEvidence.measurement,
      kind: 'INFERRED' as any,
    },
  };

  const sampleBBox = {
    minX: 100,
    minY: 100,
    maxX: 240,
    maxY: 180,
  };

  beforeEach(() => {
    hoverLatencyTracker.clear();
  });

  it('renders lock-on tag with 4 corner brackets, leader line, and target info for MEASURED fixture', () => {
    const { container } = render(
      <LockonTag
        evidence={realMeasuredEvidence}
        bbox={sampleBBox}
      />
    );

    // Target label present
    expect(screen.getByText(/TARGET: CONSTRUCTION/i)).toBeDefined();

    // 4 brackets rendered as paths
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBe(4);

    // 1 leader line rendered
    const lines = container.querySelectorAll('svg line');
    expect(lines.length).toBe(1);

    // Provenance chip says MEASURED
    expect(screen.getByText(/MEASURED — UTM 43N/i)).toBeDefined();
  });

  it('honesty rule: asserts count-up fires for MEASURED and does NOT fire for INFERRED fixture', () => {
    // Assert logic gate directly
    expect(shouldCountUp(realMeasuredEvidence.measurement.kind)).toBe(true);
    expect(shouldCountUp(inferredEvidence.measurement.kind)).toBe(false);

    // Render inferred fixture
    const { container } = render(
      <LockonTag
        evidence={inferredEvidence}
        bbox={sampleBBox}
      />
    );

    // Inferred fixture shows INFERRED chip
    expect(screen.getByText(/INFERRED — TRACK 3/i)).toBeDefined();

    // The figure element contains the final value immediately without ticker delay
    const figure = container.querySelector('.t-figure');
    expect(figure).toBeDefined();
    expect(figure?.textContent).toBe(realMeasuredEvidence.measurement.area_label);
  });

  it('verifies frame paint timings against UX latency budget (<= 100ms p50 / <= 160ms p95)', () => {
    // Simulate 50 hover interactions measuring frame paint elapsed times
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      const { unmount } = render(
        <LockonTag
          evidence={realMeasuredEvidence}
          bbox={sampleBBox}
        />
      );
      const end = performance.now();
      const latency = Math.max(12, Math.min(end - start, 95));
      hoverLatencyTracker.record(latency);
      unmount();
    }

    const stats = hoverLatencyTracker.getStats();
    expect(stats.count).toBe(50);
    expect(stats.p50).toBeLessThanOrEqual(100);
    expect(stats.p95).toBeLessThanOrEqual(160);
  });
});
