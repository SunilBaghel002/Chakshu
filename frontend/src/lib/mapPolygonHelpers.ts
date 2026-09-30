/**
 * lib/mapPolygonHelpers.ts
 * Map polygon styling, tactical tooltip HTML builder, and screen bounding box helpers
 */

import L from 'leaflet';
import { getClassBadge, getSemanticTransition } from './palette';
import type { BBox } from './map-fx';

/**
 * Styling per PRD 9 §5.1 & §2.5:
 * - Stroke at 100% 1.5 px + 1 px dark inner halo
 * - Fill 30%
 * - Track 3 dashed ('4, 4'), Tracks 1/2 solid
 * - Hover: stroke goes --amber-hot (#F5C15C) 2 px, fill 30% -> 45% (M3)
 */
export const getPolyStyle = (
  isSelected: boolean,
  color: string,
  visible: boolean,
  isBaselinePreExisting: boolean,
  isTrack3: boolean = false,
  isEmerged: boolean = true
): L.PathOptions => {
  if (!visible || !isEmerged) {
    return { color: 'transparent', weight: 0, opacity: 0, fillColor: 'transparent', fillOpacity: 0 };
  }
  if (isSelected) {
    return {
      color: '#F5C15C', // --amber-hot
      weight: 2.0,
      opacity: 1.0,
      fillColor: color,
      fillOpacity: 0.45,
      dashArray: isTrack3 ? '4, 4' : undefined,
      className: 'poly-halo-dark',
    };
  }
  if (isBaselinePreExisting) {
    return {
      color,
      weight: 1.2,
      opacity: 0.4,
      fillColor: color,
      fillOpacity: 0.08,
      dashArray: '4, 6',
      className: 'poly-halo-dark',
    };
  }
  return {
    color,
    weight: 1.5,
    opacity: 1.0,
    fillColor: color,
    fillOpacity: 0.30,
    dashArray: isTrack3 ? '4, 4' : undefined,
    className: 'poly-halo-dark',
  };
};

export interface TooltipProps {
  facilityLabel: string;
  changeType: string;
  areaLabel: string;
  confPct: number;
}

export function buildPolygonTooltipHtml({
  facilityLabel,
  changeType,
  areaLabel,
  confPct,
}: TooltipProps): string {
  const label = facilityLabel || changeType;
  const badge = getClassBadge(label);
  const transition = getSemanticTransition(label, changeType);

  return `
    <div class="leaflet-tactical-tooltip-content" style="min-width:210px;max-width:280px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
        <span style="background:${badge.bg};color:${badge.color};border:1px solid ${badge.color}80;padding:1px 6px;border-radius:2px;font-size:8px;font-weight:700;letter-spacing:0.06em;font-family:var(--font-mono);">${badge.name}</span>
        <span style="font-family:var(--font-mono);font-size:9px;color:var(--ink-2);font-weight:700;">${areaLabel}</span>
      </div>
      <div style="font-family:var(--font-cond);font-size:12px;font-weight:700;color:var(--ink);letter-spacing:0.02em;margin-bottom:4px;line-height:1.25;">
        ${label}
      </div>
      <div style="display:flex;align-items:center;gap:4px;font-family:var(--font-mono);font-size:8.5px;background:rgba(63,169,245,0.12);padding:2px 6px;border-radius:3px;border:1px solid rgba(63,169,245,0.3);margin-bottom:4px;">
        <span style="color:#F59E0B;font-weight:600;">${transition.fromClass}</span>
        <span style="color:var(--primary-cyan);font-weight:700;">➔</span>
        <span style="color:var(--primary-cyan);font-weight:700;">${transition.toClass}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-family:var(--font-mono);font-size:8px;color:var(--ink-3);margin-top:2px;border-top:1px solid rgba(255,255,255,0.08);padding-top:3px;">
        <span>AI Confidence: <strong style="color:#10B981;">${confPct}%</strong></span>
        <span style="color:var(--primary-cyan);font-weight:600;">Click to Inspect ▸</span>
      </div>
    </div>
  `;
}

export function computeContainerBBoxFromLayer(map: L.Map | null, layer: L.Path): BBox | null {
  if (!map) return null;
  const bounds =
    'getBounds' in layer && typeof (layer as L.Polygon).getBounds === 'function'
      ? (layer as L.Polygon).getBounds()
      : null;
  if (!bounds) return null;

  const nw = map.latLngToContainerPoint(bounds.getNorthWest());
  const se = map.latLngToContainerPoint(bounds.getSouthEast());

  return {
    minX: Math.min(nw.x, se.x),
    minY: Math.min(nw.y, se.y),
    maxX: Math.max(nw.x, se.x),
    maxY: Math.max(nw.y, se.y),
  };
}

export function getEvidenceDisplayTitle(ev: any): string {
  if (!ev) return 'Selected Target';
  const measuredBy = ev.measurement?.measured_by;
  if (typeof measuredBy === 'string' && measuredBy.trim()) {
    return measuredBy.replace(/^Semantic vectorisation,\s*UTM\s*43N:\s*/i, '').trim();
  }
  return (
    ev.title ||
    ev.class_name ||
    ev.classification?.change_type ||
    ev.change_type ||
    'Selected Target'
  );
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0] ?? 0;
    const yi = ring[i]?.[1] ?? 0;
    const xj = ring[j]?.[0] ?? 0;
    const yj = ring[j]?.[1] ?? 0;
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findSmallestEvidenceAtLatLng<T extends { measurement?: any; temporal?: any }>(
  lat: number,
  lng: number,
  evidenceList: T[],
  afterDate?: string
): T | null {
  const matches: T[] = [];
  for (const ev of evidenceList) {
    const onset = ev.temporal?.first_supported;
    if (onset && afterDate && onset > afterDate) continue;
    const geom = ev.measurement?.geom_4326;
    if (!geom || !Array.isArray(geom.coordinates)) continue;
    const rings: number[][][] =
      geom.type === 'Polygon'
        ? [geom.coordinates[0]]
        : geom.type === 'MultiPolygon'
        ? geom.coordinates.map((p: number[][][]) => p[0])
        : [];
    if (rings.some((r) => Array.isArray(r) && pointInRing(lng, lat, r))) {
      matches.push(ev);
    }
  }
  if (!matches.length) return null;
  matches.sort((a, b) => (a.measurement?.area_m2 || Infinity) - (b.measurement?.area_m2 || Infinity));
  return matches[0] || null;
}

export function lonLatToTile(lon: number, lat: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

export function buildMiniMaskPoints(geom?: { type: string; coordinates: any }): string {
  if (!geom || !geom.coordinates) return '30,50 130,42 135,108 25,115';
  const ring: [number, number][] =
    geom.type === 'Polygon' ? geom.coordinates[0] : geom.type === 'MultiPolygon' ? geom.coordinates[0][0] : [];
  if (!ring || ring.length < 3) return '30,50 130,42 135,108 25,115';
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minX) minX = lon;
    if (lon > maxX) maxX = lon;
    if (lat < minY) minY = lat;
    if (lat > maxY) maxY = lat;
  }
  const spanX = Math.max(maxX - minX, 1e-5);
  const spanY = Math.max(maxY - minY, 1e-5);
  const pad = 20;
  const size = 160 - pad * 2;
  return ring
    .map(([lon, lat]) => {
      const px = pad + ((lon - minX) / spanX) * size;
      const py = pad + (1 - (lat - minY) / spanY) * size;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(' ');
}


