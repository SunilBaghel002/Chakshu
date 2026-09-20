import React, { useState } from 'react';
import { FeedbackState } from './ui/FeedbackState';
import { Button } from './ui/Button';
import { FEEDBACK_COPY, REFUSAL_NOTICES, DOSSIER_COPY } from '../lib/copy';
import { PrimaryOwnerProvider } from './ui/PrimaryOwnerContext';

/**
 * StatesContactSheet — PRD 12 §4 (X4) & PRD 10 §8
 * Demonstrates all five states for every data-bearing region:
 * 1. ok (with stale modifier)
 * 2. loading (skeleton sheen, zero spinners)
 * 3. empty (out-of-focus iris, widen range)
 * 4. error (red frame, trace id, retry)
 * 5. capability_notice (amber-wash, aperture icon, verbatim refusal, NEVER red)
 */
export const StatesContactSheet: React.FC = () => {
  const [staleToggle, setStaleToggle] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [refreshCount, setRefreshCount] = useState<number>(0);
  const [widenCount, setWidenCount] = useState<number>(0);

  return (
    <PrimaryOwnerProvider initialOwnerId="states-sheet-primary">
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-8 dot-grid overflow-y-auto font-ui space-y-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto border-b border-[var(--line)] pb-4 flex items-center justify-between">
          <div>
            <div className="dossier-bar inline-flex mb-2">
              <span>FIVE FEEDBACK STATES CONTACT SHEET // PRD 12 §4 (X4)</span>
            </div>
            <p className="t-mono text-[var(--ink-2)] text-xs">
              CANONICAL STATES FOR EVERY DATA-BEARING REGION: OK (STALE MODIFIER) · LOADING · EMPTY · ERROR · CAPABILITY NOTICE
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              window.location.href = '/';
            }}
          >
            RETURN TO CONSOLE
          </Button>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. OK STATE */}
          <div className="flex flex-col gap-2">
            <div className="dossier-bar">
              <span>1. STATE: OK (LIVE DATA)</span>
            </div>
            <div className="h-64 rounded bg-[var(--panel)] border border-[var(--line)] p-4">
              <FeedbackState state="ok">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="t-tag font-bold text-xs" style={{ color: 'var(--amber)' }}>
                      TARGET EV-2024-001
                    </span>
                    <span
                      className="t-tag px-2 py-0.5 rounded bg-[var(--confirmed-fill)] border border-[var(--confirmed-border)] text-[var(--confirmed-text)]"
                      style={{ fontSize: 9 }}
                    >
                      {DOSSIER_COPY.verified}
                    </span>
                  </div>
                  <div className="t-figure text-2xl font-bold" style={{ color: 'var(--amber)' }}>
                    475.83 ha
                  </div>
                  <div className="t-mono text-xs text-[var(--ink-3)]">
                    Kruger UTM 43N Ellipsoid Projection · Centroid [77.6075, 28.1748]
                  </div>
                  <div className="mt-4 p-2 rounded bg-[var(--well)] border border-[var(--line)] t-mono text-xs text-[var(--ink-2)]">
                    Confidence: 94% · Agreement: 98% · Quality: 96%
                  </div>
                </div>
              </FeedbackState>
            </div>
          </div>

          {/* 1b. OK STATE WITH STALE MODIFIER */}
          <div className="flex flex-col gap-2">
            <div className="dossier-bar flex justify-between items-center">
              <span>1B. OK + STALE MODIFIER</span>
              <button
                onClick={() => setStaleToggle(!staleToggle)}
                className="t-tag text-[var(--amber)] underline cursor-pointer"
                style={{ fontSize: 9 }}
              >
                TOGGLE
              </button>
            </div>
            <div className="h-64 rounded bg-[var(--panel)] border border-[var(--line)] overflow-hidden">
              <FeedbackState
                state="ok"
                stale={staleToggle}
                staleNotice={FEEDBACK_COPY.staleNotice}
                onRefresh={() => setRefreshCount((c) => c + 1)}
              >
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="t-tag font-bold text-xs" style={{ color: 'var(--amber)' }}>
                      TARGET EV-2021-042
                    </span>
                    <span
                      className="t-tag px-2 py-0.5 rounded bg-[var(--well)] border border-[var(--line)] text-[var(--ink-3)]"
                      style={{ fontSize: 9 }}
                    >
                      AOI CHANGED
                    </span>
                  </div>
                  <div className="t-figure text-2xl font-bold" style={{ color: 'var(--amber)' }}>
                    18.43 ha
                  </div>
                  <div className="t-mono text-xs text-[var(--ink-3)]">
                    Cached query from 09:41:22 GMT · Refreshes: {refreshCount}
                  </div>
                </div>
              </FeedbackState>
            </div>
          </div>

          {/* 2. LOADING STATE (ZERO SPINNERS) */}
          <div className="flex flex-col gap-2">
            <div className="dossier-bar">
              <span>2. STATE: LOADING (SHEEN SWEEP)</span>
            </div>
            <div className="h-64 rounded bg-[var(--panel)] border border-[var(--line)]">
              <FeedbackState
                state="loading"
                loadingStage={FEEDBACK_COPY.loadingDefault}
              />
            </div>
          </div>

          {/* 3. EMPTY STATE */}
          <div className="flex flex-col gap-2">
            <div className="dossier-bar">
              <span>3. STATE: EMPTY (OUT-OF-FOCUS IRIS)</span>
            </div>
            <div className="h-64 rounded bg-[var(--panel)] border border-[var(--line)]">
              <FeedbackState
                state="empty"
                emptyMessage={FEEDBACK_COPY.emptyDefault}
                emptyAction={{
                  label: `${FEEDBACK_COPY.widenRange} (${widenCount})`,
                  onClick: () => setWidenCount((c) => c + 1),
                }}
              />
            </div>
          </div>

          {/* 4. ERROR STATE */}
          <div className="flex flex-col gap-2">
            <div className="dossier-bar">
              <span>4. STATE: ERROR (RED FRAME + TRACE)</span>
            </div>
            <div className="h-64 rounded bg-[var(--panel)] border border-[var(--line)] p-4">
              <FeedbackState
                state="error"
                errorCode="RASTER_DECOMPRESSION_FAILED"
                errorMessage="Raster decompression checksum mismatch on Sentinel-2 tile 43RCU band B08"
                traceId="tr_err_7c19a2b"
                onRetry={() => setRetryCount((c) => c + 1)}
              />
              {retryCount > 0 && (
                <div className="mt-2 t-mono text-[var(--ink-3)]" style={{ fontSize: 10 }}>
                  Retry triggered {retryCount} time(s).
                </div>
              )}
            </div>
          </div>

          {/* 5. CAPABILITY NOTICE (AMBER-WASH, NEVER RED) */}
          <div className="flex flex-col gap-2">
            <div className="dossier-bar">
              <span>5. STATE: CAPABILITY NOTICE (AMBER-WASH)</span>
            </div>
            <div className="h-64 rounded bg-[var(--panel)] border border-[var(--line)] p-4">
              <FeedbackState
                state="capability_notice"
                refusalNotice={REFUSAL_NOTICES.NOTICE_T3}
              />
            </div>
          </div>
        </div>
      </div>
    </PrimaryOwnerProvider>
  );
};
