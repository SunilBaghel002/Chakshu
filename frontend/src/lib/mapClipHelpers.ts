/**
 * lib/mapClipHelpers.ts
 * Calculation helpers for swipe comparison split clipPath and M3 lock-on bounding boxes
 */

import L from 'leaflet';
import type { BBox } from './map-fx';

export function computeSwipeClipPolygon(
  pct: number,
  w: number,
  h: number,
  map: L.Map,
  isNormal: boolean
): string {
  const nw = map.containerPointToLayerPoint([0, 0]);
  const se = map.containerPointToLayerPoint([w, h]);
  const clipX = map.containerPointToLayerPoint([(pct / 100) * w, 0]).x;
  const top = nw.y - 3000;
  const bot = se.y + 3000;
  const l = nw.x - 3000;
  const r = se.x + 3000;

  return isNormal
    ? `polygon(${clipX}px ${top}px, ${r}px ${top}px, ${r}px ${bot}px, ${clipX}px ${bot}px)`
    : `polygon(${l}px ${top}px, ${clipX}px ${top}px, ${clipX}px ${bot}px, ${l}px ${bot}px)`;
}

export function adjustBBoxForSwipe(
  bbox: BBox,
  containerW: number,
  sliderPos: number,
  isNormal: boolean
): BBox | null {
  const splitPx = (sliderPos / 100) * containerW;
  if (isNormal) {
    if (bbox.maxX <= splitPx) return null;
    return {
      ...bbox,
      minX: Math.max(bbox.minX, splitPx + 8),
    };
  } else {
    if (bbox.minX >= splitPx) return null;
    return {
      ...bbox,
      maxX: Math.min(bbox.maxX, splitPx - 8),
    };
  }
}
