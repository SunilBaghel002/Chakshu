import React from 'react';
import { ShieldAlert } from 'lucide-react';
import type { RejectionsSummary, Upload } from '../lib/types';
import { COPY } from '../lib/copy';

interface UploadRejectionsTabProps {
  upload: Upload;
  rejections?: RejectionsSummary | null;
}

export const UploadRejectionsTab: React.FC<UploadRejectionsTabProps> = ({ upload, rejections }) => {
  return (
    <div className="space-y-3 font-mono text-xs">
      {/* Resolution Gate Notice */}
      <div className="bg-[#F2B84B]/10 border border-[#F2B84B]/40 p-3.5 rounded-lg space-y-1.5 font-sans">
        <div className="flex items-center gap-2 text-[#F2B84B] font-bold text-xs font-mono">
          <ShieldAlert className="w-4 h-4 text-[#F2B84B]" />
          <span>RESOLUTION GATE POLICY (Refusals Are Features)</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {upload.capability_notice || COPY.refusal10mVehicles}
        </p>
        <div className="text-[10px] text-[#F2B84B]/80 font-mono pt-1 uppercase">
          PERMITTED CLASSES AT THIS TIER: {upload.capabilities.object_classes.join(', ') || 'none (coarse GSD)'}
        </div>
      </div>

      {/* Rejection Log */}
      {rejections && rejections.count > 0 ? (
        <div className="bg-[#0B0D10] border border-[#2A3447] p-3.5 rounded-lg space-y-2.5">
          <div className="flex justify-between text-xs text-rose-300 font-semibold uppercase tracking-wider">
            <span>FILTERED & EXCLUDED PROPOSALS</span>
            <span className="tabular-nums font-mono text-rose-400">{rejections.count} items filtered</span>
          </div>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
            {rejections.detail.map((rej, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 bg-[#111827] p-2.5 rounded border border-slate-800"
              >
                <div>
                  <span className="text-rose-400 font-bold uppercase font-mono mr-2 text-[11px]">
                    {rej.label_raw || rej.reason}:
                  </span>
                  <span className="text-slate-300 text-[11px] font-sans">{rej.detail}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {rej.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#0B0D10] border border-[#2A3447] p-6 rounded-lg text-center text-slate-500 font-mono text-xs">
          No proposals filtered. All detections conformed strictly to the sensor resolution tier.
        </div>
      )}
    </div>
  );
};
