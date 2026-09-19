import React, { useRef, useCallback, useEffect } from 'react';
import { Columns } from 'lucide-react';

interface SwipeCompareProps {
  sliderPos: number; // 0 to 100
  onSliderChange: (newPos: number) => void;
  isSwipeActive: boolean;
  onToggleSwipe: () => void;
  beforeDate?: string;
  afterDate?: string;
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
          className="flex items-center gap-2 bg-[#090D13]/95 hover:bg-[#111622] text-slate-100 px-3 py-1.5 rounded border border-[#F2B84B]/40 shadow-2xl text-xs font-mono font-semibold backdrop-blur-md transition-all"
        >
          <Columns className="w-3.5 h-3.5 text-[#F2B84B]" />
          <span>ACTIVATE SPLIT COMPARE</span>
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
      {/* Vertical Hairline Divider */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-[#F2B84B] shadow-[0_0_10px_rgba(242,184,75,0.8)] pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        {/* Tactical Center Draggable Handle */}
        <div
          onPointerDown={handlePointerDown}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#090D13] border-2 border-[#F2B84B] shadow-[0_0_16px_rgba(242,184,75,0.6)] flex items-center justify-center cursor-ew-resize pointer-events-auto hover:scale-110 active:scale-95 transition-transform"
          title="Drag left or right to wipe between Before and After"
        >
          <div className="flex items-center gap-0.5 text-[9px] font-extrabold text-[#F2B84B]">
            <span>◀</span>
            <div className="w-0.5 h-2.5 bg-[#F2B84B] rounded-full mx-0.5" />
            <span>▶</span>
          </div>
        </div>

        {/* Bottom Percentage Tag */}
        <div className="absolute bottom-4 -translate-x-1/2 bg-[#090D13] border border-[#1C2333] text-[#F2B84B] px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums shadow-xl pointer-events-none">
          {Math.round(sliderPos)}%
        </div>
      </div>
    </div>
  );
};
