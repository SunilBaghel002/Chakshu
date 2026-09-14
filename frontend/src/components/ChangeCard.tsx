import React from 'react';
import { Eye, Check, Ban, Calendar, Ruler, ShieldCheck } from 'lucide-react';
import type { Evidence } from '../lib/types';
import { getClassColor, PALETTE } from '../lib/palette';

interface ChangeCardProps {
  evidence: Evidence;
  isSelected?: boolean;
  onSelect?: (evidence: Evidence) => void;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  className?: string;
}

/**
 * ChangeCard — Grid-view card in Review Queue with Console Treatment
 */
export const ChangeCard: React.FC<ChangeCardProps> = ({
  evidence,
  isSelected = false,
  onSelect,
  onConfirm,
  onReject,
  className = '',
}) => {
  const { change_object_id, change_type, measurement, temporal, confidence, status, sources } = evidence;
  const color = getClassColor(change_type);
  const confPct = Math.round(confidence.overall * 100);
  const onsetDate = temporal.first_supported || sources.after.acquired_at;

  return (
    <div
      onClick={() => onSelect?.(evidence)}
      className={`relative p-3.5 transition-all cursor-pointer border corner-ticks ${
        isSelected
          ? 'bg-[var(--panel2)] border-[var(--amber)] shadow-lg shadow-[rgba(240,180,95,0.1)]'
          : 'bg-[var(--panel)] hover:bg-[var(--panel2)] border-[var(--line)] hover:border-[var(--line-strong)]'
      } ${className}`}
      style={{
        borderRadius: 'var(--r-sm)',
      }}
    >
      {/* Top row: Change Type + Epistemic Chip + Status */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono"
            style={{
              backgroundColor: `${color}18`,
              color: color,
              border: `1px solid ${color}40`,
              borderRadius: 'var(--r-sm)',
            }}
          >
            {change_type.replace('_', ' ')}
          </span>

          {/* Epistemic Chip */}
          <span
            className="px-1.5 py-0.5 text-[9px] font-mono font-semibold flex items-center gap-1"
            style={{
              backgroundColor: PALETTE.measuredFill,
              color: PALETTE.measuredText,
              border: `1px solid ${PALETTE.measuredBorder}`,
              borderRadius: 'var(--r-sm)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-measured)]"></span>
            MEASURED
          </span>
        </div>

        {/* Status indicator */}
        <span
          className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider"
          style={{
            borderRadius: 'var(--r-sm)',
            backgroundColor:
              status === 'confirmed'
                ? 'var(--color-measured-fill)'
                : status === 'rejected'
                ? 'var(--color-rejected-fill)'
                : 'var(--color-inferred-fill)',
            color:
              status === 'confirmed'
                ? 'var(--color-measured-text)'
                : status === 'rejected'
                ? 'var(--color-rejected-text)'
                : 'var(--color-inferred-text)',
            border: `1px solid ${
              status === 'confirmed'
                ? 'rgba(47,191,113,0.3)'
                : status === 'rejected'
                ? 'rgba(229,72,77,0.3)'
                : 'rgba(240,180,95,0.3)'
            }`,
          }}
        >
          {status}
        </span>
      </div>

      {/* Center section: Ground Area & Onset */}
      <div
        className="grid grid-cols-2 gap-2 my-2 py-2"
        style={{
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div>
          <div className="flex items-center gap-1 text-[var(--ink3)] text-[10px] font-mono">
            <Ruler className="w-3 h-3 text-[var(--amber)]" />
            <span>GROUND AREA</span>
          </div>
          <span className="text-sm font-bold text-[var(--ink)] font-mono tabular-nums mt-0.5 block">
            {measurement.area_label}
          </span>
        </div>

        <div>
          <div className="flex items-center gap-1 text-[var(--ink3)] text-[10px] font-mono">
            <Calendar className="w-3 h-3 text-[var(--teal)]" />
            <span>FIRST SEEN</span>
          </div>
          <span className="text-xs font-semibold text-[var(--ink2)] font-mono tabular-nums mt-0.5 block truncate">
            {onsetDate}
          </span>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
          <span className="text-[var(--ink3)] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[var(--teal)]" />
            CONFIDENCE
          </span>
          <span className="text-[var(--amber)] font-bold tabular-nums">{confPct}%</span>
        </div>
        <div className="w-full h-1.5 bg-[var(--well)] overflow-hidden" style={{ borderRadius: 'var(--r-sm)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${confPct}%`,
              backgroundColor: confPct > 80 ? 'var(--color-measured)' : confPct > 60 ? 'var(--amber)' : 'var(--color-rejected)',
            }}
          />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-mono text-[var(--ink3)] truncate max-w-[120px]" title={change_object_id}>
          {change_object_id.slice(0, 8)}...
        </span>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onSelect?.(evidence)}
            className="p-1.5 bg-[var(--panel2)] hover:bg-[var(--line)] text-[var(--ink2)] hover:text-[var(--ink)] transition-colors"
            style={{ borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}
            title="Inspect on Map"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onConfirm?.(change_object_id)}
            className="p-1.5 transition-colors"
            style={{
              borderRadius: 'var(--r-sm)',
              backgroundColor: status === 'confirmed' ? 'var(--color-measured)' : 'var(--color-measured-fill)',
              color: status === 'confirmed' ? '#000' : 'var(--color-measured-text)',
              border: '1px solid rgba(47,191,113,0.3)',
            }}
            title="Confirm genuine change"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onReject?.(change_object_id)}
            className="p-1.5 transition-colors"
            style={{
              borderRadius: 'var(--r-sm)',
              backgroundColor: status === 'rejected' ? 'var(--color-rejected)' : 'var(--color-rejected-fill)',
              color: status === 'rejected' ? '#FFF' : 'var(--color-rejected-text)',
              border: '1px solid rgba(229,72,77,0.3)',
            }}
            title="Reject as false alarm"
          >
            <Ban className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
