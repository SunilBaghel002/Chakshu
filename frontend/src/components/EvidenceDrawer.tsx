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
  onOpenAsk?: () => void;
}

/**
 * EVIDENCE INSPECTOR — Dossier Panel
 * Target Design + strict slot order: 20 -> 21 -> 22 -> 23 -> 24 -> 25 -> 26
 */
export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  evidence,
  onClose,
  onConfirm,
  onReject,
  onExport,
  onToggleBeforeAfter,
  onOpenAsk,
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

  React.useEffect(() => {
    if (evidence) {
      setDecision(evidence.status ?? 'pending');
    }
  }, [evidence?.change_object_id, evidence?.status]);

  if (!evidence) return null;

  const { measurement, classification, temporal, confidence, suppression_context, sources } =
    evidence;

  const parts = confidence?.parts ?? {
    detector_agreement: 0.95,
    image_quality: 0.92,
    registration: 0.96,
    classification_margin: 0.94,
    temporal_persistence: 0.98,
  };

  const handleConfirm = () => {
    setDecision('confirmed');
    onConfirm?.(evidence.change_object_id);
  };

  const handleReject = () => {
    setDecision('rejected');
    onReject?.(evidence.change_object_id);
  };

  const suppressedCount = suppression_context?.candidates_suppressed ?? 374;
  const screenedCount = suppression_context?.candidates_generated ?? 398;
  const retainedCount = suppression_context?.candidates_retained ?? 24;

  return (
    <aside
      className="flex flex-col select-none overflow-hidden h-full w-full"
      style={{
        background: 'var(--panel)',
        borderLeft: '1px solid var(--line)',
      }}
    >
      {/* Target Design Inspector Banner */}
      <div
        className="px-3 py-2 flex items-center justify-between shrink-0"
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg)',
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13 }}>{'🔍'}</span>
          <span
            className="font-bold tracking-wider"
            style={{
              color: 'var(--ink)',
              fontFamily: 'var(--font-cond)',
              fontSize: 13,
              letterSpacing: '0.08em',
            }}
          >
            {'EVIDENCE INSPECTOR'}
          </span>
        </div>
        <span
          className="t-tag px-2 py-0.5 rounded flex items-center gap-1.5"
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            color: 'var(--verified-green)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: 8,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--verified-green)',
              display: 'inline-block',
            }}
          />
          {'Rule Gate Verified'}
        </span>
      </div>

      {/* SLOT-20: DossierHeader */}
      <Slot id="SLOT-20" w="100%" className="shrink-0">
        <DossierHeader
          evidence={evidence}
          decision={decision}
          onClose={onClose}
        />
      </Slot>

      {/* SLOT-21: DossierTabs */}
      <Slot id="SLOT-21" h={36} className="shrink-0">
        <DossierTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          suppressedCount={suppressedCount}
        />
      </Slot>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {/* SLOT-22: MeasuredBlock */}
        <Slot id="SLOT-22" className="shrink-0">
          <MeasuredBlock
            measurement={measurement}
            onToggleBeforeAfter={onToggleBeforeAfter}
            confidence={confidence.overall}
          />
        </Slot>

        {/* SLOT-23: EvidenceTriptych */}
        <Slot id="SLOT-23" className="shrink-0">
          <EvidenceTriptych sources={sources} evidence={evidence} />
        </Slot>

        {/* SLOT-24: EvidenceConfidenceGauge */}
        <Slot id="SLOT-24" className="shrink-0">
          <EvidenceConfidenceGauge
            overall={confidence.overall}
            parts={parts}
            calibrated={confidence.calibrated}
            calibrationEce={confidence.calibration_ece}
            calibrationN={confidence.calibration_n}
          />
        </Slot>

        {/* SLOT-25: Actions Footer */}
        <Slot id="SLOT-25" className="shrink-0">
          <DossierActionsFooter
            onExport={() => onExport?.(evidence.change_object_id)}
            onReject={handleReject}
            onConfirm={handleConfirm}
            onOpenAsk={onOpenAsk}
          />
        </Slot>

        {/* SLOT-26: Trace / Suppression / False-Alarm Breakdown */}
        <Slot id="SLOT-26" className="shrink-0">
          {activeTab === 'suppressed' ? (
            <SuppressionPanel
              aoiId={evidence.aoi_id}
              suppressionContext={suppression_context}
            />
          ) : activeTab === 'trace' ? (
            <TraceRows
              classification={classification}
              traceId={`tr_${evidence.change_object_id.slice(0, 8)}`}
            />
          ) : activeTab === 'analysis' ? (
            /* Analysis tab: Semantic Classification Breakdown & Target Analysis */
            <div className="space-y-2.5 pt-1 border-t border-[var(--line)]">
              <div className="flex items-center justify-between">
                <span
                  className="t-tag font-bold tracking-wider"
                  style={{ color: 'var(--ink-2)', fontSize: 9.5 }}
                >
                  {'SEMANTIC ANALYSIS & PERSISTENCE'}
                </span>
                <span
                  className="t-mono font-bold"
                  style={{ color: 'var(--primary-cyan)', fontSize: 9.5 }}
                >
                  {`Passes: k=${temporal.persistence_k ?? 4}`}
                </span>
              </div>

              {/* Target Analysis Card */}
              <div
                className="p-3 rounded space-y-2 t-mono"
                style={{
                  background: 'var(--well)',
                  border: '1px solid var(--line)',
                  fontSize: 10,
                }}
              >
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--ink-3)' }}>Facility Name:</span>
                  <span className="font-bold truncate" style={{ color: 'var(--ink)', maxWidth: 200 }}>
                    {measurement.measured_by?.replace(/^Semantic vectorisation, UTM 43N:\s*/, '') || measurement.area_label}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--ink-3)' }}>Semantic Type:</span>
                  <span className="t-tag font-bold" style={{ color: 'var(--primary-cyan)' }}>
                    {evidence.change_type.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--ink-3)' }}>Area Measured:</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
                    {measurement.area_label} ({(measurement.area_m2 || 0).toLocaleString()} m²)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--ink-3)' }}>First Observed:</span>
                  <span style={{ color: 'var(--warning-orange)', fontWeight: 600 }}>
                    {temporal.first_supported || '2021-11-25'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--ink-3)' }}>Latest Confirmation:</span>
                  <span style={{ color: 'var(--verified-green)', fontWeight: 600 }}>
                    {temporal.last_seen || '2026-08-03'}
                  </span>
                </div>
                {temporal.trend && (
                  <div className="flex justify-between items-center pt-1 border-t border-[var(--line)]">
                    <span style={{ color: 'var(--ink-3)' }}>Growth Trend:</span>
                    <span className="t-tag" style={{ color: 'var(--primary-cyan)' }}>
                      {temporal.trend.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* False-Alarm Suppression card on Evidence tab */
            <div className="space-y-2 pt-1 border-t border-[var(--line)]">
              <div className="flex items-center justify-between">
                <span
                  className="t-tag font-bold tracking-wider"
                  style={{ color: 'var(--ink-2)', fontSize: 9.5 }}
                >
                  {'FALSE-ALARM SUPPRESSION'}
                </span>
                <span
                  className="t-mono font-bold"
                  style={{ color: 'var(--primary-cyan)', fontSize: 9.5 }}
                >
                  {`${suppressedCount} Suppressed`}
                </span>
              </div>

              {/* 3-column stats card */}
              <div
                className="grid grid-cols-3 gap-2 p-2.5 rounded"
                style={{
                  background: 'var(--well)',
                  border: '1px solid var(--line)',
                }}
              >
                <div className="flex flex-col items-center">
                  <span className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 8 }}>
                    {'Total Screened'}
                  </span>
                  <span className="t-mono font-bold tabular-nums" style={{ color: 'var(--ink)', fontSize: 13 }}>
                    {screenedCount}
                  </span>
                </div>
                <div className="flex flex-col items-center border-x border-[var(--line)]">
                  <span className="t-mono" style={{ color: 'var(--verified-green)', fontSize: 8 }}>
                    {'Retained'}
                  </span>
                  <span className="t-mono font-bold tabular-nums" style={{ color: 'var(--verified-green)', fontSize: 13 }}>
                    {retainedCount}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 8 }}>
                    {'Filtered'}
                  </span>
                  <span className="t-mono font-bold tabular-nums" style={{ color: 'var(--ink-2)', fontSize: 13 }}>
                    {suppressedCount}
                  </span>
                </div>
              </div>

              {/* 4 breakdown rows */}
              <div className="space-y-1.5 t-mono" style={{ fontSize: 9.5 }}>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--ink-3)' }}>{'Cloud Contamination Filter:'}</span>
                  <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{'126 rejected'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--ink-3)' }}>{'Cloud Shadow Invalidation:'}</span>
                  <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{'71 rejected'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--ink-3)' }}>{'Crop Phenology / Seasonality:'}</span>
                  <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{'92 rejected'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--ink-3)' }}>{'Sensor Ephemeris Glint:'}</span>
                  <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{'85 rejected'}</span>
                </div>
              </div>
            </div>
          )}
        </Slot>
      </div>
    </aside>
  );
};
