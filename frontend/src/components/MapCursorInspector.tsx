import React from 'react';
import type { Evidence } from '../lib/types';
import { Eye, EyeOff } from 'lucide-react';

interface MapCursorInspectorProps {
  hoveredEvidence: Evidence | null;
  beforeDate: string;
  afterDate: string;
  showAllPolygons: boolean;
  onToggleShowAll: () => void;
  coordRef: React.RefObject<HTMLDivElement | null>;
  inspectorRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * SLOT-14 coordinate readout + SLOT-16 lock-on tag.
 * Amber-styled coordinate readout and hover inspector.
 */
export const MapCursorInspector: React.FC<MapCursorInspectorProps> = ({
  hoveredEvidence,
  beforeDate,
  afterDate,
  showAllPolygons,
  onToggleShowAll,
  coordRef,
  inspectorRef,
}) => {
  return (
    <>
      {/* Polygon visibility toggle */}
      <div className="absolute top-16 left-3 z-[400] flex items-center gap-2">
        <button
          onClick={onToggleShowAll}
          className="flex items-center gap-1.5 px-3 py-1.5 t-tag cursor-pointer transition-colors"
          style={{
            background: showAllPolygons ? 'var(--amber-wash)' : 'var(--panel)',
            border: `1px solid ${showAllPolygons ? 'var(--amber)' : 'var(--line-strong)'}`,
            color: showAllPolygons ? 'var(--amber)' : 'var(--ink-3)',
            borderRadius: 'var(--radius)',
            fontSize: 9,
          }}
          title="Toggle visibility of change boundary polygons"
        >
          {showAllPolygons ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{showAllPolygons ? 'POLYGONS VISIBLE' : 'HOVER TO INSPECT'}</span>
        </button>
      </div>

      {/* SLOT-14: Fixed corner coordinate badge */}
      <div
        ref={coordRef}
        className="absolute top-16 right-24 z-[400] t-mono tabular-nums pointer-events-none hidden px-2.5 py-1"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          fontSize: 10,
          color: 'var(--ink-3)',
        }}
      >
        <span style={{ color: 'var(--ink-3)' }}>LAT: </span>
        <span style={{ color: 'var(--amber)' }} data-lat="">—</span>
        <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>LON: </span>
        <span style={{ color: 'var(--amber)' }} data-lng="">—</span>
      </div>

      {/* SLOT-16: Lock-on tag — polygon hover inspector */}
      <div
        ref={inspectorRef}
        className="pointer-events-none absolute z-[450] hidden"
        style={{ left: 0, top: 0 }}
      >
        {hoveredEvidence && (
          <div
            className="corner-ticks"
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--amber)',
              borderRadius: 'var(--radius)',
              padding: 10,
              width: 220,
              transform: 'skewX(-2deg)',
            }}
          >
            <div style={{ transform: 'skewX(2deg)' }}>
              {/* Amber left bar */}
              <div
                className="absolute left-0 top-2 bottom-2"
                style={{ width: 3, background: 'var(--amber)', borderRadius: '0 2px 2px 0' }}
              />

              <div className="flex items-center justify-between mb-1">
                <span className="t-tag" style={{ color: 'var(--amber)', fontSize: 10 }}>
                  TARGET: {hoveredEvidence.change_type.replace('_', ' ').toUpperCase()}
                </span>
                <span
                  className="t-tag tabular-nums"
                  style={{
                    padding: '1px 4px',
                    background: 'var(--measured-fill)',
                    border: '1px solid var(--measured-border)',
                    color: 'var(--measured-text)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 9,
                  }}
                >
                  {(hoveredEvidence.confidence.overall * 100).toFixed(0)}%
                </span>
              </div>

              <div className="t-figure tabular-nums" style={{ color: 'var(--amber)', fontSize: 22 }}>
                {hoveredEvidence.measurement.area_label}
              </div>

              <div className="t-mono mt-1" style={{ color: 'var(--ink-3)', fontSize: 9 }}>
                ({hoveredEvidence.measurement.area_m2.toLocaleString()} m²)
              </div>

              <div className="t-mono mt-1.5 pt-1.5 flex justify-between" style={{ borderTop: '1px solid var(--line)', color: 'var(--ink-3)', fontSize: 9 }}>
                <span>{beforeDate} → {afterDate}</span>
                <span style={{ color: 'var(--amber)' }}>CLICK TO INSPECT</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
