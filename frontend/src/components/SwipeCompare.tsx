import React, { useRef, useCallback, useEffect } from 'react';
import { Columns, Eye } from 'lucide-react';
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

export const SwipeCompare: React.FC<SwipeCompareProps> = React.memo(({
  sliderPos,
  onSliderChange,
  isSwipeActive,
  onToggleSwipe,
  beforeDate: _beforeDate,
  afterDate: _afterDate,
  availableDates: _availableDates = [],
  onSelectBeforeDate: _onSelectBeforeDate,
  onSelectAfterDate: _onSelectAfterDate,
  onSwapDates: _onSwapDates,
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

  useEffect(() => {
    if (!isDraggingRef.current) {
      lastPctRef.current = sliderPos;
      if (dividerRef.current) dividerRef.current.style.left = `${sliderPos}%`;
      if (percentTagRef.current) percentTagRef.current.textContent = `${Math.round(sliderPos)}%`;
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
      if (percentTagRef.current) {
        percentTagRef.current.textContent = `${Math.round(pct)}%`;
      }
      onDragMove?.(pct);

      // Throttle root state changes to ~100ms to avoid re-rendering entire ConsoleApp during drag
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

  if (!isSwipeActive) {
    return (
      <div className="absolute top-4 left-3 z-[400]">
        <button
          onClick={onToggleSwipe}
          className="flex items-center gap-2 px-3.5 py-2 t-tag cursor-pointer transition-colors"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--amber)',
            color: 'var(--amber)',
            borderRadius: 'var(--radius)',
            fontSize: 10,
          }}
        >
          <Columns className="w-4 h-4" />
          <span>ENABLE SPLIT VIEW</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute inset-0 pointer-events-none z-[400] select-none"
    >
      {/* Top Center Floating HUD Mode Pill */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto px-2 py-1 rounded-full shadow-lg transition-all"
        style={{
          background: 'rgba(14, 22, 38, 0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--line-strong)',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 px-2 py-0.5 t-tag" style={{ color: 'var(--ink-2)', fontSize: 9 }}>
          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--amber)' }} />
          <span className="t-mono font-bold" style={{ color: 'var(--amber)' }}>T₀</span>
          <span style={{ color: 'var(--line-strong)' }}>vs</span>
          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ion)' }} />
          <span className="t-mono font-bold" style={{ color: 'var(--ion)' }}>T₁</span>
          <span className="t-mono tabular-nums px-1.5 py-0.2 rounded" style={{ background: 'var(--panel)', color: 'var(--ink)' }}>
            {Math.round(sliderPos)}%
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleSwipe}
          className="flex items-center gap-1.5 px-2.5 py-1 t-tag cursor-pointer transition-colors rounded-full"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--line-strong)',
            color: 'var(--teal)',
            fontSize: 9,
            fontWeight: 700,
          }}
          title="Switch to single layer view"
        >
          <Eye className="w-3 h-3" />
          <span>SINGLE VIEW</span>
        </button>
      </div>

      {/* Vertical Hairline Divider — amber */}
      <div
        ref={dividerRef}
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: `${sliderPos}%`,
          width: 2,
          background: 'var(--amber)',
          boxShadow: '0 0 12px rgba(240, 180, 95, 0.6)',
        }}
      >
        {/* Draggable Handle */}
        <div
          onPointerDown={handlePointerDown}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center cursor-ew-resize pointer-events-auto transition-transform hover:scale-110 active:scale-95"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--panel)',
            border: '2px solid var(--amber)',
            boxShadow: '0 0 16px rgba(240, 180, 95, 0.5)',
          }}
          title="Drag to wipe between Before and After"
        >
          <div className="flex items-center gap-1" style={{ color: 'var(--amber)', fontSize: 10, fontWeight: 700 }}>
            <span>◀</span>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)' }} />
            <span>▶</span>
          </div>
        </div>

        {/* Percentage tag */}
        <div
          ref={percentTagRef}
          className="absolute bottom-6 -translate-x-1/2 t-mono tabular-nums pointer-events-none px-2 py-0.5"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            color: 'var(--ink-2)',
            borderRadius: 'var(--radius)',
            fontSize: 10,
          }}
        >
          {Math.round(sliderPos)}%
        </div>
      </div>
    </div>
  );
});
