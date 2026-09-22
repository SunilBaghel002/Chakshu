import React from 'react';
import { ArrowLeftRight, CheckCircle2, AlertTriangle, Calendar, Radio, Sparkles } from 'lucide-react';
import { getYearDifference, MIN_TEMPORAL_GAP_YEARS } from '../lib/satelliteProviders';
import { Button } from './ui/Button';
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

const BEFORE_CHIPS = ['2021-01-15', '2022-05-20', '2023-08-10'];
const AFTER_CHIPS = ['2024-04-12', '2025-03-18', '2026-08-18'];
const PRESETS = [
  { label: '5-YR FULL (5.6Y)', b: '2021-01-15', a: '2026-08-18' },
  { label: 'EARTHWORKS (2.6Y)', b: '2021-01-15', a: '2023-08-10' },
  { label: 'RUNWAY (3.0Y)', b: '2023-08-10', a: '2026-08-18' },
];

/**
 * SLOT-02 — Temporal Command Deck
 * Arranged into 4 distinct tactical bays:
 * Bay 1: T₀ Baseline Selector & Year Quick-Chips
 * Bay 2: Operations Center (Detect Changes + Swap + Delta Telemetry)
 * Bay 3: Mission Profiles / Presets
 * Bay 4: T₁ Observation Selector & Year Quick-Chips
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
  const isGapValid = gapYears >= MIN_TEMPORAL_GAP_YEARS;

  // Compute dynamic max allowed beforeDate and min allowed afterDate for native picker
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
      className="w-full flex items-center justify-between px-3 gap-2 select-none overflow-x-auto"
      style={{
        height: 52,
        background: 'linear-gradient(180deg, var(--panel) 0%, rgba(14, 22, 38, 0.98) 100%)',
        borderBottom: '1px solid var(--line)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 20,
      }}
    >
      {/* BAY 1: T₀ BASELINE SELECTOR */}
      <div
        className="flex items-center gap-2 px-2.5 py-1 shrink-0 transition-colors"
        style={{
          background: 'var(--panel-2)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
          height: 38,
        }}
      >
        <div className="flex items-center gap-1.5 pr-1 border-r border-[var(--line)]">
          <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--signal)' }} />
          <span className="t-tag font-bold tracking-wider" style={{ color: 'var(--signal)', fontSize: 9 }}>
            T₀ BASELINE
          </span>
        </div>

        <input
          type="date"
          value={beforeDate}
          min="2018-01-01"
          max={maxAllowedBefore}
          onChange={(e) => onBeforeDateChange(e.target.value)}
          className="t-mono tabular-nums px-2 py-0.5 cursor-pointer focus:outline-none rounded"
          style={{
            background: 'var(--well)',
            border: '1px solid var(--line-strong)',
            color: 'var(--signal)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
          title={`Baseline date (Historical Wayback archive). Max selectable: ${maxAllowedBefore}`}
        />

        <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-[var(--line)]">
          {BEFORE_CHIPS.map((d) => {
            const yr = d.split('-')[0];
            const isChipActive = beforeDate === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onBeforeDateChange(d)}
                className="t-mono px-1.5 py-0.5 cursor-pointer transition-all duration-150 rounded"
                style={{
                  background: isChipActive ? 'var(--signal-wash)' : 'var(--panel)',
                  color: isChipActive ? 'var(--signal)' : 'var(--ink-3)',
                  border: isChipActive ? '1px solid var(--signal)' : '1px solid var(--line)',
                  fontSize: 10,
                  fontWeight: isChipActive ? 700 : 500,
                  boxShadow: isChipActive ? '0 0 6px rgba(255, 148, 38, 0.25)' : 'none',
                }}
                title={`Select ${d} as baseline date`}
              >
                {yr}
              </button>
            );
          })}
        </div>
      </div>

      {/* BAY 2: OPERATIONS CENTER (DETECT + SWAP + DELTA) */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          id="detect-changes"
          variant="primary"
          size="md"
          shortcut="D"
          loading={isAnalyzing}
          loadingText={BUTTON_COPY.detecting}
          onClick={onRunAnalysis}
          icon={<Sparkles className="w-4 h-4" />}
          title="Execute bi-temporal classical CVA change detection pipeline"
          className="shadow-sm font-bold tracking-wider"
          style={{
            height: 38,
            boxShadow: isAnalyzing ? 'none' : '0 0 12px rgba(255, 148, 38, 0.35)',
          }}
        >
          {BUTTON_COPY.detect}
        </Button>

        <Button
          id="swap-dates"
          variant="secondary"
          size="md"
          shortcut="S"
          icon={<ArrowLeftRight className="w-3.5 h-3.5" style={{ color: 'var(--signal)' }} />}
          onClick={onSwapDates}
          title="Swap Before and After dates (Shortcut: S)"
          style={{ height: 38 }}
        >
          {BUTTON_COPY.swap}
        </Button>

        {/* 2-Year Minimum Gap Badge Pill */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1"
          style={{
            background: isGapValid ? 'var(--measured-fill)' : 'var(--rejected-fill)',
            border: isGapValid ? '1px solid var(--measured-border)' : '1px solid var(--rejected-border)',
            borderRadius: 'var(--radius)',
            height: 38,
          }}
          title={`Temporal difference: ${gapYears.toFixed(2)} years. Minimum required delta is ${MIN_TEMPORAL_GAP_YEARS} years.`}
        >
          {isGapValid ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />
          )}
          <div className="flex flex-col leading-none">
            <span className="t-mono font-bold text-[11px]" style={{ color: isGapValid ? 'var(--success)' : 'var(--danger)' }}>
              Δ {gapYears.toFixed(1)} YRS
            </span>
            <span className="t-tag text-[7.5px] mt-0.5 tracking-wider" style={{ color: isGapValid ? 'var(--measured-text)' : 'var(--rejected-text)' }}>
              {isGapValid ? 'BASELINE OK' : 'GAP < 2Y'}
            </span>
          </div>
        </div>
      </div>

      {/* BAY 3: MISSION PROFILES & PRESETS */}
      <div
        className="hidden xl:flex items-center gap-1.5 px-2 py-1 shrink-0"
        style={{
          background: 'var(--panel-2)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
          height: 38,
        }}
      >
        <span className="t-tag px-1" style={{ color: 'var(--ink-3)', fontSize: 8.5, letterSpacing: '0.1em' }}>
          PRESETS:
        </span>
        <div className="flex items-center gap-1">
          {PRESETS.map(({ label, b, a }) => {
            const isPresetActive = beforeDate === b && afterDate === a;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onBeforeDateChange(b);
                  onAfterDateChange(a);
                }}
                className="t-tag px-2 py-1 cursor-pointer transition-all duration-150 rounded"
                style={{
                  background: isPresetActive ? 'var(--panel-3)' : 'var(--panel)',
                  color: isPresetActive ? 'var(--ink)' : 'var(--ink-2)',
                  border: isPresetActive ? '1px solid var(--line-strong)' : '1px solid transparent',
                  fontSize: 8.5,
                  fontWeight: isPresetActive ? 700 : 500,
                  boxShadow: isPresetActive ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BAY 4: T₁ OBSERVATION SELECTOR */}
      <div
        className="flex items-center gap-2 px-2.5 py-1 shrink-0 transition-colors"
        style={{
          background: 'var(--panel-2)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
          height: 38,
        }}
      >
        <div className="flex items-center gap-1.5 pr-1 border-r border-[var(--line)]">
          <Radio className="w-3.5 h-3.5" style={{ color: 'var(--ion)' }} />
          <span className="t-tag font-bold tracking-wider" style={{ color: 'var(--ion)', fontSize: 9 }}>
            T₁ OBSERVATION
          </span>
        </div>

        <input
          type="date"
          value={afterDate}
          min={minAllowedAfter}
          max="2026-12-31"
          onChange={(e) => onAfterDateChange(e.target.value)}
          className="t-mono tabular-nums px-2 py-0.5 cursor-pointer focus:outline-none rounded"
          style={{
            background: 'var(--well)',
            border: '1px solid var(--line-strong)',
            color: 'var(--ion)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
          title={`Observation date (Google Satellite HD). Min selectable: ${minAllowedAfter}`}
        />

        <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-[var(--line)]">
          {AFTER_CHIPS.map((d) => {
            const yr = d.split('-')[0];
            const isChipActive = afterDate === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onAfterDateChange(d)}
                className="t-mono px-1.5 py-0.5 cursor-pointer transition-all duration-150 rounded"
                style={{
                  background: isChipActive ? 'var(--ion-wash)' : 'var(--panel)',
                  color: isChipActive ? 'var(--ion)' : 'var(--ink-3)',
                  border: isChipActive ? '1px solid var(--ion)' : '1px solid var(--line)',
                  fontSize: 10,
                  fontWeight: isChipActive ? 700 : 500,
                  boxShadow: isChipActive ? '0 0 6px rgba(63, 169, 245, 0.25)' : 'none',
                }}
                title={`Select ${d} as observation date`}
              >
                {yr}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

