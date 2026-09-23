/**
 * Inline-SVG chart primitives without external chart libraries.
 * Specs: PRD 16 §5 (D5)
 * - Sparkline: Polyline, 1.5 px --signal, last point dot, --signal-wash area fill at 12%.
 * - BarRow: 120px label, flex bar with --panel-2 track and --signal fill, tabular value.
 * - Split: Stacked single-row bar with legend list beneath.
 * - TableToggle: Accessible switch for tabular equivalents.
 */

import React from 'react';
import { Table, BarChart2 } from 'lucide-react';
import { ADMIN_PANEL_COPY } from '../../lib/landingCopy';

export interface SparklineProps {
  values: number[];
  w?: number;
  h?: number;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  values,
  w = 120,
  h = 28,
  className = '',
}) => {
  if (!values || values.length === 0) {
    return <div style={{ width: w, height: h }} className="bg-[var(--well)] rounded" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 3;
  const effectiveH = h - padding * 2;
  const stepX = (w - padding * 2) / Math.max(1, values.length - 1);

  const points = values.map((v, i) => {
    const x = padding + i * stepX;
    const y = h - padding - ((v - min) / range) * effectiveH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastPoint = points[points.length - 1]?.split(',') || ['0', '0'];
  const lastX = Number(lastPoint[0] || 0);
  const lastY = Number(lastPoint[1] || 0);

  const polylinePoints = points.join(' ');
  const areaPoints = `${padding},${h} ${polylinePoints} ${w - padding},${h}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={`overflow-visible ${className}`}
      aria-hidden="true"
    >
      <polygon points={areaPoints} fill="var(--signal)" opacity="0.12" />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="var(--signal)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill="var(--signal)" />
    </svg>
  );
};

export interface BarRowProps {
  label: string;
  value: number;
  max: number;
  meta?: string;
  unit?: string;
  onClick?: () => void;
}

export const BarRow: React.FC<BarRowProps> = ({
  label,
  value,
  max,
  meta,
  unit = '',
  onClick,
}) => {
  const safeMax = max || 1;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div
      className={`flex items-center gap-3 py-1.5 text-xs select-text ${onClick ? 'cursor-pointer hover:bg-[var(--well)] px-1.5 rounded' : ''}`}
      onClick={onClick}
    >
      <span style={{ width: '120px' }} className="truncate text-[var(--ink-2)] font-mono font-medium" title={label}>
        {label}
      </span>
      <div className="flex-1 h-2 bg-[var(--panel-2)] rounded-sm overflow-hidden flex items-center">
        <div
          className="h-full bg-[var(--signal)] rounded-sm transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div style={{ minWidth: '70px' }} className="flex items-center justify-end gap-2 tabular-nums font-mono text-right">
        <span className="font-bold text-[var(--ink)]">
          {value.toLocaleString()}
          {unit}
        </span>
        {meta && <span className="text-xs opacity-75 text-[var(--ink-3)]">({meta})</span>}
      </div>
    </div>
  );
};

export interface SplitSegment {
  label: string;
  value: number;
  color?: string;
}

const PALETTE = [
  'var(--signal)',
  'var(--ion)',
  'var(--ok)',
  'var(--warn)',
  'var(--danger)',
  'var(--steel)',
];

export const Split: React.FC<{ parts: SplitSegment[] }> = ({ parts }) => {
  const total = parts.reduce((acc, p) => acc + p.value, 0) || 1;

  return (
    <div className="space-y-2">
      <div className="h-3 w-full bg-[var(--panel-2)] rounded-sm flex overflow-hidden">
        {parts.map((part, i) => {
          const pct = (part.value / total) * 100;
          if (pct <= 0) return null;
          const bg = part.color || PALETTE[i % PALETTE.length];
          return (
            <div
              key={part.label}
              style={{ width: `${pct}%`, backgroundColor: bg }}
              className="h-full transition-all duration-300 first:rounded-l-sm last:rounded-r-sm"
              title={`${part.label}: ${part.value} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
        {parts.map((part, i) => {
          const pct = ((part.value / total) * 100).toFixed(1);
          const bg = part.color || PALETTE[i % PALETTE.length];
          return (
            <div key={part.label} className="flex items-center gap-1.5 text-[var(--ink-2)]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bg }} />
              <span className="font-medium">{part.label}</span>
              <span className="tabular-nums font-bold text-[var(--ink)]">
                {part.value.toLocaleString()} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TableToggle: React.FC<{
  isTable: boolean;
  onToggle: () => void;
}> = ({ isTable, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex items-center gap-1.5 px-2 py-0.5 text-xs uppercase tracking-wider font-mono border border-[var(--line)] rounded hover:bg-[var(--well)] text-[var(--ink-2)] hover:text-[var(--ink)]"
  >
    {isTable ? <BarChart2 className="w-3 h-3" /> : <Table className="w-3 h-3" />}
    <span>{isTable ? ADMIN_PANEL_COPY.chart : ADMIN_PANEL_COPY.table}</span>
  </button>
);
