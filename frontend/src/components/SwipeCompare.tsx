import React, { useRef, useCallback, useEffect } from 'react';
import { Columns, Eye, Calendar, ArrowLeftRight, ChevronDown } from 'lucide-react';

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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = (x / rect.width) * 100;
      onSliderChange(Math.round(pct * 10) / 10);
    },
    [onSliderChange]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleGlobalUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, []);

  if (!isSwipeActive) {
    return (
      <div className="absolute top-4 left-4 z-[400]">
        <button
          onClick={onToggleSwipe}
          className="flex items-center gap-2 bg-[#111827]/95 hover:bg-[#1E293B] text-slate-100 px-3.5 py-2 rounded-lg border border-indigo-500/50 shadow-2xl text-xs font-semibold backdrop-blur-md transition-all"
        >
          <Columns className="w-4 h-4 text-indigo-400" />
          <span>Turn On Split-Screen Comparison</span>
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
      {/* Top Floating Controls and Date Badges */}
      <div 
        className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto gap-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Before Date Chip (Left side) */}
        <div 
          className="flex items-center gap-2 bg-[#111827]/95 border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-2xl backdrop-blur-md"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] font-mono text-slate-400 font-semibold">BEFORE:</span>
          {onSelectBeforeDate && availableDates.length > 0 ? (
            <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
              <select
                value={beforeDate}
                onChange={(e) => onSelectBeforeDate(e.target.value)}
                className="appearance-none bg-[#0F172A] text-slate-100 text-xs font-mono font-bold pl-2 pr-6 py-1 rounded border border-slate-700 cursor-pointer focus:outline-none hover:border-amber-500"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d} className="bg-[#111827]">
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <span className="text-xs font-mono font-bold text-slate-100 tabular-nums">
              {beforeDate}
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold">
            Old Starting Baseline
          </span>
        </div>

        {/* Center Actions: Swap Dates & Single Layer Toggle */}
        <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          {onSwapDates && (
            <button
              onClick={onSwapDates}
              className="flex items-center gap-1.5 bg-[#111827]/95 hover:bg-[#1E293B] text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 shadow-xl text-xs font-semibold backdrop-blur-md transition-all hover:border-indigo-500"
              title="Swap Before and After photos"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
              <span>Swap Dates</span>
            </button>
          )}

          <button
            onClick={onToggleSwipe}
            className="flex items-center gap-1.5 bg-[#111827]/95 hover:bg-[#1E293B] text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg border border-indigo-500/40 shadow-xl backdrop-blur-md text-xs font-semibold transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Single Photo View</span>
          </button>
        </div>

        {/* After Date Chip (Right side) */}
        <div 
          className="flex items-center gap-2 bg-[#111827]/95 border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-2xl backdrop-blur-md"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-semibold">
            Newest Satellite Photo
          </span>
          <span className="text-[11px] font-mono text-slate-400 font-semibold">AFTER:</span>
          {onSelectAfterDate && availableDates.length > 0 ? (
            <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
              <select
                value={afterDate}
                onChange={(e) => onSelectAfterDate(e.target.value)}
                className="appearance-none bg-[#0F172A] text-slate-100 text-xs font-mono font-bold pl-2 pr-6 py-1 rounded border border-slate-700 cursor-pointer focus:outline-none hover:border-indigo-500"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d} className="bg-[#111827]">
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <span className="text-xs font-mono font-bold text-slate-100 tabular-nums">
              {afterDate}
            </span>
          )}
          <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        </div>
      </div>

      {/* Vertical Hairline Divider */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-indigo-500/80 via-white to-indigo-500/80 shadow-[0_0_12px_rgba(99,102,241,0.8)] pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        {/* Iris Center Draggable Handle */}
        <div
          onPointerDown={handlePointerDown}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-[#111827] border-2 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.7)] flex items-center justify-center cursor-ew-resize pointer-events-auto hover:scale-110 active:scale-95 transition-transform"
          title="Drag left or right to wipe between Before and After"
        >
          <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-300">
            <span>◀</span>
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>▶</span>
          </div>
        </div>

        {/* Bottom Percentage Tag */}
        <div className="absolute bottom-6 -translate-x-1/2 bg-[#0F172A]/95 border border-slate-700 text-slate-200 px-2 py-0.5 rounded text-[10px] font-mono tabular-nums shadow-lg pointer-events-none">
          {Math.round(sliderPos)}% Split
        </div>
      </div>
    </div>
  );
};
