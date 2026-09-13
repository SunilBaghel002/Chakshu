import React from 'react';
import { ZoomIn, ZoomOut, Compass } from 'lucide-react';

interface MapZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  coords: [number, number];
}

export const MapZoomControls: React.FC<MapZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onCenter,
  coords,
}) => {
  return (
    <div className="absolute right-4 top-16 z-[400] flex flex-col gap-2">
      <div className="bg-[#111827]/90 rounded-md border border-[#374151] p-1 shadow-2xl flex flex-col gap-1 backdrop-blur-md">
        <button
          onClick={onZoomIn}
          className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={onCenter}
          className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-t border-slate-800"
          title="Center on AOI"
        >
          <Compass className="w-4 h-4 text-indigo-400" />
        </button>
      </div>

      <div className="bg-[#0F172A]/90 border border-slate-700/80 px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 shadow-xl backdrop-blur-md text-right">
        <div>LAT: {coords[0].toFixed(4)}° N</div>
        <div>LON: {coords[1].toFixed(4)}° E</div>
      </div>
    </div>
  );
};
