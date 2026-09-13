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
      className={`relative rounded-xl p-3.5 transition-all cursor-pointer border ${
        isSelected
          ? 'bg-slate-900/95 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500'
          : 'bg-[#111827]/90 hover:bg-slate-900 border-[#1F2937] hover:border-slate-700'
      } ${className}`}
    >
      {/* Top row: Change Type + Epistemic Chip + Status */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${color}25`,
              color: color,
              border: `1px solid ${color}50`,
            }}
          >
            {change_type.replace('_', ' ')}
          </span>

          {/* Epistemic Chip (PRD 4 §3: MEASURED solid green, INFERRED dashed amber) */}
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium flex items-center gap-1"
            style={{
              backgroundColor: PALETTE.measuredBg,
              color: PALETTE.measuredGreen,
              border: `1px solid ${PALETTE.measuredBorder}`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            MEASURED
          </span>
        </div>

        {/* Status indicator */}
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
            status === 'confirmed'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : status === 'rejected'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}
        >
          {status}
        </span>
      </div>

      {/* Center section: Ground Area & Onset */}
      <div className="grid grid-cols-2 gap-2 my-2 py-2 border-y border-slate-800/80">
        <div>
          <div className="flex items-center gap-1 text-slate-400 text-[10px] font-mono">
            <Ruler className="w-3 h-3 text-indigo-400" />
            <span>GROUND AREA</span>
          </div>
          <span className="text-sm font-bold text-white font-mono tabular-nums mt-0.5 block">
            {measurement.area_label}
          </span>
        </div>

        <div>
          <div className="flex items-center gap-1 text-slate-400 text-[10px] font-mono">
            <Calendar className="w-3 h-3 text-amber-400" />
            <span>FIRST SEEN</span>
          </div>
          <span className="text-xs font-semibold text-slate-300 font-mono tabular-nums mt-0.5 block truncate">
            {onsetDate}
          </span>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
          <span className="text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Confidence
          </span>
          <span className="text-emerald-400 font-bold tabular-nums">{confPct}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${confPct}%`,
              backgroundColor: confPct > 80 ? '#10B981' : confPct > 60 ? '#F59E0B' : '#EF4444',
            }}
          />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]" title={change_object_id}>
          {change_object_id.slice(0, 8)}...
        </span>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onSelect?.(evidence)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Inspect on Map"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onConfirm?.(change_object_id)}
            className={`p-1.5 rounded transition-colors ${
              status === 'confirmed'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/60'
            }`}
            title="Confirm genuine change"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onReject?.(change_object_id)}
            className={`p-1.5 rounded transition-colors ${
              status === 'rejected'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-800/60'
            }`}
            title="Reject as false alarm"
          >
            <Ban className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
