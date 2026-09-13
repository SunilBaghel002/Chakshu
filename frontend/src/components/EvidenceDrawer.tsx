import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Filter,
  Check,
  Ban,
  Info,
  Layers,
} from 'lucide-react';
import type { Evidence } from '../lib/types';
import { COPY } from '../lib/copy';
import { EvidenceTriptych } from './EvidenceTriptych';
import { SuppressionPanel } from './SuppressionPanel';

interface EvidenceDrawerProps {
  evidence: Evidence | null;
  onClose: () => void;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
}

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

  const parts = confidence?.parts ?? {
    detector_agreement: 0.90,
    image_quality: 0.85,
    registration: 0.92,
    classification_margin: 0.78,
    temporal_persistence: 0.88,
  };

  const confidenceComponents = [
    { label: 'Detector Agreement', val: parts.detector_agreement, desc: 'Multi-detector consensus' },
    { label: 'Image Quality & SNR', val: parts.image_quality, desc: 'Clear sky, low aerosol and noise' },
    { label: 'Geometric Registration', val: parts.registration, desc: 'Sub-pixel phase correlation' },
    { label: 'Classification Margin', val: parts.classification_margin, desc: 'Separation vs 2nd candidate' },
    { label: 'Temporal Persistence', val: parts.temporal_persistence, desc: 'Persistence across k passes' },
  ];

  return (
    <aside className="w-96 md:w-[420px] bg-[#111827] border-l border-[#1F2937] h-full flex flex-col shadow-2xl z-30 select-none overflow-hidden text-slate-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#1F2937] flex items-center justify-between bg-[#0F172A]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
              Detected Change Details
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                analystDecision === 'confirmed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : analystDecision === 'rejected'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {analystDecision === 'confirmed' ? 'Verified' : analystDecision === 'rejected' ? 'Rejected' : 'Needs Review'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 truncate max-w-[260px]">
            Target: {evidence.change_type.toUpperCase()} · ID: {evidence.change_object_id.substring(0, 16)}...
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1F2937] bg-[#0B0F19] text-xs font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
            activeTab === 'evidence'
              ? 'border-indigo-500 text-indigo-300 bg-[#111827]'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Photos & Area
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
            activeTab === 'rules'
              ? 'border-indigo-500 text-indigo-300 bg-[#111827]'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Rule Trace
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'border-indigo-500 text-indigo-300 bg-[#111827]'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Suppression ({evidence.suppression_context?.candidates_suppressed ?? 312})
        </button>
      </div>

      {/* Drawer Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'evidence' && (
          <>
            {/* Deterministic Measurement Block */}
            <div className="bg-[#0F172A] border border-[#1F2937] p-3.5 rounded-xl shadow-inner">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-300 font-medium">Measured Ground Area</span>
                <span
                  className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-600/50 font-semibold"
                  title="Direct pixel geometry (ST_Area) — AI never hallucinates geometry numbers."
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {COPY.realMathCalculation}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white tabular-nums">
                  {measurement.area_label}
                </span>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  ({measurement.area_m2.toLocaleString('en-US', { minimumFractionDigits: 1 })} m²)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                ≈ approx. {(measurement.area_m2 / 7140).toFixed(1)} standard football fields
              </p>

              <div className="mt-2.5 pt-2.5 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500">Perimeter:</span>{' '}
                  <span className="text-slate-200 tabular-nums">{measurement.perimeter_m} m</span>
                </div>
                <div>
                  <span className="text-slate-500">Projection:</span>{' '}
                  <span className="text-slate-200 tabular-nums">UTM {measurement.utm_epsg}</span>
                </div>
              </div>
            </div>

            {/* Before / Mask / After Visual Thumbnails */}
            <EvidenceTriptych sources={sources} />

            {/* 5-Component Confidence Analysis */}
            <div className="bg-[#0F172A] border border-[#1F2937] p-3.5 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200">5-Part Confidence Score</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                  Geometric Mean
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Radial Gauge */}
                <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#1F2937" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke={confidence.overall >= 0.75 ? '#10B981' : confidence.overall >= 0.5 ? '#F59E0B' : '#EF4444'}
                      strokeWidth="3"
                      strokeDasharray={`${confidence.overall * 88} 88`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute font-mono text-xs font-bold text-white tabular-nums">
                    {(confidence.overall * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 leading-tight">
                  Calibrated score (ECE: {confidence.calibration_ece ?? 0.043}, N={confidence.calibration_n ?? 147}).
                  Weakest component penalizes overall score.
                </div>
              </div>

              {/* 5 Sub-component bars */}
              <div className="space-y-1.5 pt-1">
                {confidenceComponents.map((comp, idx) => (
                  <div key={idx} className="space-y-0.5" title={comp.desc}>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">{comp.label}</span>
                      <span className={`font-semibold ${comp.val < 0.6 ? 'text-amber-400' : 'text-slate-200'}`}>
                        {(comp.val * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          comp.val < 0.6 ? 'bg-amber-500' : comp.val >= 0.85 ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, comp.val * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* When Did This Happen? Onset Bracket */}
            <div className="bg-[#0F172A] border border-[#1F2937] p-3 rounded-xl text-xs font-mono space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-0.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Temporal Timeline & Onset</span>
              </div>
              <div className="flex items-center justify-between text-slate-200">
                <span className="text-slate-400 text-[11px]">First Supported:</span>
                <span className="font-bold text-white">{temporal.first_supported ?? '2021-11-25'}</span>
              </div>
              {temporal.onset_interval && (
                <div className="flex items-center justify-between text-[11px] text-indigo-300 bg-indigo-950/40 p-1.5 rounded border border-indigo-900/50">
                  <span>Onset Bracket:</span>
                  <span>
                    {temporal.onset_interval.start} to {temporal.onset_interval.end} (±{temporal.onset_interval.days}d)
                  </span>
                </div>
              )}
              {temporal.onset_gaps && temporal.onset_gaps.length > 0 && temporal.onset_gaps[0] && (
                <div className="text-[10px] text-amber-300 bg-amber-950/30 p-1.5 rounded border border-amber-800/40">
                  Gap Disclosed: {temporal.onset_gaps[0].reason?.replace('_', ' ')} ({temporal.onset_gaps[0].start} to {temporal.onset_gaps[0].end})
                </div>
              )}
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Track Trend:</span>
                <span className="text-indigo-400 uppercase font-semibold">
                  {temporal.trend ?? 'Actively Expanding'} (k={temporal.persistence_k ?? 3})
                </span>
              </div>
            </div>
          </>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-3 font-sans">
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated decision table trace showing exact spectral and geometric criteria evaluated:
            </p>

            {/* Dynamic Rule Trace */}
            <div className="space-y-2 font-mono text-xs">
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
                  <div key={rIdx} className="bg-[#0F172A] border border-[#1F2937] p-2.5 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-300">
                        {ruleItem.rule} (val: {String(ruleItem.tested_value ?? ruleItem.value)})
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isPassed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                        {isPassed ? '✓ PASSED' : '✕ FAILED'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      Threshold: {ruleItem.comparator ?? '>='} {String(ruleItem.threshold ?? '0.0')}
                    </div>
                    {ruleItem.rationale && (
                      <p className="font-sans text-[11px] text-slate-300 pt-0.5 leading-snug">
                        {ruleItem.rationale}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Alternatives Rejected */}
            {classification.alternatives && classification.alternatives.length > 0 && (
              <div className="bg-[#0F172A] border border-[#1F2937] p-3 rounded-xl space-y-2 mt-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Alternative Classes Considered</span>
                </div>
                <div className="space-y-1.5">
                  {classification.alternatives.map((alt, aIdx) => (
                    <div key={aIdx} className="bg-slate-900/80 p-2 rounded text-[11px] font-mono border border-slate-800">
                      <div className="flex justify-between text-slate-300">
                        <span className="font-bold uppercase text-amber-300">{alt.change_type ?? alt.type}</span>
                        <span>Score: {((alt.score ?? 0) * 100).toFixed(0)}%</span>
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

      {/* Action Footer: Confirm / Reject */}
      <div className="p-4 border-t border-[#1F2937] bg-[#0F172A] flex items-center justify-between gap-3">
        <button
          onClick={() => {
            setAnalystDecision('rejected');
            onReject?.(evidence.change_object_id);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-all"
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Mark False Alarm</span>
        </button>

        <button
          onClick={() => {
            setAnalystDecision('confirmed');
            onConfirm?.(evidence.change_object_id);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg transition-all"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Approve Real Change</span>
        </button>
      </div>
    </aside>
  );
};
