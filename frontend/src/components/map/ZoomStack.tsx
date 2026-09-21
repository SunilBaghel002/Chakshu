import React from 'react';
import { Plus, Minus, Home, Maximize2, Ruler } from 'lucide-react';
import { Slot } from '../layout/Slot';
import { MAP_OVERLAY_COPY } from '../../lib/copy';

interface ZoomStackProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onHome: () => void;
  onFitAoi: () => void;
  onToggleMeasure?: () => void;
  isMeasureActive?: boolean;
}

/**
 * SLOT-12 — Zoom Stack (PRD 10 §4 / L4)
 * Top-right corner of the map stage, inset 12px.
 * Vertical stack: + / − / HOME / FIT AOI / MEASURE
 * Max size: 36 x 176 px, gap --s-1 (4px).
 */
export const ZoomStack: React.FC<ZoomStackProps> = React.memo(({
  onZoomIn,
  onZoomOut,
  onHome,
  onFitAoi,
  onToggleMeasure,
  isMeasureActive = false,
}) => {
  return (
    <Slot
      id="SLOT-12"
      className="absolute top-3 right-3 flex flex-col items-center"
      style={{
        width: 36,
        gap: 'var(--s-1)',
      }}
    >
      <div
        className="flex flex-col p-0.5 rounded"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--r-panel)',
          boxShadow: 'var(--shadow-menu)',
          width: 36,
        }}
      >
        {/* Zoom In */}
        <button
          type="button"
          onClick={onZoomIn}
          title={MAP_OVERLAY_COPY.zoomInTitle}
          className="flex items-center justify-center p-1.5 transition-colors cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-2)',
            borderRadius: 'var(--r-ctl)',
            height: 32,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--amber)';
            (e.currentTarget as HTMLElement).style.background = 'var(--panel-2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--ink-2)';
            (e.currentTarget as HTMLElement).style.background = 'none';
          }}
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={onZoomOut}
          title={MAP_OVERLAY_COPY.zoomOutTitle}
          className="flex items-center justify-center p-1.5 transition-colors cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-2)',
            borderRadius: 'var(--r-ctl)',
            height: 32,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--amber)';
            (e.currentTarget as HTMLElement).style.background = 'var(--panel-2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--ink-2)';
            (e.currentTarget as HTMLElement).style.background = 'none';
          }}
        >
          <Minus className="w-4 h-4" />
        </button>

        <div style={{ height: 1, background: 'var(--line)', margin: '2px 0' }} />

        {/* Home */}
        <button
          type="button"
          onClick={onHome}
          title={MAP_OVERLAY_COPY.homeTitle}
          className="flex items-center justify-center p-1.5 transition-colors cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--amber)',
            borderRadius: 'var(--r-ctl)',
            height: 32,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--amber-hot)';
            (e.currentTarget as HTMLElement).style.background = 'var(--panel-2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--amber)';
            (e.currentTarget as HTMLElement).style.background = 'none';
          }}
        >
          <Home className="w-4 h-4" />
        </button>

        {/* Fit AOI */}
        <button
          type="button"
          onClick={onFitAoi}
          title={MAP_OVERLAY_COPY.fitAoiTitle}
          className="flex items-center justify-center p-1.5 transition-colors cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-2)',
            borderRadius: 'var(--r-ctl)',
            height: 32,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--amber)';
            (e.currentTarget as HTMLElement).style.background = 'var(--panel-2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--ink-2)';
            (e.currentTarget as HTMLElement).style.background = 'none';
          }}
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Measure */}
        <button
          type="button"
          onClick={onToggleMeasure}
          title={MAP_OVERLAY_COPY.measureTitle}
          className="flex items-center justify-center p-1.5 transition-colors cursor-pointer"
          style={{
            background: isMeasureActive ? 'var(--amber-wash)' : 'none',
            border: 'none',
            color: isMeasureActive ? 'var(--amber)' : 'var(--ink-2)',
            borderRadius: 'var(--r-ctl)',
            height: 32,
          }}
          onMouseEnter={(e) => {
            if (!isMeasureActive) {
              (e.currentTarget as HTMLElement).style.color = 'var(--amber)';
              (e.currentTarget as HTMLElement).style.background = 'var(--panel-2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMeasureActive) {
              (e.currentTarget as HTMLElement).style.color = 'var(--ink-2)';
              (e.currentTarget as HTMLElement).style.background = 'none';
            }
          }}
        >
          <Ruler className="w-4 h-4" />
        </button>
      </div>
    </Slot>
  );
});
