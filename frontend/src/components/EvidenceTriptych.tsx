import React from 'react';
import { Layers } from 'lucide-react';
import type { SourcesSubObject } from '../lib/types';
import { SATELLITE_FALLBACK } from '../lib/satelliteFallback';

interface EvidenceTriptychProps {
  sources: SourcesSubObject;
}

export const EvidenceTriptych: React.FC<EvidenceTriptychProps> = ({ sources }) => {
  return (
    <div>
      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
        <Layers className="w-3.5 h-3.5 text-indigo-400" />
        Satellite Verification Photos
      </span>

      <div className="grid grid-cols-3 gap-2">
        {/* Before Thumbnail */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-2 text-center flex flex-col justify-between">
          <div className="w-full h-20 rounded bg-slate-900 border border-slate-700/60 overflow-hidden relative">
            <img
              src={sources.triptych_urls?.before || SATELLITE_FALLBACK.before}
              alt="Satellite Before"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = SATELLITE_FALLBACK.before;
              }}
            />
            <span className="absolute top-1 left-1 text-[9px] font-mono px-1 py-0.5 rounded bg-black/80 text-amber-300 font-bold uppercase">
              Before
            </span>
          </div>
          <div className="mt-1.5 space-y-0.5 text-left">
            <span className="text-[10px] font-mono text-slate-300 font-medium block truncate">
              {sources.before.acquired_at}
            </span>
            <span className="text-[9px] font-mono text-slate-500 block truncate">
              Sentinel-2 L2A · 10m GSD
            </span>
            <span className="text-[9px] font-mono text-slate-500 block">
              ☁️ {sources.before.cloud_cover_pct}% cloud
            </span>
          </div>
        </div>

        {/* Mask Thumbnail */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-2 text-center flex flex-col justify-between">
          <div className="w-full h-20 rounded bg-slate-950 border border-indigo-500/40 overflow-hidden relative">
            <img
              src={sources.triptych_urls?.mask || SATELLITE_FALLBACK.mask}
              alt="Detection Mask"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = SATELLITE_FALLBACK.mask;
              }}
            />
            <span className="absolute top-1 left-1 text-[9px] font-mono px-1 py-0.5 rounded bg-black/80 text-indigo-300 font-bold uppercase">
              Mask
            </span>
          </div>
          <div className="mt-1.5 space-y-0.5 text-left">
            <span className="text-[10px] font-mono text-indigo-300 font-medium block truncate">
              Detected Shape
            </span>
            <span className="text-[9px] font-mono text-slate-500 block truncate">
              Otsu + CVA Vector
            </span>
            <span className="text-[9px] font-mono text-slate-500 block">
              Strict Perimeter
            </span>
          </div>
        </div>

        {/* After Thumbnail */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-2 text-center flex flex-col justify-between">
          <div className="w-full h-20 rounded bg-slate-900 border border-orange-500/40 overflow-hidden relative">
            <img
              src={sources.triptych_urls?.after || SATELLITE_FALLBACK.after}
              alt="Satellite After"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = SATELLITE_FALLBACK.after;
              }}
            />
            <span className="absolute top-1 left-1 text-[9px] font-mono px-1 py-0.5 rounded bg-black/80 text-orange-400 font-bold uppercase">
              After
            </span>
          </div>
          <div className="mt-1.5 space-y-0.5 text-left">
            <span className="text-[10px] font-mono text-slate-300 font-medium block truncate">
              {sources.after.acquired_at}
            </span>
            <span className="text-[9px] font-mono text-slate-500 block truncate">
              Sentinel-2 L2A · 10m GSD
            </span>
            <span className="text-[9px] font-mono text-slate-500 block">
              ☁️ {sources.after.cloud_cover_pct}% cloud
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
