import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

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
  { label: 'FULL 5-YEAR', b: '2021-01-15', a: '2026-08-18' },
  { label: 'EARTHWORKS', b: '2021-01-15', a: '2023-08-10' },
  { label: 'RUNWAY', b: '2023-08-10', a: '2026-08-18' },
];

/**
 * SLOT-02 — Temporal Bar
 * Date-A / Date-B selectors, year chips, DETECT CHANGES, SWAP, and presets.
 */
export const TemporalBar: React.FC<TemporalBarProps> = ({
  beforeDate, afterDate, onBeforeDateChange, onAfterDateChange,
  onSwapDates, onRunAnalysis, isAnalyzing,
}) => {
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
          type="date" value={beforeDate} min="2021-01-01" max="2026-12-31"
          onChange={(e) => onBeforeDateChange(e.target.value)}
          className="t-mono tabular-nums px-2 py-1 cursor-pointer focus:outline-none"
          style={dateInputStyle('var(--amber)')}
        />
        <div className="hidden sm:flex items-center gap-1">
          {BEFORE_CHIPS.map((d) => (
            <button key={d} onClick={() => onBeforeDateChange(d)}
              className="t-tag px-1.5 py-0.5 cursor-pointer transition-colors"
              style={chipStyle(beforeDate === d, 'var(--amber)', 'var(--amber-wash)')}>
              {d.split('-')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Center: DETECT CHANGES + SWAP + Presets */}
      <div className="flex items-center gap-2">
        <button onClick={onRunAnalysis} disabled={isAnalyzing} className="btn-primary"
          title="Execute bi-temporal classical CVA detection pipeline"
          style={{ opacity: isAnalyzing ? 0.5 : 1 }}>
          <span>{isAnalyzing ? 'DETECTING…' : 'DETECT CHANGES'}</span>
        </button>
        <button onClick={onSwapDates} className="btn-secondary" title="Swap Before and After dates">
          <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: 'var(--amber)' }} />
          <span className="hidden sm:inline">SWAP</span>
        </button>
        <div className="hidden lg:flex items-center gap-1.5 pl-2" style={{ borderLeft: '1px solid var(--line)' }}>
          <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>PRESETS:</span>
          {PRESETS.map(({ label, b, a }) => (
            <button key={label} onClick={() => { onBeforeDateChange(b); onAfterDateChange(a); }}
              className="t-tag px-2 py-0.5 cursor-pointer transition-colors"
              style={{ background: 'var(--panel-2)', color: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: 9 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Date B + year chips */}
      <div className="flex items-center gap-2">
        <span className="t-tag" style={{ color: 'var(--teal)' }}>DATE B:</span>
        <input
          type="date" value={afterDate} min="2021-01-01" max="2026-12-31"
          onChange={(e) => onAfterDateChange(e.target.value)}
          className="t-mono tabular-nums px-2 py-1 cursor-pointer focus:outline-none"
          style={dateInputStyle('var(--teal)')}
        />
        <div className="hidden sm:flex items-center gap-1">
          {AFTER_CHIPS.map((d) => (
            <button key={d} onClick={() => onAfterDateChange(d)}
              className="t-tag px-1.5 py-0.5 cursor-pointer transition-colors"
              style={chipStyle(afterDate === d, 'var(--teal)', 'var(--teal-wash)')}>
              {d.split('-')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
