import React, { useRef, useCallback, useEffect, useState } from 'react';
import { track } from '../lib/track';

interface SwipeCompareProps {
  sliderPos: number; // 0 to 100
  onSliderChange: (newPos: number) => void;
  isSwipeActive: boolean;
  onToggleSwipe: () => void;
  beforeDate: string;
  afterDate: string;
  availableDates?: string[];
  onSelectBeforeDate?: (date: string) => void;
  onSelectAfterDate?: (date: string) => void;
  onSwapDates?: () => void;
  onDragMove?: (newPos: number) => void;
}

export type ViewMode = 'SWIPE' | 'SPLIT' | 'BLEND' | 'SINGLE';

export const SwipeCompare: React.FC<SwipeCompareProps> = React.memo(({
  sliderPos,
  onSliderChange,
  isSwipeActive,
  onToggleSwipe,
  beforeDate,
  afterDate,
  onDragMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastPctRef = useRef(sliderPos);
  const dragStartPctRef = useRef(sliderPos);
  const lastEmitTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [mode, setMode] = useState<ViewMode>('SWIPE');

  const beforeYear = beforeDate.slice(0, 4) || '2021';
  const afterYear = afterDate.slice(0, 4) || '2026';

  useEffect(() => {
    if (!isDraggingRef.current) {
      lastPctRef.current = sliderPos;
      if (dividerRef.current) dividerRef.current.style.left = `${sliderPos}%`;
    }
  }, [sliderPos]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
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
      onDragMove?.(pct);

      const now = performance.now();
      if (now - lastEmitTimeRef.current > 100) {
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
  const splitRatioRight = Math.round(100 - sliderPos);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute inset-0 pointer-events-none z-[400] select-none"
    >
      {/* Top Center: Floating Comparison Mode Switcher */}
      <div className="absolute top-space-md left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto">
        <div className="bg-surface-container-lowest/95 backdrop-blur-md px-2 py-1 rounded-lg shadow-md flex items-center gap-2 border border-outline-variant/30">
          <div className="flex items-center bg-surface-container p-0.5 rounded">
            <button
              type="button"
              onClick={() => {
                setMode('SWIPE');
                if (!isSwipeActive) onToggleSwipe();
              }}
              className={`px-2.5 py-1 rounded font-label-sm text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                mode === 'SWIPE' && isSwipeActive
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">compare</span>
              SWIPE
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('SPLIT');
                if (!isSwipeActive) onToggleSwipe();
              }}
              className={`px-2 py-1 rounded font-label-sm text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                mode === 'SPLIT'
                  ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">splitscreen</span>
              SPLIT
            </button>

            <button
              type="button"
              onClick={() => setMode('BLEND')}
              className={`px-2 py-1 rounded font-label-sm text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                mode === 'BLEND'
                  ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">opacity</span>
              BLEND
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('SINGLE');
                if (isSwipeActive) onToggleSwipe();
              }}
              className={`px-2 py-1 rounded font-label-sm text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                mode === 'SINGLE' || !isSwipeActive
                  ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">crop_square</span>
              SINGLE
            </button>
          </div>

          <div className="h-4 w-px bg-outline-variant/30" />

          <div className="flex items-center gap-1.5 px-1 font-label-sm text-[10px]">
            <span className="text-outline">Split:</span>
            <span className="font-code-num text-[11px] text-primary font-semibold">
              {splitRatioLeft}:{splitRatioRight}
            </span>
          </div>
        </div>
      </div>

      {/* Swipe Divider Vertical Bar & Center Drag Handle */}
      {isSwipeActive && (
        <div
          ref={dividerRef}
          className="absolute top-0 bottom-0 pointer-events-none flex items-center justify-center -translate-x-1/2 z-30"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Vertical Blue Line */}
          <div className="w-0.5 h-full bg-primary shadow-[0_0_10px_rgba(77,163,255,0.8)]" />

          {/* Center Drag Capsule */}
          <div
            onPointerDown={handlePointerDown}
            className="absolute top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-surface-container-lowest border-2 border-primary text-primary flex items-center justify-center shadow-lg pointer-events-auto cursor-ew-resize hover:scale-105 active:scale-95 transition-transform"
            title="Drag to wipe between 2021 and 2026"
          >
            <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
          </div>

          {/* Temporal Epoch badge below handle */}
          <div className="absolute top-[55%] -translate-y-1/2 bg-surface-container-lowest/95 border border-outline-variant/40 px-1.5 py-0.5 rounded text-[9px] font-code-num text-outline shadow-sm whitespace-nowrap pointer-events-none">
            {beforeYear} | {afterYear}
          </div>
        </div>
      )}
    </div>
  );
});
