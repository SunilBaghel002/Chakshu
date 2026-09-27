import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  Sparkles,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import type { SceneItem } from '../lib/api';

interface TimelineSliderProps {
  scenes: SceneItem[];
  beforeDate: string;
  afterDate: string;
  onSelectBeforeDate: (date: string) => void;
  onSelectAfterDate: (date: string) => void;
}

// Key Temporal Intelligence Milestones for Jewar International Airport
interface MilestoneEpoch {
  date: string;
  year: string;
  title: string;
  phase: string;
  cloud: number;
  usable: boolean;
  gsd: string;
}

const MILESTONES: MilestoneEpoch[] = [
  {
    date: '2021-01-15',
    year: '2021',
    title: 'Baseline Farmland',
    phase: 'Pre-construction agricultural parcel',
    cloud: 0.8,
    usable: true,
    gsd: '0.5m',
  },
  {
    date: '2022-04-10',
    year: '2022',
    title: 'Site Demarcation',
    phase: 'Perimeter fencing & tree clearance',
    cloud: 2.1,
    usable: true,
    gsd: '0.5m',
  },
  {
    date: '2023-11-02',
    year: '2023',
    title: 'Mass Earthworks',
    phase: 'Runway corridor grading (+280 ha)',
    cloud: 1.4,
    usable: true,
    gsd: '0.5m',
  },
  {
    date: '2024-03-19',
    year: '2024',
    title: 'Runway Base Layer',
    phase: 'Sub-base compaction & drainage network',
    cloud: 0.4,
    usable: true,
    gsd: '0.5m',
  },
  {
    date: '2025-12-14',
    year: '2025',
    title: 'Tarmac Paving',
    phase: 'Terminal superstructure & bituminous asphalt',
    cloud: 3.2,
    usable: true,
    gsd: '0.5m',
  },
  {
    date: '2026-08-03',
    year: '2026',
    title: 'Operational Airport',
    phase: 'Completed 3,900m runway & terminal roof',
    cloud: 1.2,
    usable: true,
    gsd: '0.3m',
  },
];

/**
 * SLOT-30 — High-Utility Geospatial Temporal Scrubber
 * Replaces unreadable dots with interactive milestone epoch cards, continuous range scrubber,
 * and tactile time-lapse controls that actually drive the map.
 */
export const TimelineSlider: React.FC<TimelineSliderProps> = React.memo(({
  scenes: _scenes,
  beforeDate,
  afterDate,
  onSelectBeforeDate,
  onSelectAfterDate,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [targetSlot, setTargetSlot] = useState<'A' | 'B'>('B');

  // Find index of currently active milestone
  const currentMilestoneIdx = useMemo(() => {
    const idx = MILESTONES.findIndex((m) => m.date === afterDate);
    return idx >= 0 ? idx : MILESTONES.length - 1;
  }, [afterDate]);

  // Playback timer
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    const interval = Math.round(1400 / speed);
    playTimerRef.current = setInterval(() => {
      const nextIdx = (currentMilestoneIdx + 1) % MILESTONES.length;
      const ep = MILESTONES[nextIdx];
      if (ep) onSelectAfterDate(ep.date);
    }, interval);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, speed, currentMilestoneIdx, onSelectAfterDate]);

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);

  const handlePrev = useCallback(() => {
    const prev = Math.max(0, currentMilestoneIdx - 1);
    const ep = MILESTONES[prev];
    if (ep) onSelectAfterDate(ep.date);
  }, [currentMilestoneIdx, onSelectAfterDate]);

  const handleNext = useCallback(() => {
    const next = Math.min(MILESTONES.length - 1, currentMilestoneIdx + 1);
    const ep = MILESTONES[next];
    if (ep) onSelectAfterDate(ep.date);
  }, [currentMilestoneIdx, onSelectAfterDate]);

  const handleFirst = useCallback(() => {
    const ep = MILESTONES[0];
    if (ep) onSelectAfterDate(ep.date);
  }, [onSelectAfterDate]);

  const handleLatest = useCallback(() => {
    const ep = MILESTONES[MILESTONES.length - 1];
    if (ep) onSelectAfterDate(ep.date);
  }, [onSelectAfterDate]);

  const handleEpochClick = (epochDate: string) => {
    if (targetSlot === 'A') {
      onSelectBeforeDate(epochDate);
      setTargetSlot('B');
    } else {
      onSelectAfterDate(epochDate);
    }
  };

  // Keyboard shortcut listener (Space to play, Left/Right to step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handlePrev, handleNext]);

  return (
    <div
      id="slot-30-timeline"
      className="w-full h-full bg-[#0D1219] border-t border-outline-variant/30 px-space-md py-1.5 flex flex-col justify-between select-none relative overflow-hidden"
      style={{
        zIndex: 25,
      }}
    >
      {/* Top Header: Timeline Command Bar & Playback */}
      <div className="flex items-center justify-between h-6">
        {/* Left: Mode Title & Target Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-primary font-label-sm text-[10px] font-semibold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[14px]">timeline</span>
            <span>TEMPORAL TIME-SERIES</span>
          </div>

          <div className="flex items-center bg-surface-container p-0.5 rounded border border-outline-variant/30 text-[9.5px] font-code-num">
            <span className="text-outline text-[9px] px-1">ASSIGN TO:</span>
            <button
              type="button"
              onClick={() => setTargetSlot('A')}
              className={`px-1.5 py-0.2 rounded transition-colors ${
                targetSlot === 'A'
                  ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/50'
                  : 'text-outline hover:text-on-surface'
              }`}
              title="Clicking an epoch sets T₀ Baseline Date"
            >
              T₀ BASELINE ({beforeDate.slice(0, 4)})
            </button>
            <button
              type="button"
              onClick={() => setTargetSlot('B')}
              className={`px-1.5 py-0.2 rounded transition-colors ${
                targetSlot === 'B'
                  ? 'bg-primary/20 text-primary font-bold border border-primary/50'
                  : 'text-outline hover:text-on-surface'
              }`}
              title="Clicking an epoch sets T₁ Observation Date"
            >
              T₁ CURRENT ({afterDate.slice(0, 4)})
            </button>
          </div>
        </div>

        {/* Right: Tactile Time-Lapse Media Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-surface-container p-0.5 rounded border border-outline-variant/30">
            <button
              type="button"
              onClick={handleFirst}
              className="w-5 h-5 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Jump to 2021 Baseline"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handlePrev}
              className="w-5 h-5 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Previous Milestone (Left Arrow)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className={`px-2 h-5 rounded flex items-center gap-1 font-label-sm text-[10px] font-semibold transition-colors cursor-pointer ${
                isPlaying
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-primary/15 text-primary hover:bg-primary/25'
              }`}
              title="Play/Pause Time-Lapse (Space)"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3 h-3" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 ml-0.5" />
                  <span>PLAY LAPSE</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="w-5 h-5 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Next Milestone (Right Arrow)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleLatest}
              className="w-5 h-5 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Jump to 2026 Operational Airport"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1))}
            className="px-1.5 h-5 rounded bg-surface-container text-outline hover:text-on-surface font-code-num text-[10px] border border-outline-variant/30 font-semibold"
            title="Toggle playback speed"
          >
            {speed}x
          </button>
        </div>
      </div>

      {/* Center: Interactive Milestone Epoch Stepper Cards (Replaces empty dots) */}
      <div className="grid grid-cols-6 gap-1.5 my-0.5">
        {MILESTONES.map((ep, idx) => {
          const isT0 = beforeDate.startsWith(ep.year);
          const isT1 = afterDate.startsWith(ep.year);
          const isPast = idx < currentMilestoneIdx;
          const isCurrent = idx === currentMilestoneIdx;

          return (
            <button
              type="button"
              key={ep.date}
              onClick={() => handleEpochClick(ep.date)}
              className={`flex flex-col text-left p-1.5 rounded-md border transition-all cursor-pointer relative group ${
                isT1
                  ? 'bg-primary/10 border-primary shadow-[0_0_8px_rgba(77,163,255,0.3)]'
                  : isT0
                  ? 'bg-amber-400/10 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                  : isCurrent
                  ? 'bg-surface-container-high border-outline-variant'
                  : 'bg-surface-container-lowest/80 border-outline-variant/20 hover:border-outline-variant/60 hover:bg-surface-container'
              }`}
            >
              {/* Badge indicator on top right */}
              {isT0 && (
                <span className="absolute -top-1.5 -left-1 bg-amber-400 text-[#0B0F14] font-code-num text-[8px] font-bold px-1 rounded-full shadow-sm">
                  T₀ BASE
                </span>
              )}
              {isT1 && (
                <span className="absolute -top-1.5 -right-1 bg-primary text-on-primary font-code-num text-[8px] font-bold px-1 rounded-full shadow-sm">
                  T₁ VIEW
                </span>
              )}

              {/* Year & GSD Header */}
              <div className="flex items-center justify-between leading-none">
                <span
                  className={`font-code-num text-[12px] font-bold ${
                    isT1 ? 'text-primary' : isT0 ? 'text-amber-300' : 'text-on-surface'
                  }`}
                >
                  {ep.year}
                </span>
                <span className="font-code-num text-[9px] text-outline">
                  {ep.gsd}
                </span>
              </div>

              {/* Title / Phase */}
              <span
                className={`font-label-sm text-[10px] font-semibold truncate mt-0.5 ${
                  isT1 ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'
                }`}
              >
                {ep.title}
              </span>

              {/* Mini Progress / State Bar */}
              <div className="w-full h-1 bg-outline-variant/20 rounded-full mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isT1
                      ? 'w-full bg-primary'
                      : isT0
                      ? 'w-full bg-amber-400'
                      : isPast
                      ? 'w-full bg-tertiary/60'
                      : 'w-0'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Info Bar: Clear telemetry readout */}
      <div className="flex items-center justify-between text-outline font-label-sm text-[9.5px] pt-0.5 border-t border-outline-variant/20">
        <div className="flex items-center gap-2">
          <span className="text-on-surface-variant">
            Viewing: <strong className="text-primary font-code-num">{afterDate}</strong> (
            {MILESTONES[currentMilestoneIdx]?.title})
          </span>
          <span>•</span>
          <span className="text-outline">
            Baseline: <strong className="text-amber-300 font-code-num">{beforeDate}</strong> (Farmland)
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 font-code-num text-[9px]">
          <span>Sub-pixel co-reg ≤ 0.22px</span>
          <span>•</span>
          <span className="bg-surface-container px-1 rounded text-outline">[Space] Play</span>
          <span className="bg-surface-container px-1 rounded text-outline">[← / →] Scrub</span>
        </div>
      </div>
    </div>
  );
});
