import React from 'react';
import { Plus, Minus, Home, Maximize2, Ruler, Layers } from 'lucide-react';
import { Slot } from '../layout/Slot';
import { MAP_OVERLAY_COPY } from '../../lib/copy';

interface ZoomStackProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onHome: () => void;
  onFitAoi: () => void;
  onToggleMeasure?: () => void;
  isMeasureActive?: boolean;
  bearing?: number;
  pitch?: number;
  onResetBearing?: () => void;
  onTogglePitch?: () => void;
  onToggleLabels?: () => void;
  isLabelsActive?: boolean;
}

/**
 * SLOT-12 — Zoom Stack / Google Earth Tactical HUD Cluster (PRD 10 §4 / L4)
 * Top-right corner of the map stage, inset 12px.
 * Vertical stack: Compass (Bearing Dial) / 3D Tilt / + / − / HOME / FIT AOI / MEASURE
 * Max size: 38 x 260 px, gap --s-1 (4px).
 */
export const ZoomStack: React.FC<ZoomStackProps> = React.memo(({
  onZoomIn,
  onZoomOut,
  onHome,
  onFitAoi,
  onToggleMeasure,
  isMeasureActive = false,
  bearing = 0,
  pitch = 0,
  onResetBearing,
  onTogglePitch,
  onToggleLabels,
  isLabelsActive = true,
}) => {
  const is3D = pitch > 10;
  const isRotated = Math.abs(bearing) > 0.5;

  return (
    <Slot
      id="SLOT-12"
      className="absolute top-3 right-3 flex flex-col items-center"
      style={{
        width: 38,
        gap: 'var(--s-1)',
      }}
    >
      {/* 1. Compass / Bearing Dial (Google Earth Style) */}
      {onResetBearing && (
        <div
          className="flex flex-col items-center justify-center p-0.5 rounded"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--r-panel)',
            boxShadow: 'var(--shadow-menu)',
            width: 38,
            height: 38,
          }}
        >
          <button
            type="button"
            onClick={onResetBearing}
            title={MAP_OVERLAY_COPY.resetBearingTitle}
            className="flex items-center justify-center p-1 transition-transform cursor-pointer relative"
            style={{
              background: 'none',
              border: 'none',
              color: isRotated ? 'var(--amber)' : 'var(--ink-2)',
              borderRadius: '50%',
              width: 32,
              height: 32,
            }}
          >
            <div
              className="flex items-center justify-center w-full h-full transition-transform duration-200"
              style={{
                transform: `rotate(${-bearing}deg)`,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="pointer-events-none">
                {/* Outer ring */}
                <circle cx="12" cy="12" r="10" stroke="var(--line-strong)" strokeWidth="1.5" />
                {/* North needle (amber) */}
                <polygon points="12,3 15,12 12,10 9,12" fill="var(--amber)" />
                {/* South needle (muted ink) */}
                <polygon points="12,21 15,12 12,14 9,12" fill="var(--ink-4)" />
                {/* Center pivot */}
                <circle cx="12" cy="12" r="1.5" fill="var(--ink-1)" />
              </svg>
            </div>
            {/* North Indicator Badge */}
            <span
              className="absolute pointer-events-none text-center font-mono font-bold"
              style={{
                top: 1,
                fontSize: 8,
                color: 'var(--amber)',
                lineHeight: 1,
              }}
            >
              {MAP_OVERLAY_COPY.headingN}
            </span>
          </button>
        </div>
      )}

      {/* 2. Main Tactical Tool Stack */}
      <div
        className="flex flex-col p-0.5 rounded"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--r-panel)',
          boxShadow: 'var(--shadow-menu)',
          width: 38,
        }}
      >
        {/* 3D / 2D Perspective Mode Toggle */}
        {onTogglePitch && (
          <>
            <button
              type="button"
              onClick={onTogglePitch}
              title={is3D ? MAP_OVERLAY_COPY.pitch2dTitle : MAP_OVERLAY_COPY.pitch3dTitle}
              className="flex items-center justify-center p-1 transition-all cursor-pointer font-mono font-bold text-xs"
              style={{
                background: is3D ? 'var(--amber-wash)' : 'none',
                border: is3D ? '1px solid var(--amber)' : 'none',
                color: is3D ? 'var(--amber)' : 'var(--ink-2)',
                borderRadius: 'var(--r-ctl)',
                height: 32,
              }}
            >
              <span>{is3D ? MAP_OVERLAY_COPY.mode3D : MAP_OVERLAY_COPY.mode2D}</span>
            </button>
            <div style={{ height: 1, background: 'var(--line)', margin: '2px 0' }} />
          </>
        )}

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
        {onToggleMeasure && (
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
        )}

        {/* Layer Annotation Toggle */}
        {onToggleLabels && (
          <button
            type="button"
            onClick={onToggleLabels}
            title={MAP_OVERLAY_COPY.toggleLabelsTitle}
            className="flex items-center justify-center p-1.5 transition-colors cursor-pointer"
            style={{
              background: isLabelsActive ? 'var(--amber-wash)' : 'none',
              border: 'none',
              color: isLabelsActive ? 'var(--amber)' : 'var(--ink-3)',
              borderRadius: 'var(--r-ctl)',
              height: 32,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--amber)';
              (e.currentTarget as HTMLElement).style.background = 'var(--panel-2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = isLabelsActive ? 'var(--amber)' : 'var(--ink-3)';
              (e.currentTarget as HTMLElement).style.background = isLabelsActive ? 'var(--amber-wash)' : 'none';
            }}
          >
            <Layers className="w-4 h-4" />
          </button>
        )}
      </div>
    </Slot>
  );
});
ZoomStack.displayName = 'ZoomStack';
