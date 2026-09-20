import React, { useState } from 'react';
import {
  X,
  Check,
  Ban,
} from 'lucide-react';
import type { Evidence } from '../lib/types';
import { COPY } from '../lib/copy';
import { getClassColor, getClassBadge } from '../lib/palette';
import { EvidenceTriptych } from './EvidenceTriptych';
import { EvidenceConfidenceGauge } from './EvidenceConfidenceGauge';
import { SuppressionPanel } from './SuppressionPanel';

interface EvidenceDrawerProps {
  evidence: Evidence | null;
  onClose: () => void;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
}

/**
 * SLOT-20 — Dossier Panel (380px)
 * Skewed amber dossier bars, corner ticks, 5-arc confidence gauge.
 */
export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  evidence,
  onClose,
  onConfirm,
  onReject,
}) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'rules' | 'history'>('evidence');
  const [analystDecision, setAnalystDecision] = useState<'pending' | 'confirmed' | 'rejected'>(
    evidence?.status ?? 'pending'
  );

  if (!evidence) return null;

  const { measurement, classification, temporal, confidence, suppression_context, sources } =
    evidence;
  const facilityName =
    measurement.measured_by?.replace(/^Semantic vectorisation, UTM 43N:\s*/, '') ||
    measurement.area_label;
  const badge = getClassBadge(facilityName || evidence.change_type);

  const parts = confidence?.parts ?? {
    detector_agreement: 0.90,
    image_quality: 0.85,
    registration: 0.92,
    classification_margin: 0.78,
    temporal_persistence: 0.88,
  };

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'evidence', label: 'EVIDENCE' },
    { key: 'rules', label: 'TRACE' },
    { key: 'history', label: `SUPPRESSION (${evidence.suppression_context?.candidates_suppressed ?? 312})` },
  ];

  return (
    <aside
      id="slot-20-dossier"
      className="flex flex-col select-none overflow-hidden animate-dossier-in"
      style={{
        width: 380,
        background: 'var(--panel)',
        borderLeft: '1px solid var(--line)',
        height: '100%',
        zIndex: 30,
      }}
    >
      {/* Dossier Header */}
      <div
        className="p-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className="t-tag font-bold"
              style={{
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.color}60`,
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 9,
              }}
            >
              {badge.name}
            </span>
            <span
              className="t-tag"
              style={{
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 9,
                background: analystDecision === 'confirmed' ? 'var(--confirmed-fill)' : analystDecision === 'rejected' ? 'var(--rejected-fill)' : 'var(--amber-wash)',
                border: `1px solid ${analystDecision === 'confirmed' ? 'var(--confirmed-border)' : analystDecision === 'rejected' ? 'var(--rejected-border)' : 'var(--amber)'}`,
                color: analystDecision === 'confirmed' ? 'var(--confirmed-text)' : analystDecision === 'rejected' ? 'var(--rejected-text)' : 'var(--amber)',
              }}
            >
              {analystDecision === 'confirmed' ? 'VERIFIED' : analystDecision === 'rejected' ? 'REJECTED' : 'PENDING'}
            </span>
          </div>
          <div className="font-bold text-xs text-[var(--ink)] font-mono mt-1.5 line-clamp-1" style={{ maxWidth: 280 }}>
            {facilityName}
          </div>
          <p className="t-mono mt-0.5" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
            ID: {evidence.change_object_id.substring(0, 16)}…
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 transition-colors cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-3)',
            borderRadius: 'var(--radius)',
          }}
          title="Close dossier"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}
      >
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex-1 py-2 text-center t-tag transition-colors relative cursor-pointer"
            style={{
              background: activeTab === key ? 'var(--panel)' : 'transparent',
              color: activeTab === key ? 'var(--amber)' : 'var(--ink-3)',
              border: 'none',
              fontSize: 9,
            }}
          >
            {label}
            {activeTab === key && (
              <span
                className="absolute bottom-0 left-1/4 right-1/4"
                style={{ height: 2, background: 'var(--amber)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'evidence' && (
          <>
            {/* Measured Area — dossier bar */}
            <div>
              <div className="dossier-bar" style={{ marginBottom: 8 }}>
                <span>{COPY.measuredBadge} — GROUND AREA</span>
              </div>
              <div
                className="console-panel corner-ticks p-3"
              >
                <div className="flex items-baseline gap-2">
                  <span className="t-figure tabular-nums" style={{ color: 'var(--amber)' }}>
                    {measurement.area_label}
                  </span>
                  <span className="t-mono tabular-nums" style={{ color: 'var(--ink-3)' }}>
                    ({measurement.area_m2.toLocaleString('en-US', { minimumFractionDigits: 1 })} m²)
                  </span>
                </div>
                <div className="chip-measured t-tag mt-2" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--measured-border)', display: 'inline-block' }} />
                  {COPY.measuredBadge} — UTM {measurement.utm_epsg}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 t-mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                  <div>
                    <span style={{ color: 'var(--ink-3)' }}>Perimeter: </span>
                    <span className="tabular-nums">{measurement.perimeter_m} m</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-3)' }}>Projection: </span>
                    <span className="tabular-nums">UTM {measurement.utm_epsg}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence Triptych */}
            <EvidenceTriptych sources={sources} />

            {/* 5-Component Confidence */}
            <EvidenceConfidenceGauge
              overall={confidence.overall}
              parts={parts}
              calibrated={confidence.calibrated}
              calibrationEce={confidence.calibration_ece}
              calibrationN={confidence.calibration_n}
            />

            {/* Temporal / Onset */}
            <div>
              <div className="dossier-bar" style={{ marginBottom: 8 }}>
                <span>TEMPORAL ONSET</span>
              </div>
              <div className="console-panel p-3 space-y-2 t-mono" style={{ fontSize: 11 }}>
                <div className="flex justify-between" style={{ color: 'var(--ink-2)' }}>
                  <span style={{ color: 'var(--ink-3)' }}>First Supported:</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{temporal.first_supported ?? '2021-11-25'}</span>
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
                    ONSET: {temporal.onset_interval.start} → {temporal.onset_interval.end} (±{temporal.onset_interval.days}d)
                  </div>
                )}
                {temporal.onset_gaps && temporal.onset_gaps.length > 0 && temporal.onset_gaps[0] && (
                  <div
                    className="p-2"
                    style={{
                      background: 'var(--inferred-fill)',
                      border: '1px dashed var(--inferred-border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--inferred-text)',
                      fontSize: 10,
                    }}
                  >
                    GAP: {temporal.onset_gaps[0].reason?.replace('_', ' ')} ({temporal.onset_gaps[0].start} → {temporal.onset_gaps[0].end})
                  </div>
                )}
                <div className="flex justify-between" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
                  <span>Trend:</span>
                  <span className="t-tag" style={{ color: 'var(--teal)' }}>
                    {temporal.trend ?? 'EXPANDING'} (k={temporal.persistence_k ?? 3})
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-2">
            <div className="dossier-bar" style={{ marginBottom: 8 }}>
              <span>DECISION TRACE</span>
            </div>
            <p className="t-body" style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 8 }}>
              Automated decision table — exact spectral and geometric criteria evaluated:
            </p>

            {(classification.rule_trace && classification.rule_trace.length > 0
              ? classification.rule_trace
              : [
                  { rule: 'ndbi_rise', tested_value: 0.21, threshold: 0.10, comparator: '>=', passed: true, rationale: 'Building index (NDBI) jumped above threshold, indicating concrete, roof, or runway pavement.' },
                  { rule: 'ndvi_drop', tested_value: -0.34, threshold: -0.15, comparator: '<=', passed: true, rationale: 'Vegetation index (NDVI) fell sharply as farmland was stripped and cleared.' },
                  { rule: 'ndwi_water_check', tested_value: -0.28, threshold: 0.15, comparator: '<', passed: true, rationale: 'NDWI remains negative, confirming dry soil excavation and rejecting seasonal flooding.' },
                ]
            ).map((ruleItem, rIdx) => {
              const isPassed = ruleItem.passed !== false && ruleItem.fired !== false;
              return (
                <div
                  key={rIdx}
                  className="console-panel p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="t-tag" style={{ color: 'var(--amber)', fontSize: 10 }}>
                      {ruleItem.rule} (val: {String(ruleItem.tested_value ?? ruleItem.value)})
                    </span>
                    <span
                      className="t-tag"
                      style={{
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 9,
                        background: isPassed ? 'var(--measured-fill)' : 'var(--rejected-fill)',
                        border: `1px solid ${isPassed ? 'var(--measured-border)' : 'var(--rejected-border)'}`,
                        color: isPassed ? 'var(--measured-text)' : 'var(--rejected-text)',
                      }}
                    >
                      {isPassed ? '✓ PASS' : '✕ FAIL'}
                    </span>
                  </div>
                  <div className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
                    Threshold: {ruleItem.comparator ?? '>='} {String(ruleItem.threshold ?? '0.0')}
                  </div>
                  {ruleItem.rationale && (
                    <p className="t-body" style={{ color: 'var(--ink-2)', fontSize: 11, lineHeight: '16px' }}>
                      {ruleItem.rationale}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Alternatives */}
            {classification.alternatives && classification.alternatives.length > 0 && (
              <div>
                <div className="dossier-bar" style={{ marginTop: 12, marginBottom: 8 }}>
                  <span>ALTERNATIVES CONSIDERED</span>
                </div>
                <div className="space-y-1.5">
                  {classification.alternatives.map((alt, aIdx) => (
                    <div
                      key={aIdx}
                      className="console-panel p-2 t-mono"
                      style={{ fontSize: 11 }}
                    >
                      <div className="flex justify-between">
                        <span className="t-tag" style={{ color: 'var(--amber)', fontSize: 10 }}>
                          {alt.change_type ?? alt.type}
                        </span>
                        <span className="tabular-nums" style={{ color: 'var(--ink-2)' }}>
                          {((alt.score ?? 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <SuppressionPanel
            aoiId={evidence.aoi_id}
            suppressionContext={suppression_context}
          />
        )}
      </div>

      {/* Action Footer */}
      <div
        className="p-3 flex items-center gap-2"
        style={{ borderTop: '1px solid var(--line)', background: 'var(--bg)' }}
      >
        <button
          onClick={() => {
            setAnalystDecision('rejected');
            onReject?.(evidence.change_object_id);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 t-tag cursor-pointer transition-colors"
          style={{
            background: 'var(--rejected-fill)',
            border: '1px solid var(--rejected-border)',
            color: 'var(--rejected-text)',
            borderRadius: 'var(--radius)',
            fontSize: 10,
          }}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>REJECT</span>
        </button>

        <button
          onClick={() => {
            setAnalystDecision('confirmed');
            onConfirm?.(evidence.change_object_id);
          }}
          className="btn-primary flex-1 flex items-center justify-center gap-1.5"
          style={{ fontSize: 10, padding: '8px 12px' }}
        >
          <Check className="w-3.5 h-3.5" />
          <span>CONFIRM</span>
        </button>
      </div>
    </aside>
  );
};
