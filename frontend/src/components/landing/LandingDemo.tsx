import React, { useState, useRef, useCallback } from 'react';
import { LANDING_COPY } from '../../lib/landingCopy';

/**
 * W2.5 · THE DEMO — full-bleed, --well background, min-height 70vh
 * Specs: PRD 13 §2 W2.5
 *
 * Interactive swipe with authentic Jewar Airport satellite imagery:
 * - Before: 2021 pre-construction agricultural baseline
 * - After: 2026 operational airport with Runway 10/28 tarmac and Terminal 1
 * - Live change polygon over the detected runway infrastructure
 * - Draggable handle and live fixture data readout panel.
 */
export const LandingDemo: React.FC = () => {
  const [splitPos, setSplitPos] = useState(50);
  const [hoveredTarget, setHoveredTarget] = useState<string | null>('chg_jewar_runway_01');
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
    dragging.current = false;
  }, []);

  const fixtureData = {
    target: LANDING_COPY.demoTargetLabel,
    area: '120.4 ha',
    type: LANDING_COPY.demoTypeLabel,
    confidence: LANDING_COPY.demoConfidenceValue,
    onset: 'OCT 2021 – MAR 2022',
  };

  return (
    <section
      className="w-full border-b border-[var(--line)]"
      style={{ minHeight: '70vh', background: 'var(--well)' }}
    >
      <div className="px-6 py-16 md:py-24 landing-container">
        <div className="relative">
          {/* Swipe container */}
          <div
            ref={containerRef}
            className="relative w-full rounded-[var(--r-panel)] border border-[var(--line-strong)] overflow-hidden cursor-col-resize select-none"
            style={{ aspectRatio: '21/9' }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* "Before" side — authentic 2021 satellite view (farmland) */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <img
                src="/imagery/jewar_before_satellite.jpg"
                alt={LANDING_COPY.demoBeforeBadge}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'rgba(8,12,22,0.15)' }}
              />
              <div
                className="absolute top-4 left-4 font-mono text-[var(--ink)] bg-[var(--panel)]/80 px-2.5 py-1 border border-[var(--line)] rounded-[var(--r-tag)] backdrop-blur-sm"
                style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
              >
                {LANDING_COPY.demoBeforeBadge}
              </div>
            </div>

            {/* "After" side — authentic 2026 operational airport (clipped by splitPos) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
            >
              <img
                src="/imagery/jewar_after_satellite.jpg"
                alt={LANDING_COPY.demoAfterBadge}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'rgba(8,12,22,0.1)' }}
              />
              <div
                className="absolute top-4 right-4 font-mono text-[var(--signal)] bg-[var(--panel)]/80 px-2.5 py-1 border border-[var(--signal)]/40 rounded-[var(--r-tag)] backdrop-blur-sm"
                style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
              >
                {LANDING_COPY.demoAfterBadge}
              </div>
            </div>

            {/* Change polygon overlay — precisely over the Runway 10/28 tarmac and terminal complex */}
            <div
              className="absolute cursor-pointer transition-all duration-150"
              style={{
                top: '55%',
                left: '12%',
                width: '74%',
                height: '36%',
                border: hoveredTarget ? '2px solid var(--signal)' : '1.5px solid rgba(255,148,38,0.7)',
                background: hoveredTarget ? 'rgba(255,148,38,0.22)' : 'rgba(255,148,38,0.12)',
                borderRadius: 2,
                boxShadow: hoveredTarget ? '0 0 20px rgba(255,148,38,0.4)' : 'none',
              }}
              onMouseEnter={() => setHoveredTarget('chg_jewar_runway_01')}
              onMouseLeave={() => setHoveredTarget(null)}
            >
              {/* Corner targeting reticles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[var(--signal)]" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[var(--signal)]" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[var(--signal)]" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[var(--signal)]" />

              {/* Lock-on Tag */}
              <div
                className="absolute -top-7 left-2"
                style={{ transform: 'skewX(-2deg)' }}
              >
                <div className="dossier-bar flex items-center gap-1.5 px-2 py-0.5" style={{ fontSize: 9 }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal)] animate-pulse" />
                  <span>{fixtureData.area} · {fixtureData.type}</span>
                </div>
              </div>
            </div>

            {/* Swipe handle */}
            <div
              className="absolute top-0 bottom-0 flex flex-col items-center justify-center cursor-col-resize"
              style={{
                left: `${splitPos}%`,
                transform: 'translateX(-50%)',
                width: 24,
                zIndex: 'var(--z-map-overlay)',
              }}
              onPointerDown={handlePointerDown}
            >
              <div
                className="w-0.5 h-full"
                style={{ background: 'var(--signal)' }}
              />
              <div
                className="absolute flex items-center justify-center rounded-full"
                style={{
                  width: 32,
                  height: 32,
                  background: 'var(--signal)',
                  boxShadow: '0 0 12px rgba(255,148,38,0.4)',
                }}
              >
                <span className="text-[var(--signal-ink)] font-bold" style={{ fontSize: 12 }}>⇄</span>
              </div>
            </div>
          </div>

          {/* Left overlay panel (desktop) */}
          <div
            className="lg:absolute lg:top-4 lg:left-4 mt-6 lg:mt-0 p-5 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)]"
            style={{
              width: 'min(380px, 100%)',
              opacity: 0.95,
            }}
          >
            <h3
              className="font-bold font-cond text-[var(--ink)] mb-4"
              style={{ fontSize: 18, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              {LANDING_COPY.demoTitle}
            </h3>

            <div className="flex flex-col gap-3 mb-4">
              {[LANDING_COPY.demoStep1, LANDING_COPY.demoStep2, LANDING_COPY.demoStep3].map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 font-mono text-[var(--ink-2)]"
                  style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
                >
                  <span
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded font-bold text-[var(--signal)]"
                    style={{ fontSize: 11, background: 'rgba(255,148,38,0.15)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            {/* Live readout */}
            {hoveredTarget && (
              <div className="border-t border-[var(--line)] pt-3 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(fixtureData).map(([key, val]) => (
                    <div key={key}>
                      <div className="font-mono text-[var(--ink-3)]" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {key}
                      </div>
                      <div className="font-mono text-[var(--signal)] font-bold tabular-nums" style={{ fontSize: 12 }}>
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[var(--ink-3)] font-sans mt-4" style={{ fontSize: 12 }}>
              {LANDING_COPY.demoFootnote}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
