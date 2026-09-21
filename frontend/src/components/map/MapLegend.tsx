import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Slot } from '../layout/Slot';
import { MAP_OVERLAY_COPY } from '../../lib/copy';

interface MapLegendProps {
  hiddenLabelCount?: number;
  initialCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

/**
 * SLOT-13 — Map Legend (PRD 10 §4 / L4, PRD 9 §5.1 & §2.5)
 * Bottom-left corner of the map stage, inset 12px.
 * Max width: 220px.
 * Collapsible to a 28px bar ("LEGEND ▸"). Shortcut 'L' toggles.
 *
 * Contains:
 * 1. Track 1/2 solid ("measured from pixels") vs Track 3 dashed ("identified by a model").
 * 2. Land-cover / Change categorical swatches with 1px dark inner halo.
 * 3. Label collision suppression indicator: "+n LABELS HIDDEN".
 * 4. Compact attribution text (10px --ink-3).
 */
export const MapLegend: React.FC<MapLegendProps> = React.memo(({
  hiddenLabelCount = 0,
  initialCollapsed = false,
  onToggleCollapse,
}) => {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    onToggleCollapse?.(next);
  };

  if (collapsed) {
    return (
      <Slot
        id="SLOT-13"
        className="absolute bottom-3 left-3"
        style={{
          width: 'auto',
          height: 28,
        }}
      >
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1.5 px-2.5 py-1 t-tag cursor-pointer corner-ticks transition-colors"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--r-panel)',
            color: 'var(--ink-2)',
            height: 28,
            boxShadow: 'var(--shadow-menu)',
          }}
          title="Toggle Legend (L)"
        >
          <span style={{ color: 'var(--amber)' }}>{MAP_OVERLAY_COPY.legendTitle}</span>
          <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--amber)' }} />
          {hiddenLabelCount > 0 && (
            <span
              className="ml-1 px-1.5 py-0.2 rounded"
              style={{
                background: 'var(--amber-wash)',
                color: 'var(--amber)',
                fontSize: 9,
                border: '1px solid var(--amber)',
              }}
            >
              +{hiddenLabelCount}
            </span>
          )}
        </button>
      </Slot>
    );
  }

  return (
    <Slot
      id="SLOT-13"
      className="absolute bottom-3 left-3 flex flex-col corner-ticks"
      style={{
        width: 220,
        background: 'var(--panel)',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--r-panel)',
        boxShadow: 'var(--shadow-menu)',
        padding: 'var(--s-2)',
      }}
    >
      {/* Header with collapse button */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1.5 t-tag cursor-pointer text-left w-full"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--amber)',
            padding: 0,
          }}
          title="Collapse Legend (L)"
        >
          <span className="font-bold">{MAP_OVERLAY_COPY.legendTitle}</span>
          <ChevronDown className="w-3.5 h-3.5 ml-auto" style={{ color: 'var(--ink-3)' }} />
        </button>
      </div>

      {/* Track Provenance (PRD 9 §5.1) */}
      <div className="flex flex-col gap-1 mb-2">
        <div className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>
          {MAP_OVERLAY_COPY.tracksHeader}
        </div>

        {/* Solid: Tracks 1/2 */}
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 18,
              height: 2,
              background: 'var(--amber)',
              boxShadow: '0 0 1px var(--bg)',
            }}
          />
          <div className="flex flex-col">
            <span className="t-mono" style={{ color: 'var(--ink)', fontSize: 9.5 }}>
              {MAP_OVERLAY_COPY.trackSolidLabel}
            </span>
            <span className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 8.5 }}>
              {MAP_OVERLAY_COPY.trackSolidDesc}
            </span>
          </div>
        </div>

        {/* Dashed: Track 3 */}
        <div className="flex items-center gap-2 mt-0.5">
          <div
            style={{
              width: 18,
              height: 0,
              borderTop: '2px dashed var(--amber)',
            }}
          />
          <div className="flex flex-col">
            <span className="t-mono" style={{ color: 'var(--ink)', fontSize: 9.5 }}>
              {MAP_OVERLAY_COPY.trackDashedLabel}
            </span>
            <span className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 8.5 }}>
              {MAP_OVERLAY_COPY.trackDashedDesc}
            </span>
          </div>
        </div>
      </div>

      {/* Label Collision Suppression Chip */}
      {hiddenLabelCount > 0 ? (
        <div
          className="t-tag py-0.5 px-1.5 mb-2 rounded flex items-center justify-between"
          style={{
            background: 'var(--amber-wash)',
            border: '1px solid var(--amber)',
            color: 'var(--amber)',
            fontSize: 9,
          }}
        >
          <span>{MAP_OVERLAY_COPY.labelsHidden(hiddenLabelCount)}</span>
          <span className="opacity-75" style={{ fontSize: 8.5 }}>{MAP_OVERLAY_COPY.prdCollisionRef}</span>
        </div>

      ) : (
        <div
          className="t-mono py-0.5 px-1 mb-2 rounded"
          style={{
            color: 'var(--ink-3)',
            fontSize: 8.5,
          }}
        >
          {MAP_OVERLAY_COPY.labelsAllVisible}
        </div>
      )}

      {/* Compact Attribution Footer (Relocated per PRD 10 §4) */}
      <div
        className="pt-1.5 mt-0.5 t-mono"
        style={{
          borderTop: '1px solid var(--line)',
          color: 'var(--ink-3)',
          fontSize: 8.5,
          lineHeight: '12px',
        }}
      >
        {MAP_OVERLAY_COPY.attributionText}
      </div>
    </Slot>
  );
});
