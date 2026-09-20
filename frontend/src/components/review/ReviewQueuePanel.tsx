import React, { useState, useMemo } from 'react';
import type { Evidence } from '../../lib/types';
import { Button } from '../ui/Button';
import { REVIEW_COPY, DOSSIER_COPY } from '../../lib/copy';
import { FeedbackState } from '../ui/FeedbackState';

interface ReviewQueuePanelProps {
  evidenceList: Evidence[];
  selectedEvidenceId: string | null;
  onSelectEvidence: (ev: Evidence) => void;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

/**
 * ReviewQueuePanel — SLOT-20 + SLOT-25 (PRD 10 §5 / L5 & PRD 9 §5)
 * The un-modaled review queue:
 * - SORT ▾ + FILTER ▾ chips at top
 * - Rows with M6 hover (2px right shift + 3px amber left bar)
 * - Sticky footer: n of m reviewed progress + SKIP ghost + REJECT danger + CONFIRM primary
 * - Keyboard hints: J/K, ⏎, ⌫, Space
 */
export const ReviewQueuePanel: React.FC<ReviewQueuePanelProps> = ({
  evidenceList,
  selectedEvidenceId,
  onSelectEvidence,
  onConfirm,
  onReject,
  onSkip,
  isLoading = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'area' | 'date'>('confidence');

  const filtered = useMemo(() => {
    let list = [...evidenceList];
    if (filter !== 'all') {
      list = list.filter((e) => e.status === filter);
    }
    if (sortBy === 'confidence') {
      list.sort((a, b) => (b.confidence?.overall || 0) - (a.confidence?.overall || 0));
    } else if (sortBy === 'area') {
      list.sort((a, b) => (b.measurement.area_m2 || 0) - (a.measurement.area_m2 || 0));
    }
    return list;
  }, [evidenceList, filter, sortBy]);

  const reviewedCount = evidenceList.filter((e) => e.status === 'confirmed' || e.status === 'rejected').length;
  const totalCount = evidenceList.length;

  const activeEvidence = evidenceList.find((e) => e.change_object_id === selectedEvidenceId) || filtered[0];

  if (isLoading) {
    return <FeedbackState state="loading" loadingStage="RETRIEVING CHANGE TARGETS FOR TRIAGE…" />;
  }

  if (evidenceList.length === 0) {
    return (
      <FeedbackState
        state="empty"
        emptyMessage="NO TARGETS FOUND IN REVIEW QUEUE FOR THIS TIMEFRAME"
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden bg-[var(--panel)]">
      {/* Header & Filter/Sort Controls */}
      <div className="p-3 border-b border-[var(--line)] bg-[var(--bg)] flex flex-col gap-2 shrink-0">
        <div className="dossier-bar" style={{ margin: 0 }}>
          <span>{REVIEW_COPY.queueTitle}</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          {/* SORT ▾ */}
          <div className="flex items-center gap-1.5">
            <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>
              {REVIEW_COPY.sortLabel}:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-[var(--well)] text-[var(--ink)] t-mono text-xs px-2 py-0.5 rounded border border-[var(--line)]"
            >
              <option value="confidence">{REVIEW_COPY.sortConfidence}</option>
              <option value="area">{REVIEW_COPY.sortArea}</option>
            </select>
          </div>

          {/* FILTER ▾ */}
          <div className="flex items-center gap-1">
            {(['all', 'pending', 'confirmed', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="t-tag px-2 py-0.5 rounded border transition-colors cursor-pointer"
                style={{
                  fontSize: 9,
                  background: filter === f ? 'var(--amber-wash)' : 'transparent',
                  borderColor: filter === f ? 'var(--amber)' : 'var(--line)',
                  color: filter === f ? 'var(--amber)' : 'var(--ink-3)',
                }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Target Rows (M6 hover) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
        {filtered.map((item, idx) => {
          const isSelected = item.change_object_id === selectedEvidenceId;
          const conf = Math.round((item.confidence?.overall || 0) * 100);
          const area = item.measurement.area_label;

          return (
            <div
              key={item.change_object_id}
              onClick={() => onSelectEvidence(item)}
              className="console-panel p-2 flex items-center justify-between cursor-pointer transition-all duration-150"
              style={{
                borderLeft: isSelected ? '3px solid var(--amber)' : '1px solid var(--line)',
                background: isSelected ? 'var(--amber-wash)' : 'var(--panel)',
                transform: isSelected ? 'translateX(2px)' : 'none',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="t-mono text-[var(--ink-3)] w-4" style={{ fontSize: 10 }}>
                  {(idx + 1).toString().padStart(2, '0')}
                </span>
                <span className="t-tag font-bold text-xs" style={{ color: 'var(--amber)' }}>
                  {item.change_type.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="t-mono text-xs tabular-nums text-[var(--ink-2)]">
                  {area}
                </span>
                <span className="t-mono text-xs tabular-nums font-semibold text-[var(--ink)]">
                  {conf}%
                </span>
                <span
                  className="t-tag px-1.5 py-0.5 rounded"
                  style={{
                    fontSize: 9,
                    background:
                      item.status === 'confirmed'
                        ? 'var(--confirmed-fill)'
                        : item.status === 'rejected'
                        ? 'var(--rejected-fill)'
                        : 'var(--amber-wash)',
                    color:
                      item.status === 'confirmed'
                        ? 'var(--confirmed-text)'
                        : item.status === 'rejected'
                        ? 'var(--rejected-text)'
                        : 'var(--amber)',
                    border: `1px solid ${
                      item.status === 'confirmed'
                        ? 'var(--confirmed-border)'
                        : item.status === 'rejected'
                        ? 'var(--rejected-border)'
                        : 'var(--amber)'
                    }`,
                  }}
                >
                  {item.status.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SLOT-25: Action Footer (Sticky Reflow Ban) */}
      <div
        data-slot="SLOT-25"
        className="p-3 border-t border-[var(--line)] bg-[var(--panel)] flex flex-col gap-2 shrink-0"
        style={{ position: 'sticky', bottom: 0, zIndex: 'var(--z-base)' }}
      >
        <div className="flex items-center justify-between">
          <span className="t-mono text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {REVIEW_COPY.reviewedProgress(reviewedCount, totalCount)}
          </span>

          <div className="flex items-center gap-2">
            {onSkip && (
              <Button variant="ghost" size="sm" onClick={onSkip} shortcut="Space">
                {REVIEW_COPY.skip}
              </Button>
            )}

            <Button
              variant="danger-outline"
              size="sm"
              shortcut="⌫"
              disabled={!activeEvidence}
              onClick={() => activeEvidence && onReject(activeEvidence.change_object_id)}
            >
              {DOSSIER_COPY.reject}
            </Button>

            <Button
              id="review-confirm-primary"
              variant="primary"
              size="sm"
              shortcut="⏎"
              disabled={!activeEvidence}
              onClick={() => activeEvidence && onConfirm(activeEvidence.change_object_id)}
            >
              {DOSSIER_COPY.confirm}
            </Button>
          </div>
        </div>

        <div className="text-center t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>
          {REVIEW_COPY.keyboardHints}
        </div>
      </div>
    </div>
  );
};
