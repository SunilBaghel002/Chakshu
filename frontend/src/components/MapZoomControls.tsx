import React from 'react';
import { ZoomIn, ZoomOut, Compass } from 'lucide-react';

interface MapZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  coords: [number, number];
}

/**
 * SLOT-12 — Zoom/coord controls (top-right of map stage).
 * Crisp 4px radius panels with --panel fill, amber hover states.
 */
export const MapZoomControls: React.FC<MapZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onCenter,
  coords,
}) => {
  return (
    <div className="absolute right-3 top-16 z-[400] flex flex-col gap-2">
      <div
        className="flex flex-col gap-0.5 p-0.5"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
        }}
      >
        <button
          onClick={onZoomIn}
          className="p-2 transition-colors cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-2)',
            borderRadius: 'var(--radius)',
          }}
          title="Zoom in"
          onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'var(--amber)'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--ink-2)'; }}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-2 transition-colors cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-2)',
            borderRadius: 'var(--radius)',
          }}
          title="Zoom out"
          onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'var(--amber)'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--ink-2)'; }}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div style={{ height: 1, background: 'var(--line)' }} />
        <button
          onClick={onCenter}
          className="p-2 transition-colors cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--amber)',
            borderRadius: 'var(--radius)',
          }}
          title="Center on AOI"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      <div
        className="t-mono tabular-nums text-right px-2 py-1"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          color: 'var(--ink-3)',
          fontSize: 10,
        }}
      >
        <div>LAT: {coords[0].toFixed(4)}° N</div>
        <div>LON: {coords[1].toFixed(4)}° E</div>
      </div>
    </div>
  );
};
