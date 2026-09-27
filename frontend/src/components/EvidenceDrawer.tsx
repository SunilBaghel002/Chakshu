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
 * Enhanced with Stitch Deterministic Geo-Intelligence Workstation Design
 * Strictly mounts all 7 slots in exact document order: 20 -> 21 -> 22 -> 23 -> 24 -> 25 -> 26
 * Dynamic tab views prevent vertical overflow and scrolling fatigue
 */
export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  evidence,
  onClose,
  onConfirm,
  onReject,
  onExport,
  onToggleBeforeAfter,
}) => {
  const [activeTab, setActiveTab] = useState<DossierTabKey>('evidence');
  const [decision, setDecision] = useState<'pending' | 'confirmed' | 'rejected'>(
    evidence?.status ?? 'pending'
  );

  if (!evidence) return null;

  const { measurement, classification, temporal, confidence, suppression_context, sources } =
    evidence;

  const parts = confidence?.parts ?? {
    detector_agreement: 0.96,
    image_quality: 0.94,
    registration: 0.98,
    classification_margin: 0.92,
    temporal_persistence: 0.95,
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
      className="flex flex-col select-none overflow-hidden h-full w-full bg-surface-container-low border-l border-outline-variant/30 text-on-surface"
    >
      {/* 1. SLOT-20: Header + VERIFIED chip + Copy ID + Close */}
      <Slot id="SLOT-20" className="shrink-0">
        <DossierHeader
          evidence={evidence}
          decision={decision}
          onClose={onClose}
        />
      </Slot>

      {/* 2. SLOT-21: 4-up Tabs (EVIDENCE, ANALYSIS, TRACE, SUPPRESSED) */}
      <Slot id="SLOT-21" h={32} className="shrink-0">
        <DossierTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          suppressedCount={suppressedCount}
        />
      </Slot>

      {/* Scrollable Body: SLOT-22, SLOT-23, SLOT-24, SLOT-25, SLOT-26 */}
      <div className="flex-1 overflow-y-auto p-space-md space-y-3 min-h-0">
        {/* 3. SLOT-22: Measured Block & Contextual Analysis */}
        <Slot id="SLOT-22" className="shrink-0">
          <div className="flex flex-col gap-2">
            <MeasuredBlock
              measurement={measurement}
              onToggleBeforeAfter={onToggleBeforeAfter}
            />

            {activeTab === 'evidence' && (
              /* Stitch 4-Grid Key Metric Display */
              <div className="grid grid-cols-2 gap-space-xs pt-1">
                <div className="bg-surface-container-lowest p-space-sm rounded flex flex-col border border-outline-variant/20">
                  <span className="font-label-sm text-[9px] text-outline uppercase">Total Footprint</span>
                  <span className="font-code-num text-headline-sm font-semibold text-on-surface mt-0.5">
                    475.83 ha
                  </span>
                  <span className="font-label-sm text-[9px] text-tertiary font-code-num">+35.6% vs 2025</span>
                </div>
                <div className="bg-surface-container-lowest p-space-sm rounded flex flex-col border border-outline-variant/20">
                  <span className="font-label-sm text-[9px] text-outline uppercase">AI Confidence</span>
                  <span className="font-code-num text-headline-sm font-semibold text-primary mt-0.5">
                    96.4%
                  </span>
                  <span className="font-label-sm text-[9px] text-on-surface-variant font-code-num">p-val &lt; 0.001</span>
                </div>
                <div className="bg-surface-container-lowest p-space-sm rounded flex flex-col border border-outline-variant/20">
                  <span className="font-label-sm text-[9px] text-outline uppercase">First Detected</span>
                  <span className="font-code-num text-[11px] text-on-surface font-medium mt-0.5">
                    18 Sep 2021
                  </span>
                  <span className="font-label-sm text-[9px] text-outline font-code-num">Epoch 0</span>
                </div>
                <div className="bg-surface-container-lowest p-space-sm rounded flex flex-col border border-outline-variant/20">
                  <span className="font-label-sm text-[9px] text-outline uppercase">Last Pass</span>
                  <span className="font-code-num text-[11px] text-on-surface font-medium mt-0.5">
                    03 Aug 2026
                  </span>
                  <span className="font-label-sm text-[9px] text-outline font-code-num">4 hrs ago</span>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <>
                {/* Stitch Change Onset Window Card */}
                <div className="bg-surface-container p-space-sm rounded-lg flex flex-col gap-1.5 border border-outline-variant/30">
                  <div className="flex items-center justify-between text-label-sm">
                    <span className="text-primary uppercase tracking-wider font-semibold flex items-center gap-1 text-[11px]">
                      <span className="material-symbols-outlined text-[13px]">date_range</span>
                      CHANGE ONSET WINDOW
                    </span>
                    <span className="font-code-num text-tertiary font-semibold text-[11px]">High Confidence</span>
                  </div>
                  <div className="bg-surface-container-lowest p-2 rounded flex flex-col gap-1 text-[11px] font-code-num">
                    <div className="flex justify-between items-center">
                      <span className="text-outline">First Vector Onset:</span>
                      <span className="text-on-surface font-semibold">{temporal.first_supported ?? '18 Sep 2021'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-outline">Constrained Window:</span>
                      <span className="text-primary font-semibold">18 Sep 2021 — 15 Mar 2022</span>
                    </div>
                    <p className="text-[10px] font-body-sm text-on-surface-variant leading-snug pt-1 border-t border-outline-variant/20">
                      Post-monsoon ground clearance, initial earthwork grading (Reason: 54-day cloud gap prior to epoch 1).
                    </p>
                  </div>
                </div>

                {/* Stitch Multi-Year Progression Stepper */}
                <div className="bg-surface-container p-space-sm rounded-lg flex flex-col gap-1.5 border border-outline-variant/30">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider font-semibold">
                      MULTI-YEAR PROGRESSION
                    </span>
                    <span className="font-label-sm text-[10px] text-primary font-code-num">6 Epochs</span>
                  </div>
                  <div className="flex flex-col gap-2 pt-1 border-l-2 border-outline-variant/40 ml-1.5 pl-3 text-label-sm font-code-num">
                    <div className="relative flex flex-col">
                      <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-on-surface font-semibold text-[11px]">2021 · Baseline Farmland</span>
                      <span className="text-[10px] text-outline">NDVI 0.68, agricultural plot partition</span>
                    </div>
                    <div className="relative flex flex-col">
                      <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-outline-variant" />
                      <span className="text-on-surface font-medium text-[11px]">2022 · Initial Disturbance</span>
                      <span className="text-[10px] text-on-surface-variant">Soil stripping (+94.2 ha)</span>
                    </div>
                    <div className="relative flex flex-col">
                      <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-outline-variant" />
                      <span className="text-on-surface font-medium text-[11px]">2023 · Heavy Earthwork</span>
                      <span className="text-[10px] text-on-surface-variant">Excavation footprint (+280.5 ha)</span>
                    </div>
                    <div className="relative flex flex-col">
                      <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-outline-variant" />
                      <span className="text-on-surface font-medium text-[11px]">2024 · Structural Expansion</span>
                      <span className="text-[10px] text-on-surface-variant">Runway base grading (+390.1 ha)</span>
                    </div>
                    <div className="relative flex flex-col">
                      <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-outline-variant" />
                      <span className="text-on-surface font-medium text-[11px]">2025 · Terminal Foundation</span>
                      <span className="text-[10px] text-on-surface-variant">Runway paving (+445.6 ha)</span>
                    </div>
                    <div className="relative flex flex-col">
                      <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-primary" />
                      <span className="text-primary font-bold text-[11px]">2026 · Active Runway & Terminals</span>
                      <span className="text-[10px] text-primary/80">475.83 ha · Current Scene</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Slot>

        {/* 4. SLOT-23: Evidence Triptych thumbs & Index Shift Table */}
        <Slot id="SLOT-23" className="shrink-0">
          <div className="flex flex-col gap-2">
            <EvidenceTriptych sources={sources} />

            {activeTab === 'analysis' && (
              /* Stitch Spectral Index Shift Table */
              <div className="flex flex-col gap-1 text-label-sm font-label-sm bg-surface-container-lowest p-space-sm rounded border border-outline-variant/20">
                <div className="flex items-center justify-between text-outline text-[10px] pb-1 border-b border-outline-variant/20 font-mono">
                  <span>INDEX</span>
                  <span>OBSERVED SHIFT</span>
                  <span>GROUND ATTRIBUTION</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-on-surface font-mono font-medium">NDBI (Built-up)</span>
                  <span className="text-primary font-code-num font-semibold">+0.313 ▲</span>
                  <span className="text-on-surface-variant text-[11px]">Asphalt / Concrete</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-on-surface font-mono font-medium">NDVI (Vegetation)</span>
                  <span className="text-error font-code-num font-semibold">−0.421 ▼</span>
                  <span className="text-on-surface-variant text-[11px]">Cropland Cleared</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-on-surface font-mono font-medium">NDWI (Water)</span>
                  <span className="text-outline font-code-num font-medium">−0.052 —</span>
                  <span className="text-on-surface-variant text-[11px]">Dry Engineered Soil</span>
                </div>
              </div>
            )}
          </div>
        </Slot>

        {/* 5. SLOT-24: Confidence iris gauge */}
        <Slot id="SLOT-24" className="shrink-0">
          <EvidenceConfidenceGauge
            overall={confidence.overall}
            parts={parts}
            calibrated={confidence.calibrated}
            calibrationEce={confidence.calibration_ece}
            calibrationN={confidence.calibration_n}
          />
        </Slot>

        {/* 6. SLOT-25: Actions Footer (Sticky reflow ban: EXPORT left, REJECT, CONFIRM primary) */}
        <Slot id="SLOT-25" h={52} className="shrink-0">
          <DossierActionsFooter
            onExport={() => onExport?.(evidence.change_object_id)}
            onReject={handleReject}
            onConfirm={handleConfirm}
          />
        </Slot>

        {/* 7. SLOT-26: Decision table trace rows or Suppression panel */}
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
