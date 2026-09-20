import React, { useRef, useCallback, useEffect } from 'react';
import { Columns, Eye, ArrowLeftRight, ChevronDown } from 'lucide-react';
import { getYearDifference, MIN_TEMPORAL_GAP_YEARS } from '../lib/satelliteProviders';

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

export const SwipeCompare: React.FC<SwipeCompareProps> = ({
  sliderPos,
  onSliderChange,
  isSwipeActive,
  onToggleSwipe,
  beforeDate,
  afterDate,
  availableDates = [],
  onSelectBeforeDate,
  onSelectAfterDate,
  onSwapDates,
  onDragMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const percentTagRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastPctRef = useRef(sliderPos);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDraggingRef.current) {
      lastPctRef.current = sliderPos;
      if (dividerRef.current) dividerRef.current.style.left = `${sliderPos}%`;
      if (percentTagRef.current) percentTagRef.current.textContent = `${Math.round(sliderPos)}%`;
    }
  }, [sliderPos]);

  // Ensure active dates are always present in dropdown options
  const beforeOptions = React.useMemo(() => {
    const dates = new Set(availableDates);
    if (beforeDate) dates.add(beforeDate);
    return Array.from(dates).sort();
  }, [availableDates, beforeDate]);

  const afterOptions = React.useMemo(() => {
    const dates = new Set(availableDates);
    if (afterDate) dates.add(afterDate);
    return Array.from(dates).sort();
  }, [availableDates, afterDate]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
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

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          onSliderChange(pct);
          rafRef.current = null;
        });
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
      {/* Top Floating Controls */}
      <div
        className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto gap-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Before Date Chip */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="t-tag" style={{ color: 'var(--amber)', fontSize: 9 }}>DATE A:</span>
          {onSelectBeforeDate && beforeOptions.length > 0 ? (
            <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
              <select
                value={beforeDate}
                onChange={(e) => onSelectBeforeDate(e.target.value)}
                className="appearance-none t-mono tabular-nums pl-2 pr-6 py-0.5 cursor-pointer focus:outline-none"
                style={{
                  background: 'var(--panel-2)',
                  border: '1px solid var(--line-strong)',
                  color: 'var(--amber)',
                  borderRadius: 'var(--radius)',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {beforeOptions.map((d) => (
                  <option key={d} value={d} style={{ background: 'var(--panel)' }}>
                    {d} ({d.slice(0, 4)})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-3)' }} />
            </div>
          ) : (
            <span className="t-mono tabular-nums" style={{ color: 'var(--amber)', fontSize: 11, fontWeight: 700 }}>
              {beforeDate}
            </span>
          )}
        </div>

        {/* Center: Swap + Gap Indicator + Single View */}
        <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          {onSwapDates && (
            <button
              onClick={onSwapDates}
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: 10, minHeight: 28 }}
              title="Swap Before and After"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: 'var(--amber)' }} />
              <span>SWAP</span>
            </button>
          )}
          {(() => {
            const gapYears = getYearDifference(beforeDate, afterDate);
            const isGapValid = gapYears >= MIN_TEMPORAL_GAP_YEARS;
            return (
              <div
                className="hidden sm:flex items-center gap-1 px-2 py-1"
                style={{
                  background: isGapValid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.15)',
                  border: isGapValid ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.5)',
                  borderRadius: 'var(--radius)',
                  fontSize: 9,
                }}
                title={`Temporal baseline gap: ${gapYears.toFixed(2)} years (Minimum 2.0y required)`}
              >
                <span className="t-mono font-bold" style={{ color: isGapValid ? '#4ade80' : '#f87171' }}>
                  Δ {gapYears.toFixed(1)}Y
                </span>
                <span className="t-tag text-[8px]" style={{ color: isGapValid ? '#86efac' : '#fca5a5' }}>
                  {isGapValid ? 'OK' : '<2Y'}
                </span>
              </div>
            );
          })()}
          <button
            onClick={onToggleSwipe}
            className="flex items-center gap-1.5 px-2.5 py-1 t-tag cursor-pointer transition-colors"
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--line-strong)',
              color: 'var(--teal)',
              borderRadius: 'var(--radius)',
              fontSize: 9,
            }}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>SINGLE VIEW</span>
          </button>
        </div>

        {/* After Date Chip */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="t-tag" style={{ color: 'var(--teal)', fontSize: 9 }}>DATE B:</span>
          {onSelectAfterDate && afterOptions.length > 0 ? (
            <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
              <select
                value={afterDate}
                onChange={(e) => onSelectAfterDate(e.target.value)}
                className="appearance-none t-mono tabular-nums pl-2 pr-6 py-0.5 cursor-pointer focus:outline-none"
                style={{
                  background: 'var(--panel-2)',
                  border: '1px solid var(--line-strong)',
                  color: 'var(--teal)',
                  borderRadius: 'var(--radius)',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {afterOptions.map((d) => (
                  <option key={d} value={d} style={{ background: 'var(--panel)' }}>
                    {d} ({d.slice(0, 4)})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-3)' }} />
            </div>
          ) : (
            <span className="t-mono tabular-nums" style={{ color: 'var(--teal)', fontSize: 11, fontWeight: 700 }}>
              {afterDate}
            </span>
          )}
        </div>
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
};
