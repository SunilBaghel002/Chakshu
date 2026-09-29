import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import type { SceneItem } from '../lib/api';
import { TimelineNodeTooltip } from './timeline/TimelineNodeTooltip';
import { TimelineLegend } from './timeline/TimelineLegend';

interface TimelineSliderProps {
  scenes: SceneItem[];
  beforeDate: string;
  afterDate: string;
  onSelectBeforeDate: (date: string) => void;
  onSelectAfterDate: (date: string) => void;
}

/**
 * SLOT-30 — Observation Deck
 * Modern aerospace timeline with telemetry row, filter chips, and scrubber track
 */
export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  scenes,
  beforeDate,
  afterDate,
  onSelectBeforeDate,
  onSelectAfterDate,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredScene, setHoveredScene] = useState<SceneItem | null>(null);
  const [targetDateMode] = useState<'after' | 'before'>('after');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [playSpeed, setPlaySpeed] = useState<number>(1);
  const playIntervalRef = useRef<number | null>(null);

  const sortedScenes = React.useMemo(() => {
    const seen = new Set<string>();
    const list: SceneItem[] = [];
    const sorted = [...scenes].sort(
      (a, b) => new Date(a.acquired_at).getTime() - new Date(b.acquired_at).getTime()
    );
    for (const s of sorted) {
      if (!seen.has(s.acquired_at)) {
        seen.add(s.acquired_at);
        list.push(s);
      }
    }
    return list;
  }, [scenes]);

  const displayedScenes = React.useMemo(() => {
    return selectedYear === 'all'
      ? sortedScenes
      : sortedScenes.filter((s) => s.acquired_at.startsWith(String(selectedYear)));
  }, [sortedScenes, selectedYear]);

  const currentAfterIndex = sortedScenes.findIndex((s) => s.acquired_at === afterDate);
  const usableCount = displayedScenes.filter((s) => s.usable).length;
  const cloudyCount = displayedScenes.length - usableCount;
  const changeCount = 24; // Static display value

  // Keep references updated for the playback interval
  const sortedScenesRef = useRef(sortedScenes);
  sortedScenesRef.current = sortedScenes;
  const onSelectAfterDateRef = useRef(onSelectAfterDate);
  onSelectAfterDateRef.current = onSelectAfterDate;
  const afterDateRef = useRef(afterDate);
  afterDateRef.current = afterDate;

  useEffect(() => {
    if (isPlaying && sortedScenes.length > 0) {
      playIntervalRef.current = window.setInterval(() => {
        const allScenes = sortedScenesRef.current;
        if (!allScenes.length) return;
        const currentAfter = afterDateRef.current;
        const currentIdx = allScenes.findIndex((s) => s.acquired_at === currentAfter);
        const nextIdx = (currentIdx === -1 ? 0 : currentIdx + 1) % allScenes.length;
        const nextScene = allScenes[nextIdx];
        if (nextScene) {
          afterDateRef.current = nextScene.acquired_at;
          onSelectAfterDateRef.current(nextScene.acquired_at);
        }
      }, 600 / playSpeed);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, playSpeed, sortedScenes.length]);

  const handleNext = useCallback(() => {
    if (!sortedScenes.length) return;
    const currentIdx = sortedScenes.findIndex((s) => s.acquired_at === afterDate);
    const nextIdx = currentIdx === -1 ? 0 : Math.min(sortedScenes.length - 1, currentIdx + 1);
    const nextScene = sortedScenes[nextIdx];
    if (nextScene) onSelectAfterDate(nextScene.acquired_at);
  }, [sortedScenes, afterDate, onSelectAfterDate]);

  const handlePrev = useCallback(() => {
    if (!sortedScenes.length) return;
    const currentIdx = sortedScenes.findIndex((s) => s.acquired_at === afterDate);
    const prevIdx = currentIdx === -1 ? 0 : Math.max(0, currentIdx - 1);
    const prevScene = sortedScenes[prevIdx];
    if (prevScene) onSelectAfterDate(prevScene.acquired_at);
  }, [sortedScenes, afterDate, onSelectAfterDate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  const handleSceneClick = (scene: SceneItem) => {
    if (targetDateMode === 'before') {
      onSelectBeforeDate(scene.acquired_at);
    } else {
      onSelectAfterDate(scene.acquired_at);
    }
  };

  // Calculate baseline span percentages
  const beforeIdx = displayedScenes.findIndex((s) => s.acquired_at === beforeDate);
  const afterIdx = displayedScenes.findIndex((s) => s.acquired_at === afterDate);
  const total = displayedScenes.length;
  const hasSpan = beforeIdx !== -1 && afterIdx !== -1 && total > 1;
  const minIdx = Math.min(beforeIdx, afterIdx);
  const maxIdx = Math.max(beforeIdx, afterIdx);
  const spanLeftPct = hasSpan ? (minIdx / (total - 1)) * 100 : 0;
  const spanWidthPct = hasSpan ? ((maxIdx - minIdx) / (total - 1)) * 100 : 0;

  const filterChips = [
    { label: `ALL (${displayedScenes.length})`, value: 'all' as const, active: selectedYear === 'all' },
    { label: `Clear (${usableCount})`, value: 'clear' as const, active: false },
    { label: `Cloudy (${cloudyCount})`, value: 'cloudy' as const, active: false },
    { label: `Changes (${changeCount})`, value: 'changes' as const, active: false },
  ];

  return (
    <div
      id="slot-30-timeline"
      className="w-full h-full flex flex-col justify-between select-none"
      style={{
        background: 'linear-gradient(180deg, var(--panel) 0%, rgba(8, 12, 22, 0.98) 100%)',
        borderTop: '1px solid var(--line)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.35)',
        zIndex: 20,
      }}
    >
      {/* Telemetry Row */}
      <div
        className="w-full px-4 py-1 overflow-hidden"
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'rgba(8, 12, 22, 0.6)',
        }}
      >
        <span className="t-mono block truncate" style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.04em' }}>
          Sentinel-2 L2A + Planet SkySat | 10m & 0.5m GSD | UTM 32643 | Sub-pixel co-registration ≤ 0.22 px | Radiometric Ortho-rectified | SRTM 30m DEM Corrected
        </span>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-2">
          {/* Label */}
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" style={{ color: 'var(--primary-cyan, #3FA9F5)' }} />
            <span className="t-tag font-bold" style={{ color: 'var(--ink)', fontSize: 9, letterSpacing: '0.08em' }}>
              TEMPORAL OBSERVATIONS
            </span>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1 ml-2">
            {filterChips.map(({ label, value, active: _active }) => (
              <button
                key={value}
                type="button"
                onClick={() => value === 'all' ? setSelectedYear('all') : undefined}
                className="t-mono px-2 py-0.5 cursor-pointer transition-all duration-150 rounded"
                style={{
                  background: (value === 'all' && selectedYear === 'all') ? 'var(--cyan-wash, rgba(63, 169, 245, 0.12))' : 'var(--panel-2)',
                  color: (value === 'all' && selectedYear === 'all') ? 'var(--primary-cyan, #3FA9F5)' : 'var(--ink-3)',
                  border: (value === 'all' && selectedYear === 'all') ? '1px solid rgba(63, 169, 245, 0.35)' : '1px solid var(--line)',
                  fontSize: 9,
                  fontWeight: (value === 'all' && selectedYear === 'all') ? 700 : 500,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Counter & Playback Controls */}
        <div className="flex items-center gap-2">
          <span className="t-mono tabular-nums" style={{ color: 'var(--ink-2)', fontSize: 9 }}>
            Pass {currentAfterIndex === -1 ? 1 : currentAfterIndex + 1} of {sortedScenes.length}
          </span>

          {/* Step Controls */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentAfterIndex <= 0}
              className="p-1 cursor-pointer transition-colors disabled:opacity-25"
              style={{ color: 'var(--ink-2)', background: 'none', border: 'none' }}
              title="Step backward"
            >
              <SkipBack className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1 px-2.5 py-0.5 cursor-pointer transition-all duration-150 rounded"
              style={{
                background: isPlaying ? 'var(--cyan-wash, rgba(63, 169, 245, 0.12))' : 'var(--primary-cyan, #3FA9F5)',
                color: isPlaying ? 'var(--primary-cyan, #3FA9F5)' : '#FFFFFF',
                border: `1px solid var(--primary-cyan, #3FA9F5)`,
                fontSize: 9,
                fontWeight: 700,
              }}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
              <span className="tracking-wider">{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentAfterIndex >= sortedScenes.length - 1}
              className="p-1 cursor-pointer transition-colors disabled:opacity-25"
              style={{ color: 'var(--ink-2)', background: 'none', border: 'none' }}
              title="Step forward"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>

          {/* Speed Controls */}
          <div className="hidden lg:flex items-center gap-0.5">
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaySpeed(spd)}
                className="t-mono px-1.5 py-0.5 cursor-pointer rounded transition-all"
                style={{
                  background: playSpeed === spd ? 'var(--panel-2)' : 'transparent',
                  color: playSpeed === spd ? 'var(--primary-cyan, #3FA9F5)' : 'var(--ink-3)',
                  border: playSpeed === spd ? '1px solid var(--line)' : '1px solid transparent',
                  fontSize: 8,
                  fontWeight: playSpeed === spd ? 700 : 500,
                }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrubber Track */}
      <div className="relative w-full flex items-center justify-between px-4 py-1" style={{ height: 32 }}>
        {/* Year Labels */}
        <span className="t-mono absolute left-4 -top-0.5" style={{ color: '#F59E0B', fontSize: 8, fontWeight: 700 }}>
          2021 (T0)
        </span>
        <span className="t-mono absolute right-4 -top-0.5" style={{ color: 'var(--primary-cyan, #3FA9F5)', fontSize: 8, fontWeight: 700 }}>
          2026 (T1 Active)
        </span>

        {/* Horizontal Guide Rail */}
        <div
          className="absolute left-4 right-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            height: 2,
            background: 'var(--line)',
            borderRadius: 1,
          }}
        />

        {/* Range Span */}
        {hasSpan && (
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300"
            style={{
              left: `calc(16px + ${spanLeftPct}% * ((100% - 32px) / 100))`,
              width: `calc(${spanWidthPct}% * ((100% - 32px) / 100))`,
              height: 6,
              background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.3) 0%, rgba(63, 169, 245, 0.3) 100%)',
              borderTop: '1px solid rgba(245, 158, 11, 0.6)',
              borderBottom: '1px solid rgba(63, 169, 245, 0.6)',
              borderRadius: 3,
            }}
          />
        )}

        {/* Scene Pass Nodes */}
        {displayedScenes.map((scene) => {
          const isBefore = scene.acquired_at === beforeDate;
          const isAfter = scene.acquired_at === afterDate;

          let dotStyle: React.CSSProperties;
          if (isAfter) {
            dotStyle = {
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--primary-cyan, #3FA9F5)',
              border: '2px solid #FFFFFF',
              boxShadow: '0 0 10px rgba(63, 169, 245, 0.8)',
            };
          } else if (isBefore) {
            dotStyle = {
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#F59E0B',
              border: '2px solid #FFFFFF',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.8)',
            };
          } else if (scene.usable) {
            dotStyle = {
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--primary-cyan, #3FA9F5)',
              transition: 'transform 100ms ease-out',
            };
          } else {
            dotStyle = {
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'transparent',
              border: '1.5px solid var(--ink-3)',
              transition: 'transform 100ms ease-out',
            };
          }

          return (
            <button
              type="button"
              key={scene.id}
              className="relative group w-5 h-5 flex items-center justify-center p-0 cursor-pointer bg-transparent border-none focus:outline-none z-10"
              onClick={() => handleSceneClick(scene)}
              onMouseEnter={() => setHoveredScene(scene)}
              onMouseLeave={() => setHoveredScene(null)}
              title={`${scene.acquired_at} · ${scene.usable ? 'Clear' : 'Unusable'}`}
            >
              <span
                className="block pointer-events-none group-hover:scale-150 transition-transform"
                style={dotStyle}
              />

              {/* Hover Tooltip */}
              {hoveredScene?.id === scene.id && <TimelineNodeTooltip scene={scene} />}
            </button>
          );
        })}
      </div>

      {/* Legend Row */}
      <TimelineLegend />
    </div>
  );
};
