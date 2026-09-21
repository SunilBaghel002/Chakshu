import React from 'react';
import { Slot } from '../layout/Slot';
import { MAP_OVERLAY_COPY } from '../../lib/copy';

interface CoordReadoutProps {
  lat: number | null;
  lng: number | null;
  zoom?: number;
  visible?: boolean;
}

/**
 * SLOT-14 — Coordinate Readout (PRD 10 §4 / L4, PRD 9 §6 M1)
 * Bottom-right corner of the map stage, inset 12px.
 * Max size: 300 x 24 px.
 * Reserved space: The bottom-right 300 x 40 px is strictly ours.
 * Renders live LAT / LON / ZOOM readout in --t-mono.
 */
export const CoordReadout: React.FC<CoordReadoutProps> = React.memo(({
  lat,
  lng,
  zoom,
  visible = true,
}) => {
  if (!visible || lat === null || lng === null) {
    return (
      <Slot
        id="SLOT-14"
        className="absolute bottom-3 right-3 pointer-events-none"
        style={{
          width: 300,
          height: 24,
        }}
      >
        <div
          className="flex items-center justify-end px-2.5 py-0.5 t-mono tabular-nums opacity-40"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-panel)',
            fontSize: 10,
            color: 'var(--ink-3)',
            height: 24,
          }}
        >
          <span>{MAP_OVERLAY_COPY.latPrefix} — · {MAP_OVERLAY_COPY.lonPrefix} —</span>
        </div>
      </Slot>
    );
  }

  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const latStr = `${Math.abs(lat).toFixed(4)}° ${latDir}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}° ${lngDir}`;
  const zoomStr = zoom !== undefined ? ` · Z ${zoom.toFixed(1)}` : '';

  return (
    <Slot
      id="SLOT-14"
      className="absolute bottom-3 right-3 pointer-events-none select-none"
      style={{
        width: 300,
        height: 24,
      }}
    >
      <div
        className="flex items-center justify-end gap-1 px-2.5 py-0.5 t-mono tabular-nums corner-ticks"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--r-panel)',
          boxShadow: 'var(--shadow-menu)',
          fontSize: 10,
          color: 'var(--ink-2)',
          height: 24,
        }}
      >
        <span style={{ color: 'var(--ink-3)' }}>{MAP_OVERLAY_COPY.latPrefix}</span>
        <span style={{ color: 'var(--signal)', fontWeight: 600 }}>{latStr}</span>
        <span style={{ color: 'var(--ink-3)', margin: '0 2px' }}>·</span>
        <span style={{ color: 'var(--ink-3)' }}>{MAP_OVERLAY_COPY.lonPrefix}</span>
        <span style={{ color: 'var(--signal)', fontWeight: 600 }}>{lngStr}</span>
        {zoomStr && (
          <>
            <span style={{ color: 'var(--ink-3)', margin: '0 2px' }}>·</span>
            <span style={{ color: 'var(--ion)', fontWeight: 600 }}>{zoomStr.replace(' · ', '')}</span>
          </>
        )}
      </div>
    </Slot>
  );
});

