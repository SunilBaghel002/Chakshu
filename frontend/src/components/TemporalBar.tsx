import React from 'react';
import { ArrowLeftRight, CheckCircle2, AlertTriangle } from 'lucide-react';
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
 * SLOT-02 — Temporal Bar
 * Date-A / Date-B selectors, year chips, DETECT CHANGES, SWAP, presets, and 2-Year Minimum Gap enforcement.
 */
export const TemporalBar: React.FC<TemporalBarProps> = ({
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

  const dateInputStyle = (color: string) => ({
    background: 'var(--panel-2)',
    border: '1px solid var(--line-strong)',
    color,
    borderRadius: 'var(--radius)',
    fontSize: 12,
    fontWeight: 600,
  });

  const chipStyle = (active: boolean, activeColor: string, activeBg: string) => ({
    background: active ? activeBg : 'var(--panel-2)',
    color: active ? activeColor : 'var(--ink-3)',
    border: active ? `1px solid ${activeColor}` : '1px solid transparent',
    borderRadius: 'var(--radius-sm)',
    fontSize: 9,
  });

  return (
    <div
      className="w-full flex items-center justify-between px-4 gap-3 select-none"
      style={{ height: 44, background: 'var(--panel)', borderBottom: '1px solid var(--line)', zIndex: 20 }}
    >
      {/* Left: Date A + year chips */}
      <div className="flex items-center gap-2">
        <span className="t-tag" style={{ color: 'var(--amber)' }}>DATE A:</span>
        <input
          type="date"
          value={beforeDate}
          min="2018-01-01"
          max={maxAllowedBefore}
          onChange={(e) => onBeforeDateChange(e.target.value)}
          className="t-mono tabular-nums px-2 py-1 cursor-pointer focus:outline-none"
          style={dateInputStyle('var(--amber)')}
          title={`Baseline date (Historical Wayback archive). Max selectable to preserve 2-year gap: ${maxAllowedBefore}`}
        />
        <div className="hidden sm:flex items-center gap-1">
          {BEFORE_CHIPS.map((d) => (
            <button
              key={d}
              onClick={() => onBeforeDateChange(d)}
              className="t-tag px-1.5 py-0.5 cursor-pointer transition-colors"
              style={chipStyle(beforeDate === d, 'var(--amber)', 'var(--amber-wash)')}
              title={`Select ${d} as baseline date`}
            >
              {d.split('-')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Center: DETECT CHANGES + SWAP + Gap Pill + Presets */}
      <div className="flex items-center gap-2">
        <Button
          id="detect-changes"
          variant="primary"
          size="md"
          shortcut="D"
          loading={isAnalyzing}
          loadingText={BUTTON_COPY.detecting}
          onClick={onRunAnalysis}
          title="Execute bi-temporal classical CVA detection pipeline"
        >
          {BUTTON_COPY.detect}
        </Button>

        <Button
          id="swap-dates"
          variant="secondary"
          size="md"
          shortcut="S"
          icon={<ArrowLeftRight className="w-3.5 h-3.5" style={{ color: 'var(--amber)' }} />}
          onClick={onSwapDates}
          title="Swap Before and After dates"
        >
          {BUTTON_COPY.swap}
        </Button>

        {/* 2-Year Minimum Gap Badge Pill */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2 py-1"
          style={{
            background: isGapValid ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.15)',
            border: isGapValid ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.6)',
            borderRadius: 'var(--radius)',
          }}
          title={`Temporal difference: ${gapYears.toFixed(2)} years. Minimum required delta is ${MIN_TEMPORAL_GAP_YEARS} years.`}
        >
          {isGapValid ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className="t-mono font-bold text-[10px]" style={{ color: isGapValid ? '#4ade80' : '#f87171' }}>
            Δ {gapYears.toFixed(1)} YRS
          </span>
          <span className="t-tag text-[8px]" style={{ color: isGapValid ? '#86efac' : '#fca5a5' }}>
            {isGapValid ? '≥ 2Y BASELINE OK' : 'GAP < 2Y'}
          </span>
        </div>

        {/* Presets */}
        <div className="hidden lg:flex items-center gap-1.5 pl-2" style={{ borderLeft: '1px solid var(--line)' }}>
          <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>PRESETS:</span>
          {PRESETS.map(({ label, b, a }) => (
            <button
              key={label}
              onClick={() => {
                onBeforeDateChange(b);
                onAfterDateChange(a);
              }}
              className="t-tag px-2 py-0.5 cursor-pointer transition-colors"
              style={{
                background: 'var(--panel-2)',
                color: 'var(--ink-3)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 9,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Date B + year chips */}
      <div className="flex items-center gap-2">
        <span className="t-tag" style={{ color: 'var(--teal)' }}>DATE B:</span>
        <input
          type="date"
          value={afterDate}
          min={minAllowedAfter}
          max="2026-12-31"
          onChange={(e) => onAfterDateChange(e.target.value)}
          className="t-mono tabular-nums px-2 py-1 cursor-pointer focus:outline-none"
          style={dateInputStyle('var(--teal)')}
          title={`Observation date (Google Satellite HD). Min selectable to preserve 2-year gap: ${minAllowedAfter}`}
        />
        <div className="hidden sm:flex items-center gap-1">
          {AFTER_CHIPS.map((d) => (
            <button
              key={d}
              onClick={() => onAfterDateChange(d)}
              className="t-tag px-1.5 py-0.5 cursor-pointer transition-colors"
              style={chipStyle(afterDate === d, 'var(--teal)', 'var(--teal-wash)')}
              title={`Select ${d} as observation date`}
            >
              {d.split('-')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
