import React from 'react';
import { Sparkles, ArrowLeftRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { getYearDifference, MIN_TEMPORAL_GAP_YEARS } from '../lib/satelliteProviders';
import { BUTTON_COPY } from '../lib/copy';
import { Button } from './ui/Button';

interface TemporalBarProps {
  beforeDate: string;
  afterDate: string;
  onBeforeDateChange: (d: string) => void;
  onAfterDateChange: (d: string) => void;
  onSwapDates: () => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  isDualView?: boolean;
  onToggleDualView?: () => void;
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
 * Compact, flex-tight layout guaranteed to fit viewports without horizontal overflow or clipping.
 */
export const TemporalBar: React.FC<TemporalBarProps> = React.memo(({
  beforeDate,
  afterDate,
  onBeforeDateChange,
  onAfterDateChange,
  onSwapDates,
  onRunAnalysis,
  isAnalyzing,
  isDualView = true,
  onToggleDualView,
}) => {
  const gapYears = getYearDifference(beforeDate, afterDate);
  const isGapValid = gapYears >= MIN_TEMPORAL_GAP_YEARS;

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
      className="w-full h-full bg-surface-container-low border-b border-outline-variant/30 px-space-md flex items-center justify-between select-none overflow-hidden"
      style={{
        zIndex: 25,
      }}
    >
      {/* LEFT SECTION: Baseline & Current Observation Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Module Badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded text-outline font-label-sm text-[10px] tracking-wider uppercase border border-outline-variant/20">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span>TEMPORAL</span>
        </div>

        {/* Epoch A Capsule (Baseline) */}
        <div className="flex items-center gap-1.5 bg-surface-container-high px-2 py-1 rounded-md border border-outline-variant/40 hover:border-amber-500/50 transition-colors relative group cursor-pointer">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <div className="flex flex-col text-left leading-none">
            <span className="font-label-sm text-[8px] uppercase tracking-wider text-amber-300 font-semibold">
              T₀ BASELINE
            </span>
            <span className="font-code-num text-[11px] font-bold text-on-surface">
              {formatDateLabel(beforeDate)}
            </span>
          </div>

          {/* Quick Year Pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBeforeDateChange('2021-01-15');
            }}
            className="hidden md:inline-block font-code-num text-[9px] px-1 py-0.2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30 hover:bg-amber-400/20"
            title="Set to 2021 Farmland Baseline"
          >
            2021
          </button>

          <input
            type="date"
            value={beforeDate}
            min="2018-01-01"
            max={maxAllowedBefore}
            onChange={(e) => onBeforeDateChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="Click to select baseline date"
          />
        </div>

        {/* Swap & Delta Indicator */}
        <div className="flex items-center gap-1">
          <Button
            id="swap-dates"
            variant="secondary"
            size="sm"
            shortcut="S"
            icon={<ArrowLeftRight className="w-3.5 h-3.5 text-primary" />}
            onClick={onSwapDates}
            title="Swap Before and After dates (Shortcut: S)"
            className="h-7 px-2"
          >
            <span className="hidden xl:inline">{BUTTON_COPY.swap}</span>
          </Button>

          {/* 2-Year Gap Badge */}
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-code-num ${
              isGapValid
                ? 'bg-surface-container border-outline-variant/30 text-tertiary'
                : 'bg-error/10 border-error/40 text-error'
            }`}
            title={`Temporal gap: ${gapYears.toFixed(2)} years. Minimum: ${MIN_TEMPORAL_GAP_YEARS} years.`}
          >
            {isGapValid ? (
              <CheckCircle2 className="w-3 h-3 text-tertiary shrink-0" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-error shrink-0" />
            )}
            <span className="font-semibold whitespace-nowrap">Δ {gapYears.toFixed(1)}Y</span>
          </div>
        </div>

        {/* Epoch B Capsule (Observation) */}
        <div className="flex items-center gap-1.5 bg-surface-container-high px-2 py-1 rounded-md border border-outline-variant/40 hover:border-primary/50 transition-colors relative group cursor-pointer">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <div className="flex flex-col text-left leading-none">
            <span className="font-label-sm text-[8px] uppercase tracking-wider text-primary font-semibold">
              T₁ CURRENT
            </span>
            <span className="font-code-num text-[11px] font-bold text-on-surface">
              {formatDateLabel(afterDate)}
            </span>
          </div>

          {/* Quick Year Pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAfterDateChange('2026-08-03');
            }}
            className="hidden md:inline-block font-code-num text-[9px] px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
            title="Set to 2026 Current Airport"
          >
            2026
          </button>

          <input
            type="date"
            value={afterDate}
            min={minAllowedAfter}
            max="2026-12-31"
            onChange={(e) => onAfterDateChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="Click to select observation date"
          />
        </div>
      </div>

      {/* RIGHT SECTION: Mode Switcher & Primary Action (Guaranteed to be fully visible) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Dual-View / Single Toggle */}
        {onToggleDualView && (
          <button
            type="button"
            onClick={onToggleDualView}
            className={`h-7 px-2.5 rounded border text-label-sm font-label-sm flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDualView
                ? 'bg-surface-container-high border-primary/40 text-primary font-semibold'
                : 'bg-transparent border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
            }`}
            title="Toggle between Dual-Layer Swipe and Single View"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isDualView ? 'Dual Swipe' : 'Single'}</span>
          </button>
        )}

        {/* PRIMARY CTA: Detect Changes — ALWAYS visible with no overflow */}
        <Button
          id="detect-changes"
          variant="primary"
          size="md"
          shortcut="D"
          loading={isAnalyzing}
          loadingText={BUTTON_COPY.detecting}
          onClick={onRunAnalysis}
          icon={<Sparkles className="w-4 h-4" />}
          title="Execute bi-temporal classical CVA change detection pipeline (Shortcut: D)"
          className="shadow-sm font-bold tracking-wider whitespace-nowrap h-7 px-3 text-[11px]"
        >
          {BUTTON_COPY.detect}
        </Button>

        {/* Quality Gate Telemetry Badge */}
        <div className="hidden lg:flex items-center gap-1 bg-surface-container px-2 py-1 rounded border border-outline-variant/30 text-outline font-label-sm text-[10px]">
          <span className="material-symbols-outlined text-tertiary text-[13px]">verified</span>
          <span className="font-code-num text-on-surface">
            <strong className="text-tertiary font-semibold">96%</strong> Clear
          </span>
        </div>
      </div>
    </div>
  );
});
