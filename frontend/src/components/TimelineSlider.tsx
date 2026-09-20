import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import type { SceneItem } from '../lib/api';

interface TimelineSliderProps {
  scenes: SceneItem[];
  beforeDate: string;
  afterDate: string;
  onSelectBeforeDate: (date: string) => void;
  onSelectAfterDate: (date: string) => void;
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  scenes,
  beforeDate,
  afterDate,
  onSelectBeforeDate,
  onSelectAfterDate,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [targetDateMode, setTargetDateMode] = useState<'after' | 'before'>('after');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const playIntervalRef = useRef<number | null>(null);

  // Sort scenes chronologically
  const sortedScenes = [...scenes].sort(
    (a, b) => new Date(a.acquired_at).getTime() - new Date(b.acquired_at).getTime()
  );

  const displayedScenes =
    selectedYear === 'all'
      ? sortedScenes
      : sortedScenes.filter((s) => s.acquired_at.startsWith(String(selectedYear)));

  const currentAfterIndex = sortedScenes.findIndex((s) => s.acquired_at === afterDate);

  // Animation player
  useEffect(() => {
    if (isPlaying && sortedScenes.length > 0) {
      playIntervalRef.current = window.setInterval(() => {
        const nextIndex = (currentAfterIndex + 1) % sortedScenes.length;
        const nextScene = sortedScenes[nextIndex];
        if (nextScene) {
          onSelectAfterDate(nextScene.acquired_at);
        }
      }, 700);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, currentAfterIndex, sortedScenes, onSelectAfterDate]);

  const handleNext = () => {
    const nextIndex = Math.min(sortedScenes.length - 1, currentAfterIndex + 1);
    const nextScene = sortedScenes[nextIndex];
    if (nextScene) onSelectAfterDate(nextScene.acquired_at);
  };

  const handlePrev = () => {
    const prevIndex = Math.max(0, currentAfterIndex - 1);
    const prevScene = sortedScenes[prevIndex];
    if (prevScene) onSelectAfterDate(prevScene.acquired_at);
  };

  return (
    <div className="h-22 w-full bg-[#080B10] border-t border-[#1C2333] px-3 py-1.5 flex flex-col justify-between select-none relative z-20 font-mono">
      {/* 1. Controller Bar */}
      <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
        {/* Playback Controls & Quick Years */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#111622] hover:bg-[#F2B84B] hover:text-black text-[#F2B84B] border border-[#F2B84B]/60 font-bold shadow-[0_0_10px_rgba(242,184,75,0.2)] transition-all text-xs"
            title={isPlaying ? 'Pause animation' : 'Play satellite timeline'}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            onClick={handlePrev}
            disabled={currentAfterIndex <= 0}
            className="p-1 rounded bg-[#111622] hover:bg-slate-800 text-slate-300 border border-[#1C2333] disabled:opacity-30"
            title="Previous pass"
          >
            <SkipBack className="w-3 h-3" />
          </button>

          <button
            onClick={handleNext}
            disabled={currentAfterIndex >= sortedScenes.length - 1}
            className="p-1 rounded bg-[#111622] hover:bg-slate-800 text-slate-300 border border-[#1C2333] disabled:opacity-30"
            title="Next pass"
          >
            <SkipForward className="w-3 h-3" />
          </button>

          {/* Quick Year Filter Buttons */}
          <div className="hidden lg:flex items-center gap-1 bg-[#111622] p-0.5 rounded border border-[#1C2333] text-[10px] ml-1">
            {(['all', 2021, 2022, 2023, 2024, 2025, 2026] as const).map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  selectedYear === yr
                    ? 'bg-[#F2B84B] text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {yr === 'all' ? 'ALL' : yr}
              </button>
            ))}
          </div>
        </div>

        {/* Center/Right: Target Mode Selection & Controls */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-slate-500 uppercase">CLICK SETS:</span>
          <button
            onClick={() => setTargetDateMode('before')}
            className={`px-2 py-0.5 rounded transition-all font-bold ${
              targetDateMode === 'before'
                ? 'bg-[#F2B84B]/20 text-[#F2B84B] border border-[#F2B84B]/60'
                : 'text-slate-400 bg-[#111622] border border-[#1C2333]'
            }`}
          >
            DATE A ({beforeDate})
          </button>
          <button
            onClick={() => setTargetDateMode('after')}
            className={`px-2 py-0.5 rounded transition-all font-bold ${
              targetDateMode === 'after'
                ? 'bg-[#24C6C8]/20 text-[#24C6C8] border border-[#24C6C8]/60'
                : 'text-slate-400 bg-[#111622] border border-[#1C2333]'
            }`}
          >
            DATE B ({afterDate})
          </button>

          <button
            onClick={() => {
              const first = sortedScenes[0];
              const last = sortedScenes[sortedScenes.length - 1];
              if (first && last) {
                onSelectBeforeDate(first.acquired_at);
                onSelectAfterDate(last.acquired_at);
              }
            }}
            className="px-2 py-0.5 rounded bg-[#111622] text-[#24C6C8] border border-[#24C6C8]/40 hover:bg-slate-800"
          >
            ● CLEAR
          </button>
          <span className="text-rose-400 hidden sm:inline">⊘ UNUSABLE</span>
        </div>
      </div>

      {/* 2. Acquisition Pass Dot Scrubber */}
      <div className="relative w-full py-1">
        {/* Continuous Range Slider */}
        <input
          type="range"
          min={0}
          max={Math.max(0, sortedScenes.length - 1)}
          value={currentAfterIndex >= 0 ? currentAfterIndex : 0}
          onChange={(e) => {
            const idx = Number(e.target.value);
            const target = sortedScenes[idx];
            if (target) {
              if (targetDateMode === 'before') {
                onSelectBeforeDate(target.acquired_at);
              } else {
                onSelectAfterDate(target.acquired_at);
              }
            }
          }}
          className="w-full accent-[#F2B84B] h-1 bg-[#111622] rounded cursor-pointer z-10 block"
        />

        {/* Scene Dot Indicators */}
        <div className="flex justify-between items-center px-1 pt-1 overflow-hidden">
          {(displayedScenes.length > 0 ? displayedScenes : sortedScenes).map((scene, i) => {
            const isBefore = scene.acquired_at === beforeDate;
            const isAfter = scene.acquired_at === afterDate;
            const isUsable = scene.usable !== false;

            let dotColor = '#24C6C8'; // Cyan pass dot
            if (isBefore || isAfter) {
              dotColor = '#F2B84B'; // Amber selected
            } else if (!isUsable) {
              dotColor = '#EF4444'; // Red unusable
            }

            return (
              <button
                key={scene.id || scene.acquired_at || i}
                onClick={() => {
                  if (targetDateMode === 'before') {
                    onSelectBeforeDate(scene.acquired_at);
                  } else {
                    onSelectAfterDate(scene.acquired_at);
                  }
                }}
                className="group relative flex flex-col items-center py-0.5 focus:outline-none"
                title={`${scene.acquired_at} · Cloud: ${scene.cloud_cover_pct ?? 0}%`}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-transform ${
                    isBefore || isAfter ? 'scale-125 ring-2 ring-[#F2B84B]/60' : 'hover:scale-150'
                  }`}
                  style={{ backgroundColor: dotColor }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Bottom Tactical Status Footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-[#141A24]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            READY
          </span>
          <span className="text-slate-400">Inspecting construction</span>
        </div>
        <div className="text-slate-500 font-mono text-[9px]">
          trace: tr_8f3a2b1c
        </div>
      </div>
    </div>
  );
};
