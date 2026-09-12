import React from 'react';
import { X, UploadCloud, ShieldAlert, Layers } from 'lucide-react';
import type { DetectionSet } from '../lib/types';
import { COPY } from '../lib/copy';
import { getClassColor } from '../lib/palette';

interface UploadModalProps {
  detectionSet: DetectionSet;
  onClose: () => void;
  onLoadSample: (type: 'georeferenced' | 'visual_only' | 'unknown_gsd') => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  detectionSet,
  onClose,
  onLoadSample,
}) => {
  const { upload, coverage, rejections } = detectionSet;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#111827] border border-[#374151] rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 bg-[#0F172A] border-b border-[#1F2937] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Single Satellite Photo Inspector</h2>
              <p className="text-xs text-slate-400">
                Inspect land cover and detect building complexes in uploaded satellite images.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sample Switcher Buttons */}
        <div className="p-3 bg-[#0B0F19] border-b border-[#1F2937] flex items-center gap-2 text-xs font-mono flex-wrap">
          <span className="text-slate-400">Test Examples:</span>
          <button
            onClick={() => onLoadSample('georeferenced')}
            className="px-2.5 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium"
          >
            Jewar Airport (Standard 10m)
          </button>
          <button
            onClick={() => onLoadSample('visual_only')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Photo Without GPS Data
          </button>
          <button
            onClick={() => onLoadSample('unknown_gsd')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Unknown Image Scale
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {/* Metadata Card */}
          <div className="bg-[#0F172A] border border-[#1F2937] p-3.5 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">File Name</span>
              <span className="text-white font-semibold truncate block">{upload.filename}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Image Detail (GSD)</span>
              <span className="text-indigo-400 font-bold tabular-nums">
                {upload.gsd_m ? `${upload.gsd_m} meters/pixel` : 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Capability Level</span>
              <span className="text-amber-300 font-bold">{upload.capability_tier}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">GPS Zone</span>
              <span className="text-slate-200 tabular-nums">{upload.crs_epsg ? `EPSG:${upload.crs_epsg}` : 'No GPS'}</span>
            </div>
          </div>

          {/* Resolution Gate Notice / Refusal */}
          <div className="bg-amber-950/20 border border-amber-800/50 p-3.5 rounded-lg space-y-1.5 font-sans">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs font-mono">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>{COPY.refusalInsufficientResolution}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {upload.capability_notice || COPY.refusal10mVehicles}
            </p>
          </div>

          {/* Land-cover Coverage Summary Bar */}
          {coverage && (
            <div className="bg-[#0F172A] border border-[#1F2937] p-3.5 rounded-lg space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Land-Cover Percentage Breakdown
                </span>
                <span className="text-slate-400 text-[10px]">
                  Total: 100% Computer-Calculated
                </span>
              </div>

              {/* Progress Bar Stack */}
              <div className="w-full h-3.5 rounded bg-slate-800 overflow-hidden flex">
                {coverage.by_class.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      width: `${item.pct}%`,
                      backgroundColor: getClassColor(item.label),
                    }}
                    title={`${item.label}: ${item.pct.toFixed(1)}%`}
                  />
                ))}
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                {coverage.by_class.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: getClassColor(item.label) }}
                      />
                      <span className="capitalize">{item.label}</span>
                    </span>
                    <span className="font-semibold tabular-nums text-white">
                      {item.pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejections Log */}
          {rejections && rejections.count > 0 && (
            <div className="bg-[#0F172A] border border-[#1F2937] p-3 rounded-lg space-y-1.5">
              <div className="flex justify-between text-xs text-rose-300 font-semibold">
                <span>Objects Excluded from Counting</span>
                <span className="tabular-nums">{rejections.count} items filtered</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-400 font-sans">
                {rejections.detail.map((rej, i) => (
                  <div key={i} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-rose-400 font-bold uppercase font-mono">{rej.label_raw}:</span>
                    <span className="text-slate-300">{rej.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0F172A] border-t border-[#1F2937] flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            Security Checksum: {upload.checksum_sha256.substring(0, 20)}...
          </span>
          <button onClick={onClose} className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
