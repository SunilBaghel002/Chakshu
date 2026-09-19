import React from 'react';
import { CheckCircle2, Info, Layers, BarChart3 } from 'lucide-react';
import type { CoverageSummary, CountsSummary, DetectionStats } from '../lib/types';
import { getClassColor, formatClassLabel } from '../lib/palette';

interface UploadTelemetryTabProps {
  coverage?: CoverageSummary | null;
  counts?: CountsSummary | null;
  stats?: DetectionStats | null;
}

export const UploadTelemetryTab: React.FC<UploadTelemetryTabProps> = ({ coverage, counts, stats }) => {
  const lcStats = stats?.landcover_area;

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Land-Cover Breakdown with Area in m² and Hectares (Task T-4) */}
      {lcStats && (
        <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-white font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Land-Cover Breakdown (Area in Hectares & m²)
            </span>
            <span className="text-indigo-400 text-[11px] font-mono">
              Total Area: {stats.total_area_m2 === null ? 'N/A' : `${stats.total_area_m2.toLocaleString()} m² (${(stats.total_area_m2 / 10000).toFixed(1)} ha)`}
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {Object.entries(lcStats).map(([cname, data]) => {
              const color = getClassColor(cname);
              const displayName = formatClassLabel(cname);
              return (
                <div key={cname} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="flex items-center gap-1.5 capitalize font-medium text-slate-200">
                      <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
                      {displayName}
                    </span>
                    <span className="tabular-nums text-slate-300">
                      <span className="font-bold text-white">{data.pct.toFixed(1)}%</span>
                      <span className="text-slate-500 mx-1">·</span>
                      <span>{data.ha === null ? 'N/A' : `${data.ha.toFixed(1)} ha`}</span>
                      <span className="text-slate-500 mx-1">·</span>
                      <span className="text-slate-400">{data.m2 === null ? 'N/A' : `${data.m2.toLocaleString()} m²`}</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{ width: `${Math.min(100, data.pct)}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Coverage Stacked Bar (Deterministic Spectral) */}
      {coverage && !lcStats && (
        <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-white font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Deterministic Optical Land-Cover Classification
            </span>
            <span className="text-emerald-400 text-[11px] font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% Computer-Calculated
            </span>
          </div>

          {/* Progress Bar Stack */}
          <div className="w-full h-4 rounded-md bg-slate-800 overflow-hidden flex shadow-inner">
            {coverage.by_class.map((item) => (
              <div
                key={item.label}
                style={{
                  width: `${item.pct}%`,
                  backgroundColor: getClassColor(item.label),
                }}
                title={`${item.label}: ${item.pct.toFixed(1)}% (${item.px.toLocaleString()} px)`}
              />
            ))}
          </div>

          {/* Detailed Class Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {coverage.by_class.map((item) => (
              <div
                key={item.label}
                className="bg-[#111827] border border-slate-800 p-2.5 rounded-lg flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: getClassColor(item.label) }}
                  />
                  <span className="capitalize text-slate-300 font-medium">{formatClassLabel(item.label)}</span>
                </span>
                <div className="text-right">
                  <span className="font-bold tabular-nums text-white block">
                    {item.pct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500 tabular-nums">
                    {item.px.toLocaleString()} px
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exact Counts Summary Card */}
      {counts && (
        <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-400" />
              Database Counts Verification
            </span>
            <span className="text-slate-500 text-[10px] font-mono">
              {counts.source}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-[#111827] border border-slate-800 p-2.5 rounded text-center">
              <span className="text-slate-400 text-[10px] block">Discrete Objects</span>
              <span className="text-indigo-400 text-base font-bold tabular-nums">
                {counts.total_object_detections}
              </span>
            </div>
            <div className="bg-[#111827] border border-slate-800 p-2.5 rounded text-center">
              <span className="text-slate-400 text-[10px] block">Landcover Polygons</span>
              <span className="text-emerald-400 text-base font-bold tabular-nums">
                {counts.total_landcover_detections}
              </span>
            </div>
            {Object.entries(counts.by_label).slice(0, 2).map(([label, cnt]) => (
              <div key={label} className="bg-[#111827] border border-slate-800 p-2.5 rounded text-center">
                <span className="text-slate-400 text-[10px] block uppercase">{formatClassLabel(label)}</span>
                <span className="text-white text-base font-bold tabular-nums">{cnt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
