import React, { useState } from 'react';
import { getYearDifference, MIN_TEMPORAL_GAP_YEARS } from '../lib/satelliteProviders';
import { BUTTON_COPY } from '../lib/copy';

interface TemporalBarProps {
  beforeDate: string;
  afterDate: string;
  onBeforeDateChange: (d: string) => void;
  onAfterDateChange: (d: string) => void;
  onSwapDates: () => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
}

const formatDateLabel = (d: string) => {
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  } catch {
    return d;
  }
};

/**
 * SLOT-02 — Stitch Temporal Analysis Command Deck
 * Design System: Deterministic Geo-Intelligence
 */
export const TemporalBar: React.FC<TemporalBarProps> = React.memo(({
  beforeDate,
  afterDate,
  onBeforeDateChange,
  onAfterDateChange,
  onSwapDates,
  onRunAnalysis,
  isAnalyzing,
}) => {
  const gapYears = getYearDifference(beforeDate, afterDate);
  const [compareBy, setCompareBy] = useState<'Date' | 'Year' | 'Pass'>('Date');

  const maxAllowedBefore = React.useMemo(() => {
    try {
      const a = new Date(afterDate).getTime();
      return new Date(a - MIN_TEMPORAL_GAP_YEARS * 365.25 * 86400000).toISOString().slice(0, 10);
    } catch {
      return '2024-12-31';
    }
  }, [afterDate]);

  const minAllowedAfter = React.useMemo(() => {
    try {
      const b = new Date(beforeDate).getTime();
      return new Date(b + MIN_TEMPORAL_GAP_YEARS * 365.25 * 86400000).toISOString().slice(0, 10);
    } catch {
      return '2023-01-01';
    }
  }, [beforeDate]);

  return (
    <div
      id="slot-02-temporal"
      className="h-12 w-full bg-surface-container-low/95 backdrop-blur-md px-space-md flex items-center justify-between border-b border-outline-variant/30 z-20 select-none overflow-x-auto"
    >
      <div className="flex items-center gap-space-md">
        {/* Temporal Analysis Live Capsule */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container border border-outline-variant/30 shrink-0">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-label-sm text-label-sm font-semibold tracking-wider text-primary uppercase">
            TEMPORAL ANALYSIS
          </span>
        </div>

        {/* Dual Epoch Comparison Capsule */}
        <div className="flex items-center bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-0.5 shadow-sm shrink-0">
          {/* Baseline Epoch */}
          <div className="relative flex items-center gap-2 px-2.5 py-1 rounded hover:bg-surface-container cursor-pointer transition-colors group">
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="font-label-sm text-[10px] text-amber-300 font-semibold uppercase">
                  A · BASELINE
                </span>
                <span className="font-code-num text-body-sm font-semibold text-on-surface">
                  {formatDateLabel(beforeDate)}
                </span>
              </div>
              <span className="font-label-sm text-[9px] text-outline font-code-num">
                Sentinel-2 L2A · 10m · 0.8% Cloud
              </span>
            </div>
            <span className="material-symbols-outlined text-[14px] text-outline group-hover:text-on-surface">
              calendar_today
            </span>
            <input
              type="date"
              value={beforeDate}
              min="2018-01-01"
              max={maxAllowedBefore}
              onChange={(e) => onBeforeDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Change baseline date"
            />
          </div>

          {/* Swap Button & Delta Readout */}
          <button
            type="button"
            onClick={onSwapDates}
            className="flex items-center gap-1 px-2 py-1 bg-surface-container-high hover:bg-surface-bright rounded text-outline hover:text-primary transition-colors border border-outline-variant/20 mx-0.5 cursor-pointer"
            title="Swap Comparison Epochs"
          >
            <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
            <span className="font-label-sm text-[9px] font-code-num text-on-surface-variant font-medium whitespace-nowrap">
              {gapYears > 0 ? `${gapYears.toFixed(1)} YRS` : 'SWAP'}
            </span>
          </button>

          {/* Current Epoch */}
          <div className="relative flex items-center gap-2 px-2.5 py-1 rounded hover:bg-surface-container cursor-pointer transition-colors group">
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="font-label-sm text-[10px] text-primary font-semibold uppercase">
                  B · CURRENT
                </span>
                <span className="font-code-num text-body-sm font-semibold text-on-surface">
                  {formatDateLabel(afterDate)}
                </span>
              </div>
              <span className="font-label-sm text-[9px] text-outline font-code-num">
                SkySat + S2 · 0.5m · 1.2% Cloud
              </span>
            </div>
            <span className="material-symbols-outlined text-[14px] text-outline group-hover:text-on-surface">
              calendar_today
            </span>
            <input
              type="date"
              value={afterDate}
              min={minAllowedAfter}
              max="2026-12-31"
              onChange={(e) => onAfterDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Change current observation date"
            />
          </div>
        </div>

        {/* Compare By Pill Group */}
        <div className="hidden xl:flex items-center bg-surface-container rounded p-0.5 border border-outline-variant/20 shrink-0">
          <span className="font-label-sm text-[10px] text-outline px-1.5 uppercase font-medium">
            COMPARE BY:
          </span>
          {(['Date', 'Year', 'Pass'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setCompareBy(mode)}
              className={`px-2 py-0.5 rounded font-label-sm text-[11px] transition-colors cursor-pointer ${
                compareBy === mode
                  ? 'bg-surface-container-high text-on-surface font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-outline-variant/40 mx-0.5 hidden xl:block" />

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-space-xs shrink-0">
          <button
            type="button"
            id="detect-changes"
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
            className="h-7 px-3 rounded bg-primary-container text-on-primary-container font-headline-md text-body-sm font-semibold hover:bg-primary transition-colors flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
            title="Execute bi-temporal classical CVA change detection pipeline"
          >
            <span className="material-symbols-outlined text-[15px]">
              {isAnalyzing ? 'sync' : 'auto_awesome'}
            </span>
            {isAnalyzing ? BUTTON_COPY.detecting : 'Detect Changes'}
          </button>

          <button
            type="button"
            onClick={onSwapDates}
            className="h-7 px-2.5 rounded bg-transparent border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-headline-md text-body-sm flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">splitscreen_left</span>
            Dual-View
          </button>
        </div>
      </div>

      {/* Right Telemetry Readouts */}
      <div className="hidden lg:flex items-center gap-space-md shrink-0">
        <div className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded border border-outline-variant/30 text-outline font-label-sm text-[11px]">
          <span className="material-symbols-outlined text-[14px] text-secondary">satellite_alt</span>
          <span className="font-code-num text-on-surface">
            <strong className="text-on-surface font-semibold">184</strong> Usable /{' '}
            <span className="text-outline">21 Cloudy</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded border border-outline-variant/30">
          <span className="material-symbols-outlined text-tertiary text-[14px]">verified</span>
          <span className="font-code-num text-label-sm text-[11px] text-on-surface-variant">
            Cloud Gate: <strong className="text-tertiary font-semibold">96% Clear</strong>
          </span>
        </div>
      </div>
    </div>
  );
});
