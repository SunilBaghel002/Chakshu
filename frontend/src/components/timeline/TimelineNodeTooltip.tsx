import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { SceneItem } from '../../lib/api';
import { TIMELINE_COPY } from '../../lib/copy';

interface TimelineNodeTooltipProps {
  scene: SceneItem;
}

export const TimelineNodeTooltip: React.FC<TimelineNodeTooltipProps> = React.memo(({ scene }) => {
  return (
    <div
      className="absolute bottom-7 left-1/2 -translate-x-1/2 w-48 p-2 pointer-events-none text-left rounded"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--line-strong)',
        boxShadow: 'var(--shadow-popup, 0 8px 24px rgba(0, 0, 0, 0.85))',
        zIndex: 'var(--z-tooltip)',
      }}
    >
      <div
        className="flex items-center justify-between t-mono font-bold"
        style={{ color: 'var(--ink)', fontSize: 10 }}
      >
        <span>{scene.acquired_at}</span>
        <span
          className="t-tag px-1 py-0.5 rounded"
          style={{
            fontSize: 7,
            background: scene.usable ? 'var(--cyan-wash, rgba(16, 185, 129, 0.12))' : 'var(--rejected-fill)',
            color: scene.usable ? 'var(--verified-green, var(--positive))' : 'var(--rejected-text)',
            border: `1px solid ${scene.usable ? 'var(--verified-green, var(--positive))' : 'var(--rejected-border)'}`,
          }}
        >
          {scene.usable ? TIMELINE_COPY.clear : TIMELINE_COPY.unusable}
        </span>
      </div>
      <div className="t-mono mt-1 text-xs" style={{ color: 'var(--ink-3)', fontSize: 9 }}>
        <span>{TIMELINE_COPY.cloudPrefix}</span>
        <span
          className="tabular-nums font-bold"
          style={{ color: scene.cloud_cover_pct > 20 ? 'var(--danger)' : 'var(--ink)' }}
        >
          {scene.cloud_cover_pct.toFixed(1)}%
        </span>
      </div>
      {scene.unusable_reason && (
        <div
          className="flex items-center gap-1 mt-1 t-mono"
          style={{ color: 'var(--danger)', fontSize: 8 }}
        >
          <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
          <span>{scene.unusable_reason}</span>
        </div>
      )}
    </div>
  );
});
