import React from 'react';
import type { SourcesSubObject, Evidence } from '../lib/types';
import { SATELLITE_FALLBACK } from '../lib/satelliteFallback';

interface EvidenceTriptychProps {
  sources: SourcesSubObject;
  evidence?: Evidence;
}

/**
 * Section 2: Triptych Spectral Pair
 * 3 cards: T0 (2021), CVA MASK, T1 (2026)
 * Followed by dynamic NDBI, NDVI, NDWI spectral index rows
 */
export const EvidenceTriptych: React.FC<EvidenceTriptychProps> = ({ sources, evidence }) => {
  const lastSeen = evidence?.temporal?.last_seen || '03 Aug 2026';
  const panels = [
    {
      label: 'T0 (2021)',
      sublabel: '15 Jan 2021',
      src: sources.triptych_urls?.before || SATELLITE_FALLBACK.before,
      fallback: SATELLITE_FALLBACK.before,
      color: 'var(--warning-orange, #F59E0B)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
    },
    {
      label: 'CVA MASK',
      sublabel: 'Change Vector',
      src: sources.triptych_urls?.mask || SATELLITE_FALLBACK.mask,
      fallback: SATELLITE_FALLBACK.mask,
      color: 'var(--primary-cyan, #3FA9F5)',
      borderColor: 'rgba(63, 169, 245, 0.5)',
    },
    {
      label: 'T1 (2026)',
      sublabel: lastSeen,
      src: sources.triptych_urls?.after || SATELLITE_FALLBACK.after,
      fallback: SATELLITE_FALLBACK.after,
      color: 'var(--ink-2)',
      borderColor: 'var(--line-strong)',
    },
  ];

  const ruleTrace = evidence?.classification?.rule_trace || [];
  const ndbiRule = ruleTrace.find((r) => r.field === 'd_ndbi');
  const ndviRule = ruleTrace.find((r) => r.field === 'd_ndvi');
  const ndwiRule = ruleTrace.find((r) => r.field === 'd_ndwi');

  const ndbiVal: number = typeof ndbiRule?.value === 'number' ? ndbiRule.value : 0.313;
  const ndviVal: number = typeof ndviRule?.value === 'number' ? ndviRule.value : -0.421;
  const ndwiVal: number = typeof ndwiRule?.value === 'number' ? ndwiRule.value : -0.052;

  const ndbiText = ndbiVal >= 0.1
    ? `${ndbiVal >= 0 ? '+' : ''}${ndbiVal.toFixed(3)} ▲ (Asphalt / Concrete / Built-up)`
    : `${ndbiVal.toFixed(3)} — (Low Built-up Signature)`;

  const ndviText = ndviVal > 0
    ? `+${ndviVal.toFixed(3)} ▲ (Canopy / Cropland Gain)`
    : `${ndviVal.toFixed(3)} ▼ (Vegetation / Cropland Loss)`;

  const ndwiText = ndwiVal > 0.1
    ? `+${ndwiVal.toFixed(3)} ▲ (Water Body / Retention Pond)`
    : `${ndwiVal.toFixed(3)} — (Compacted Earth / Subgrade)`;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="t-tag font-bold tracking-wider"
          style={{ color: 'var(--ink-2)', fontSize: 9.5 }}
        >
          {'TRIPTYCH SPECTRAL PAIR'}
        </span>
        <button
          type="button"
          className="t-tag px-2 py-0.5 rounded cursor-pointer transition-colors"
          style={{
            color: 'var(--primary-cyan, #3FA9F5)',
            background: 'none',
            border: '1px solid rgba(63, 169, 245, 0.3)',
            fontSize: 8,
            fontWeight: 600,
          }}
        >
          {'Export Tri-Tile'}
        </button>
      </div>

      {/* 3-card layout */}
      <div className="grid grid-cols-3 gap-2">
        {panels.map(({ label, sublabel, src, fallback, color, borderColor }) => (
          <div key={label} className="flex flex-col">
            <div
              className="relative overflow-hidden rounded"
              style={{
                aspectRatio: '1',
                background: 'var(--well)',
                border: `1px solid ${borderColor}`,
              }}
            >
              <img
                src={src}
                alt={`Satellite ${label}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallback;
                }}
              />
            </div>
            <div className="mt-1 text-center">
              <div className="t-tag font-bold" style={{ color, fontSize: 8 }}>
                {label}
              </div>
              <div className="t-mono" style={{ fontSize: 7.5, color: 'var(--ink-3)' }}>
                {sublabel}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Spectral Index Rows */}
      <div className="mt-2 space-y-1 t-mono" style={{ fontSize: 9.5 }}>
        <div className="flex justify-between items-center">
          <span style={{ color: 'var(--ink-3)' }}>{'NDBI (Built-up Index):'}</span>
          <span style={{ color: ndbiVal >= 0.1 ? 'var(--primary-cyan, #3FA9F5)' : 'var(--ink-2)', fontWeight: 700 }}>
            {ndbiText}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: 'var(--ink-3)' }}>{'NDVI (Vegetation Index):'}</span>
          <span style={{ color: ndviVal > 0 ? 'var(--verified-green, #10B981)' : 'var(--danger-red, #EF4444)', fontWeight: 700 }}>
            {ndviText}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: 'var(--ink-3)' }}>{'NDWI (Water Index):'}</span>
          <span style={{ color: ndwiVal > 0.1 ? 'var(--primary-cyan, #3FA9F5)' : 'var(--ink-3)', fontWeight: ndwiVal > 0.1 ? 700 : 500 }}>
            {ndwiText}
          </span>
        </div>
      </div>
    </div>
  );
};
