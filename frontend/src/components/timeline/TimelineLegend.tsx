import React from 'react';
import { TIMELINE_COPY } from '../../lib/copy';

/**
 * TimelineLegend
 * Displays status indicator legend and keyboard shortcut hint row.
 */
export const TimelineLegend: React.FC = React.memo(() => {
  return (
    <div
      className="flex items-center justify-between px-4 py-1 select-none"
      style={{ borderTop: '1px solid var(--line)' }}
    >
      <div className="flex items-center gap-3 t-mono text-xs" style={{ color: 'var(--ink-3)' }}>
        <span className="flex items-center gap-1">
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--primary-cyan)',
              display: 'inline-block',
            }}
          />
          {TIMELINE_COPY.usablePass}
        </span>
        <span className="flex items-center gap-1">
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              border: '1px solid var(--ink-3)',
              display: 'inline-block',
            }}
          />
          {TIMELINE_COPY.cloudDegraded}
        </span>
        <span className="flex items-center gap-1">
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--warning-orange, var(--amber))',
              display: 'inline-block',
            }}
          />
          {TIMELINE_COPY.baselineT0}
        </span>
        <span className="flex items-center gap-1">
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--danger-red, var(--danger))',
              display: 'inline-block',
            }}
          />
          {TIMELINE_COPY.highChange}
        </span>
      </div>
      <div className="flex items-center gap-3 t-mono text-xs" style={{ color: 'var(--ink-3)' }}>
        <span>{TIMELINE_COPY.stepHint}</span>
        <span>{TIMELINE_COPY.spacePlayHint}</span>
      </div>
    </div>
  );
});
