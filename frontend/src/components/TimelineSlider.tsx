import React, { useState, useEffect, useRef } from 'react';
import type { SceneItem } from '../lib/api';

interface TimelineSliderProps {
  scenes: SceneItem[];
  beforeDate: string;
  afterDate: string;
  onSelectBeforeDate: (date: string) => void;
  onSelectAfterDate: (date: string) => void;
}

const MILESTONE_EPOCHS = [
  { date: '2021-01-15', label: '15 Jan 2021', stage: 'T0 · Baseline', isBaseline: true },
  { date: '2022-04-10', label: '10 Apr 2022', stage: 'Earthwork' },
  { date: '2023-11-02', label: '02 Nov 2023', stage: 'Foundation' },
  { date: '2024-03-19', label: '19 Mar 2024', stage: 'Runway Base' },
  { date: '2025-12-14', label: '14 Dec 2025', stage: 'Terminal R/C' },
  { date: '2026-08-03', label: '03 Aug 2026', stage: 'T1 · Active', isActive: true },
];

/**
 * SLOT-30 — Stitch Temporal Scrubber Rail
 * Height: 156px
 * Design System: Deterministic Geo-Intelligence
 */
export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  scenes,
  beforeDate,
  afterDate,
  onSelectBeforeDate,
  onSelectAfterDate,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [filterMode, setFilterMode] = useState<'all' | 'usable' | 'cloudy' | 'changes'>('all');
  const playIntervalRef = useRef<number | null>(null);

  const sortedScenes = React.useMemo(() => {
    return [...scenes].sort(
      (a, b) => new Date(a.acquired_at).getTime() - new Date(b.acquired_at).getTime()
    );
  }, [scenes]);

  const currentAfterIndex = Math.max(
    0,
    sortedScenes.findIndex((s) => s.acquired_at === afterDate)
  );

  useEffect(() => {
    if (isPlaying && sortedScenes.length > 0) {
      const intervalMs = Math.round(800 / playbackSpeed);
      playIntervalRef.current = window.setInterval(() => {
        const nextIndex = (currentAfterIndex + 1) % sortedScenes.length;
        const nextScene = sortedScenes[nextIndex];
        if (nextScene) {
          onSelectAfterDate(nextScene.acquired_at);
        }
      }, intervalMs);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, playbackSpeed, currentAfterIndex, sortedScenes, onSelectAfterDate]);

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
    <div
      id="slot-30-timeline"
      className="h-[156px] w-full bg-surface-container-lowest border-t border-outline-variant/30 flex flex-col justify-between px-space-lg py-2.5 z-30 select-none shadow-md"
    >
      {/* Top Controls Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[16px]">timelapse</span>
            <span className="font-label-sm text-[11px] tracking-wider uppercase font-semibold text-on-surface">
              TEMPORAL SCRUBBER
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-surface-container rounded p-0.5 text-[10px] font-code-num">
            <span className="text-outline px-1.5 uppercase font-medium">SHOW:</span>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                filterMode === 'all'
                  ? 'bg-surface-container-high text-on-surface font-medium'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All (184)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('usable')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                filterMode === 'usable'
                  ? 'bg-surface-container-high text-on-surface font-medium'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Usable (163)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('cloudy')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                filterMode === 'cloudy'
                  ? 'bg-surface-container-high text-on-surface font-medium'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Cloudy (21)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('changes')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                filterMode === 'changes'
                  ? 'bg-surface-container-high text-primary font-medium'
                  : 'text-primary hover:text-on-surface'
              }`}
            >
              Changes (24)
            </button>
          </div>
        </div>

        {/* Playback Controls & Frame Status */}
        <div className="flex items-center gap-space-md">
          <span className="font-code-num text-[11px] text-on-surface-variant">
            Frame{' '}
            <strong className="text-primary font-semibold">
              {currentAfterIndex + 1}
            </strong>{' '}
            / {sortedScenes.length || 184}
          </span>

          <div className="flex items-center bg-surface-container rounded p-0.5 border border-outline-variant/20">
            <button
              type="button"
              onClick={handlePrev}
              className="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              title="Previous Pass"
            >
              <span className="material-symbols-outlined text-[14px]">skip_previous</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-6 px-2 rounded bg-primary text-on-primary font-label-sm text-[11px] flex items-center gap-1 font-semibold hover:bg-secondary transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play Sequence'}
            >
              <span className="material-symbols-outlined text-[13px]">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              title="Next Pass"
            >
              <span className="material-symbols-outlined text-[14px]">skip_next</span>
            </button>
          </div>

          {/* Speed Presets */}
          <div className="flex items-center bg-surface-container rounded p-0.5 text-[10px] font-code-num text-on-surface-variant">
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPlaybackSpeed(s)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  playbackSpeed === s
                    ? 'bg-surface-container-high text-primary font-semibold'
                    : 'hover:text-on-surface'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Center Timeline Visual Scrub Track */}
      <div className="relative w-full py-1 flex flex-col justify-center">
        {/* Track Line */}
        <div className="relative w-full h-1.5 bg-surface-container-high rounded-full overflow-visible">
          <div className="absolute left-0 top-0 bottom-0 bg-primary/30 w-full rounded-full" />
          {/* Monsoon Gap Indicator */}
          <div
            className="absolute left-[11%] w-[9%] top-0 bottom-0 bg-error/30 border-l border-r border-error/50"
            title="Monsoon Observation Gap (Cloud Cover)"
          />
          <div className="absolute -top-4 left-[11%] text-[8px] font-code-num text-error tracking-tight uppercase whitespace-nowrap">
            Monsoon Gap (Jul-Oct 2021)
          </div>
        </div>

        {/* Milestone Epoch Pips */}
        <div className="relative w-full flex justify-between items-center -mt-2.5">
          {MILESTONE_EPOCHS.map((ep) => {
            const isT0 = ep.isBaseline;
            const isT1 = ep.isActive;

            return (
              <div
                key={ep.date}
                onClick={() => {
                  if (isT0) {
                    onSelectBeforeDate(ep.date);
                  } else {
                    onSelectAfterDate(ep.date);
                  }
                }}
                className={`flex flex-col items-center group cursor-pointer relative ${
                  isT1 ? 'relative' : ''
                }`}
              >
                {/* Active Floating Tooltip on T1 */}
                {isT1 && (
                  <div className="absolute -top-7 -translate-x-1/2 left-1/2 bg-surface-container-highest px-2 py-0.5 rounded text-[9px] font-code-num text-primary border border-primary/40 shadow-md whitespace-nowrap pointer-events-none">
                    03 AUG 2026 · S2-L2A · 1.2% Cloud · OPTIMAL
                  </div>
                )}

                {/* Node Pip */}
                {isT0 ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-surface-container-lowest flex items-center justify-center shadow-md">
                    <div className="w-1 h-1 rounded-full bg-surface-container-lowest" />
                  </div>
                ) : isT1 ? (
                  <div className="w-4 h-4 rounded-full bg-primary-container flex items-center justify-center shadow-[0_0_8px_rgba(77,163,255,0.7)] border-2 border-surface-container-lowest">
                    <div className="w-1.5 h-1.5 rounded-full bg-on-primary-container" />
                  </div>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-outline-variant group-hover:bg-primary transition-colors" />
                )}

                {/* Date Label */}
                <span
                  className={`font-code-num text-[10px] mt-1.5 ${
                    isT0
                      ? 'text-amber-300 font-semibold'
                      : isT1
                      ? 'text-primary font-bold'
                      : 'text-on-surface-variant group-hover:text-on-surface'
                  }`}
                >
                  {ep.label}
                </span>

                {/* Stage Tag */}
                <span
                  className={`font-label-sm text-[8px] uppercase mt-0.5 ${
                    isT0
                      ? 'text-outline font-semibold'
                      : isT1
                      ? 'text-primary bg-primary/10 px-1 rounded font-semibold'
                      : 'text-outline'
                  }`}
                >
                  {ep.stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer Info Strip */}
      <div className="flex items-center justify-between text-outline font-label-sm text-[11px] pt-1 border-t border-outline-variant/20">
        <div className="flex items-center gap-space-sm">
          <span>Pass Sensors: Sentinel-2A/B (10m) + Planet SkySat (0.5m GSD)</span>
          <span>•</span>
          <span className="text-tertiary font-code-num">Sub-pixel co-registration ≤ 0.22 px</span>
        </div>
        <div className="flex items-center gap-2 font-code-num text-[10px]">
          <span className="bg-surface-container px-1.5 py-0.5 rounded text-outline">← → Scrub</span>
          <span className="bg-surface-container px-1.5 py-0.5 rounded text-outline">Space Play</span>
          <span className="bg-surface-container px-1.5 py-0.5 rounded text-outline">J/K Change Event</span>
        </div>
      </div>
    </div>
  );
};
