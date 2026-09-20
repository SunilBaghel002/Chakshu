import React from 'react';

interface StatusLineProps {
  jobState?: string;
  lastAction?: string;
  traceId?: string;
}

/**
 * SLOT-40 — Status Line (24px)
 * Job state, last action, current trace_id (monospace, copyable).
 */
export const StatusLine: React.FC<StatusLineProps> = ({
  jobState = 'READY',
  lastAction = 'AOI loaded',
  traceId = 'tr_8f3a2b1c',
}) => {
  const handleCopyTrace = () => {
    navigator.clipboard.writeText(traceId).catch(() => {});
  };

  return (
    <footer
      id="slot-40-status"
      className="w-full flex items-center justify-between px-4 select-none"
      style={{
        height: 24,
        background: 'var(--bg)',
        borderTop: '1px solid var(--line)',
        color: 'var(--ink-3)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        lineHeight: '14px',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: jobState === 'ANALYSING' ? 'var(--amber)' : jobState === 'ERROR' ? 'var(--danger)' : 'var(--success)',
            }}
          />
          <span style={{ color: 'var(--ink-2)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            {jobState}
          </span>
        </span>
        <span style={{ color: 'var(--line-strong)' }}>·</span>
        <span>{lastAction}</span>
      </div>

      <button
        onClick={handleCopyTrace}
        className="hover:text-amber-400 transition-colors cursor-pointer"
        style={{ color: 'var(--ink-3)', background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit' }}
        title="Copy trace ID"
      >
        trace: {traceId}
      </button>
    </footer>
  );
};
