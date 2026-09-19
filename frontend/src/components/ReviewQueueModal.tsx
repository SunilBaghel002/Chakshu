import React from 'react';
import { X, Check, Ban, Eye, ClipboardCheck } from 'lucide-react';
import type { Evidence } from '../lib/types';
import { getClassColor, formatClassLabel } from '../lib/palette';

interface ReviewQueueModalProps {
  evidenceList: Evidence[];
  onSelectEvidence: (evidence: Evidence) => void;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onClose: () => void;
}

export const ReviewQueueModal: React.FC<ReviewQueueModalProps> = ({
  evidenceList,
  onSelectEvidence,
  onConfirm,
  onReject,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none font-mono">
      <div className="bg-[#0E131F] border border-[#2A3447] rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-slate-200 tactical-corners">
        {/* Header */}
        <div className="px-4 py-3 bg-[#0B0D10] border-b border-[#1E2638] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-[#F2B84B]/15 text-[#F2B84B] border border-[#F2B84B]/30">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white tracking-wider uppercase">
                  DETECTED CHANGES REVIEW QUEUE
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#F2B84B]/15 text-[#F2B84B] border border-[#F2B84B]/40">
                  {evidenceList.length} PROPOSALS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                Review flagged satellite changes. Confirm ground truth or suppress false alarms.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#070A10]">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#1E2638] text-slate-400 uppercase text-[9px] tracking-wider">
                <th className="pb-2.5">CHANGE ID</th>
                <th className="pb-2.5">CATEGORY</th>
                <th className="pb-2.5 text-right">GROUND AREA</th>
                <th className="pb-2.5 text-center">FIRST SEEN</th>
                <th className="pb-2.5 text-right">CONFIDENCE</th>
                <th className="pb-2.5 text-center">STATUS</th>
                <th className="pb-2.5 text-right">OPERATIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {evidenceList.map((ev) => {
                const color = getClassColor(ev.change_type);
                const displayLabel = formatClassLabel(ev.change_type);
                return (
                  <tr key={ev.change_object_id} className="hover:bg-[#111827] transition-colors">
                    <td className="py-3 text-slate-300 font-semibold truncate max-w-[140px] text-[11px]">
                      {ev.change_object_id}
                    </td>
                    <td className="py-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: `${color}20`,
                          color: color,
                          border: `1px solid ${color}50`,
                        }}
                      >
                        {displayLabel}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-[#F2B84B] tabular-nums text-[11px]">
                      {ev.measurement.area_label}
                    </td>
                    <td className="py-3 text-center text-slate-300 tabular-nums text-[11px]">
                      {ev.temporal.first_supported ?? '—'}
                    </td>
                    <td className="py-3 text-right text-[#35D07F] font-semibold tabular-nums text-[11px]">
                      {(ev.confidence.overall * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                          ev.status === 'confirmed'
                            ? 'bg-[#35D07F]/20 text-[#35D07F] border border-[#35D07F]/50'
                            : ev.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                            : 'bg-[#F2B84B]/20 text-[#F2B84B] border border-[#F2B84B]/50'
                        }`}
                      >
                        {ev.status === 'confirmed' ? 'APPROVED' : ev.status === 'rejected' ? 'REJECTED' : 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            onSelectEvidence(ev);
                            onClose();
                          }}
                          className="p-1.5 rounded bg-[#161D2B] hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60"
                          title="Locate on map"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onConfirm(ev.change_object_id)}
                          className="p-1.5 rounded bg-[#35D07F]/20 hover:bg-[#35D07F]/30 text-[#35D07F] border border-[#35D07F]/50"
                          title="Confirm change"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onReject(ev.change_object_id)}
                          className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/50"
                          title="Reject false alarm"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer shortcuts info */}
        <div className="px-4 py-2.5 bg-[#0B0D10] border-t border-[#1E2638] flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#24C6C8]" />
            <span>Select eye icon to focus polygon · Confirm or suppress with check/cross</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#161D2B] hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
