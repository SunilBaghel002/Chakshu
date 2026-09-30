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

type FilterMode = 'all' | 'clear' | 'cloudy' | 'changes';

function isHighChangeScene(scene: SceneItem, index: number): boolean {
  if (!scene.usable || Number(scene.acquired_at.slice(0, 4)) < 2022) return false;
  return (
    index % 4 === 0 ||
    scene.acquired_at.startsWith('2023-08') ||
    scene.acquired_at.startsWith('2024-04') ||
    scene.acquired_at.startsWith('2025-06')
  );
}

/**
 * SLOT-30 — Observation Deck
 * Modern aerospace timeline with interactive filter chips, non-overlapping year/T0/T1 axis, and recessed scrubber rail.
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
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
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

  const currentAfterIndex = sortedScenes.findIndex((s) => s.acquired_at === afterDate);
  const usableCount = sortedScenes.filter((s) => s.usable).length;
  const cloudyCount = sortedScenes.length - usableCount;
  const highChangeCount = sortedScenes.filter((s, idx) => isHighChangeScene(s, idx)).length;

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
        const currentIdx = allScenes.findIndex((s) => s.acquired_at === afterDateRef.current);
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
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
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
    if (targetDateMode === 'before') onSelectBeforeDate(scene.acquired_at);
    else onSelectAfterDate(scene.acquired_at);
  };

  const beforeIdx = sortedScenes.findIndex((s) => s.acquired_at === beforeDate);
  const afterIdx = sortedScenes.findIndex((s) => s.acquired_at === afterDate);
  const total = sortedScenes.length;
  const hasSpan = beforeIdx !== -1 && afterIdx !== -1 && total > 1;
  const minIdx = Math.min(beforeIdx, afterIdx);
  const maxIdx = Math.max(beforeIdx, afterIdx);
  const spanLeftPct = hasSpan ? (minIdx / (total - 1)) * 100 : 0;
  const spanWidthPct = hasSpan ? ((maxIdx - minIdx) / (total - 1)) * 100 : 0;

  const filterChips: { label: string; value: FilterMode; accent?: string }[] = [
    { label: `ALL (${sortedScenes.length})`, value: 'all' },
    { label: `Clear (${usableCount})`, value: 'clear' },
    { label: `Cloudy (${cloudyCount})`, value: 'cloudy' },
    { label: `Changes (${highChangeCount})`, value: 'changes', accent: '#EF4444' },
  ];
  const years = ['2021', '2022', '2023', '2024', '2025', '2026'];

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
      {/* Row 1: Header, Filter Chips & Playback Controls */}
      <div
        className="flex items-center justify-between px-4 py-1.5"
        style={{ borderBottom: '1px solid rgba(30, 43, 68, 0.6)' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--primary-cyan, #3FA9F5)' }} />
            <span className="t-tag font-bold" style={{ color: 'var(--ink)', fontSize: 9.5, letterSpacing: '0.08em' }}>
              TEMPORAL OBSERVATIONS
            </span>
          </div>

          <div className="flex items-center gap-1 ml-2">
            {filterChips.map(({ label, value, accent }) => {
              const isActive = activeFilter === value;
              const activeColor = accent || 'var(--primary-cyan, #3FA9F5)';
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveFilter(value)}
                  className="t-mono px-2 py-0.5 cursor-pointer transition-all duration-150 rounded"
                  style={{
                    background: isActive
                      ? accent ? 'rgba(239, 68, 68, 0.14)' : 'var(--cyan-wash, rgba(63, 169, 245, 0.14))'
                      : 'var(--panel-2)',
                    color: isActive ? activeColor : 'var(--ink-3)',
                    border: isActive
                      ? `1px solid ${accent ? 'rgba(239, 68, 68, 0.45)' : 'rgba(63, 169, 245, 0.45)'}`
                      : '1px solid var(--line)',
                    fontSize: 9,
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className="t-mono tabular-nums px-2 py-0.5 rounded"
            style={{ color: 'var(--ink-2)', background: 'var(--panel-2)', border: '1px solid var(--line)', fontSize: 9 }}
          >
            Pass <strong>{currentAfterIndex === -1 ? 1 : currentAfterIndex + 1}</strong> of {sortedScenes.length}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentAfterIndex <= 0}
              className="p-1 rounded cursor-pointer transition-colors hover:bg-[var(--panel-2)] disabled:opacity-25"
              style={{ color: 'var(--ink-2)', background: 'none', border: 'none' }}
              title="Step backward (←)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1 px-2.5 py-0.5 cursor-pointer transition-all duration-150 rounded"
              style={{
                background: isPlaying ? 'var(--cyan-wash, rgba(63, 169, 245, 0.15))' : 'var(--primary-cyan, #3FA9F5)',
                color: isPlaying ? 'var(--primary-cyan, #3FA9F5)' : '#FFFFFF',
                border: '1px solid var(--primary-cyan, #3FA9F5)',
                fontSize: 9,
                fontWeight: 700,
              }}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
              <span className="tracking-wider">{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentAfterIndex >= sortedScenes.length - 1}
              className="p-1 rounded cursor-pointer transition-colors hover:bg-[var(--panel-2)] disabled:opacity-25"
              style={{ color: 'var(--ink-2)', background: 'none', border: 'none' }}
              title="Step forward (→)"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

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
                  border: playSpeed === spd ? '1px solid var(--line-strong)' : '1px solid transparent',
                  fontSize: 8.5,
                  fontWeight: playSpeed === spd ? 700 : 500,
                }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Dedicated Year Axis + Recessed Scrubber Track */}
      <div className="flex flex-col px-4 py-1 gap-1">
        <div className="flex items-center justify-between px-1">
          <span className="t-mono flex items-center gap-1" style={{ color: '#F59E0B', fontSize: 8.5, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
            T0 BASELINE · {beforeDate}
          </span>

          <div className="hidden md:flex items-center gap-8 t-mono" style={{ fontSize: 8, color: 'var(--ink-3)' }}>
            {years.map((yr) => (
              <span key={yr} style={{ letterSpacing: '0.06em' }}>{yr}</span>
            ))}
          </div>

          <span className="t-mono flex items-center gap-1" style={{ color: 'var(--primary-cyan, #3FA9F5)', fontSize: 8.5, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-cyan, #3FA9F5)', display: 'inline-block' }} />
            T1 ACTIVE · {afterDate}
          </span>
        </div>

        <div
          className="relative w-full flex items-center justify-between px-3 rounded"
          style={{ height: 24, background: 'rgba(6, 10, 18, 0.78)', border: '1px solid var(--line)' }}
        >
          <div
            className="absolute left-3 right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ height: 2, background: 'var(--line-strong)', borderRadius: 1 }}
          />

          {hasSpan && (
            <div
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300"
              style={{
                left: `calc(12px + ${spanLeftPct}% * ((100% - 24px) / 100))`,
                width: `calc(${spanWidthPct}% * ((100% - 24px) / 100))`,
                height: 6,
                background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.35) 0%, rgba(63, 169, 245, 0.35) 100%)',
                borderTop: '1px solid rgba(245, 158, 11, 0.65)',
                borderBottom: '1px solid rgba(63, 169, 245, 0.65)',
                borderRadius: 3,
              }}
            />
          )}

          {sortedScenes.map((scene, idx) => {
            const isBefore = scene.acquired_at === beforeDate;
            const isAfter = scene.acquired_at === afterDate;
            const isHighDelta = isHighChangeScene(scene, idx);
            const matchesFilter =
              activeFilter === 'all' ||
              (activeFilter === 'clear' && scene.usable) ||
              (activeFilter === 'cloudy' && !scene.usable) ||
              (activeFilter === 'changes' && isHighDelta);

            const dotStyle: React.CSSProperties = isAfter
              ? { width: 11, height: 11, borderRadius: '50%', background: 'var(--primary-cyan, #3FA9F5)', border: '2px solid #FFFFFF', boxShadow: '0 0 10px rgba(63, 169, 245, 0.9)' }
              : isBefore
              ? { width: 11, height: 11, borderRadius: '50%', background: '#F59E0B', border: '2px solid #FFFFFF', boxShadow: '0 0 10px rgba(245, 158, 11, 0.9)' }
              : isHighDelta
              ? { width: 6.5, height: 6.5, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px rgba(239, 68, 68, 0.65)', opacity: matchesFilter ? 1 : 0.2 }
              : scene.usable
              ? { width: 5.5, height: 5.5, borderRadius: '50%', background: 'var(--primary-cyan, #3FA9F5)', opacity: matchesFilter ? 0.9 : 0.18 }
              : { width: 5.5, height: 5.5, borderRadius: '50%', background: 'transparent', border: '1.5px solid var(--ink-3)', opacity: matchesFilter ? 0.85 : 0.18 };

            return (
              <button
                type="button"
                key={scene.id}
                className="relative group w-4 h-5 flex items-center justify-center p-0 cursor-pointer bg-transparent border-none focus:outline-none z-10"
                onClick={() => handleSceneClick(scene)}
                onMouseEnter={() => setHoveredScene(scene)}
                onMouseLeave={() => setHoveredScene(null)}
                title={`${scene.acquired_at} · ${scene.usable ? 'Clear' : 'Cloudy'}`}
              >
                <span className="block pointer-events-none group-hover:scale-150 transition-transform" style={dotStyle} />
                {hoveredScene?.id === scene.id && <TimelineNodeTooltip scene={scene} />}
              </button>
            );
          })}
        </div>
      </div>

      <TimelineLegend />
    </div>
  );
};
