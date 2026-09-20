import React from 'react';
import type { SourcesSubObject } from '../lib/types';
import { SATELLITE_FALLBACK } from '../lib/satelliteFallback';

interface EvidenceTriptychProps {
  sources: SourcesSubObject;
}

/**
 * Evidence Triptych — Three 1:1 wells labelled BEFORE / MASK / AFTER.
 * Active well gets amber frame + corner ticks.
 * Captions in t-mono with scene ID, sensor, cloud %.
 */
export const EvidenceTriptych: React.FC<EvidenceTriptychProps> = ({ sources }) => {
  const panels = [
    {
      label: 'BEFORE',
      src: sources.triptych_urls?.before || SATELLITE_FALLBACK.before,
      fallback: SATELLITE_FALLBACK.before,
      date: sources.before.acquired_at,
      cloud: sources.before.cloud_cover_pct,
      color: 'var(--ink-3)',
    },
    {
      label: 'MASK',
      src: sources.triptych_urls?.mask || SATELLITE_FALLBACK.mask,
      fallback: SATELLITE_FALLBACK.mask,
      date: 'Detected Shape',
      cloud: null,
      color: 'var(--amber)',
    },
    {
      label: 'AFTER',
      src: sources.triptych_urls?.after || SATELLITE_FALLBACK.after,
      fallback: SATELLITE_FALLBACK.after,
      date: sources.after.acquired_at,
      cloud: sources.after.cloud_cover_pct,
      color: 'var(--ink-3)',
    },
  ];

  return (
    <div>
      <div className="dossier-bar" style={{ marginBottom: 8 }}>
        <span>SATELLITE IMAGERY</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {panels.map(({ label, src, fallback, date, cloud, color }) => (
          <div key={label} className="flex flex-col">
            <div
              className={`relative overflow-hidden ${label === 'MASK' ? 'corner-ticks' : ''}`}
              style={{
                aspectRatio: '1',
                background: 'var(--well)',
                border: `1px solid ${label === 'MASK' ? 'var(--amber)' : 'var(--line-strong)'}`,
                borderRadius: 'var(--radius)',
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
              <span
                className="absolute top-1 left-1 t-tag"
                style={{
                  padding: '1px 4px',
                  background: 'rgba(11, 13, 16, 0.85)',
                  color,
                  fontSize: 8,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {label}
              </span>
            </div>
            <div className="mt-1 t-mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
              <div>{date}</div>
              {cloud !== null && <div>☁ {cloud}%</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
