import React, { useState, useRef, useCallback } from 'react';
import { LANDING_COPY } from '../../lib/landingCopy';

/**
 * W2.5 · THE DEMO — full-bleed, --well background, min-height 70vh
 * Specs: PRD 13 §2 W2.5
 *
 * Interactive swipe with draggable handle and fixture data readout.
 * Left overlay panel with instructions.
 */
export const LandingDemo: React.FC = () => {
  const [splitPos, setSplitPos] = useState(50);
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
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
    area: '120.4 ha',
    type: 'CONSTRUCTION',
    confidence: '91%',
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
            {/* "Before" side — simulated satellite view (left) */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(26,58,42,1) 0%, rgba(45,90,58,1) 30%, rgba(58,107,74,1) 60%, rgba(74,124,90,1) 100%)',
              }}
            >
              {/* Grid overlay to simulate fields */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />
              <div
                className="absolute top-4 left-4 font-mono text-[var(--ink-2)]"
                style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
              >
                BEFORE · 2021
              </div>
            </div>

            {/* "After" side — simulated construction (right, clipped) */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: `inset(0 0 0 ${splitPos}%)`,
                background: 'linear-gradient(135deg, rgba(42,42,26,1) 0%, rgba(90,74,45,1) 30%, rgba(138,112,64,1) 60%, rgba(176,144,80,1) 100%)',
              }}
            >
              {/* Construction pattern */}
              <div
                className="absolute"
                style={{
                  top: '20%', left: '25%', width: '50%', height: '60%',
                  background: 'rgba(180,160,120,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
              <div
                className="absolute top-4 right-4 font-mono text-[var(--ink-2)]"
                style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
              >
                AFTER · 2025
              </div>
            </div>

            {/* Change polygon overlay — visible on both sides */}
            <div
              className="absolute cursor-pointer"
              style={{
                top: '25%', left: '30%', width: '35%', height: '45%',
                border: hoveredTarget ? '2px solid var(--signal)' : '1.5px solid rgba(255,148,38,0.6)',
                background: hoveredTarget ? 'rgba(255,148,38,0.2)' : 'rgba(255,148,38,0.08)',
                borderRadius: 2,
                transition: 'all 150ms ease-out',
              }}
              onMouseEnter={() => setHoveredTarget('chg_jewar_runway_01')}
              onMouseLeave={() => setHoveredTarget(null)}
            >
              {hoveredTarget && (
                <div
                  className="absolute -top-8 left-0"
                  style={{ transform: 'skewX(-2deg)' }}
                >
                  <div className="dossier-bar" style={{ fontSize: 9 }}>
                    <span>{fixtureData.area} · {fixtureData.type}</span>
                  </div>
                </div>
              )}
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
                  width: 32, height: 32,
                  background: 'var(--signal)',
                  boxShadow: '0 0 12px rgba(255,148,38,0.4)',
                }}
              >
                <span className="text-[var(--signal-ink)] font-bold" style={{ fontSize: 12 }}>⇄</span>
              </div>
              {/* Handle label */}
              <div
                className="absolute -bottom-6 whitespace-nowrap font-mono text-[var(--signal)] font-bold"
                style={{ fontSize: 9, letterSpacing: '0.1em' }}
              >
                2021 ⇄ 2025
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
