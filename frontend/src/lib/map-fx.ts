/**
 * map-fx.ts — Map hover, animation, and coordinate math module
 * Source: PRD/09_ui-context.md §6 (M1–M10) & §5.1; PRD/10_ui-console.md §4; PRD/12_ux-rules.md §2, §7
 *
 * All map interaction physics, timings, and honesty rules live here.
 */

/** Check if user prefers reduced motion (disables M2/M8/M9/M10, snaps M1, instant M7) */
export function isReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * M7 & M3 — Number count-up ticker.
 * Animates a figure from 0 to target over 400ms ease-out (1 - (1 - t)^3).
 *
 * HONESTY RULE (PRD 12 §7.1):
 * NEVER count up or animate an INFERRED or UNVERIFIED value.
 * Animating a guess would dress it as a measurement.
 * Never loops.
 */
export function countUp(
  el: HTMLElement,
  target: number,
  suffix: string = '',
  decimals: number = 2,
  onComplete?: () => void,
): () => void {
  if (isReducedMotion()) {
    el.textContent = target.toFixed(decimals) + suffix;
    onComplete?.();
    return () => {};
  }

  const duration = 400; // 400ms per M7 / --m-tick
  const start = performance.now();
  let animId = 0;
  let cancelled = false;

  function tick(now: number) {
    if (cancelled) return;
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Cubic ease-out: 1 - (1 - t)^3
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;
    el.textContent = current.toFixed(decimals) + suffix;

    if (progress < 1) {
      animId = requestAnimationFrame(tick);
    } else {
      el.textContent = target.toFixed(decimals) + suffix;
      onComplete?.();
    }
  }

  animId = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(animId);
  };
}

/**
 * Honesty rule check: whether a value kind is permitted to have a count-up ticker.
 * ONLY 'MEASURED' values may animate. 'INFERRED', 'UNVERIFIED', or unspecified values
 * MUST appear instantly without animation.
 */
export function shouldCountUp(kind?: string | null): boolean {
  if (!kind) return false;
  return kind.toUpperCase() === 'MEASURED';
}

/**
 * M1 — Format coordinates for SLOT-14 readout.
 * Format: LAT: 28.1395° N · LON: 77.7612° E · Z 14.0
 */
export function formatCoord(lat: number, lng: number, zoom?: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const latStr = `${Math.abs(lat).toFixed(4)}° ${latDir}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}° ${lngDir}`;
  const zoomStr = zoom !== undefined ? ` · Z ${zoom.toFixed(1)}` : '';
  return `LAT: ${latStr} · LON: ${lngStr}${zoomStr}`;
}

/**
 * M7 — Format area for display.
 */
export function formatArea(areaM2: number): { label: string; value: number; unit: string; decimals: number } {
  if (areaM2 >= 10000) {
    const val = areaM2 / 10000;
    return { label: `${val.toFixed(2)} ha`, value: val, unit: ' ha', decimals: 2 };
  }
  const val = Math.round(areaM2);
  return { label: `${val} m²`, value: val, unit: ' m²', decimals: 0 };
}

/**
 * M4 — 8 × 5 Sector Grid definition and calculation from stage coordinates.
 * Columns: 01 to 08
 * Rows: A to E
 * Example: SEC 04·B
 */
export interface SectorInfo {
  col: number;
  row: string;
  label: string;
  colIndex: number; // 0..7
  rowIndex: number; // 0..4
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function getSectorFromCoords(
  x: number,
  y: number,
  width: number,
  height: number,
): SectorInfo {
  const safeW = Math.max(width, 1);
  const safeH = Math.max(height, 1);

  const colIndex = Math.min(7, Math.max(0, Math.floor((x / safeW) * 8)));
  const rowIndex = Math.min(4, Math.max(0, Math.floor((y / safeH) * 5)));

  const col = colIndex + 1;
  const row = String.fromCharCode(65 + rowIndex); // A, B, C, D, E
  const colStr = String(col).padStart(2, '0');
  const label = `SEC ${colStr}·${row}`;

  const cellW = safeW / 8;
  const cellH = safeH / 5;

  return {
    col,
    row,
    label,
    colIndex,
    rowIndex,
    rect: {
      x: colIndex * cellW,
      y: rowIndex * cellH,
      width: cellW,
      height: cellH,
    },
  };
}

/**
 * M3 — Lock-on corner brackets calculation.
 * 4 L-shaped corner brackets animate from 12px outside the bbox to the bbox corners
 * over 160ms, staggered 30ms (0ms, 30ms, 60ms, 90ms) with cubic-bezier(0.22, 1, 0.36, 1).
 */
export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface BracketCorner {
  start: { x: number; y: number };
  end: { x: number; y: number };
  delayMs: number;
  durationMs: number;
  armLength: number;
}

export interface BracketSet {
  topLeft: BracketCorner;
  topRight: BracketCorner;
  bottomLeft: BracketCorner;
  bottomRight: BracketCorner;
  bbox: BBox;
}

export function computeBrackets(bbox: BBox): BracketSet {
  const offset = 12; // starts 12px outside the bbox per M3
  const armLength = 10;
  const durationMs = 160;

  return {
    topLeft: {
      start: { x: bbox.minX - offset, y: bbox.minY - offset },
      end: { x: bbox.minX, y: bbox.minY },
      delayMs: 0,
      durationMs,
      armLength,
    },
    topRight: {
      start: { x: bbox.maxX + offset, y: bbox.minY - offset },
      end: { x: bbox.maxX, y: bbox.minY },
      delayMs: 30,
      durationMs,
      armLength,
    },
    bottomLeft: {
      start: { x: bbox.minX - offset, y: bbox.maxY + offset },
      end: { x: bbox.minX, y: bbox.maxY },
      delayMs: 60,
      durationMs,
      armLength,
    },
    bottomRight: {
      start: { x: bbox.maxX + offset, y: bbox.maxY + offset },
      end: { x: bbox.maxX, y: bbox.maxY },
      delayMs: 90,
      durationMs,
      armLength,
    },
    bbox,
  };
}

/**
 * M3 — Compute leader line coordinates from top-left bracket to dossier tag panel.
 */
export function computeLeaderLine(
  bracketTL: { x: number; y: number },
  tagTL: { x: number; y: number },
): { x1: number; y1: number; x2: number; y2: number } {
  return {
    x1: bracketTL.x,
    y1: bracketTL.y,
    x2: tagTL.x,
    y2: tagTL.y,
  };
}

/**
 * PRD 9 §5.1 — Label collision suppression.
 * When change candidate / polygon labels overlap in screen space,
 * the colliding labels are suppressed and counted for the "+n LABELS HIDDEN" chip in SLOT-13.
 */
export interface LabelItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority?: number;
}

export function checkLabelCollisions(items: LabelItem[]): {
  visibleIds: Set<string>;
  hiddenCount: number;
} {
  const visibleIds = new Set<string>();
  const visibleRects: Array<{ x: number; y: number; width: number; height: number }> = [];

  // Sort by priority descending if given
  const sorted = [...items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const item of sorted) {
    const itemRight = item.x + item.width;
    const itemBottom = item.y + item.height;

    let collides = false;
    for (const rect of visibleRects) {
      const rectRight = rect.x + rect.width;
      const rectBottom = rect.y + rect.height;

      // 4px margin around labels to prevent crowding
      const margin = 4;
      const overlap = !(
        itemRight + margin < rect.x ||
        item.x > rectRight + margin ||
        itemBottom + margin < rect.y ||
        item.y > rectBottom + margin
      );

      if (overlap) {
        collides = true;
        break;
      }
    }

    if (!collides) {
      visibleIds.add(item.id);
      visibleRects.push({ x: item.x, y: item.y, width: item.width, height: item.height });
    }
  }

  const hiddenCount = items.length - visibleIds.size;
  return { visibleIds, hiddenCount };
}

/**
 * Hover latency tracker for verification against PRD 12 §2:
 * Budget: Hover polygon -> lock-on tag: <= 100ms p50 / <= 160ms p95.
 */
class HoverLatencyTracker {
  private samples: number[] = [];

  record(latencyMs: number): void {
    this.samples.push(latencyMs);
    if (this.samples.length > 200) {
      this.samples.shift();
    }
  }

  getStats(): { p50: number; p95: number; count: number } {
    if (this.samples.length === 0) return { p50: 0, p95: 0, count: 0 };
    const sorted = [...this.samples].sort((a, b) => a - b);
    const p50Idx = Math.floor(sorted.length * 0.5);
    const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    return {
      p50: sorted[p50Idx] ?? 0,
      p95: sorted[p95Idx] ?? 0,
      count: sorted.length,
    };

  }

  clear(): void {
    this.samples = [];
  }
}

export const hoverLatencyTracker = new HoverLatencyTracker();

import { track, trackAgg } from './track';

/**
 * Record aggregated map polygon hover per PRD 15 §3 (<= 1 per 5s).
 * A pointermove handler emits nothing; only aggregated hover emits.
 */
export function trackMapHover(targetId?: string): void {
  trackAgg('map.hover', { target_id: targetId }, 5000);
}

let viewportTimer: ReturnType<typeof setTimeout> | null = null;
let lastViewportEmitTime = 0;

/**
 * Debounced map viewport tracking per PRD 15 §3.
 * Debounced 2s after interaction ends, max 1 per 10s.
 */
export function trackMapViewport(zoom: number, center: [number, number]): void {
  if (viewportTimer) {
    clearTimeout(viewportTimer);
    viewportTimer = null;
  }

  viewportTimer = setTimeout(() => {
    const now = Date.now();
    if (now - lastViewportEmitTime >= 10000) {
      lastViewportEmitTime = now;
      track('map.viewport', {
        z: Math.round(zoom * 10) / 10,
        center: [
          Math.round(center[0] * 10000) / 10000,
          Math.round(center[1] * 10000) / 10000,
        ],
      });
    }
  }, 2000);
}
