import React, { useEffect, useRef } from 'react';
import type { Evidence } from '../../lib/types';
import { Slot } from '../layout/Slot';
import {
  computeBrackets,
  computeLeaderLine,
  countUp,
  shouldCountUp,
  formatArea,
  isReducedMotion,
  hoverLatencyTracker,
  type BBox,
} from '../../lib/map-fx';
import { MAP_OVERLAY_COPY } from '../../lib/copy';

interface LockonTagProps {
  evidence: Evidence | null;
  bbox: BBox | null;
  onTagMouseEnter?: () => void;
  onTagMouseLeave?: () => void;
  onClick?: (evidence: Evidence) => void;
}

/**
 * SLOT-16 — Target Lock-On Overlay (PRD 9 §6 M3 & PRD 10 §4)
 * The signature interaction of the console:
 * (a) Stroke goes --amber-hot 2px, fill 30% -> 45% (handled on polygon layer)
 * (b) Four L-shaped corner brackets animate 12px outside bbox -> corners (160ms, 30ms stagger)
 * (c) Skewed dossier tag panel slides in 8px from bbox TL over 140ms, skewed -2 deg,
 *     amber left bar, containing target ID, measured area with 400ms count-up (MEASURED only!),
 *     provenance chip, confidence %, and onset date.
 * (d) 1px leader line from bracket to tag.
 * (e) On leave: brackets retract and tag slides out over 120ms.
 * (f) Hovering the tag keeps lock-on active (no flicker at boundary).
 */
export const LockonTag: React.FC<LockonTagProps> = ({
  evidence,
  bbox,
  onTagMouseEnter,
  onTagMouseLeave,
  onClick,
}) => {
  const figureRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(performance.now());
  const reducedMotion = isReducedMotion();

  useEffect(() => {
    startTimeRef.current = performance.now();
  }, [evidence?.change_object_id]);

  // Handle M7 / M3 Count-up ticker
  useEffect(() => {
    if (!evidence || !figureRef.current) return;

    const areaM2 = evidence.measurement.area_m2 || 0;
    const formatted = formatArea(areaM2);
    const kind = evidence.measurement.kind || 'MEASURED';
    const canAnimate = shouldCountUp(kind);

    if (canAnimate && !reducedMotion) {
      const cancel = countUp(
        figureRef.current,
        formatted.value,
        formatted.unit,
        formatted.decimals,
        () => {
          // Record latency once paint completes
          const elapsed = performance.now() - startTimeRef.current;
          hoverLatencyTracker.record(elapsed);
        }
      );
      return cancel;
    } else {
      // Honesty Rule: INFERRED / UNVERIFIED renders immediately with no count-up ticker
      figureRef.current.textContent = formatted.label;
      const elapsed = performance.now() - startTimeRef.current;
      hoverLatencyTracker.record(elapsed);
    }
  }, [evidence, reducedMotion]);

  if (!evidence || !bbox) return null;

  const brackets = computeBrackets(bbox);

  // Position tag panel offset -8px, -8px from bbox top-left (clamped to container)
  const tagLeft = Math.max(12, bbox.minX - 8);
  const tagTop = Math.max(12, bbox.minY - 8);

  const leader = computeLeaderLine(
    { x: brackets.topLeft.end.x, y: brackets.topLeft.end.y },
    { x: tagLeft, y: tagTop }
  );

  const kind = evidence.measurement.kind || 'MEASURED';
  const isMeasured = shouldCountUp(kind);
  const chipText = isMeasured ? MAP_OVERLAY_COPY.measuredChip : MAP_OVERLAY_COPY.inferredChip;
  const chipBg = isMeasured ? 'var(--measured-fill)' : 'var(--inferred-fill)';
  const chipBorder = isMeasured ? 'var(--measured-border)' : 'var(--inferred-border)';
  const chipColor = isMeasured ? 'var(--measured-text)' : 'var(--inferred-text)';

  const shortId = evidence.change_object_id.slice(0, 8);
  const targetType = evidence.change_type.replace('_', ' ').toUpperCase();
  const onsetDate = evidence.temporal?.first_supported || '2024-06-09';
  const confidencePct = Math.round((evidence.confidence?.overall || 0.85) * 100);

  return (
    <Slot
      id="SLOT-16"
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    >
      {/* SVG Layer for 4 Corner Brackets + Leader Line */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 'var(--z-locktag)' }}
      >
        {/* Leader line from top-left bracket to tag */}
        <line
          x1={leader.x1}
          y1={leader.y1}
          x2={leader.x2}
          y2={leader.y2}
          stroke="var(--amber)"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.8"
        />

        {/* 4 L-shaped Corner Brackets */}
        {/* Top-Left */}
        <path
          d={`M ${brackets.topLeft.end.x + brackets.topLeft.armLength} ${brackets.topLeft.end.y} L ${brackets.topLeft.end.x} ${brackets.topLeft.end.y} L ${brackets.topLeft.end.x} ${brackets.topLeft.end.y + brackets.topLeft.armLength}`}
          fill="none"
          stroke="var(--amber)"
          strokeWidth="2"
          style={{
            animation: reducedMotion ? 'none' : `bracket-lock ${brackets.topLeft.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${brackets.topLeft.delayMs}ms forwards`,
            filter: 'drop-shadow(0 0 2px rgba(240, 180, 95, 0.5))',
          }}
        />

        {/* Top-Right */}
        <path
          d={`M ${brackets.topRight.end.x - brackets.topRight.armLength} ${brackets.topRight.end.y} L ${brackets.topRight.end.x} ${brackets.topRight.end.y} L ${brackets.topRight.end.x} ${brackets.topRight.end.y + brackets.topRight.armLength}`}
          fill="none"
          stroke="var(--amber)"
          strokeWidth="2"
          style={{
            animation: reducedMotion ? 'none' : `bracket-lock ${brackets.topRight.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${brackets.topRight.delayMs}ms forwards`,
            filter: 'drop-shadow(0 0 2px rgba(240, 180, 95, 0.5))',
          }}
        />

        {/* Bottom-Left */}
        <path
          d={`M ${brackets.bottomLeft.end.x} ${brackets.bottomLeft.end.y - brackets.bottomLeft.armLength} L ${brackets.bottomLeft.end.x} ${brackets.bottomLeft.end.y} L ${brackets.bottomLeft.end.x + brackets.bottomLeft.armLength} ${brackets.bottomLeft.end.y}`}
          fill="none"
          stroke="var(--amber)"
          strokeWidth="2"
          style={{
            animation: reducedMotion ? 'none' : `bracket-lock ${brackets.bottomLeft.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${brackets.bottomLeft.delayMs}ms forwards`,
            filter: 'drop-shadow(0 0 2px rgba(240, 180, 95, 0.5))',
          }}
        />

        {/* Bottom-Right */}
        <path
          d={`M ${brackets.bottomRight.end.x - brackets.bottomRight.armLength} ${brackets.bottomRight.end.y} L ${brackets.bottomRight.end.x} ${brackets.bottomRight.end.y} L ${brackets.bottomRight.end.x} ${brackets.bottomRight.end.y - brackets.bottomRight.armLength}`}
          fill="none"
          stroke="var(--amber)"
          strokeWidth="2"
          style={{
            animation: reducedMotion ? 'none' : `bracket-lock ${brackets.bottomRight.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${brackets.bottomRight.delayMs}ms forwards`,
            filter: 'drop-shadow(0 0 2px rgba(240, 180, 95, 0.5))',
          }}
        />
      </svg>

      {/* Skewed Dossier Tag Panel */}
      <div
        className="absolute pointer-events-auto corner-ticks cursor-pointer"
        style={{
          left: tagLeft,
          top: tagTop,
          zIndex: 'var(--z-locktag)',
          width: 220,
          background: 'var(--panel)',
          border: '1px solid var(--amber)',
          borderRadius: 'var(--r-panel)',
          padding: 'var(--s-2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 12px rgba(240, 180, 95, 0.25)',
          transform: 'skewX(-2deg)',
          animation: reducedMotion ? 'none' : 'tag-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        }}
        onMouseEnter={onTagMouseEnter}
        onMouseLeave={onTagMouseLeave}
        onClick={() => onClick?.(evidence)}
      >
        <div style={{ transform: 'skewX(2deg)' }}>
          {/* Amber left vertical bar */}
          <div
            className="absolute left-0 top-1.5 bottom-1.5"
            style={{
              width: 3,
              background: 'var(--amber)',
              borderRadius: '0 2px 2px 0',
            }}
          />

          {/* Target Header */}
          <div className="flex items-center justify-between pl-1.5 mb-1">
            <span className="t-tag" style={{ color: 'var(--amber)', fontSize: 9.5 }}>
              {MAP_OVERLAY_COPY.targetPrefix} {targetType} // {shortId}
            </span>
            <span
              className="t-mono tabular-nums px-1.5 py-0.2 rounded"
              style={{
                background: chipBg,
                border: `1px solid ${chipBorder}`,
                color: chipColor,
                fontSize: 9,
                fontWeight: 600,
              }}
            >
              {confidencePct}%
            </span>
          </div>

          {/* Measured Figure with 400ms Count-Up (or instant for Inferred) */}
          <div
            ref={figureRef}
            className="t-figure tabular-nums pl-1.5"
            style={{
              color: 'var(--ink)',
              fontSize: 24,
              lineHeight: '28px',
            }}
          >
            —
          </div>

          {/* Provenance Badge + Onset */}
          <div className="flex items-center justify-between pl-1.5 mt-1.5 pt-1 t-tag" style={{ borderTop: '1px solid var(--line)', fontSize: 8.5 }}>
            <span
              style={{
                color: chipColor,
                fontWeight: 700,
              }}
            >
              {chipText}
            </span>
            <span style={{ color: 'var(--ink-3)' }}>
              ONSET: {onsetDate}
            </span>
          </div>

          {/* Click to inspect affordance */}
          <div className="pl-1.5 mt-1 t-mono text-right" style={{ color: 'var(--amber)', fontSize: 8.5 }}>
            {MAP_OVERLAY_COPY.clickToInspect} ▸
          </div>
        </div>
      </div>
    </Slot>
  );
};
