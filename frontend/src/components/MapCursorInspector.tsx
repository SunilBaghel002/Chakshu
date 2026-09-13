import React from 'react';
import type { Evidence } from '../lib/types';
import { Eye, EyeOff, Sparkles, Layers } from 'lucide-react';

interface MapCursorInspectorProps {
  cursorPos: { lat: number; lng: number; x: number; y: number } | null;
  hoveredEvidence: Evidence | null;
  beforeDate: string;
  afterDate: string;
  showAllPolygons: boolean;
  onToggleShowAll: () => void;
}

export const MapCursorInspector: React.FC<MapCursorInspectorProps> = ({
  cursorPos,
  hoveredEvidence,
  beforeDate,
  afterDate,
  showAllPolygons,
  onToggleShowAll,
}) => {
  return (
    <>
      {/* Tactical Mode Switch: Hover Inspect vs Show All Polygons */}
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

      {/* Floating Cursor Change Inspector Card */}
      {cursorPos && (
        <div
          className="pointer-events-none absolute z-[450] transition-all duration-75"
          style={{
            left: `${Math.min(cursorPos.x + 16, window.innerWidth - 320)}px`,
            top: `${Math.min(cursorPos.y + 16, window.innerHeight - 200)}px`,
          }}
        >
          <div className="bg-[#0B0F19]/92 border border-slate-700/90 rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-xs font-mono text-slate-200 w-64 space-y-2 ring-1 ring-white/10">
            {/* Header / Coordinates */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-indigo-300 font-semibold">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Change Inspector</span>
              </span>
              <span>
                {cursorPos.lat.toFixed(4)}°N, {cursorPos.lng.toFixed(4)}°E
              </span>
            </div>

            {/* Hovered Detected Change or General Area Delta */}
            {hoveredEvidence ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 font-bold uppercase text-[11px]">
                    {hoveredEvidence.change_type.replace('_', ' ')}
                  </span>
                  <span className="text-emerald-400 text-[10px] bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    {(hoveredEvidence.confidence.overall * 100).toFixed(0)}% Sure
                  </span>
                </div>
                <div className="text-white font-bold text-sm">
                  {hoveredEvidence.measurement.area_label}
                  <span className="text-[10px] font-normal text-slate-400 ml-1">
                    ({hoveredEvidence.measurement.area_m2.toLocaleString()} m²)
                  </span>
                </div>
                <div className="text-[10px] text-indigo-300 pt-0.5 flex items-center gap-1">
                  <span>💡 Click polygon to open full evidence dossier</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Baseline ({beforeDate}):</span>
                  <span className="text-amber-300 font-medium">🌾 Farmland</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Observed ({afterDate}):</span>
                  <span className="text-indigo-300 font-medium">🏗️ Construction</span>
                </div>
                <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Spectral Shift:</span>
                  <span className="text-emerald-400 font-semibold">NDBI ↑ (+0.21)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
