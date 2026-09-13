import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertTriangle, CloudRain, SkipBack, SkipForward, Calendar, Check } from 'lucide-react';
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
  const [hoveredScene, setHoveredScene] = useState<SceneItem | null>(null);
  const [targetDateMode, setTargetDateMode] = useState<'after' | 'before'>('after');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const playIntervalRef = useRef<number | null>(null);

  // Sort scenes chronologically
  const sortedScenes = [...scenes].sort(
    (a, b) => new Date(a.acquired_at).getTime() - new Date(b.acquired_at).getTime()
  );

  // Filter by year if chosen
  const displayedScenes =
    selectedYear === 'all'
      ? sortedScenes
      : sortedScenes.filter((s) => s.acquired_at.startsWith(String(selectedYear)));

  const currentAfterIndex = sortedScenes.findIndex((s) => s.acquired_at === afterDate);
  const activeScene = sortedScenes[currentAfterIndex >= 0 ? currentAfterIndex : sortedScenes.length - 1];

  // Play animation through scenes
  useEffect(() => {
    if (isPlaying && sortedScenes.length > 0) {
      playIntervalRef.current = window.setInterval(() => {
        const nextIndex = (currentAfterIndex + 1) % sortedScenes.length;
        const nextScene = sortedScenes[nextIndex];
        if (nextScene) {
          onSelectAfterDate(nextScene.acquired_at);
        }
      }, 600);
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

  const handleSceneClick = (scene: SceneItem) => {
    if (targetDateMode === 'before') {
      onSelectBeforeDate(scene.acquired_at);
    } else {
      onSelectAfterDate(scene.acquired_at);
    }
  };

  return (
    <div className="h-24 w-full bg-[#0F172A]/95 border-t border-[#1F2937] px-4 py-2 flex flex-col justify-between select-none relative z-20 backdrop-blur-md">
      {/* Top Controller Bar */}
      <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
        {/* Playback Controls & Quick Years */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md transition-all text-xs"
            title={isPlaying ? 'Pause timeline animation' : 'Watch satellite timeline from 2021 to 2026'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
          </button>

          <button
            onClick={handlePrev}
            disabled={currentAfterIndex <= 0}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
            title="Previous month"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleNext}
            disabled={currentAfterIndex >= sortedScenes.length - 1}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
            title="Next month"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Quick Year Filter Buttons */}
          <div className="hidden lg:flex items-center gap-1 bg-[#111827] p-0.5 rounded border border-slate-800 text-[11px] font-mono ml-1">
            {(['all', 2021, 2022, 2023, 2024, 2025, 2026] as const).map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  selectedYear === yr
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {yr === 'all' ? 'All' : yr}
              </button>
            ))}
          </div>
        </div>

        {/* Target Mode Toggle (Click updates Before or After) */}
        <div className="flex items-center gap-1.5 bg-[#111827] px-2 py-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px] hidden sm:inline">Clicking Dot Sets:</span>
          <button
            onClick={() => setTargetDateMode('before')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
              targetDateMode === 'before'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ● Before Date ({beforeDate})
          </button>
          <button
            onClick={() => setTargetDateMode('after')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
              targetDateMode === 'after'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ● After Date ({afterDate})
          </button>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Clear Sky</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-rose-400 bg-transparent" />
            <span className="text-rose-300">Monsoon Rain/Clouds</span>
          </div>
        </div>
      </div>

      {/* Timeline Range Scrubber & Scene Dots */}
      <div className="relative w-full flex flex-col justify-center px-2 py-1">
        {/* Continuous Range Slider for effortless dragging */}
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
          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer transition-all z-10"
          title="Drag slider left or right to scrub through satellite history"
        />

        {/* Dots along timeline */}
        <div className="relative w-full flex items-center justify-between -mt-2 pointer-events-none">
          {displayedScenes.map((scene) => {
            const isBefore = scene.acquired_at === beforeDate;
            const isAfter = scene.acquired_at === afterDate;

            return (
              <div
                key={scene.id}
                className="relative group cursor-pointer py-1 pointer-events-auto"
                onClick={() => handleSceneClick(scene)}
                onMouseEnter={() => setHoveredScene(scene)}
                onMouseLeave={() => setHoveredScene(null)}
              >
                {/* Visual Dot */}
                <div
                  className={`transition-all duration-150 rounded-full ${
                    isAfter
                      ? 'w-4 h-4 bg-indigo-500 border-2 border-white ring-4 ring-indigo-500/50 shadow-lg scale-125'
                      : isBefore
                      ? 'w-3.5 h-3.5 bg-amber-400 border-2 border-white ring-2 ring-amber-400/50'
                      : scene.usable
                      ? 'w-1.5 h-1.5 bg-emerald-400 hover:scale-150 hover:bg-emerald-300'
                      : 'w-1.5 h-1.5 border border-rose-400 bg-[#0F172A] hover:scale-150'
                  }`}
                />

                {/* Tooltip on Hover */}
                {hoveredScene?.id === scene.id && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 bg-[#111827] border border-slate-700 text-slate-200 p-2.5 rounded-lg shadow-2xl z-50 text-[11px] font-mono pointer-events-none">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>{scene.acquired_at}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          scene.usable ? 'text-emerald-400 bg-emerald-950' : 'text-rose-300 bg-rose-950'
                        }`}
                      >
                        {scene.usable ? 'CLEAR PASS' : 'CLOUDY'}
                      </span>
                    </div>
                    <div className="text-slate-400 mt-1">
                      Cloud Cover: <span className="text-white font-semibold">{scene.cloud_cover_pct.toFixed(1)}%</span>
                    </div>
                    {scene.unusable_reason && (
                      <div className="text-rose-300 mt-1 text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{scene.unusable_reason}</span>
                      </div>
                    )}
                    <div className="text-indigo-300 mt-1 pt-1 border-t border-slate-800 text-[10px]">
                      Click to set as {targetDateMode === 'before' ? 'Before' : 'After'} date
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
