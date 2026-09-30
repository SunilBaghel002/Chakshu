import React, { useMemo } from 'react';
import type { SourcesSubObject, Evidence } from '../lib/types';
import { SATELLITE_FALLBACK } from '../lib/satelliteFallback';

interface EvidenceTriptychProps {
  sources: SourcesSubObject;
  evidence?: Evidence;
}

/**
 * Convert [lon, lat] to Web Mercator slippy map tile (x, y) at zoom z.
 */
function lonLatToTileXY(lon: number, lat: number, z: number): { x: number; y: number } {
  const n = Math.pow(2, z);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

/**
 * Convert GeoJSON Polygon coordinates into normalized SVG polygon points inside a 160x160 box.
 */
function buildSvgPolygonPoints(evidence?: Evidence): string {
  const coords = evidence?.measurement?.geom_4326?.coordinates?.[0] as
    | [number, number][]
    | undefined;
  if (!coords || coords.length < 3) {
    return '28,68 132,54 136,92 32,106';
  }
  const lons = coords.map((p) => p[0]);
  const lats = coords.map((p) => p[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const spanLon = Math.max(maxLon - minLon, 0.0005);
  const spanLat = Math.max(maxLat - minLat, 0.0005);

  const pad = 26;
  const box = 160 - pad * 2;
  // Preserve aspect ratio within the 160x160 viewport
  const scale = Math.min(box / spanLon, box / spanLat);
  const usedW = spanLon * scale;
  const usedH = spanLat * scale;
  const offsetX = (160 - usedW) / 2;
  const offsetY = (160 - usedH) / 2;

  return coords
    .map(([lon, lat]) => {
      const x = offsetX + (lon - minLon) * scale;
      const y = offsetY + (maxLat - lat) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * Section 2: Triptych Spectral Pair (SLOT-23)
 * Renders T0 (2021 Satellite Tile + Baseline Reticle), CVA MASK (Live Vector Geometry Mask),
 * and T1 (2026 Satellite Tile + Detected Vector Overlay), followed by NDBI/NDVI/NDWI telemetry.
 */
export const EvidenceTriptych: React.FC<EvidenceTriptychProps> = ({ evidence }) => {
  const lastSeen = evidence?.temporal?.last_seen || '2026-08-03';
  const beforeDate = evidence?.sources?.before?.acquired_at || '2021-01-15';
  const centroid = evidence?.measurement?.centroid || [77.6107, 28.1769];
  const changeType = evidence?.change_type || 'construction';

  const { t0Url, t1Url, svgPoints, maskColor } = useMemo(() => {
    const [lon, lat] = centroid;
    const z = 15;
    const { x, y } = lonLatToTileXY(lon, lat, z);
    // 2021 ArcGIS Wayback historical imagery tile vs 2026 Google Satellite UHD tile
    const t0 = `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/1049/${z}/${y}/${x}`;
    const t1 = `https://mt1.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${z}`;
    const pts = buildSvgPolygonPoints(evidence);
    const color =
      changeType === 'water_gain'
        ? '#38BDF8'
        : changeType === 'vegetation_gain'
        ? '#22C55E'
        : '#00E5FF';
    return { t0Url: t0, t1Url: t1, svgPoints: pts, maskColor: color };
  }, [centroid, evidence, changeType]);

  const ruleTrace = evidence?.classification?.rule_trace || [];
  const ndbiRule = ruleTrace.find((r) => r.field === 'd_ndbi');
  const ndviRule = ruleTrace.find((r) => r.field === 'd_ndvi');
  const ndwiRule = ruleTrace.find((r) => r.field === 'd_ndwi');

  const ndbiVal: number = typeof ndbiRule?.value === 'number' ? ndbiRule.value : 0.32;
  const ndviVal: number = typeof ndviRule?.value === 'number' ? ndviRule.value : -0.45;
  const ndwiVal: number = typeof ndwiRule?.value === 'number' ? ndwiRule.value : -0.05;

  const spectralRows = [
    {
      code: 'ΔNDBI',
      name: 'Built-up Index',
      val: `${ndbiVal >= 0 ? '+' : ''}${ndbiVal.toFixed(3)} ▲`,
      desc: ndbiVal >= 0.1 ? 'Asphalt / Concrete' : 'Low Built-up',
      color: ndbiVal >= 0.1 ? 'var(--primary-cyan, #3FA9F5)' : 'var(--ink-2)',
      pct: Math.min(100, Math.max(15, Math.round(Math.abs(ndbiVal) * 180))),
    },
    {
      code: 'ΔNDVI',
      name: 'Vegetation Index',
      val: `${ndviVal >= 0 ? '+' : ''}${ndviVal.toFixed(3)} ${ndviVal >= 0 ? '▲' : '▼'}`,
      desc: ndviVal >= 0 ? 'Green Buffer Gain' : 'Cropland Cleared',
      color: ndviVal >= 0 ? 'var(--verified-green, #10B981)' : 'var(--danger-red, #EF4444)',
      pct: Math.min(100, Math.max(15, Math.round(Math.abs(ndviVal) * 180))),
    },
    {
      code: 'ΔNDWI',
      name: 'Water Index',
      val: `${ndwiVal >= 0 ? '+' : ''}${ndwiVal.toFixed(3)} ${ndwiVal > 0.1 ? '▲' : '—'}`,
      desc: ndwiVal > 0.1 ? 'Water Reservoir' : 'Compacted Subgrade',
      color: ndwiVal > 0.1 ? '#38BDF8' : 'var(--ink-3)',
      pct: Math.min(100, Math.max(12, Math.round(Math.abs(ndwiVal) * 180))),
    },
  ];

  return (
    <div
      className="p-3 rounded space-y-2.5"
      style={{
        background: 'var(--panel-2)',
        border: '1px solid var(--line)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--primary-cyan, #3FA9F5)',
              display: 'inline-block',
            }}
          />
          <span
            className="t-tag font-bold tracking-wider"
            style={{ color: 'var(--ink)', fontSize: 9.5 }}
          >
            {'TRIPTYCH SPECTRAL PAIR'}
          </span>
        </div>
        <span
          className="t-mono px-2 py-0.5 rounded"
          style={{
            color: 'var(--primary-cyan, #3FA9F5)',
            background: 'rgba(63, 169, 245, 0.10)',
            border: '1px solid rgba(63, 169, 245, 0.28)',
            fontSize: 8,
            fontWeight: 600,
          }}
        >
          {'10m → 0.5m CVA'}
        </span>
      </div>

      {/* 3-card Triptych Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Card 1: T0 (2021 Baseline) */}
        <div className="flex flex-col">
          <div
            className="relative overflow-hidden rounded"
            style={{
              aspectRatio: '1',
              background: '#0A101D',
              border: '1px solid rgba(245, 158, 11, 0.45)',
            }}
          >
            <img
              src={t0Url}
              alt="Satellite T0 (2021)"
              className="w-full h-full object-cover"
              style={{ filter: 'saturate(1.1) contrast(1.08)' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = SATELLITE_FALLBACK.before;
              }}
            />
            {/* Dashed Pre-Construction Footprint Overlay */}
            <svg
              viewBox="0 0 160 160"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <polygon
                points={svgPoints}
                fill="rgba(245, 158, 11, 0.12)"
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            </svg>
            <span
              className="absolute top-1 left-1 px-1 py-0.5 rounded t-mono"
              style={{
                background: 'rgba(8, 12, 22, 0.82)',
                color: '#F59E0B',
                fontSize: 7,
                fontWeight: 700,
              }}
            >
              S2A · T0
            </span>
          </div>
          <div className="mt-1 text-center">
            <div className="t-tag font-bold" style={{ color: '#F59E0B', fontSize: 8.5 }}>
              {'T0 (2021)'}
            </div>
            <div className="t-mono" style={{ fontSize: 7.5, color: 'var(--ink-3)' }}>
              {beforeDate}
            </div>
          </div>
        </div>

        {/* Card 2: CVA MASK (Vector Change Mask) */}
        <div className="flex flex-col">
          <div
            className="relative overflow-hidden rounded"
            style={{
              aspectRatio: '1',
              background: '#070B14',
              border: '1px solid rgba(63, 169, 245, 0.55)',
              boxShadow: 'inset 0 0 16px rgba(63, 169, 245, 0.12)',
            }}
          >
            <svg viewBox="0 0 160 160" className="w-full h-full block">
              <defs>
                <pattern id="cva-grid" width="16" height="16" patternUnits="userSpaceOnUse">
                  <path
                    d="M 16 0 L 0 0 0 16"
                    fill="none"
                    stroke="rgba(63, 169, 245, 0.12)"
                    strokeWidth="0.6"
                  />
                </pattern>
              </defs>
              <rect width="160" height="160" fill="url(#cva-grid)" />
              {/* Crosshair axes */}
              <line
                x1="80"
                y1="0"
                x2="80"
                y2="160"
                stroke="rgba(63, 169, 245, 0.18)"
                strokeWidth="0.7"
                strokeDasharray="3 3"
              />
              <line
                x1="0"
                y1="80"
                x2="160"
                y2="80"
                stroke="rgba(63, 169, 245, 0.18)"
                strokeWidth="0.7"
                strokeDasharray="3 3"
              />
              {/* Outer glow polygon */}
              <polygon
                points={svgPoints}
                fill={maskColor}
                fillOpacity="0.28"
                stroke={maskColor}
                strokeWidth="2.2"
              />
              {/* Corner HUD brackets */}
              <path
                d="M8,8 L8,20 M8,8 L20,8 M152,8 L152,20 M152,8 L140,8 M8,152 L8,140 M8,152 L20,152 M152,152 L152,140 M152,152 L140,152"
                stroke={maskColor}
                strokeWidth="1.5"
                fill="none"
                opacity="0.85"
              />
              {/* Centroid Lock-on Dot */}
              <circle cx="80" cy="80" r="3" fill="#FFFFFF" stroke={maskColor} strokeWidth="1.5" />
            </svg>
            <span
              className="absolute top-1 left-1 px-1 py-0.5 rounded t-mono"
              style={{
                background: 'rgba(8, 12, 22, 0.85)',
                color: maskColor,
                fontSize: 7,
                fontWeight: 700,
              }}
            >
              CVA · OTSU
            </span>
          </div>
          <div className="mt-1 text-center">
            <div
              className="t-tag font-bold"
              style={{ color: 'var(--primary-cyan, #3FA9F5)', fontSize: 8.5 }}
            >
              {'CVA MASK'}
            </div>
            <div className="t-mono" style={{ fontSize: 7.5, color: 'var(--ink-3)' }}>
              {'Change Vector'}
            </div>
          </div>
        </div>

        {/* Card 3: T1 (2026 Current) */}
        <div className="flex flex-col">
          <div
            className="relative overflow-hidden rounded"
            style={{
              aspectRatio: '1',
              background: '#0A101D',
              border: '1px solid rgba(16, 185, 129, 0.45)',
            }}
          >
            <img
              src={t1Url}
              alt="Satellite T1 (2026)"
              className="w-full h-full object-cover"
              style={{ filter: 'contrast(1.18) saturate(1.2)' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = SATELLITE_FALLBACK.after;
              }}
            />
            {/* Verified Vector Polygon Overlay */}
            <svg
              viewBox="0 0 160 160"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <polygon
                points={svgPoints}
                fill="rgba(0, 229, 255, 0.16)"
                stroke="#00E5FF"
                strokeWidth="1.8"
              />
            </svg>
            <span
              className="absolute top-1 left-1 px-1 py-0.5 rounded t-mono"
              style={{
                background: 'rgba(8, 12, 22, 0.82)',
                color: '#10B981',
                fontSize: 7,
                fontWeight: 700,
              }}
            >
              UHD · T1
            </span>
          </div>
          <div className="mt-1 text-center">
            <div className="t-tag font-bold" style={{ color: '#10B981', fontSize: 8.5 }}>
              {'T1 (2026)'}
            </div>
            <div className="t-mono" style={{ fontSize: 7.5, color: 'var(--ink-3)' }}>
              {lastSeen}
            </div>
          </div>
        </div>
      </div>

      {/* Spectral Index Rows */}
      <div
        className="pt-2 space-y-1.5 t-mono"
        style={{ borderTop: '1px solid var(--line)', fontSize: 9.5 }}
      >
        {spectralRows.map((row) => (
          <div key={row.code} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span style={{ color: 'var(--ink-3)' }}>
                <strong style={{ color: 'var(--ink-2)' }}>{row.code}</strong> ({row.name}):
              </span>
              <span className="truncate" style={{ color: row.color, fontWeight: 700 }}>
                {row.val} · {row.desc}
              </span>
            </div>
            <div
              className="w-full h-1 rounded-full overflow-hidden"
              style={{ background: 'var(--bg)' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${row.pct}%`, background: row.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
