import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Columns, Eye, SplitSquareVertical } from 'lucide-react';
import { track } from '../lib/track';

interface SwipeCompareProps {
  sliderPos: number; // 0 to 100
  onSliderChange: (newPos: number) => void;
  isSwipeActive: boolean;
  onToggleSwipe: () => void;
  beforeDate?: string;
  afterDate?: string;
  beforeYear?: string;
  afterYear?: string;
  availableDates?: string[];
  onSelectBeforeDate?: (date: string) => void;
  onSelectAfterDate?: (date: string) => void;
  onSwapDates?: () => void;
  onDragMove?: (newPos: number) => void;
}

/**
 * SLOT-18 — Stitch Swipe Controller & Dual-Epoch Spatial Comparator
 * Fluid pointer capture, real-time tile clipping, ratio HUD, and responsive positioning
 */
export const SwipeCompare: React.FC<SwipeCompareProps> = React.memo(({
  sliderPos,
  onSliderChange,
  isSwipeActive,
  onToggleSwipe,
  beforeDate = '2021-01-15',
  afterDate = '2026-08-03',
  beforeYear = beforeDate.slice(0, 4),
  afterYear = afterDate.slice(0, 4),
  onDragMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const percentTagRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastPctRef = useRef(sliderPos);
  const dragStartPctRef = useRef(sliderPos);
  const lastEmitTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [mode, setMode] = useState<'SWIPE' | 'SPLIT' | 'SINGLE'>('SWIPE');

  useEffect(() => {
    if (!isDraggingRef.current) {
      lastPctRef.current = sliderPos;
      if (dividerRef.current) dividerRef.current.style.left = `${sliderPos}%`;
      if (percentTagRef.current) percentTagRef.current.textContent = `${Math.round(sliderPos)}%`;
    }
  }, [sliderPos]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartPctRef.current = lastPctRef.current;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = Math.round((x / rect.width) * 1000) / 10;
      lastPctRef.current = pct;

      if (dividerRef.current) {
        dividerRef.current.style.left = `${pct}%`;
      }
      if (percentTagRef.current) {
        percentTagRef.current.textContent = `${Math.round(pct)}%`;
      }
      onDragMove?.(pct);

      const now = performance.now();
      if (now - lastEmitTimeRef.current > 80) {
        lastEmitTimeRef.current = now;
        onSliderChange(pct);
      }
    },
    [onSliderChange, onDragMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      track('map.swipe', {
        from_pct: dragStartPctRef.current,
        to_pct: lastPctRef.current,
      });
      onSliderChange(lastPctRef.current);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    },
    [onSliderChange]
  );

  useEffect(() => {
    const handleGlobalUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        onSliderChange(lastPctRef.current);
      }
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [onSliderChange]);

  const splitRatioLeft = Math.round(sliderPos);
  const splitRatioRight = 100 - splitRatioLeft;

  if (!isSwipeActive) {
    return (
      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={onToggleSwipe}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md border border-primary/50 text-primary hover:bg-surface-container font-label-sm text-[11px] font-semibold shadow-lg cursor-pointer transition-colors"
        >
          <Columns className="w-3.5 h-3.5" />
          <span>ENABLE DUAL-VIEW SWIPE</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute inset-0 pointer-events-none z-30 select-none"
    >
      {/* Top Center: Floating Comparison Mode Switcher */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto">
        <div className="bg-surface-container-lowest/95 backdrop-blur-md px-2 py-1 rounded-full shadow-lg flex items-center gap-2 border border-outline-variant/30">
          <div className="flex items-center bg-surface-container p-0.5 rounded-full">
            <button
              type="button"
              onClick={() => {
                setMode('SWIPE');
                if (!isSwipeActive) onToggleSwipe();
              }}
              className={`px-2.5 py-0.5 rounded-full font-label-sm text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                mode === 'SWIPE'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <SplitSquareVertical className="w-3 h-3" />
              SWIPE
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('SINGLE');
                onToggleSwipe();
              }}
              className="px-2.5 py-0.5 rounded-full font-label-sm text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors text-on-surface-variant hover:text-on-surface"
              title="Switch to single layer view"
            >
              <Eye className="w-3 h-3" />
              SINGLE
            </button>
          </div>

          <div className="h-3 w-px bg-outline-variant/30" />

          <div className="flex items-center gap-1.5 px-1 font-label-sm text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="font-code-num text-amber-300 font-bold">{beforeYear}</span>
            <span className="text-outline">vs</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="font-code-num text-primary font-bold">{afterYear}</span>
            <span className="font-code-num text-[10px] bg-surface-container px-1 rounded text-on-surface font-semibold ml-1">
              {splitRatioLeft}:{splitRatioRight}
            </span>
          </div>
        </div>
      </div>

      {/* Swipe Divider Vertical Bar & Center Drag Handle */}
      <div
        ref={dividerRef}
        className="absolute top-0 bottom-0 pointer-events-none flex items-center justify-center -translate-x-1/2 z-30"
        style={{ left: `${sliderPos}%` }}
      >
        {/* Vertical Line with Cyan/Blue glow */}
        <div className="w-[2px] h-full bg-primary shadow-[0_0_10px_rgba(77,163,255,0.9)]" />

        {/* Center Drag Handle Capsule */}
        <div
          onPointerDown={handlePointerDown}
          className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-surface-container-lowest border-2 border-primary text-primary flex items-center justify-center shadow-xl pointer-events-auto cursor-ew-resize hover:scale-110 active:scale-95 transition-transform"
          title="Drag left/right to compare baseline and current imagery"
        >
          <div className="flex items-center gap-0.5 text-[9px] font-bold text-primary select-none">
            <span>◀</span>
            <span>▶</span>
          </div>
        </div>

        {/* Percentage Floating Readout below handle */}
        <div
          ref={percentTagRef}
          className="absolute top-[54%] -translate-y-1/2 bg-surface-container-lowest/95 border border-outline-variant/40 px-1.5 py-0.5 rounded text-[9px] font-code-num text-outline shadow-sm whitespace-nowrap pointer-events-none"
        >
          {Math.round(sliderPos)}%
        </div>
      </div>
    </div>
  );
});
