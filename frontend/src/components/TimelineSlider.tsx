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
 * SLOT-30 — Tactical Timeline & Chronological Pass Deck
 * Two-tier aerospace deck:
 * Upper: Playback suite, segmented year filter, target date mode toggle, pass counters
 * Lower: Illuminated baseline track with glowing range band, T₀ / T₁ radar nodes, and hover inspection
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
  const usableCount = displayedScenes.filter((s) => s.usable).length;
  const unusableCount = displayedScenes.length - usableCount;

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

  // Calculate baseline span percentages along displayed track
  const beforeIdx = displayedScenes.findIndex((s) => s.acquired_at === beforeDate);
  const afterIdx = displayedScenes.findIndex((s) => s.acquired_at === afterDate);
  const total = displayedScenes.length;
  const hasSpan = beforeIdx !== -1 && afterIdx !== -1 && total > 1;
  const minIdx = Math.min(beforeIdx, afterIdx);
  const maxIdx = Math.max(beforeIdx, afterIdx);
  const spanLeftPct = hasSpan ? (minIdx / (total - 1)) * 100 : 0;
  const spanWidthPct = hasSpan ? ((maxIdx - minIdx) / (total - 1)) * 100 : 0;

  return (
    <div
      id="slot-30-timeline"
      className="w-full px-4 py-1.5 flex flex-col justify-between select-none"
      style={{
        height: 76,
        background: 'linear-gradient(180deg, var(--panel) 0%, rgba(8, 12, 22, 0.98) 100%)',
        borderTop: '1px solid var(--line)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.35)',
        zIndex: 20,
      }}
    >
      {/* TIER 1: MISSION CONTROLS DECK */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Playback Suite & Year Segments */}
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1 cursor-pointer transition-all duration-150 rounded"
            style={{
              background: isPlaying ? 'var(--signal-wash)' : 'var(--signal)',
              color: isPlaying ? 'var(--signal)' : 'var(--signal-ink)',
              border: `1px solid var(--signal)`,
              fontSize: 9.5,
              fontWeight: 700,
              boxShadow: isPlaying ? '0 0 10px rgba(255, 148, 38, 0.4)' : '0 0 8px rgba(255, 148, 38, 0.25)',
            }}
            title={isPlaying ? 'Pause timeline playback' : 'Play timeline animation'}
          >
            {isPlaying ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            <span className="tracking-wider">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          {/* Step Back / Step Forward */}
          <div
            className="flex items-center p-0.5"
            style={{
              background: 'var(--panel-2)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius)',
            }}
          >
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentAfterIndex <= 0}
              className="p-1 cursor-pointer transition-colors disabled:opacity-25 hover:text-[var(--ink)]"
              style={{ color: 'var(--ink-2)', background: 'none', border: 'none' }}
              title="Step backward to previous pass"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentAfterIndex >= sortedScenes.length - 1}
              className="p-1 cursor-pointer transition-colors disabled:opacity-25 hover:text-[var(--ink)]"
              style={{ color: 'var(--ink-2)', background: 'none', border: 'none' }}
              title="Step forward to next pass"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>

          {/* Year Filter Segmented Control */}
          <div
            className="hidden lg:flex items-center gap-0.5 p-0.5"
            style={{
              background: 'var(--panel-2)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius)',
            }}
          >
            {(['all', 2021, 2022, 2023, 2024, 2025, 2026] as const).map((yr) => {
              const isActive = selectedYear === yr;
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className="t-mono px-2 py-0.5 cursor-pointer transition-all duration-150 rounded"
                  style={{
                    background: isActive ? 'var(--panel-3)' : 'transparent',
                    color: isActive ? 'var(--signal)' : 'var(--ink-3)',
                    border: isActive ? '1px solid rgba(255, 148, 38, 0.4)' : '1px solid transparent',
                    fontSize: 9,
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {yr === 'all' ? 'ALL' : yr}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Target Mode Selector (Click sets Date A or Date B) */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--panel-2)] border border-[var(--line-strong)] rounded-[var(--radius)]">
          <span className="t-tag hidden sm:inline text-[var(--ink-3)] text-[8px]">CLICK ASSIGNS:</span>
          <button
            type="button"
            onClick={() => setTargetDateMode('before')}
            className={`t-mono px-2 py-0.5 cursor-pointer transition-all duration-150 rounded flex items-center gap-1.5 text-[9.5px] ${
              targetDateMode === 'before' ? 'bg-[var(--signal-wash)] text-[var(--signal)] border border-[var(--signal)] font-bold shadow-[0_0_8px_rgba(255,148,38,0.25)]' : 'bg-[var(--panel)] text-[var(--ink-3)] border border-[var(--line)] font-medium'
            }`}
            title="Clicking any pass node sets T₀ Baseline Date"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal)]" />
            <span>DATE A ({beforeDate})</span>
          </button>
          <button
            type="button"
            onClick={() => setTargetDateMode('after')}
            className={`t-mono px-2 py-0.5 cursor-pointer transition-all duration-150 rounded flex items-center gap-1.5 text-[9.5px] ${
              targetDateMode === 'after' ? 'bg-[var(--ion-wash)] text-[var(--ion)] border border-[var(--ion)] font-bold shadow-[0_0_8px_rgba(63,169,245,0.25)]' : 'bg-[var(--panel)] text-[var(--ink-3)] border border-[var(--line)] font-medium'
            }`}
            title="Clicking any pass node sets T₁ Observation Date"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ion)]" />
            <span>DATE B ({afterDate})</span>
          </button>
        </div>

        {/* Telemetry Count & Legend */}
        <div className="hidden md:flex items-center gap-3 t-tag" style={{ fontSize: 8.5 }}>
          <span className="t-mono tabular-nums" style={{ color: 'var(--ink-2)' }}>
            {displayedScenes.length} PASSES
          </span>
          <div className="flex items-center gap-1.5">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} />
            <span style={{ color: 'var(--teal)' }}>{usableCount} CLEAR</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1.5px solid var(--danger)', display: 'inline-block' }} />
            <span style={{ color: 'var(--danger)' }}>{unusableCount} UNUSABLE</span>
          </div>
        </div>
      </div>

      {/* TIER 2: CHRONOLOGICAL TIMELINE TRACK */}
      <div className="relative w-full flex items-center justify-between h-7 px-1">
        {/* Horizontal Guide Rail Track */}
        <div
          className="absolute left-2 right-2 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            height: 2,
            background: 'var(--line)',
            borderRadius: 1,
          }}
        />

        {/* Illuminated Baseline Range Span */}
        {hasSpan && (
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300"
            style={{
              left: `calc(8px + ${spanLeftPct}% * ((100% - 16px) / 100))`,
              width: `calc(${spanWidthPct}% * ((100% - 16px) / 100))`,
              height: 6,
              background: 'linear-gradient(90deg, rgba(255, 148, 38, 0.3) 0%, rgba(63, 169, 245, 0.3) 100%)',
              borderTop: '1px solid rgba(255, 148, 38, 0.6)',
              borderBottom: '1px solid rgba(63, 169, 245, 0.6)',
              borderRadius: 3,
              boxShadow: '0 0 10px rgba(255, 148, 38, 0.2)',
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
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: 'var(--ion)',
              border: '2px solid #FFFFFF',
              boxShadow: '0 0 12px rgba(63, 169, 245, 0.9)',
            };
          } else if (isBefore) {
            dotStyle = {
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: 'var(--signal)',
              border: '2px solid #FFFFFF',
              boxShadow: '0 0 12px rgba(255, 148, 38, 0.9)',
            };
          } else if (scene.usable) {
            dotStyle = {
              width: 6.5,
              height: 6.5,
              borderRadius: '50%',
              background: 'var(--teal)',
              transition: 'transform 100ms ease-out',
            };
          } else {
            dotStyle = {
              width: 6.5,
              height: 6.5,
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
              className="relative group w-6 h-6 flex items-center justify-center p-0 cursor-pointer bg-transparent border-none focus:outline-none z-10"
              onClick={() => handleSceneClick(scene)}
              onMouseEnter={() => setHoveredScene(scene)}
              onMouseLeave={() => setHoveredScene(null)}
              title={`${scene.acquired_at} · ${scene.usable ? 'Clear' : 'Unusable'}`}
            >
              <span
                className="block pointer-events-none group-hover:scale-150 transition-transform"
                style={dotStyle}
              />

              {/* Node Badge Tag for Date A and Date B */}
              {(isBefore || isAfter) && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 t-tag font-bold pointer-events-none"
                  style={{
                    fontSize: 7.5,
                    color: isBefore ? 'var(--signal)' : 'var(--ion)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {isBefore ? 'T₀' : 'T₁'}
                </span>
              )}

              {/* Holographic Tooltip */}
              {hoveredScene?.id === scene.id && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-52 p-2.5 pointer-events-none text-left z-50 rounded bg-[var(--panel)] border border-[var(--line-strong)] shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
                  <div className="flex items-center justify-between t-mono text-[11px] font-bold text-[var(--ink)]">
                    <span>{scene.acquired_at}</span>
                    <span className={`t-tag px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[8px] border ${
                      scene.usable ? 'bg-[var(--measured-fill)] text-[var(--measured-text)] border-[var(--measured-border)]' : 'bg-[var(--rejected-fill)] text-[var(--rejected-text)] border-[var(--rejected-border)]'
                    }`}>
                      {scene.usable ? 'CLEAR PASS' : 'UNUSABLE'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between t-mono mt-1.5 text-[var(--ink-3)] text-[9.5px]">
                    <span>Cloud Coverage:</span>
                    <span className="tabular-nums font-bold" style={{ color: scene.cloud_cover_pct > 20 ? 'var(--danger)' : 'var(--ink)' }}>
                      {scene.cloud_cover_pct.toFixed(1)}%
                    </span>
                  </div>

                  {scene.unusable_reason && (
                    <div className="flex items-center gap-1 mt-1 t-mono text-[var(--danger)] text-[9px]">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{scene.unusable_reason}</span>
                    </div>
                  )}

                  <div className={`t-tag mt-2 pt-1.5 flex items-center justify-between border-t border-[var(--line)] text-[8.5px] font-bold ${
                    targetDateMode === 'before' ? 'text-[var(--signal)]' : 'text-[var(--ion)]'
                  }`}>
                    <span>CLICK TO SET</span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--panel-2)]">
                      {targetDateMode === 'before' ? 'T₀ DATE A' : 'T₁ DATE B'}
                    </span>
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

