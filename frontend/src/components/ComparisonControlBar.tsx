import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type { SceneItem } from '../lib/api';

interface ComparisonControlBarProps {
  beforeDate: string;
  afterDate: string;
  scenes: SceneItem[];
  onSelectBeforeDate: (d: string) => void;
  onSelectAfterDate: (d: string) => void;
  onSwapDates: () => void;
  onDetectChanges: () => void;
}

export const ComparisonControlBar: React.FC<ComparisonControlBarProps> = ({
  beforeDate,
  afterDate,
  onSelectBeforeDate,
  onSelectAfterDate,
  onSwapDates,
  onDetectChanges,
}) => {
  return (
    <div className="bg-[#090D13] border-b border-[#1C2333] px-3 py-1.5 flex items-center justify-between gap-3 text-xs flex-wrap z-20 font-mono select-none">
      {/* Left: Baseline Date A */}
      <div className="flex items-center gap-2">
        <span className="text-[#F2B84B] font-bold text-[11px] uppercase tracking-wider">
          DATE A:
        </span>
        <input
          type="date"
          value={beforeDate}
          min="2021-01-01"
          max="2026-12-31"
          onChange={(e) => onSelectBeforeDate(e.target.value)}
          className="bg-[#111622] border border-[#1C2333] text-[#F2B84B] font-mono font-semibold px-2 py-0.5 rounded text-xs focus:outline-none focus:border-[#F2B84B] cursor-pointer hover:border-[#F2B84B]/60"
        />
        <div className="hidden sm:flex items-center gap-1 text-[10px]">
          {['2021', '2022', '2023'].map((yr) => (
            <button
              key={yr}
              onClick={() => onSelectBeforeDate(`${yr}-01-15`)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                beforeDate.startsWith(yr)
                  ? 'bg-[#F2B84B]/20 text-[#F2B84B] border border-[#F2B84B]/60 font-bold'
                  : 'text-slate-400 hover:text-white bg-[#111622] border border-[#1C2333]'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Action Buttons, Baseline Status & 1-Click Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Glowing Amber Detect Changes Button */}
        <button
          onClick={onDetectChanges}
          className="px-4 py-1 rounded bg-[#F2B84B] hover:bg-[#d9a33e] text-black font-extrabold text-xs tracking-wider uppercase shadow-[0_0_14px_rgba(242,184,75,0.45)] transition-all flex items-center gap-1 active:translate-y-0.5"
        >
          DETECT CHANGES
        </button>

        <button
          onClick={onSwapDates}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#111622] hover:bg-slate-800 text-slate-200 border border-[#1C2333] text-xs font-semibold transition-all hover:border-[#F2B84B]/50"
          title="Swap Before and After dates"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[#F2B84B]" />
          <span>SWAP</span>
        </button>

        {/* Baseline Delta Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/30 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
          <span>Δ 5.5 YRS</span>
          <span className="text-slate-500">|</span>
          <span>≥ 2Y BASELINE OK</span>
        </div>

        {/* Quick Presets */}
        <div className="hidden lg:flex items-center gap-1.5 border-l border-slate-800 pl-2">
          <span className="text-slate-500 text-[10px] uppercase">PRESETS:</span>
          <button
            onClick={() => {
              onSelectBeforeDate('2021-01-15');
              onSelectAfterDate('2026-08-18');
            }}
            className="px-2 py-0.5 rounded bg-[#111622] hover:bg-slate-800 text-slate-300 border border-[#1C2333] text-[10px] transition-colors"
          >
            5-YR FULL (5.6Y)
          </button>
          <button
            onClick={() => {
              onSelectBeforeDate('2021-01-15');
              onSelectAfterDate('2023-08-10');
            }}
            className="px-2 py-0.5 rounded bg-[#111622] hover:bg-slate-800 text-slate-300 border border-[#1C2333] text-[10px] transition-colors"
          >
            EARTHWORKS (2.6Y)
          </button>
          <button
            onClick={() => {
              onSelectBeforeDate('2023-08-10');
              onSelectAfterDate('2026-08-18');
            }}
            className="px-2 py-0.5 rounded bg-[#111622] hover:bg-slate-800 text-slate-300 border border-[#1C2333] text-[10px] transition-colors"
          >
            RUNWAY (3.0Y)
          </button>
        </div>
      </div>

      {/* Right: Newest Observation Date B */}
      <div className="flex items-center gap-2">
        <span className="text-[#24C6C8] font-bold text-[11px] uppercase tracking-wider">
          DATE B:
        </span>
        <input
          type="date"
          value={afterDate}
          min="2021-01-01"
          max="2026-12-31"
          onChange={(e) => onSelectAfterDate(e.target.value)}
          className="bg-[#111622] border border-[#1C2333] text-[#24C6C8] font-mono font-semibold px-2 py-0.5 rounded text-xs focus:outline-none focus:border-[#24C6C8] cursor-pointer hover:border-[#24C6C8]/60"
        />
        <div className="hidden sm:flex items-center gap-1 text-[10px]">
          {['2024', '2025', '2026'].map((yr) => (
            <button
              key={yr}
              onClick={() => onSelectAfterDate(`${yr}-08-18`)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                afterDate.startsWith(yr)
                  ? 'bg-[#24C6C8]/20 text-[#24C6C8] border border-[#24C6C8]/60 font-bold'
                  : 'text-slate-400 hover:text-white bg-[#111622] border border-[#1C2333]'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
