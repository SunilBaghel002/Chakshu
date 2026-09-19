import React, { useState, useEffect } from 'react';
import {
  MapPin,
  ChevronDown,
  Activity,
  Layers,
  CheckCircle2,
  UploadCloud,
  HelpCircle,
  Search,
} from 'lucide-react';
import { COPY } from '../lib/copy';
import type { AoiItem } from '../lib/api';

interface AppHeaderProps {
  aois: AoiItem[];
  selectedAoiId: string;
  onSelectAoi: (aoiId: string) => void;
  activeView: 'map' | 'review' | 'upload' | 'ask' | 'search';
  onSelectView: (view: 'map' | 'review' | 'upload' | 'ask' | 'search') => void;
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
  areaLabel = '492.31 ha',
  sceneCount = 56,
  usableScenes = 56,
}) => {
  const currentAoi = aois.find((a) => a.id === selectedAoiId) ?? aois[0];

  // Dynamic live UTC and IST telemetry clock
  const [timeStr, setTimeStr] = useState({ utc: '', ist: '' });
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const y = now.getUTCFullYear();
      const m = pad(now.getUTCMonth() + 1);
      const d = pad(now.getUTCDate());
      const hh = pad(now.getUTCHours());
      const mm = pad(now.getUTCMinutes());
      const ss = pad(now.getUTCSeconds());
      const utc = `${y}-${m}-${d} ${hh}:${mm}:${ss} UTC`;

      // IST is UTC + 5:30
      const istMs = now.getTime() + (5.5 * 3600 * 1000);
      const istDate = new Date(istMs);
      const ihh = pad(istDate.getUTCHours());
      const imm = pad(istDate.getUTCMinutes());
      const iss = pad(istDate.getUTCSeconds());
      const ist = `${ihh}:${imm}:${iss} IST`;
      setTimeStr({ utc, ist });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-[#080B10] border-b border-[#1C2333] select-none z-30 relative flex flex-col">
      {/* 1. Topmost Dense Ticker Strip */}
      <div className="bg-[#05070A] border-b border-[#141A24] px-4 py-0.5 flex items-center justify-between text-[9px] font-mono text-slate-400 overflow-x-auto whitespace-nowrap scrollbar-none tracking-widest uppercase">
        <div className="flex items-center gap-2">
          <span className="text-[#F2B84B] font-bold">LIVE — THEIA DATA STREAM:</span>
          <span>DRONE // TPOD:02 // AI:ENHANCED — RECON//02 :: //GMT — SENTINEL-2 L2A — 10M GSD — CONTINUOUS MONITORING ACTIVE —</span>
        </div>
        <div className="hidden lg:flex items-center gap-3 text-slate-500">
          <span>SENSOR: MSI OPTICAL</span>
          <span>BAND: B02/B03/B04/B08</span>
          <span className="text-emerald-400 font-semibold">FEED OK</span>
        </div>
      </div>

      {/* 2. Tactical Telemetry Engine Bar */}
      <div className="bg-[#090D13] border-b border-[#1C2333] px-4 py-1 flex items-center justify-between text-[10px] font-mono text-slate-300 gap-3 overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-3">
          <span className="text-[#F2B84B] font-bold tracking-wider">
            ISRO / SAC — MOD RECON
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">SATELLITE TELEMETRY ENGINE</span>
          <div className="flex items-center gap-1.5 text-[#24C6C8] font-bold tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-[#24C6C8] animate-pulse cyan-telemetry-dot" />
            <span>{timeStr.utc || '2026-09-15 16:05:18 UTC'}</span>
            <span className="text-slate-400 font-normal">{timeStr.ist || '21:35:18 IST'}</span>
          </div>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="text-slate-400 hidden md:inline">
            ORBIT: <span className="text-slate-200 font-semibold">LEO-SSO 786 KM</span> AZ: 164.2° EL: 58.4°
          </span>
          <span className="text-slate-600 hidden xl:inline">|</span>
          <span className="text-slate-400 hidden xl:inline">
            DATA LINK: <span className="text-emerald-400 font-semibold">420 MBPS</span> BER: 10⁻⁹
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1 text-[9px] font-mono">
            {['RUNWAY 10/28', 'TERMINAL T1', 'ATC TOWER', 'FULL AOI'].map((spot) => (
              <button
                key={spot}
                className="px-1.5 py-0.5 rounded bg-[#111622] hover:bg-slate-800 text-slate-400 hover:text-[#F2B84B] border border-[#1C2333] transition-colors"
              >
                {spot}
              </button>
            ))}
          </div>
          <span className="text-[#F2B84B] font-bold text-[10px] pl-2 border-l border-slate-800">
            AOI: {currentAoi ? currentAoi.name.toUpperCase() : 'NOIDA INTERNATIONAL'}
          </span>
        </div>
      </div>

      {/* 3. Main Operational Command Bar */}
      <div className="h-12 px-4 flex items-center justify-between bg-[#0D1117] text-xs">
        {/* Brand & Mission Badge */}
        <div className="flex items-center gap-3">
          {/* Tactical Target Reticle Icon */}
          <div className="relative flex items-center justify-center w-8 h-8 rounded bg-[#111622] border border-[#F2B84B]/40 p-1">
            <svg className="w-6 h-6 text-[#F2B84B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9" strokeOpacity="0.4" strokeDasharray="2 2" />
              <circle cx="12" cy="12" r="5" stroke="#F2B84B" strokeWidth="1.5" />
              <line x1="12" y1="2" x2="12" y2="6" stroke="#F2B84B" />
              <line x1="12" y1="18" x2="12" y2="22" stroke="#F2B84B" />
              <line x1="2" y1="12" x2="6" y2="12" stroke="#F2B84B" />
              <line x1="18" y1="12" x2="22" y2="12" stroke="#F2B84B" />
              <circle cx="12" cy="12" r="1.5" fill="#F2B84B" />
            </svg>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5 font-mono">
              <span className="text-[#F2B84B] font-semibold">{COPY.appNameDevanagari}</span>
              <span className="text-slate-100">({COPY.appName})</span>
            </span>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#F2B84B]/15 text-[#F2B84B] border border-[#F2B84B]/40 font-bold tracking-wider">
              MOD · ISRO
            </span>
          </div>

          {/* AOI Selector Dropdown */}
          <div className="relative ml-2">
            <div className="flex items-center gap-1.5 bg-[#111622] pl-2.5 pr-7 py-1 rounded border border-[#1C2333] hover:border-[#F2B84B]/60 transition-colors cursor-pointer">
              <MapPin className="w-3.5 h-3.5 text-[#F2B84B] shrink-0" />
              <select
                value={selectedAoiId}
                onChange={(e) => onSelectAoi(e.target.value)}
                className="appearance-none bg-transparent text-slate-200 text-xs font-mono font-semibold focus:outline-none cursor-pointer"
              >
                {aois.map((aoi) => (
                  <option key={aoi.id} value={aoi.id} className="bg-[#0E1219] text-slate-200">
                    {aoi.name.includes('Jewar') ? 'Noida International Airport, Jewar' : aoi.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Area & Passes Metrics */}
          <div className="hidden sm:flex items-center gap-2 font-mono text-xs">
            <span className="px-2 py-0.5 rounded bg-[#F2B84B]/15 text-[#F2B84B] border border-[#F2B84B]/30 font-bold tabular-nums">
              {areaLabel.toUpperCase()} AREA
            </span>
            <span className="text-[#24C6C8] font-bold tabular-nums">
              {usableScenes || sceneCount} PASSES
            </span>
          </div>
        </div>

        {/* Right Nav Buttons */}
        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={() => onSelectView('map')}
            className={`px-3 py-1 rounded text-xs uppercase font-medium transition-all ${
              activeView === 'map'
                ? 'bg-[#F2B84B] text-black font-bold shadow-[0_0_10px_rgba(242,184,75,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            MAP
          </button>

          <button
            onClick={() => onSelectView('review')}
            className={`px-3 py-1 rounded text-xs uppercase font-medium transition-all ${
              activeView === 'review'
                ? 'bg-[#F2B84B] text-black font-bold shadow-[0_0_10px_rgba(242,184,75,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            REVIEW
          </button>

          <button
            onClick={() => onSelectView('upload')}
            className={`px-3 py-1 rounded text-xs uppercase font-medium transition-all ${
              activeView === 'upload'
                ? 'bg-[#F2B84B] text-black font-bold shadow-[0_0_10px_rgba(242,184,75,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            UPLOAD
          </button>

          <button
            onClick={() => onSelectView('ask')}
            className={`px-3 py-1 rounded text-xs uppercase font-medium transition-all ${
              activeView === 'ask'
                ? 'bg-[#F2B84B] text-black font-bold shadow-[0_0_10px_rgba(242,184,75,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            ASK
          </button>

          {/* Live API Status Indicator */}
          <button
            onClick={onToggleMock}
            title={isMock ? 'Offline Demo Mode' : 'Live Satellite API active'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#090D13] border border-[#24C6C8]/40 text-[#24C6C8] text-xs font-mono font-bold transition-all hover:bg-[#111622]"
          >
            <span className="w-2 h-2 rounded-full bg-[#24C6C8] animate-pulse cyan-telemetry-dot" />
            <span>{isMock ? 'OFFLINE' : 'LIVE API'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
