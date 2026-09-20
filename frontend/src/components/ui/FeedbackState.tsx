import React, { useState } from 'react';
import { Aperture, RotateCcw, Copy, Check } from 'lucide-react';
import { Button } from './Button';
import { FEEDBACK_COPY } from '../../lib/copy';

export type StateKind = 'ok' | 'loading' | 'empty' | 'error' | 'capability_notice';

export interface FeedbackStateProps {
  state: StateKind;
  stale?: boolean;
  staleNotice?: string;
  onRefresh?: () => void;
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  loadingStage?: string;
  errorCode?: string;
  errorMessage?: string;
  traceId?: string;
  onRetry?: () => void;
  refusalNotice?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Out-of-focus iris SVG for empty state per PRD 9 §5 / PRD 12 §4
 * 40% opacity in --line-strong
 */
const OutOfFocusIris: React.FC = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    className="select-none"
    style={{ opacity: 0.4 }}
    aria-hidden="true"
  >
    <circle cx="32" cy="32" r="30" stroke="var(--line-strong)" strokeWidth="1.5" strokeDasharray="3 3" />
    <circle cx="32" cy="32" r="22" stroke="var(--line-strong)" strokeWidth="1.5" />
    <circle cx="32" cy="32" r="14" stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="2 2" />
    <circle cx="32" cy="32" r="6" stroke="var(--line-strong)" strokeWidth="1" />
  </svg>
);

/**
 * FeedbackState (PRD 12 §4 / X4 & PRD 9 §5)
 * The five mandatory states for every data-bearing region:
 * - Empty: out-of-focus iris + 1 line message + 1 action
 * - Loading: skeleton wells + sheen sweep (NEVER a spinner) + stage label
 * - Error: 1px --danger frame + code in --t-mono + copyable trace_id + RETRY
 * - Refusal / Capability Notice: --amber-wash panel + aperture icon (NEVER red)
 * - Stale: dimmed to --ink-3 + 2px amber top edge + REFRESH button
 */
export const FeedbackState: React.FC<FeedbackStateProps> = ({
  state,
  stale = false,
  staleNotice = FEEDBACK_COPY.staleNotice,
  onRefresh,
  emptyMessage = FEEDBACK_COPY.emptyDefault,
  emptyAction,
  loadingStage = FEEDBACK_COPY.loadingDefault,
  errorCode = 'E_OPERATION_FAILED',
  errorMessage = FEEDBACK_COPY.errorPrefix,
  traceId = 'tr_7e2a9b1c',
  onRetry,
  refusalNotice,
  children,
  className = '',
  style,
}) => {
  const [copiedTrace, setCopiedTrace] = useState<boolean>(false);

  const handleCopyTrace = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(traceId);
      setCopiedTrace(true);
      setTimeout(() => setCopiedTrace(false), 2000);
    }
  };

  // 1. Loading State (Skeleton wells + honest stage label; NO SPINNER)
  if (state === 'loading') {
    return (
      <div
        data-state="loading"
        className={`flex flex-col gap-3 p-4 w-full h-full justify-center ${className}`}
        style={style}
      >
        <div className="flex flex-col gap-2.5">
          <div
            className="w-full h-12 rounded"
            style={{
              background:
                'linear-gradient(90deg, var(--panel-2) 0%, var(--panel) 50%, var(--panel-2) 100%)',
              backgroundSize: '200% 100%',
              animation: 'scan-sheen 1.2s linear infinite',
            }}
          />
          <div
            className="w-3/4 h-8 rounded"
            style={{
              background:
                'linear-gradient(90deg, var(--panel-2) 0%, var(--panel) 50%, var(--panel-2) 100%)',
              backgroundSize: '200% 100%',
              animation: 'scan-sheen 1.2s linear infinite',
            }}
          />
          <div
            className="w-1/2 h-6 rounded"
            style={{
              background:
                'linear-gradient(90deg, var(--panel-2) 0%, var(--panel) 50%, var(--panel-2) 100%)',
              backgroundSize: '200% 100%',
              animation: 'scan-sheen 1.2s linear infinite',
            }}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="t-tag"
            style={{ color: 'var(--amber)', letterSpacing: '0.08em' }}
          >
            {loadingStage}
          </span>
        </div>
      </div>
    );
  }

  // 2. Empty State (out-of-focus iris + 1 line + 1 action)
  if (state === 'empty') {
    return (
      <div
        data-state="empty"
        className={`flex flex-col items-center justify-center p-6 text-center gap-3 w-full h-full ${className}`}
        style={style}
      >
        <OutOfFocusIris />
        <p className="t-body max-w-sm" style={{ color: 'var(--ink-2)', fontSize: 12 }}>
          {emptyMessage}
        </p>
        {emptyAction ? (
          <Button variant="secondary" size="sm" onClick={emptyAction.onClick}>
            {emptyAction.label}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRefresh?.()}
          >
            {FEEDBACK_COPY.widenRange}
          </Button>
        )}
      </div>
    );
  }

  // 3. Error State (1px --danger frame + code in --t-mono + copyable trace_id + RETRY)
  if (state === 'error') {
    return (
      <div
        data-state="error"
        className={`p-4 flex flex-col gap-3 rounded ${className}`}
        style={{
          border: '1px solid var(--danger)',
          background: 'rgba(239, 68, 68, 0.05)',
          ...style,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="t-tag font-bold" style={{ color: 'var(--danger)' }}>
            {errorMessage}
          </span>
          <span className="t-mono text-xs" style={{ color: 'var(--ink-3)' }}>
            [{errorCode}]
          </span>
        </div>

        <div
          className="flex items-center justify-between p-2 rounded t-mono text-xs"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
        >
          <span style={{ color: 'var(--ink-2)' }}>TRACE: {traceId}</span>
          <Button
            variant="icon-ghost"
            size="sm"
            onClick={handleCopyTrace}
            title={copiedTrace ? FEEDBACK_COPY.traceCopied : FEEDBACK_COPY.copyTraceId}
          >
            {copiedTrace ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {onRetry && (
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              {FEEDBACK_COPY.retry}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 4. Capability Notice / Refusal State (amber-wash + aperture icon; NEVER red)
  if (state === 'capability_notice') {
    return (
      <div
        data-state="capability_notice"
        className={`p-4 flex flex-col gap-2.5 rounded ${className}`}
        style={{
          background: 'var(--amber-wash)',
          border: '1px solid var(--amber)',
          color: 'var(--ink)',
          ...style,
        }}
      >
        <div className="flex items-center gap-2">
          <Aperture className="w-4 h-4 text-[var(--amber)] shrink-0" />
          <span className="t-tag font-bold" style={{ color: 'var(--amber)', letterSpacing: '0.08em' }}>
            RESOLUTION GATE VERDICT
          </span>
        </div>
        <p className="t-body text-xs" style={{ color: 'var(--ink)', lineHeight: '18px' }}>
          {refusalNotice || FEEDBACK_COPY.loadingDefault}
        </p>
      </div>
    );
  }

  // 5. OK State (with optional stale modifier)
  return (
    <div
      data-state="ok"
      data-stale={stale ? 'true' : undefined}
      className={`relative w-full h-full flex flex-col ${className}`}
      style={{
        borderTop: stale ? '2px solid var(--amber)' : undefined,
        ...style,
      }}
    >
      {stale && (
        <div
          className="flex items-center justify-between px-3 py-1.5 shrink-0"
          style={{
            background: 'var(--amber-wash)',
            borderBottom: '1px solid var(--amber)',
          }}
        >
          <span className="t-mono text-xs font-medium" style={{ color: 'var(--amber)' }}>
            {staleNotice}
          </span>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RotateCcw className="w-3 h-3 mr-1" />
              {FEEDBACK_COPY.refresh}
            </Button>
          )}
        </div>
      )}
      <div
        className="flex-1 w-full h-full"
        style={{
          opacity: stale ? 0.6 : 1,
          color: stale ? 'var(--ink-3)' : undefined,
          transition: 'opacity 160ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};
