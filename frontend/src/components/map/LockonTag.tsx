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
import { getClassBadge, getSemanticTransition } from '../../lib/palette';

interface LockonTagProps {
  evidence: Evidence | null;
  bbox: BBox | null;
  onTagMouseEnter?: () => void;
  onTagMouseLeave?: () => void;
  onClick?: (evidence: Evidence) => void;
}

/**
 * SLOT-16 — Target Lock-On Overlay (PRD 9 §6 M3 & PRD 10 §4)
 * Real-time hover inspector displaying:
 * - Corner tracking brackets & leader line
 * - Semantic class badge [RUNWAY], [BUILDING], [WATER], [VEGETATION]
 * - Exact facility name & target ID
 * - Deterministic footprint area with count-up ticker
 * - Live spectral index signature
 * - Provenance chip & onset date
 */
export const LockonTag: React.FC<LockonTagProps> = React.memo(({
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

  // Position tag panel offset from bbox top-left (clamped to screen boundaries)
  const maxW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const maxH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const tagLeft = Math.max(16, Math.min(maxW - 280, bbox.minX - 8));
  const tagTop = Math.max(64, Math.min(maxH - 280, bbox.minY - 18));

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
  const facilityName =
    evidence.measurement.measured_by?.replace(/^Semantic vectorisation, UTM 43N:\s*/, '') ||
    evidence.measurement.area_label ||
    evidence.change_type;
  const badge = getClassBadge(facilityName || evidence.change_type);
  const transitionInfo = getSemanticTransition(facilityName, evidence.change_type);
  const ruleTrace = evidence.classification?.rule_trace || [];
  const ndbiRule = ruleTrace.find((r) => r.field === 'd_ndbi');
  const ndviRule = ruleTrace.find((r) => r.field === 'd_ndvi');
  const ndwiRule = ruleTrace.find((r) => r.field === 'd_ndwi');
  const ndbi: number | undefined = typeof ndbiRule?.value === 'number' ? ndbiRule.value : undefined;
  const ndvi: number | undefined = typeof ndviRule?.value === 'number' ? ndviRule.value : undefined;
  const ndwi: number | undefined = typeof ndwiRule?.value === 'number' ? ndwiRule.value : undefined;
  const onsetDate = evidence.temporal?.first_supported || '2024-06-09';
  const confidencePct = Math.round((evidence.confidence?.overall || 0.85) * 100);

  return (
    <Slot
      id="SLOT-16"
      w="full"
      h="full"
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
          stroke="var(--primary-cyan)"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.8"
        />

        {/* 4 L-shaped Corner Brackets */}
        {/* Top-Left */}
        <path
          d={`M ${brackets.topLeft.end.x + brackets.topLeft.armLength} ${brackets.topLeft.end.y} L ${brackets.topLeft.end.x} ${brackets.topLeft.end.y} L ${brackets.topLeft.end.x} ${brackets.topLeft.end.y + brackets.topLeft.armLength}`}
          fill="none"
          stroke="var(--primary-cyan)"
          strokeWidth="2"
          style={{
            animation: reducedMotion ? 'none' : `bracket-lock ${brackets.topLeft.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${brackets.topLeft.delayMs}ms forwards`,
            filter: 'drop-shadow(0 0 4px var(--primary-cyan))',
          }}
        />

        {/* Top-Right */}
        <path
          d={`M ${brackets.topRight.end.x - brackets.topRight.armLength} ${brackets.topRight.end.y} L ${brackets.topRight.end.x} ${brackets.topRight.end.y} L ${brackets.topRight.end.x} ${brackets.topRight.end.y + brackets.topRight.armLength}`}
          fill="none"
          stroke="var(--primary-cyan)"
          strokeWidth="2"
          style={{
            animation: reducedMotion ? 'none' : `bracket-lock ${brackets.topRight.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${brackets.topRight.delayMs}ms forwards`,
            filter: 'drop-shadow(0 0 4px var(--primary-cyan))',
          }}
        />

        {/* Bottom-Left */}
        <path
          d={`M ${brackets.bottomLeft.end.x} ${brackets.bottomLeft.end.y - brackets.bottomLeft.armLength} L ${brackets.bottomLeft.end.x} ${brackets.bottomLeft.end.y} L ${brackets.bottomLeft.end.x + brackets.bottomLeft.armLength} ${brackets.bottomLeft.end.y}`}
          fill="none"
          stroke="var(--primary-cyan)"
          strokeWidth="2"
          style={{
            animation: reducedMotion ? 'none' : `bracket-lock ${brackets.bottomLeft.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${brackets.bottomLeft.delayMs}ms forwards`,
            filter: 'drop-shadow(0 0 4px var(--primary-cyan))',
          }}
        />

        {/* Bottom-Right */}
        <path
          d={`M ${brackets.bottomRight.end.x - brackets.bottomRight.armLength} ${brackets.bottomRight.end.y} L ${brackets.bottomRight.end.x} ${brackets.bottomRight.end.y} L ${brackets.bottomRight.end.x} ${brackets.bottomRight.end.y - brackets.bottomRight.armLength}`}
          fill="none"
          stroke="var(--primary-cyan)"
          strokeWidth="2"
          style={{
            animation: reducedMotion ? 'none' : `bracket-lock ${brackets.bottomRight.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${brackets.bottomRight.delayMs}ms forwards`,
            filter: 'drop-shadow(0 0 4px var(--primary-cyan))',
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
          width: 250,
          background: 'var(--panel)',
          border: '1px solid var(--primary-cyan)',
          borderRadius: 'var(--r-panel)',
          padding: 'var(--s-2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 14px var(--cyan-wash)',
          transform: 'skewX(-2deg)',
          animation: reducedMotion ? 'none' : 'tag-in 140ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        }}
        onMouseEnter={onTagMouseEnter}
        onMouseLeave={onTagMouseLeave}
        onClick={() => onClick?.(evidence)}
      >
        <div style={{ transform: 'skewX(2deg)' }}>
          {/* Cyan left vertical bar */}
          <div
            className="absolute left-0 top-1.5 bottom-1.5"
            style={{
              width: 3,
              background: 'var(--primary-cyan)',
              borderRadius: '0 2px 2px 0',
            }}
          />

          {/* Target Header with Semantic Badge */}
          <div className="flex items-center justify-between pl-1.5 mb-1 gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="t-tag font-bold shrink-0"
                style={{
                  background: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.color}60`,
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-sm, 3px)',
                  fontSize: 8,
                  letterSpacing: '0.04em',
                }}
              >
                {badge.name}
              </span>
              <span className="t-tag truncate" style={{ color: 'var(--primary-cyan)', fontSize: 9 }}>
                {MAP_OVERLAY_COPY.targetPrefix} {targetType} // {shortId}
              </span>
            </div>
            <span
              className="t-mono tabular-nums px-1.5 py-0.2 rounded shrink-0"
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

          {/* Specific Facility Name */}
          <div
            className="font-bold text-xs text-[var(--ink)] font-mono pl-1.5 truncate mb-1"
            style={{ maxWidth: 235 }}
            title={facilityName}
          >
            {facilityName}
          </div>

          {/* Semantic Transition (PRD requirement: What type changed to) */}
          <div
            className="flex items-center gap-1 pl-1.5 py-0.5 mb-1 rounded t-mono"
            style={{
              background: 'var(--cyan-wash, rgba(63, 169, 245, 0.12))',
              border: '1px solid rgba(63, 169, 245, 0.3)',
              fontSize: 8.5,
              padding: '2px 5px',
            }}
          >
            <span style={{ color: 'var(--warning-orange)', fontWeight: 600 }}>{transitionInfo.fromClass}</span>
            <span style={{ color: 'var(--primary-cyan)', fontWeight: 700 }}>{'➔'}</span>
            <span style={{ color: 'var(--primary-cyan)', fontWeight: 700 }}>{transitionInfo.toClass}</span>
          </div>

          {/* Measured Figure with 400ms Count-Up (or instant for Inferred) */}
          <div
            ref={figureRef}
            className="t-figure tabular-nums pl-1.5"
            style={{
              color: 'var(--ink)',
              fontSize: 22,
              lineHeight: '26px',
            }}
          >
            —
          </div>

          {/* Spectral Delta Readout */}
          <div
            className="flex items-center justify-between pl-1.5 py-0.5 t-mono"
            style={{ fontSize: 8.5, color: 'var(--ink-2)' }}
          >
            <span style={{ color: 'var(--ink-3)' }}>{'Spectral:'}</span>
            <span style={{ color: badge.color, fontWeight: 700 }}>
              {ndbi !== undefined && ndbi >= 0.1
                ? `Δ NDBI +${ndbi.toFixed(2)} (Built-up)`
                : ndvi !== undefined && ndvi > 0
                ? `Δ NDVI +${ndvi.toFixed(2)} (Canopy)`
                : ndwi !== undefined && ndwi > 0
                ? `Δ NDWI +${ndwi.toFixed(2)} (Water Body)`
                : ndvi !== undefined
                ? `Δ NDVI ${ndvi.toFixed(2)} (Loss)`
                : `Class: ${badge.name}`}
            </span>
          </div>

          {/* Provenance Badge + Onset */}
          <div className="flex items-center justify-between pl-1.5 mt-1 pt-1 t-tag" style={{ borderTop: '1px solid var(--line)', fontSize: 8.5 }}>
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
          <div className="pl-1.5 mt-1 t-mono text-right" style={{ color: 'var(--primary-cyan)', fontSize: 8.5 }}>
            {MAP_OVERLAY_COPY.clickToInspect} ▸
          </div>
        </div>
      </div>
    </Slot>
  );
});
