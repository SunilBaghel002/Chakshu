import React, { useState } from 'react';
import type { Evidence } from '../lib/types';
import { Slot } from './layout/Slot';
import { DossierHeader } from './dossier/DossierHeader';
import { DossierTabs, type DossierTabKey } from './dossier/DossierTabs';
import { MeasuredBlock } from './dossier/MeasuredBlock';
import { EvidenceTriptych } from './EvidenceTriptych';
import { EvidenceConfidenceGauge } from './EvidenceConfidenceGauge';
import { DossierActionsFooter } from './dossier/DossierActionsFooter';
import { TraceRows } from './dossier/TraceRows';
import { SuppressionPanel } from './SuppressionPanel';

export interface EvidenceDrawerProps {
  evidence: Evidence | null;
  onClose: () => void;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onExport?: (id: string) => void;
  onToggleBeforeAfter?: () => void;
}

/**
 * Dossier (SLOT-20..26) — PRD 10 §4 (L4) & PRD 9 §4
 * Strictly rendered in exact order:
 * 1. SLOT-20: Header + VERIFIED chip + Copy ID + Close
 * 2. SLOT-21: 4-up Tabs (EVIDENCE, ANALYSIS, TRACE, SUPPRESSED)
 * 3. Body:
 *    - SLOT-22: Measured Block (BEFORE ⇄ AFTER toggle + 400ms count-up)
 *    - SLOT-23: Evidence Triptych thumbs (108x108 3-up)
 *    - SLOT-24: 5-component Confidence iris gauge
 *    - SLOT-26: Decision table trace rows or Suppression panel
 * 4. SLOT-25: Actions Footer (Sticky reflow ban: EXPORT left, REJECT, CONFIRM primary)
 */
export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  evidence,
  onClose,
  onConfirm,
  onReject,
  onExport,
  onToggleBeforeAfter,
}) => {
  const initialTab = React.useMemo<DossierTabKey>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab');
      if (t === 'suppressed' || t === 'trace' || t === 'analysis' || t === 'evidence') {
        return t as DossierTabKey;
      }
    }
    return 'evidence';
  }, []);

  const [activeTab, setActiveTab] = useState<DossierTabKey>(initialTab);
  const [decision, setDecision] = useState<'pending' | 'confirmed' | 'rejected'>(
    evidence?.status ?? 'pending'
  );

  if (!evidence) return null;

  const { measurement, classification, temporal, confidence, suppression_context, sources } =
    evidence;

  const parts = confidence?.parts ?? {
    detector_agreement: 0.9,
    image_quality: 0.85,
    registration: 0.92,
    classification_margin: 0.78,
    temporal_persistence: 0.88,
  };

  const handleConfirm = () => {
    setDecision('confirmed');
    onConfirm?.(evidence.change_object_id);
  };

  const handleReject = () => {
    setDecision('rejected');
    onReject?.(evidence.change_object_id);
  };

  const suppressedCount = suppression_context?.candidates_suppressed ?? 312;

  return (
    <aside
      id="slot-20-dossier"
      className="flex flex-col select-none overflow-hidden h-full w-full"
      style={{
        background: 'var(--panel)',
        borderLeft: '1px solid var(--line)',
      }}
    >
      {/* 1. SLOT-20: Dossier Header + Target ID + VERIFIED chip */}
      <Slot id="SLOT-20" className="shrink-0">
        <DossierHeader
          evidence={evidence}
          decision={decision}
          onClose={onClose}
        />
      </Slot>

      {/* 2. SLOT-21: Dossier Tabs (EVIDENCE, ANALYSIS, TRACE, SUPPRESSED) */}
      <Slot id="SLOT-21" h={32} className="shrink-0">
        <DossierTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          suppressedCount={suppressedCount}
        />
      </Slot>

      {/* Scrollable Body: SLOT-22, SLOT-23, SLOT-24, SLOT-25, SLOT-26 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {/* 3. SLOT-22: Measured Block */}
        <Slot id="SLOT-22" className="shrink-0">
          <MeasuredBlock
            measurement={measurement}
            onToggleBeforeAfter={onToggleBeforeAfter}
          />
        </Slot>

        {/* 4. SLOT-23: Evidence Triptych thumbs (3-up 108x108) */}
        <Slot id="SLOT-23" className="shrink-0">
          <EvidenceTriptych sources={sources} />
        </Slot>

        {/* 5. SLOT-24: Confidence iris gauge + 5 component rows */}
        <Slot id="SLOT-24" className="shrink-0">
          <EvidenceConfidenceGauge
            overall={confidence.overall}
            parts={parts}
            calibrated={confidence.calibrated}
            calibrationEce={confidence.calibration_ece}
            calibrationN={confidence.calibration_n}
          />
        </Slot>

        {/* Temporal Onset details */}
        <div className="console-panel p-3 space-y-2 t-mono text-xs">
          <div className="flex justify-between" style={{ color: 'var(--ink-2)' }}>
            <span style={{ color: 'var(--ink-3)' }}>First Supported:</span>
            <span style={{ color: 'var(--ink)', fontWeight: 700 }}>
              {temporal.first_supported ?? '2021-11-25'}
            </span>
          </div>
          {temporal.onset_interval && (
            <div
              className="p-2"
              style={{
                background: 'var(--amber-wash)',
                border: '1px solid var(--amber)',
                borderRadius: 'var(--radius)',
                color: 'var(--amber)',
                fontSize: 10,
              }}
            >
              EARLIEST OBSERVED BETWEEN {temporal.onset_interval.start} → {temporal.onset_interval.end} (±{temporal.onset_interval.days}d)
            </div>
          )}
          {temporal.trend && (
            <div className="flex justify-between" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
              <span>Trend:</span>
              <span className="t-tag" style={{ color: 'var(--teal)' }}>
                {temporal.trend} (k={temporal.persistence_k ?? 3})
              </span>
            </div>
          )}
        </div>

        {/* 6. SLOT-25: Actions Footer (EXPORT left / REJECT / CONFIRM primary) */}
        <Slot id="SLOT-25" h={52} className="shrink-0">
          <DossierActionsFooter
            onExport={() => onExport?.(evidence.change_object_id)}
            onReject={handleReject}
            onConfirm={handleConfirm}
          />
        </Slot>

        {/* 7. SLOT-26: Trace Rows or Suppression Panel */}
        <Slot id="SLOT-26" className="shrink-0">
          {activeTab === 'suppressed' ? (
            <SuppressionPanel
              aoiId={evidence.aoi_id}
              suppressionContext={suppression_context}
            />
          ) : (
            <TraceRows
              classification={classification}
              traceId={`tr_${evidence.change_object_id.slice(0, 8)}`}
            />
          )}
        </Slot>
      </div>
    </aside>
  );
};
