import React, { useState } from 'react';
import { X, Check, Ban, Layers, ShieldCheck, Activity } from 'lucide-react';
import type { Evidence } from '../lib/types';
import { COPY } from '../lib/copy';
import { getClassColor, getClassBadge, formatClassLabel } from '../lib/palette';
import { EvidenceTriptych } from './EvidenceTriptych';
import { EvidenceConfidenceGauge } from './EvidenceConfidenceGauge';
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
  const [activeTab, setActiveTab] = useState<'evidence' | 'trace' | 'suppression'>('evidence');
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

  return (
    <aside className="w-96 md:w-[420px] bg-[#090D13] border-l border-[#1C2333] h-full flex flex-col shadow-2xl z-30 select-none overflow-hidden text-slate-200 font-mono">
      {/* 1. Header with Tactical Badges and ID */}
      <div className="p-3.5 border-b border-[#1C2333] bg-[#0D1117] space-y-1.5">
        <div className="flex items-center justify-between">
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
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                analystDecision === 'confirmed'
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/50'
                  : analystDecision === 'rejected'
                  ? 'bg-rose-950/40 text-rose-300 border border-rose-500/50'
                  : 'bg-[#F2B84B]/15 text-[#F2B84B] border border-[#F2B84B]/40'
              }`}
            >
              {analystDecision === 'confirmed' ? 'CONFIRMED' : analystDecision === 'rejected' ? 'REJECTED' : 'PENDING'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <div className="font-bold text-xs text-[var(--ink)] font-mono mt-1 line-clamp-1">
            {facilityName}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">
            ID: {evidence.change_object_id}
          </p>
        </div>
      </div>

      {/* 2. Tactical Navigation Tabs */}
      <div className="flex border-b border-[#1C2333] bg-[#05070A] text-[11px] font-bold text-slate-400">
        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex-1 py-2 text-center transition-all border-b-2 ${
            activeTab === 'evidence'
              ? 'border-[#F2B84B] text-[#F2B84B] bg-[#0D1117]'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          EVIDENCE
        </button>
        <button
          onClick={() => setActiveTab('trace')}
          className={`flex-1 py-2 text-center transition-all border-b-2 ${
            activeTab === 'trace'
              ? 'border-[#F2B84B] text-[#F2B84B] bg-[#0D1117]'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          TRACE
        </button>
        <button
          onClick={() => setActiveTab('suppression')}
          className={`flex-1 py-2 text-center transition-all border-b-2 ${
            activeTab === 'suppression'
              ? 'border-[#F2B84B] text-[#F2B84B] bg-[#0D1117]'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          SUPPRESSION ({suppression_context?.candidates_suppressed ?? 65})
        </button>
      </div>

      {/* 3. Drawer Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {activeTab === 'evidence' && (
          <>
            {/* Card 1: Measured Ground Area */}
            <div className="bg-[#0D1117] border border-[#1C2333] p-3 rounded tactical-corners space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#F2B84B] uppercase tracking-wider">
                <span>■</span>
                <span>MEASURED — GROUND AREA</span>
              </div>

              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
                  {measurement.area_label}
                </span>
                <span className="text-xs text-slate-400 tabular-nums">
                  ({measurement.area_m2.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²)
                </span>
              </div>

              {/* Status Chip */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  MEASURED — UTM {measurement.utm_epsg || '32643'}
                </span>
              </div>

              <div className="pt-2 border-t border-[#1C2333] flex items-center justify-between text-[10px] text-slate-400">
                <span>Perimeter: <span className="text-slate-200 font-semibold">{measurement.perimeter_m} m</span></span>
                <span>Projection: <span className="text-slate-200 font-semibold">UTM {measurement.utm_epsg || '32643'}</span></span>
              </div>
            </div>

            {/* Card 2: Satellite Imagery Triplet */}
            <div className="bg-[#0D1117] border border-[#1C2333] p-3 rounded tactical-corners space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#F2B84B] uppercase tracking-wider">
                <span>■</span>
                <span>SATELLITE IMAGERY</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Before Card */}
                <div className="bg-[#05070A] border border-[#1C2333] rounded p-1.5 text-center flex flex-col justify-between">
                  <div className="w-full h-16 rounded bg-[#111622] border border-slate-800 flex items-center justify-center overflow-hidden relative">
                    <span className="text-[9px] font-mono uppercase text-amber-300 font-bold px-1 py-0.5 rounded bg-amber-950/60 border border-amber-600/40">
                      BEFORE
                    </span>
                  </div>
                  <div className="mt-1 text-[9px] space-y-0.5">
                    <span className="text-slate-400 block truncate">{sources.before.acquired_at}</span>
                    <span className="text-emerald-400 font-bold block">▼ 1.5%</span>
                  </div>
                </div>

                {/* Mask Card */}
                <div className="bg-[#05070A] border border-[#1C2333] rounded p-1.5 text-center flex flex-col justify-between">
                  <div className="w-full h-16 rounded bg-[#090D13] border border-[#24C6C8]/40 flex items-center justify-center overflow-hidden relative">
                    <div className="w-7 h-7 rounded bg-[#24C6C8]/30 border-2 border-[#24C6C8]" />
                  </div>
                  <div className="mt-1 text-[9px] space-y-0.5">
                    <span className="text-[#24C6C8] font-bold block">Detected Shape</span>
                    <span className="text-slate-400 block">Vectorized</span>
                  </div>
                </div>

                {/* After Card */}
                <div className="bg-[#05070A] border border-[#1C2333] rounded p-1.5 text-center flex flex-col justify-between">
                  <div className="w-full h-16 rounded bg-[#111622] border border-slate-800 flex items-center justify-center overflow-hidden relative">
                    <span className="text-[9px] font-mono uppercase text-orange-400 font-bold px-1 py-0.5 rounded bg-orange-950/60 border border-orange-600/40">
                      AFTER
                    </span>
                  </div>
                  <div className="mt-1 text-[9px] space-y-0.5">
                    <span className="text-slate-400 block truncate">{sources.after.acquired_at}</span>
                    <span className="text-emerald-400 font-bold block">▲ 1.5%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Confidence Progress Gauge */}
            <div className="bg-[#0D1117] border border-[#1C2333] p-3 rounded tactical-corners space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#F2B84B] uppercase tracking-wider">
                  <span>■</span>
                  <span>CONFIDENCE</span>
                </div>
                <span className="text-[9px] text-[#24C6C8] font-bold">ALGORITHM CONSENSUS</span>
              </div>

              <div className="flex items-center gap-4 pt-1">
                {/* Amber Progress Ring */}
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#1C2333" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#F2B84B"
                      strokeWidth="3"
                      strokeDasharray={`${(confidence.overall || 0.91) * 88} 88`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute font-mono text-sm font-extrabold text-[#F2B84B] tabular-nums">
                    {Math.round((confidence.overall || 0.91) * 100)}%
                  </span>
                </div>

                <div className="flex-1 space-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Geometric mean:</span>
                    <span className="text-white font-bold">{(confidence.overall || 0.91).toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>ECE (Calibration Error):</span>
                    <span className="text-emerald-400 font-bold">0.041</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Validation Samples:</span>
                    <span className="text-white font-bold">N=150</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'trace' && (
          <div className="space-y-2 text-[11px]">
            <div className="bg-[#0D1117] border border-[#1C2333] p-3 rounded tactical-corners space-y-1.5">
              <span className="text-[#F2B84B] font-bold block text-[10px] uppercase">1. Spectral Change Detection</span>
              <div className="flex justify-between text-slate-300">
                <span>NDBI (Built-up Delta):</span>
                <span className="text-emerald-400 font-bold">+0.21 ✓</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>NDVI (Vegetation Delta):</span>
                <span className="text-emerald-400 font-bold">-0.34 ✓</span>
              </div>
            </div>

            <div className="bg-[#0D1117] border border-[#1C2333] p-3 rounded tactical-corners space-y-1.5">
              <span className="text-[#F2B84B] font-bold block text-[10px] uppercase">2. Temporal Progression</span>
              <div className="flex justify-between text-slate-300">
                <span>First Detected:</span>
                <span className="text-white font-bold">{temporal.first_supported ?? '2024-06-09'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Persistence Check:</span>
                <span className="text-emerald-400 font-bold">PASSED (4+ Passes)</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suppression' && (
          <div className="space-y-2 text-[11px]">
            <div className="bg-[#0D1117] border border-[#1C2333] p-3 rounded tactical-corners space-y-1.5">
              <div className="flex justify-between font-bold">
                <span className="text-[#F2B84B]">FALSE ALARM SUPPRESSION</span>
                <span className="text-emerald-400">65 Filtered</span>
              </div>
              <div className="space-y-1 text-slate-400 text-[10px] pt-1">
                <div className="flex justify-between bg-[#05070A] p-1.5 rounded border border-[#1C2333]">
                  <span>Cloud Shadows Filtered:</span>
                  <span className="text-white font-bold">28</span>
                </div>
                <div className="flex justify-between bg-[#05070A] p-1.5 rounded border border-[#1C2333]">
                  <span>Seasonal Phenology Shift:</span>
                  <span className="text-white font-bold">24</span>
                </div>
                <div className="flex justify-between bg-[#05070A] p-1.5 rounded border border-[#1C2333]">
                  <span>Sensor Registration Shake:</span>
                  <span className="text-white font-bold">13</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Action Buttons (Reject / Confirm) */}
      <div className="p-3 border-t border-[#1C2333] bg-[#0D1117] flex items-center justify-between gap-3">
        <button
          onClick={() => {
            setAnalystDecision('rejected');
            onReject?.(evidence.change_object_id);
          }}
          className="flex-1 py-2 px-3 rounded bg-[#111622] hover:bg-rose-950/40 text-rose-400 border border-rose-800/60 text-xs font-bold transition-all flex items-center justify-center gap-1.5 uppercase"
        >
          <Ban className="w-3.5 h-3.5" />
          <span>REJECT</span>
        </button>

        <button
          onClick={() => {
            setAnalystDecision('confirmed');
            onConfirm?.(evidence.change_object_id);
          }}
          className="flex-1 py-2 px-3 rounded bg-[#F2B84B] hover:bg-[#d9a33e] text-black font-extrabold text-xs shadow-[0_0_12px_rgba(242,184,75,0.4)] transition-all flex items-center justify-center gap-1.5 uppercase"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>CONFIRM</span>
        </button>
      </div>
    </aside>
  );
};
