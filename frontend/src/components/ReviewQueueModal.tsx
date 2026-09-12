import React from 'react';
import { X, Check, Ban, Eye } from 'lucide-react';
import type { Evidence } from '../lib/types';
import { getClassColor } from '../lib/palette';

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#111827] border border-[#374151] rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 bg-[#0F172A] border-b border-[#1F2937] flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Review Detected Changes</h2>
            <p className="text-xs text-slate-400">
              Review flagged satellite changes. Confirm genuine ground activity or mark false alarms.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#1F2937] text-slate-400 uppercase text-[10px]">
                <th className="pb-2">Change ID</th>
                <th className="pb-2">Category</th>
                <th className="pb-2 text-right">Ground Area</th>
                <th className="pb-2 text-center">First Seen Date</th>
                <th className="pb-2 text-right">Confidence</th>
                <th className="pb-2 text-center">Status</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {evidenceList.map((ev) => {
                const color = getClassColor(ev.change_type);
                return (
                  <tr key={ev.change_object_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 text-slate-300 font-semibold truncate max-w-[140px]">
                      {ev.change_object_id}
                    </td>
                    <td className="py-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: `${color}25`,
                          color: color,
                          border: `1px solid ${color}50`,
                        }}
                      >
                        {ev.change_type}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-white tabular-nums">
                      {ev.measurement.area_label}
                    </td>
                    <td className="py-3 text-center text-slate-300 tabular-nums">
                      {ev.temporal.first_supported ?? '—'}
                    </td>
                    <td className="py-3 text-right text-emerald-400 font-semibold tabular-nums">
                      {(ev.confidence.overall * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                          ev.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : ev.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {ev.status === 'confirmed' ? 'Approved' : ev.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            onSelectEvidence(ev);
                            onClose();
                          }}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          title="Show on map"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onConfirm(ev.change_object_id)}
                          className="p-1.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/50"
                          title="Approve real change"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onReject(ev.change_object_id)}
                          className="p-1.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-800/50"
                          title="Mark as false alarm"
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
        <div className="p-3 bg-[#0F172A] border-t border-[#1F2937] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Click eye icon to zoom to polygon on map · Approve or reject with check/cross</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
