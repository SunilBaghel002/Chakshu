import React, { useState, useRef, useCallback } from 'react';
import { LANDING_COPY } from '../../lib/landingCopy';
import { trackOnce } from '../../lib/track';

interface DemoPolygonItem {
  id: string;
  target: string;
  shortTag: string;
  area: string;
  type: string;
  confidence: string;
  onset: string;
  points: string;
  labelX: number;
  labelY: number;
  stroke: string;
  fill: string;
}

const DEMO_POLYGONS: DemoPolygonItem[] = [
  {
    id: 'chg_jewar_runway_01',
    target: LANDING_COPY.demoTargetLabel,
    shortTag: 'RWY 10/28 · 120.4 ha',
    area: '120.4 ha',
    type: LANDING_COPY.demoTypeLabel,
    confidence: LANDING_COPY.demoConfidenceValue,
    onset: 'OCT 2021 – MAR 2022',
    points: '118,112 1222,422 1212,458 108,148',
    labelX: 660,
    labelY: 258,
    stroke: 'rgba(0, 229, 255, 0.96)',
    fill: 'rgba(63, 169, 245, 0.28)',
  },
  {
    id: 'chg_jewar_taxiway_02',
    target: 'TARGET: chg_jewar_taxiway_02',
    shortTag: 'TAXIWAY ALPHA · 44.2 ha',
    area: '44.2 ha',
    type: 'PARALLEL TAXIWAY CORRIDOR',
    confidence: '94% (DETERMINISTIC)',
    onset: 'FEB 2022 – AUG 2023',
    points: '94,185 1196,494 1188,524 86,215',
    labelX: 620,
    labelY: 368,
    stroke: 'rgba(245, 158, 11, 0.95)',
    fill: 'rgba(245, 158, 11, 0.24)',
  },
  {
    id: 'chg_jewar_apron_03',
    target: 'TARGET: chg_jewar_apron_03',
    shortTag: 'APRON · 29.85 ha',
    area: '29.85 ha',
    type: 'AIRCRAFT PARKING APRON',
    confidence: '95% (DETERMINISTIC)',
    onset: 'JUN 2022 – NOV 2023',
    points: '98,238 326,302 304,408 76,348',
    labelX: 202,
    labelY: 325,
    stroke: 'rgba(63, 169, 245, 0.95)',
    fill: 'rgba(63, 169, 245, 0.24)',
  },
  {
    id: 'chg_jewar_terminal_04',
    target: 'TARGET: chg_jewar_terminal_04',
    shortTag: 'TERMINAL T1 · 18.6 ha',
    area: '18.6 ha',
    type: 'PASSENGER TERMINAL 1',
    confidence: '96% (DETERMINISTIC)',
    onset: 'SEP 2022 – JAN 2025',
    points: '256,412 302,422 280,558 234,548',
    labelX: 270,
    labelY: 485,
    stroke: 'rgba(16, 185, 129, 0.96)',
    fill: 'rgba(16, 185, 129, 0.28)',
  },
];

/**
 * W2.5 · THE DEMO — Interactive Console Swipe Compare with Calibrated Polygons
 */
export const LandingDemo: React.FC = () => {
  const [splitPos, setSplitPos] = useState(46);
  const [selectedId, setSelectedId] = useState<string>('chg_jewar_runway_01');
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handlePointerDown = useCallback(() => {
    dragging.current = true;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSplitPos(Math.max(5, Math.min(95, x)));
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragging.current) {
      trackOnce('landing.demo.interact', { kind: 'swipe' });
    }
    dragging.current = false;
  }, []);

  const activePoly =
    DEMO_POLYGONS.find((p) => p.id === selectedId) ?? DEMO_POLYGONS[0]!;

  const fixtureData = {
    target: activePoly.target,
    area: activePoly.area,
    type: activePoly.type,
    confidence: activePoly.confidence,
    onset: activePoly.onset,
  };

  return (
    <section
      className="w-full border-b border-[var(--line)]"
      style={{ minHeight: '72vh', background: 'var(--well)' }}
    >
      <div className="px-6 py-16 md:py-20 landing-container">
        {/* Console Temporal Header Bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-t border border-b-0"
          style={{
            background: 'var(--panel)',
            borderColor: 'var(--line-strong)',
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="px-2.5 py-1 rounded font-mono font-bold"
              style={{
                fontSize: 10,
                background: 'rgba(245, 158, 11, 0.14)',
                color: 'var(--warning-orange)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
              }}
            >
              {LANDING_COPY.demoBeforeBadge}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
              {'⇄'}
            </span>
            <span
              className="px-2.5 py-1 rounded font-mono font-bold"
              style={{
                fontSize: 10,
                background: 'var(--cyan-wash)',
                color: 'var(--primary-cyan)',
                border: '1px solid rgba(63, 169, 245, 0.4)',
              }}
            >
              {LANDING_COPY.demoAfterBadge}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span style={{ color: 'var(--ink-3)' }}>{'SWIPE SPLIT:'}</span>
            <span className="font-bold tabular-nums" style={{ color: 'var(--primary-cyan)' }}>
              {`${Math.round(splitPos)}% / ${Math.round(100 - splitPos)}%`}
            </span>
          </div>
        </div>

        <div className="relative">
          {/* Interactive 16:9 Swipe Viewport */}
          <div
            ref={containerRef}
            className="relative w-full rounded-b border overflow-hidden cursor-col-resize select-none"
            style={{
              aspectRatio: '16/9',
              borderColor: 'var(--line-strong)',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* "Before" side — 2021 pre-construction agricultural baseline */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src="/imagery/jewar_before_satellite.jpg"
                alt={LANDING_COPY.demoBeforeBadge}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            </div>

            {/* "After" side — 2026 operational airport (clipped by splitPos) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
            >
              <img
                src="/imagery/jewar_after_satellite.jpg"
                alt={LANDING_COPY.demoAfterBadge}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            </div>

            {/* Calibrated Multi-Polygon SVG Vector Overlay */}
            <svg
              viewBox="0 0 1280 720"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: 'auto' }}
            >
              {DEMO_POLYGONS.map((poly) => {
                const isSelected = poly.id === selectedId;
                return (
                  <g
                    key={poly.id}
                    onMouseEnter={() => {
                      setSelectedId(poly.id);
                      trackOnce('landing.demo.interact', { kind: 'hover' });
                    }}
                    onClick={() => setSelectedId(poly.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <polygon
                      points={poly.points}
                      fill={poly.fill}
                      stroke={poly.stroke}
                      strokeWidth={isSelected ? 3.4 : 2.0}
                    />
                    <g transform={`translate(${poly.labelX}, ${poly.labelY})`}>
                      <rect
                        x="-92"
                        y="-13"
                        width="184"
                        height="22"
                        rx="4"
                        fill="rgba(8, 12, 22, 0.9)"
                        stroke={poly.stroke}
                        strokeWidth={isSelected ? 1.8 : 1.1}
                      />
                      <text
                        x="0"
                        y="2"
                        textAnchor="middle"
                        fill="rgba(241, 245, 249, 0.98)"
                        fontSize="11"
                        fontWeight="700"
                        fontFamily="monospace"
                      >
                        {poly.shortTag}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* Swipe handle */}
            <div
              className="absolute top-0 bottom-0 flex flex-col items-center justify-center cursor-col-resize"
              style={{
                left: `${splitPos}%`,
                transform: 'translateX(-50%)',
                width: 28,
                zIndex: 'var(--z-map-overlay)',
              }}
              onPointerDown={handlePointerDown}
            >
              <div
                className="w-0.5 h-full"
                style={{
                  background: 'var(--primary-cyan)',
                  boxShadow: '0 0 10px var(--primary-cyan)',
                }}
              />
              <div
                className="absolute flex items-center justify-center rounded-full"
                style={{
                  width: 34,
                  height: 34,
                  background: 'var(--primary-cyan)',
                  border: '2px solid var(--ink)',
                  boxShadow: '0 0 16px rgba(63, 169, 245, 0.65)',
                }}
              >
                <span className="font-bold" style={{ color: 'var(--ink)', fontSize: 13 }}>
                  {'⇄'}
                </span>
              </div>
            </div>
          </div>

          {/* Left Console Dossier Readout Overlay Panel */}
          <div
            className="lg:absolute lg:top-4 lg:left-4 mt-6 lg:mt-0 p-4 rounded border"
            style={{
              width: 'min(360px, 100%)',
              background: 'rgba(14, 22, 38, 0.94)',
              borderColor: 'var(--line-strong)',
              backdropFilter: 'blur(10px)',
              zIndex: 'var(--z-toolbar)',
            }}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--line)]">
              <h3
                className="font-bold font-cond text-[var(--ink)]"
                style={{ fontSize: 16, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {LANDING_COPY.demoTitle}
              </h3>
              <span
                className="t-tag px-2 py-0.5 rounded font-bold"
                style={{
                  background: 'rgba(16, 185, 129, 0.14)',
                  color: 'var(--verified-green)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  fontSize: 8.5,
                }}
              >
                {'RULE GATE VERIFIED'}
              </span>
            </div>

            <div className="flex flex-col gap-2 mb-3">
              {[LANDING_COPY.demoStep1, LANDING_COPY.demoStep2, LANDING_COPY.demoStep3].map(
                (step, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 font-mono text-[var(--ink-2)]"
                    style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}
                  >
                    <span
                      className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded font-bold"
                      style={{
                        fontSize: 10,
                        background: 'var(--cyan-wash)',
                        color: 'var(--primary-cyan)',
                        border: '1px solid rgba(63, 169, 245, 0.35)',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{step}</span>
                  </div>
                )
              )}
            </div>

            {/* Live Selected Polygon Readout */}
            <div className="border-t border-[var(--line)] pt-3 mt-2">
              <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(fixtureData).map(([key, val]) => (
                  <div key={key}>
                    <div
                      className="font-mono text-[var(--ink-3)]"
                      style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    >
                      {key}
                    </div>
                    <div
                      className="font-mono font-bold tabular-nums"
                      style={{ color: 'var(--primary-cyan)', fontSize: 11.5 }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[var(--ink-3)] font-mono mt-3 pt-2 border-t border-[var(--line)]" style={{ fontSize: 10 }}>
              {LANDING_COPY.demoFootnote}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
