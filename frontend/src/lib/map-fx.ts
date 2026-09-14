/**
 * map-fx.ts — Map hover and animation specification
 * Implements PRD §6: M1, M2, M7, M8
 * All map interactions live in this module.
 */

/**
 * M7 — Number count-up ticker.
 * Animates a number from 0 to target over 400ms ease-out.
 * Only for MEASURED values — inferred values appear instantly.
 *
 * @param el - The DOM element to animate text content into
 * @param target - The target number
 * @param suffix - Optional suffix (e.g., ' ha', ' m²')
 * @param decimals - Number of decimal places
 */
export function countUp(
  el: HTMLElement,
  target: number,
  suffix: string = '',
  decimals: number = 2,
): void {
  // Respect prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = target.toFixed(decimals) + suffix;
    return;
  }

  const duration = 400;
  const start = performance.now();

  function tick(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out: 1 - (1 - t)^3
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;
    el.textContent = current.toFixed(decimals) + suffix;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

/**
 * M1 — Cursor reticle coordinate formatting.
 * Formats lat/lng for the SLOT-14 readout.
 */
export function formatCoord(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `LAT: ${Math.abs(lat).toFixed(4)}° ${latDir} / LON: ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/**
 * M3 — Compute lock-on bracket positions from a bounding box.
 * Returns CSS positions for four L-shaped corner brackets.
 */
export interface BracketPositions {
  topLeft: { top: number; left: number };
  topRight: { top: number; right: number };
  bottomLeft: { bottom: number; left: number };
  bottomRight: { bottom: number; right: number };
}

export function computeBrackets(
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  containerRect: DOMRect,
): BracketPositions {
  return {
    topLeft: { top: bbox.minY - containerRect.top, left: bbox.minX - containerRect.left },
    topRight: { top: bbox.minY - containerRect.top, right: containerRect.right - bbox.maxX },
    bottomLeft: { bottom: containerRect.bottom - bbox.maxY, left: bbox.minX - containerRect.left },
    bottomRight: { bottom: containerRect.bottom - bbox.maxY, right: containerRect.right - bbox.maxX },
  };
}

/**
 * M7 — Format area for display with optional count-up.
 */
export function formatArea(areaM2: number): { label: string; value: number; unit: string } {
  if (areaM2 >= 10000) {
    return { label: `${(areaM2 / 10000).toFixed(2)} ha`, value: areaM2 / 10000, unit: ' ha' };
  }
  return { label: `${Math.round(areaM2)} m²`, value: Math.round(areaM2), unit: ' m²' };
}
