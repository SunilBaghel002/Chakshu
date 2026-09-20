import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCoord,
  formatArea,
  getSectorFromCoords,
  computeBrackets,
  computeLeaderLine,
  shouldCountUp,
  countUp,
  checkLabelCollisions,
  hoverLatencyTracker,
  isReducedMotion,
} from './map-fx';

describe('map-fx: M1 Coordinate Formatting', () => {
  it('formats positive latitude and longitude with correct N/E designations', () => {
    const formatted = formatCoord(28.1395, 77.7612, 14.0);
    expect(formatted).toBe('LAT: 28.1395° N · LON: 77.7612° E · Z 14.0');
  });

  it('formats negative latitude and longitude with S/W designations', () => {
    const formatted = formatCoord(-12.3456, -45.6789);
    expect(formatted).toBe('LAT: 12.3456° S · LON: 45.6789° W');
  });

  it('formats area with ha or m² depending on threshold', () => {
    const haRes = formatArea(25000);
    expect(haRes.label).toBe('2.50 ha');
    expect(haRes.value).toBe(2.5);

    const m2Res = formatArea(4500);
    expect(m2Res.label).toBe('4500 m²');
    expect(m2Res.value).toBe(4500);
  });
});

describe('map-fx: M4 Sector Grid (8x5) Calculation', () => {
  const width = 800;
  const height = 500;

  it('calculates top-left corner as SEC 01·A', () => {
    const sector = getSectorFromCoords(10, 10, width, height);
    expect(sector.col).toBe(1);
    expect(sector.row).toBe('A');
    expect(sector.label).toBe('SEC 01·A');
  });

  it('calculates bottom-right corner as SEC 08·E', () => {
    const sector = getSectorFromCoords(790, 490, width, height);
    expect(sector.col).toBe(8);
    expect(sector.row).toBe('E');
    expect(sector.label).toBe('SEC 08·E');
  });

  it('calculates center sector correctly', () => {
    // x = 350 -> colIndex = floor((350/800)*8) = floor(3.5) = 3 -> col = 4
    // y = 150 -> rowIndex = floor((150/500)*5) = floor(1.5) = 1 -> row = 'B'
    const sector = getSectorFromCoords(350, 150, width, height);
    expect(sector.label).toBe('SEC 04·B');
  });
});

describe('map-fx: M3 Lock-on Corner Brackets', () => {
  it('computes 4 corner brackets offset 12px outside the bbox with 30ms stagger', () => {
    const bbox = { minX: 100, minY: 100, maxX: 200, maxY: 200 };
    const brackets = computeBrackets(bbox);

    // Top-Left: starts at (88, 88), ends at (100, 100), delay 0ms
    expect(brackets.topLeft.start).toEqual({ x: 88, y: 88 });
    expect(brackets.topLeft.end).toEqual({ x: 100, y: 100 });
    expect(brackets.topLeft.delayMs).toBe(0);
    expect(brackets.topLeft.durationMs).toBe(160);

    // Top-Right: starts at (212, 88), ends at (200, 100), delay 30ms
    expect(brackets.topRight.start).toEqual({ x: 212, y: 88 });
    expect(brackets.topRight.end).toEqual({ x: 200, y: 100 });
    expect(brackets.topRight.delayMs).toBe(30);

    // Bottom-Left: starts at (88, 212), ends at (100, 200), delay 60ms
    expect(brackets.bottomLeft.start).toEqual({ x: 88, y: 212 });
    expect(brackets.bottomLeft.end).toEqual({ x: 100, y: 200 });
    expect(brackets.bottomLeft.delayMs).toBe(60);

    // Bottom-Right: starts at (212, 212), ends at (200, 200), delay 90ms
    expect(brackets.bottomRight.start).toEqual({ x: 212, y: 212 });
    expect(brackets.bottomRight.end).toEqual({ x: 200, y: 200 });
    expect(brackets.bottomRight.delayMs).toBe(90);
  });

  it('computes leader line between bracket and tag anchor', () => {
    const line = computeLeaderLine({ x: 100, y: 100 }, { x: 92, y: 92 });
    expect(line).toEqual({ x1: 100, y1: 100, x2: 92, y2: 92 });
  });
});

describe('map-fx: Honesty Rules (PRD 12 §7 & M7 Ticker)', () => {
  it('allows count-up ONLY for MEASURED kind', () => {
    expect(shouldCountUp('MEASURED')).toBe(true);
    expect(shouldCountUp('measured')).toBe(true);
    expect(shouldCountUp('INFERRED')).toBe(false);
    expect(shouldCountUp('UNVERIFIED')).toBe(false);
    expect(shouldCountUp(null)).toBe(false);
    expect(shouldCountUp(undefined)).toBe(false);
  });

  it('snaps immediately when prefers-reduced-motion is active', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const el = document.createElement('div');
    countUp(el, 18.5, ' ha', 2);
    expect(el.textContent).toBe('18.50 ha');

    window.matchMedia = originalMatchMedia;
  });
});

describe('map-fx: PRD 9 §5.1 Label Collision Suppression', () => {
  it('detects overlapping labels and suppresses colliding items', () => {
    const items = [
      { id: 'item-1', x: 50, y: 50, width: 100, height: 20, priority: 10 },
      // item-2 overlaps item-1
      { id: 'item-2', x: 70, y: 55, width: 100, height: 20, priority: 5 },
      // item-3 is far away, no overlap
      { id: 'item-3', x: 300, y: 300, width: 80, height: 20, priority: 8 },
    ];

    const result = checkLabelCollisions(items);
    expect(result.visibleIds.has('item-1')).toBe(true);
    expect(result.visibleIds.has('item-2')).toBe(false); // Suppressed
    expect(result.visibleIds.has('item-3')).toBe(true);
    expect(result.hiddenCount).toBe(1);
  });

  it('returns hiddenCount 0 when no collisions exist', () => {
    const items = [
      { id: 'item-1', x: 10, y: 10, width: 50, height: 20 },
      { id: 'item-2', x: 100, y: 10, width: 50, height: 20 },
      { id: 'item-3', x: 200, y: 10, width: 50, height: 20 },
    ];
    const result = checkLabelCollisions(items);
    expect(result.hiddenCount).toBe(0);
    expect(result.visibleIds.size).toBe(3);
  });
});

describe('map-fx: Latency Budget Tracker (PRD 12 §2)', () => {
  beforeEach(() => {
    hoverLatencyTracker.clear();
  });

  it('records hover latency samples and asserts p50 <= 100ms and p95 <= 160ms', () => {
    // Simulate 100 frame paint timings for hover -> tag
    for (let i = 0; i < 100; i++) {
      // Normal distribution around 40-70ms, max 130ms
      const timing = 40 + (i % 30) * 2 + (i === 99 ? 50 : 0);
      hoverLatencyTracker.record(timing);
    }

    const stats = hoverLatencyTracker.getStats();
    expect(stats.count).toBe(100);
    expect(stats.p50).toBeLessThanOrEqual(100);
    expect(stats.p95).toBeLessThanOrEqual(160);
  });
});
