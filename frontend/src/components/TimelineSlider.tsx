import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertTriangle, SkipBack, SkipForward } from 'lucide-react';
import type { SceneItem } from '../lib/api';

interface TimelineSliderProps {
  scenes: SceneItem[];
  beforeDate: string;
  afterDate: string;
  onSelectBeforeDate: (date: string) => void;
  onSelectAfterDate: (date: string) => void;
}

/**
 * SLOT-30 — Timeline Strip (72px)
 * Teal-filled usable dots, hollow red unusable, compared dates ringed amber.
 * Console-style dark treatment.
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
  const [targetDateMode, setTargetDateMode] = useState<'after' | 'before'>('after');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const playIntervalRef = useRef<number | null>(null);

  const sortedScenes = React.useMemo(() => {
    return [...scenes].sort(
      (a, b) => new Date(a.acquired_at).getTime() - new Date(b.acquired_at).getTime()
    );
  }, [scenes]);

  const displayedScenes = React.useMemo(() => {
    return selectedYear === 'all'
      ? sortedScenes
      : sortedScenes.filter((s) => s.acquired_at.startsWith(String(selectedYear)));
  }, [sortedScenes, selectedYear]);

  const currentAfterIndex = sortedScenes.findIndex((s) => s.acquired_at === afterDate);

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
    <div
      id="slot-30-timeline"
      className="w-full px-4 py-2 flex flex-col justify-between select-none"
      style={{
        height: 72,
        background: 'var(--panel)',
        borderTop: '1px solid var(--line)',
        zIndex: 20,
      }}
    >
      {/* Top: Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Playback */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="btn-primary"
            style={{ padding: '4px 12px', fontSize: 10, minHeight: 26 }}
            title={isPlaying ? 'Pause' : 'Play timeline'}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            onClick={handlePrev}
            disabled={currentAfterIndex <= 0}
            className="p-1.5 cursor-pointer transition-colors disabled:opacity-30"
            style={{
              background: 'var(--panel-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
              borderRadius: 'var(--radius)',
            }}
            title="Previous"
          >
            <SkipBack className="w-3 h-3" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentAfterIndex >= sortedScenes.length - 1}
            className="p-1.5 cursor-pointer transition-colors disabled:opacity-30"
            style={{
              background: 'var(--panel-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
              borderRadius: 'var(--radius)',
            }}
            title="Next"
          >
            <SkipForward className="w-3 h-3" />
          </button>

          {/* Year filter */}
          <div
            className="hidden lg:flex items-center gap-0.5 p-0.5 ml-1"
            style={{
              background: 'var(--panel-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
            }}
          >
            {(['all', 2021, 2022, 2023, 2024, 2025, 2026] as const).map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className="t-tag px-1.5 py-0.5 cursor-pointer transition-colors"
                style={{
                  background: selectedYear === yr ? 'var(--amber-wash)' : 'transparent',
                  color: selectedYear === yr ? 'var(--amber)' : 'var(--ink-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: 9,
                  fontWeight: selectedYear === yr ? 700 : 600,
                }}
              >
                {yr === 'all' ? 'ALL' : yr}
              </button>
            ))}
          </div>
        </div>

        {/* Target mode */}
        <div
          className="flex items-center gap-1 px-2 py-1"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
          }}
        >
          <span className="t-tag hidden sm:inline" style={{ color: 'var(--ink-3)', fontSize: 8 }}>CLICK SETS:</span>
          <button
            onClick={() => setTargetDateMode('before')}
            className="t-tag px-2 py-0.5 cursor-pointer transition-colors"
            style={{
              background: targetDateMode === 'before' ? 'var(--amber-wash)' : 'transparent',
              color: targetDateMode === 'before' ? 'var(--amber)' : 'var(--ink-3)',
              border: targetDateMode === 'before' ? '1px solid var(--amber)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              fontSize: 9,
            }}
          >
            DATE A ({beforeDate})
          </button>
          <button
            onClick={() => setTargetDateMode('after')}
            className="t-tag px-2 py-0.5 cursor-pointer transition-colors"
            style={{
              background: targetDateMode === 'after' ? 'var(--teal-wash)' : 'transparent',
              color: targetDateMode === 'after' ? 'var(--teal)' : 'var(--ink-3)',
              border: targetDateMode === 'after' ? '1px solid var(--teal)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              fontSize: 9,
            }}
          >
            DATE B ({afterDate})
          </button>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 t-tag" style={{ fontSize: 8, color: 'var(--ink-3)' }}>
          <div className="flex items-center gap-1">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} />
            <span>CLEAR</span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--danger)', display: 'inline-block' }} />
            <span style={{ color: 'var(--danger)' }}>UNUSABLE</span>
          </div>
        </div>
      </div>

      {/* Dot timeline */}
      <div className="relative w-full flex items-center justify-between h-6">
        {displayedScenes.map((scene) => {
          const isBefore = scene.acquired_at === beforeDate;
          const isAfter = scene.acquired_at === afterDate;

          let dotStyle: React.CSSProperties;
          if (isAfter) {
            dotStyle = {
              width: 12, height: 12,
              borderRadius: '50%',
              background: 'var(--teal)',
              border: '2px solid var(--ink)',
              boxShadow: '0 0 8px rgba(53, 184, 192, 0.5)',
            };
          } else if (isBefore) {
            dotStyle = {
              width: 10, height: 10,
              borderRadius: '50%',
              background: 'var(--amber)',
              border: '2px solid var(--ink)',
              boxShadow: '0 0 6px rgba(240, 180, 95, 0.4)',
            };
          } else if (scene.usable) {
            dotStyle = {
              width: 6, height: 6,
              borderRadius: '50%',
              background: 'var(--teal)',
              transition: 'transform 100ms ease-out',
            };
          } else {
            dotStyle = {
              width: 6, height: 6,
              borderRadius: '50%',
              background: 'transparent',
              border: '1.5px solid var(--danger)',
              transition: 'transform 100ms ease-out',
            };
          }

          return (
            <button
              type="button"
              key={scene.id}
              className="relative group w-6 h-6 flex items-center justify-center p-0 cursor-pointer bg-transparent border-none focus:outline-none"
              onClick={() => handleSceneClick(scene)}
              onMouseEnter={() => setHoveredScene(scene)}
              onMouseLeave={() => setHoveredScene(null)}
              title={`${scene.acquired_at} · ${scene.usable ? 'Clear' : 'Unusable'}`}
            >
              <span
                className="block pointer-events-none group-hover:scale-150"
                style={dotStyle}
              />

              {/* Tooltip */}
              {hoveredScene?.id === scene.id && (
                <div
                  className="absolute bottom-7 left-1/2 -translate-x-1/2 w-48 p-2 pointer-events-none text-left z-50"
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--line-strong)',
                    borderRadius: 'var(--radius)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                  }}
                >
                  <div className="flex items-center justify-between t-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>
                    <span>{scene.acquired_at}</span>
                    <span
                      className="t-tag"
                      style={{
                        padding: '1px 4px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 8,
                        background: scene.usable ? 'var(--measured-fill)' : 'var(--rejected-fill)',
                        color: scene.usable ? 'var(--measured-text)' : 'var(--rejected-text)',
                        border: `1px solid ${scene.usable ? 'var(--measured-border)' : 'var(--rejected-border)'}`,
                      }}
                    >
                      {scene.usable ? 'CLEAR' : 'UNUSABLE'}
                    </span>
                  </div>
                  <div className="t-mono mt-1" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
                    Cloud: <span className="tabular-nums" style={{ color: 'var(--ink-2)' }}>{scene.cloud_cover_pct.toFixed(1)}%</span>
                  </div>
                  {scene.unusable_reason && (
                    <div className="flex items-center gap-1 mt-1 t-mono" style={{ color: 'var(--danger)', fontSize: 9 }}>
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{scene.unusable_reason}</span>
                    </div>
                  )}
                  <div className="t-tag mt-1.5 pt-1" style={{ borderTop: '1px solid var(--line)', color: 'var(--amber)', fontSize: 8 }}>
                    CLICK → SET {targetDateMode === 'before' ? 'DATE A' : 'DATE B'}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
