import React from 'react';
import type { Evidence } from '../lib/types';
import { Eye, EyeOff } from 'lucide-react';

interface MapCursorInspectorProps {
  hoveredEvidence: Evidence | null;
  beforeDate: string;
  afterDate: string;
  showAllPolygons: boolean;
  onToggleShowAll: () => void;
  coordRef: React.RefObject<HTMLDivElement | null>;
  inspectorRef: React.RefObject<HTMLDivElement | null>;
}

export const MapCursorInspector: React.FC<MapCursorInspectorProps> = ({
  hoveredEvidence,
  beforeDate,
  afterDate,
  showAllPolygons,
  onToggleShowAll,
  coordRef,
  inspectorRef,
}) => {
  return (
    <>
      {/* Tactical Mode Switch: Show All Polygons toggle */}
      <div className="absolute top-16 left-4 z-[400] flex items-center gap-2">
        <button
          onClick={onToggleShowAll}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium shadow-2xl backdrop-blur-md border transition-all ${
            showAllPolygons
              ? 'bg-indigo-600/90 border-indigo-400 text-white shadow-indigo-500/20'
              : 'bg-[#0B0F19]/85 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
          }`}
          title="Toggle visibility of change boundary polygons"
        >
          {showAllPolygons ? <Eye className="w-3.5 h-3.5 text-indigo-200" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
          <span>{showAllPolygons ? 'All Polygons Visible' : 'Inspect on Hover'}</span>
        </button>
      </div>

      {/* Fixed corner coordinate badge — positioned via DOM ref, no re-renders */}
      <div
        ref={coordRef}
        className="absolute top-16 right-4 z-[400] bg-[#0B0F19]/85 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-slate-400 shadow-lg backdrop-blur-md pointer-events-none hidden"
      >
        <span className="text-slate-500">LAT: </span>
        <span className="text-slate-200 tabular-nums" data-lat="">—</span>
        <span className="text-slate-500 ml-2">LON: </span>
        <span className="text-slate-200 tabular-nums" data-lng="">—</span>
      </div>

      {/* Polygon hover inspector card — shown only when hovering a polygon */}
      <div
        ref={inspectorRef}
        className="pointer-events-none absolute z-[450] hidden"
        style={{ left: 0, top: 0 }}
      >
        {hoveredEvidence && (
          <div className="bg-[#0B0F19]/92 border border-slate-700/90 rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-xs font-mono text-slate-200 w-56 space-y-1.5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <span className="text-amber-300 font-bold uppercase text-[11px]">
                {hoveredEvidence.change_type.replace('_', ' ')}
              </span>
              <span className="text-emerald-400 text-[10px] bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                {(hoveredEvidence.confidence.overall * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-white font-bold text-sm">
              {hoveredEvidence.measurement.area_label}
              <span className="text-[10px] font-normal text-slate-400 ml-1">
                ({hoveredEvidence.measurement.area_m2.toLocaleString()} m²)
              </span>
            </div>
            <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-1 flex justify-between">
              <span>{beforeDate} → {afterDate}</span>
              <span className="text-indigo-300">Click to inspect</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
