import React, { useEffect, useRef } from 'react';
import type { MeasurementSubObject } from '../../lib/types';
import { countUp, formatArea, isReducedMotion, shouldCountUp } from '../../lib/map-fx';
import { Button } from '../ui/Button';
import { DOSSIER_COPY, COPY } from '../../lib/copy';

interface MeasuredBlockProps {
  measurement: MeasurementSubObject;
  isBeforeActive?: boolean;
  onToggleBeforeAfter?: () => void;
}

/**
 * MeasuredBlock — SLOT-22 (PRD 10 §4 / L4 & PRD 9 §6 / M7)
 * - Dossier bar: MEASURED — GROUND AREA
 * - Right: BEFORE ⇄ AFTER toggle (84x28, shortcut B)
 * - Ticker: 400ms count-up ONLY for MEASURED values (never INFERRED)
 * - Perimeter and UTM projection
 */
export const MeasuredBlock: React.FC<MeasuredBlockProps> = ({
  measurement,
  isBeforeActive = false,
  onToggleBeforeAfter,
}) => {
  const figureRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = isReducedMotion();

  const areaM2 = measurement.area_m2 || 0;
  const formatted = formatArea(areaM2);
  const kind = measurement.kind || 'MEASURED';
  const canAnimate = shouldCountUp(kind);

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
      <div className="flex items-center justify-between">
        <div className="dossier-bar" style={{ margin: 0 }}>
          <span>{COPY.measuredBadge} — {DOSSIER_COPY.groundArea}</span>
        </div>

        {onToggleBeforeAfter && (
          <Button
            variant="secondary"
            size="sm"
            shortcut="B"
            onClick={onToggleBeforeAfter}
            className="h-7 px-2"
            title="Toggle Before/After (B)"
          >
            {DOSSIER_COPY.beforeAfterToggle}
          </Button>
        )}
      </div>

      <div className="console-panel corner-ticks p-3">
        <div className="flex items-baseline gap-2">
          <span
            ref={figureRef}
            className="t-figure tabular-nums text-2xl font-bold"
            style={{ color: 'var(--amber)' }}
          >
            {formatted.label}
          </span>
          <span className="t-mono tabular-nums text-xs" style={{ color: 'var(--ink-3)' }}>
            ({areaM2.toLocaleString('en-US', { minimumFractionDigits: 1 })} m²)
          </span>
        </div>

        <div
          className="chip-measured t-tag mt-2"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 9,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--measured-border)',
              display: 'inline-block',
            }}
          />
          {COPY.measuredBadge} — UTM {measurement.utm_epsg}
        </div>

        <div
          className="grid grid-cols-2 gap-2 mt-3 t-mono text-xs"
          style={{ color: 'var(--ink-2)' }}
        >
          <div>
            <span style={{ color: 'var(--ink-3)' }}>{DOSSIER_COPY.perimeter} </span>
            <span className="tabular-nums font-semibold">{measurement.perimeter_m} m</span>
          </div>
          <div>
            <span style={{ color: 'var(--ink-3)' }}>{DOSSIER_COPY.projection} </span>
            <span className="tabular-nums font-semibold">UTM {measurement.utm_epsg}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
