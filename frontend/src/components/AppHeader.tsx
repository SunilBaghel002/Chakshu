import React from 'react';
import {
  Layers,
  CheckCircle2,
  HelpCircle,
  Database,
  UploadCloud,
  ChevronDown,
  Activity,
  Calendar,
  MapPin,
} from 'lucide-react';
import { COPY } from '../lib/copy';
import type { AoiItem } from '../lib/api';

interface AppHeaderProps {
  aois: AoiItem[];
  selectedAoiId: string;
  onSelectAoi: (aoiId: string) => void;
  activeView: 'map' | 'review' | 'upload' | 'ask';
  onSelectView: (view: 'map' | 'review' | 'upload' | 'ask') => void;
  isMock: boolean;
  onToggleMock: () => void;
  areaLabel?: string;
  sceneCount?: number;
  usableScenes?: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  aois,
  selectedAoiId,
  onSelectAoi,
  activeView,
  onSelectView,
  isMock,
  onToggleMock,
  areaLabel = '18.43 ha',
  sceneCount = 36,
  usableScenes = 29,
}) => {
  const currentAoi = aois.find((a) => a.id === selectedAoiId) ?? aois[0];

  return (
    <header className="h-16 w-full bg-[#111827]/95 border-b border-[#1F2937] px-4 flex items-center justify-between select-none z-30 relative backdrop-blur-md">
      {/* Brand & Eye Icon */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-950/80 to-[#0B0F19] border border-indigo-500/30 p-1">
          {/* Concentric Eye Pupil SVG */}
          <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="21" stroke="#818CF8" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="3 3" />
            <circle cx="24" cy="24" r="16" stroke="#6366F1" strokeWidth="2" strokeOpacity="0.8" />
            <circle cx="24" cy="24" r="11" stroke="#4F46E5" strokeWidth="2.5" />
            <circle cx="24" cy="24" r="5" fill="#C7D2FE" className="animate-iris-pulse" />
          </svg>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              <span className="text-indigo-400 font-semibold">{COPY.appNameDevanagari}</span>
              <span className="text-slate-100">({COPY.appName})</span>
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold tracking-wider">
              MoD · ISRO
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs sm:max-w-md">
            {COPY.tagline}
          </p>
        </div>
      </div>

      {/* Location Switcher & Key Numbers in Simple English */}
      <div className="hidden md:flex items-center gap-3">
        <div className="relative">
          <div className="flex items-center gap-1.5 bg-[#0F172A] pl-2.5 pr-8 py-1.5 rounded-lg border border-[#374151] hover:border-indigo-500/60 transition-colors cursor-pointer">
            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={selectedAoiId}
              onChange={(e) => onSelectAoi(e.target.value)}
              className="appearance-none bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {aois.map((aoi) => (
                <option key={aoi.id} value={aoi.id} className="bg-[#111827] text-slate-200">
                  {aoi.name.includes('Jewar') ? '📍 Jewar Airport (UP)' : '📍 Bhadla Solar Park (RJ)'}
                </option>
              ))}
            </select>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Friendly Metric Pill */}
        <div className="flex items-center gap-2 bg-[#0F172A] px-3 py-1.5 rounded-lg border border-[#1F2937] text-xs font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold tabular-nums" title="18.43 hectares is roughly 45 standard football fields">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline shrink-0" />
            {areaLabel} New Construction
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-slate-300 tabular-nums">
            <Calendar className="w-3.5 h-3.5 text-slate-400 inline shrink-0" />
            {usableScenes} Clear Passes
          </span>
        </div>
      </div>

      {/* Easy-to-Understand Navigation Tabs */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#0F172A] p-1 rounded-lg border border-[#1F2937] text-xs">
          <button
            onClick={() => onSelectView('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-medium ${
              activeView === 'map'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>

          <button
            onClick={() => onSelectView('review')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-medium ${
              activeView === 'review'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Review Changes</span>
          </button>

          <button
            onClick={() => onSelectView('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-medium ${
              activeView === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>

          <button
            onClick={() => onSelectView('ask')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-medium ${
              activeView === 'ask'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Ask AI</span>
          </button>
        </div>

        {/* Demo Mode Badge */}
        <button
          onClick={onToggleMock}
          title={isMock ? 'Offline Demo Mode: Fast instant local data' : 'Live Satellite API'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-colors ${
            isMock
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
              : 'bg-indigo-950/40 text-indigo-300 border-indigo-800/60 hover:bg-indigo-900/40'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isMock ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'}`} />
          <span className="hidden lg:inline">{isMock ? 'OFFLINE DEMO' : 'LIVE API'}</span>
          <Activity className="w-3 h-3 text-slate-400 ml-0.5" />
        </button>
      </div>
    </header>
  );
};
