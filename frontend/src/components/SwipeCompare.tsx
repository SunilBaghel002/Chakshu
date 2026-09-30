import React, { useRef, useCallback, useEffect } from 'react';
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

const formatDateLabel = (dateStr: string | undefined, fallback: string) => { if (!dateStr) return fallback;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthIdx = parseInt(parts[1] || '1', 10) - 1;
      return `${parts[2]} ${months[monthIdx] || parts[1]} ${parts[0]}`;
    }
    return dateStr;
  } catch {
    return fallback;
  }
};

/**
 * SLOT-18: Swipe Controller
 * Modern aerospace swipe overlay with baseline & current pills, circular grip handle, and split readout
 */
export const SwipeCompare: React.FC<SwipeCompareProps> = React.memo(({
  sliderPos,
  onSliderChange,
  isSwipeActive,
  onToggleSwipe: _onToggleSwipe,
  beforeDate,
  afterDate,
  availableDates = [],
  onSelectBeforeDate,
  onSelectAfterDate,
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

  const beforeOptions = React.useMemo(() => {
    const dates = availableDates && availableDates.length > 0
      ? availableDates
      : ['2021-01-15', '2021-03-20', '2021-11-25', '2022-04-12', '2023-01-10', '2024-06-09', '2026-08-03'];
    return dates.includes(beforeDate) ? dates : [beforeDate, ...dates].sort();
  }, [availableDates, beforeDate]);

  const afterOptions = React.useMemo(() => {
    const dates = availableDates && availableDates.length > 0
      ? availableDates
      : ['2021-01-15', '2021-11-25', '2023-08-20', '2024-06-09', '2025-06-14', '2026-08-03'];
    return dates.includes(afterDate) ? dates : [afterDate, ...dates].sort();
  }, [availableDates, afterDate]);

  useEffect(() => {
    if (!isDraggingRef.current) {
      lastPctRef.current = sliderPos;
      if (dividerRef.current) dividerRef.current.style.left = `${sliderPos}%`;
    }
  }, [sliderPos]);

  const containerRectRef = useRef<DOMRect | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartPctRef.current = lastPctRef.current;
    containerRectRef.current = containerRef.current?.getBoundingClientRect() || null;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRectRef.current || containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = Math.round((x / rect.width) * 1000) / 10;
      lastPctRef.current = pct;

      if (dividerRef.current) {
        dividerRef.current.style.left = `${pct}%`;
      }
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          onDragMove?.(lastPctRef.current);
        });
      }

      const now = performance.now();
      if (now - lastEmitTimeRef.current > 120) {
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
    return null;
  }

  const beforeLabel = formatDateLabel(beforeDate, '15 JAN 2021');
  const afterLabel = formatDateLabel(afterDate, '03 AUG 2026');

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute inset-0 pointer-events-none z-[400] select-none"
    >
      {/* Top Left: Baseline Pill Badge */}
      <div
        className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded pointer-events-auto shadow-md"
        style={{
          background: 'rgba(14, 22, 38, 0.95)',
          border: '1px solid var(--line-strong)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--warning-orange, #F59E0B)',
            display: 'inline-block',
          }}
        />
        <span
          className="t-mono font-bold"
          style={{ color: 'var(--warning-orange, #F59E0B)', fontSize: 9.5 }}
        >
          BASELINE (T0):
        </span>
        {onSelectBeforeDate ? (
          <select
            value={beforeDate}
            onChange={(e) => onSelectBeforeDate(e.target.value)}
            className="bg-transparent font-bold t-mono cursor-pointer focus:outline-none"
            style={{
              color: 'var(--ink)',
              fontSize: 9.5,
              border: 'none',
              padding: 0,
            }}
            title="Change Baseline Date (T0)"
          >
            {beforeOptions.map((d) => (
              <option key={d} value={d} style={{ background: 'var(--panel)', color: 'var(--ink)' }}>
                {formatDateLabel(d, d)}
              </option>
            ))}
          </select>
        ) : (
          <span
            className="t-mono font-bold"
            style={{ color: 'var(--ink)', fontSize: 9.5 }}
          >
            {beforeLabel}
          </span>
        )}
      </div>

      {/* Top Right: Current Observation Pill Badge */}
      <div
        className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded pointer-events-auto shadow-md"
        style={{
          background: 'rgba(14, 22, 38, 0.95)',
          border: '1px solid var(--line-strong)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--primary-cyan, #3FA9F5)',
            display: 'inline-block',
          }}
        />
        <span
          className="t-mono font-bold"
          style={{ color: 'var(--primary-cyan, #3FA9F5)', fontSize: 9.5 }}
        >
          CURRENT (T1):
        </span>
        {onSelectAfterDate ? (
          <select
            value={afterDate}
            onChange={(e) => onSelectAfterDate(e.target.value)}
            className="bg-transparent font-bold t-mono cursor-pointer focus:outline-none"
            style={{
              color: 'var(--ink)',
              fontSize: 9.5,
              border: 'none',
              padding: 0,
            }}
            title="Change Observation Date (T1)"
          >
            {afterOptions.map((d) => (
              <option key={d} value={d} style={{ background: 'var(--panel)', color: 'var(--ink)' }}>
                {formatDateLabel(d, d)}
              </option>
            ))}
          </select>
        ) : (
          <span
            className="t-mono font-bold"
            style={{ color: 'var(--ink)', fontSize: 9.5 }}
          >
            {afterLabel}
          </span>
        )}
      </div>

      {/* Vertical Hairline Divider — Cyan */}
      <div
        ref={dividerRef}
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: `${sliderPos}%`,
          width: 2,
          background: 'var(--primary-cyan, #3FA9F5)',
          boxShadow: '0 0 10px rgba(63, 169, 245, 0.6)',
        }}
      >
        {/* Draggable Grip Handle */}
        <div
          onPointerDown={handlePointerDown}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center cursor-ew-resize pointer-events-auto transition-transform hover:scale-110 active:scale-95"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--panel)',
            border: '2px solid var(--primary-cyan, #3FA9F5)',
            boxShadow: '0 0 14px rgba(63, 169, 245, 0.6)',
          }}
          title="Drag to compare Before and After"
        >
          {/* 6-dot grip icon (2x3 dots) */}
          <div className="flex items-center gap-1 pointer-events-none">
            <div className="flex flex-col gap-0.5">
              <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'var(--primary-cyan, #3FA9F5)' }} />
              <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'var(--primary-cyan, #3FA9F5)' }} />
              <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'var(--primary-cyan, #3FA9F5)' }} />
            </div>
            <div className="flex flex-col gap-0.5">
              <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'var(--primary-cyan, #3FA9F5)' }} />
              <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'var(--primary-cyan, #3FA9F5)' }} />
              <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'var(--primary-cyan, #3FA9F5)' }} />
            </div>
          </div>
        </div>

        {/* Bottom Tag */}
        <div
          ref={percentTagRef}
          className="absolute bottom-6 -translate-x-1/2 t-mono tabular-nums pointer-events-none px-2 py-0.5 rounded shadow"
          style={{
            background: 'rgba(14, 22, 38, 0.9)',
            border: '1px solid var(--line-strong)',
            color: 'var(--ink)',
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          {'2021 🔀 2026'}
        </div>
      </div>
    </div>
  );
});
