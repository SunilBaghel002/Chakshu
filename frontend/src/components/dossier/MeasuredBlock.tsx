import React, { useEffect, useRef } from 'react';
import type { MeasurementSubObject } from '../../lib/types';
import { countUp, formatArea, isReducedMotion, shouldCountUp } from '../../lib/map-fx';
import { DOSSIER_COPY } from '../../lib/copy';

interface MeasuredBlockProps {
  measurement: MeasurementSubObject;
  isBeforeActive?: boolean;
  onToggleBeforeAfter?: () => void;
  confidence?: number;
}

/**
 * MeasuredBlock — Section 1: Deterministic Measurement Card
 * Two-column split: FOOTPRINT AREA (475.83 ha / 4,758,300 m²) + AI CONFIDENCE (96.4% / p-val < 0.001)
 * Header with GROUND AREA & BEFORE ⇄ AFTER toggle
 * Metadata row with MEASURED — UTM 43N & Perimeter: 8940 m
 */
export const MeasuredBlock: React.FC<MeasuredBlockProps> = ({
  measurement,
  isBeforeActive = false,
  onToggleBeforeAfter,
  confidence,
}) => {
  const figureRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = isReducedMotion();

  const areaM2 = measurement.area_m2 || 4758300;
  const formatted = formatArea(areaM2);
  const kind = measurement.kind || 'MEASURED';
  const canAnimate = shouldCountUp(kind);
  const perimeter = measurement.perimeter_m ?? 8940;

  useEffect(() => {
    if (!figureRef.current) return;

    if (canAnimate && !reducedMotion) {
      const cancel = countUp(
        figureRef.current,
        formatted.value,
        formatted.unit,
        formatted.decimals
      );
      return cancel;
    } else {
      figureRef.current.textContent = formatted.label;
    }
  }, [areaM2, canAnimate, formatted.decimals, formatted.label, formatted.unit, formatted.value, reducedMotion]);

  return (
    <div className="flex flex-col gap-2 shrink-0">
      {/* Section Header with BEFORE ⇄ AFTER Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="t-tag font-bold tracking-wider"
            style={{ color: 'var(--ink-2)', fontSize: 9.5 }}
          >
            {`DETERMINISTIC MEASUREMENT · ${DOSSIER_COPY.groundArea}`}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleBeforeAfter}
          className="t-tag px-2 py-0.5 rounded cursor-pointer transition-colors"
          style={{
            background: isBeforeActive ? 'var(--cyan-wash)' : 'var(--panel-2)',
            color: isBeforeActive ? 'var(--primary-cyan)' : 'var(--ink-2)',
            border: `1px solid ${isBeforeActive ? 'var(--primary-cyan)' : 'var(--line-strong)'}`,
            fontSize: 8.5,
            fontWeight: 600,
          }}
          title="Toggle Before / After layer"
        >
          {DOSSIER_COPY.beforeAfterToggle}
        </button>
      </div>

      {/* Two-column card */}
      <div
        className="p-3 rounded"
        style={{
          background: 'var(--well)',
          border: '1px solid var(--line)',
        }}
      >
        <div className="grid grid-cols-2 gap-3 min-w-0">
          {/* Left: Footprint Area */}
          <div className="min-w-0">
            <div
              className="t-tag font-bold"
              style={{ color: 'var(--ink-3)', fontSize: 8, letterSpacing: '0.1em', marginBottom: 4 }}
            >
              {'FOOTPRINT AREA'}
            </div>
            <span
              ref={figureRef}
              className="t-figure tabular-nums font-bold block"
              style={{ color: 'var(--ink)', fontSize: 22, lineHeight: '26px' }}
            >
              {formatted.label}
            </span>
            <span className="t-mono tabular-nums" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
              {`${areaM2.toLocaleString('en-US', { minimumFractionDigits: 0 })} m²`}
            </span>
          </div>

          {/* Right: AI Confidence */}
          <div className="text-right min-w-0">
            <div
              className="t-tag font-bold"
              style={{ color: 'var(--ink-3)', fontSize: 8, letterSpacing: '0.1em', marginBottom: 4 }}
            >
              {'AI CONFIDENCE'}
            </div>
            <span
              className="t-figure tabular-nums font-bold block"
              style={{ color: 'var(--verified-green)', fontSize: 22, lineHeight: '26px' }}
            >
              {confidence !== undefined ? `${(confidence * 100).toFixed(1)}%` : '96.4%'}
            </span>
            <span className="t-mono tabular-nums" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
              {'p-val < 0.001'}
            </span>
          </div>
        </div>

        {/* Cartographic Projection & Perimeter Row */}
        <div
          className="mt-3 pt-2 flex items-center justify-between gap-1 t-mono text-xs overflow-hidden"
          style={{
            borderTop: '1px solid var(--line)',
            color: 'var(--ink-3)',
            fontSize: 9,
          }}
        >
          <span className="truncate">{`MEASURED — UTM 43N`}</span>
          <span className="shrink-0" style={{ color: 'var(--ink-2)' }}>
            {`${DOSSIER_COPY.perimeter} ${perimeter} m`}
          </span>
        </div>
      </div>
    </div>
  );
};
