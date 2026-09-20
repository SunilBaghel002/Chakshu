import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { LANDING_COPY } from '../../lib/landingCopy';

/**
 * W2.1 · Hero (min-height 88vh, two columns 5/7 above 1024px)
 * W2.2 · Ticker
 * Specs: PRD 13 §2 W2.1, W2.2 & PRD 9 §5.8 (Tricolour rule)
 *
 * Right column: real console preview with fixture data
 * labelled "LIVE FIXTURE · NOT A SCREENSHOT"
 */
export const LandingHero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative w-full border-b border-[var(--line)] bg-[var(--bg)] flex flex-col">
      {/* Tricolour Rule (3px: saffron, white, green per PRD 9 §5.8) */}
      <div style={{ height: 3 }} className="w-full flex shrink-0">
        <div style={{ background: 'var(--tricolour-saffron)' }} className="flex-1" />
        <div style={{ background: 'var(--tricolour-white)' }} className="flex-1" />
        <div style={{ background: 'var(--tricolour-green)' }} className="flex-1" />
      </div>

      {/* Hero Body — dot grid bg + ghost numeral */}
      <div
        className="relative w-full dot-grid"
        style={{ minHeight: '88vh' }}
      >
        {/* Ghost numeral 01 (PRD 13 W2.1) */}
        <div
          className="absolute top-8 right-8 select-none pointer-events-none"
          style={{
            fontSize: 96,
            fontFamily: 'var(--font-cond)',
            fontWeight: 700,
            color: 'var(--ink-ghost)',
            lineHeight: 1,
          }}
        >
          01
        </div>

        <div className="px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start landing-container">
          {/* Left Column: Copy & CTAs — top-aligned at 22vh */}
          <div className="lg:col-span-5 flex flex-col gap-6" style={{ paddingTop: '8vh' }}>
            {/* Eyebrow */}
            <div
              className="inline-flex items-center gap-2 font-mono tracking-wider text-[var(--signal)]"
              style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
            >
              <span className="w-2 h-2 rounded-full bg-[var(--signal)] animate-pulse" />
              <span>{LANDING_COPY.heroEyebrow}</span>
            </div>

            {/* H1 */}
            <h1
              className="font-extrabold tracking-tight font-cond leading-tight text-[var(--ink)]"
              style={{ fontSize: 'clamp(34px, 5vw, 48px)', lineHeight: '1.08' }}
            >
              <span>{LANDING_COPY.heroH1Line1}</span>
              <br />
              <span className="text-[var(--signal)]">
                {LANDING_COPY.heroH1Line2}
              </span>
            </h1>

            {/* Sub */}
            <p
              className="text-[var(--ink-2)] leading-relaxed font-sans"
              style={{ fontSize: 17, lineHeight: '26px', maxWidth: '52ch' }}
            >
              {LANDING_COPY.heroSub}
            </p>

            {/* CTAs — gap 12 */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Button
                variant="bar"
                size="lg"
                onClick={() => navigate('/console')}
                className="font-bold tracking-wider"
                iconRight={<span>→</span>}
              >
                {LANDING_COPY.heroCtaConsole}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  const el = document.getElementById('how-it-works');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {LANDING_COPY.heroCtaHow}
              </Button>
            </div>

            {/* Trust Row */}
            <div
              className="pt-4 border-t border-[var(--line)] flex flex-wrap gap-x-4 gap-y-2 font-mono text-[var(--ink-3)]"
              style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
            >
              {LANDING_COPY.trustItems.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="text-[var(--measured-text)]">✓</span>
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: Live Console Preview */}
          <div className="lg:col-span-7" style={{ paddingTop: '4vh' }}>
            <div
              className="relative rounded-[var(--r-panel)] border border-[var(--line-strong)] bg-[var(--well)] p-4 shadow-2xl overflow-hidden"
              style={{ transform: 'scale(0.95)', transformOrigin: 'top right' }}
            >
              {/* Corner ticks */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[var(--signal)]" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[var(--signal)]" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[var(--signal)]" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[var(--signal)]" />

              {/* Window bar */}
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-3 text-xs font-mono text-[var(--ink-3)]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--line-strong)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--line-strong)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--line-strong)]" />
                  <span className="text-[var(--ink-2)] ml-2">{LANDING_COPY.previewTitle}</span>
                </div>
                <span
                  style={{ fontSize: 10 }}
                  className="px-2 py-0.5 rounded-[var(--r-tag)] bg-[var(--signal-wash)] text-[var(--signal)] font-bold border border-[var(--signal)]"
                >
                  {LANDING_COPY.previewLiveBadge}
                </span>
              </div>

              {/* Tactical Screen Representation */}
              <div
                style={{ aspectRatio: '16/10' }}
                className="relative bg-[var(--panel)] rounded-[var(--r-panel)] border border-[var(--line)] p-4 flex flex-col justify-between overflow-hidden"
              >
                {/* Authentic Jewar Satellite Imagery Background */}
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src="/imagery/jewar_after_satellite.jpg"
                    alt={LANDING_COPY.previewTitle}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    style={{ filter: 'contrast(1.1) brightness(0.92)' }}
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'rgba(8,12,22,0.3)' }}
                  />
                  <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
                </div>

                {/* Radar Active Scan Sweep Line (M2) */}
                <div className="absolute inset-x-0 h-0.5 bg-[var(--signal)] opacity-70 shadow-lg pointer-events-none animate-scanline" />

                {/* Detected Runway 10/28 Change Polygon */}
                <div
                  className="absolute cursor-pointer pointer-events-auto"
                  style={{
                    top: '55%',
                    left: '12%',
                    width: '74%',
                    height: '36%',
                    border: '2px solid var(--signal)',
                    background: 'rgba(255,148,38,0.22)',
                    borderRadius: 2,
                    boxShadow: '0 0 20px rgba(255,148,38,0.4)',
                  }}
                >
                  {/* Corner ticks */}
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[var(--signal)]" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[var(--signal)]" />
                  <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[var(--signal)]" />
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[var(--signal)]" />

                  {/* Lock-on tag simulation */}
                  <div
                    className="absolute -top-7 left-2"
                    style={{ transform: 'skewX(-2deg)' }}
                  >
                    <div className="dossier-bar flex items-center gap-1.5 px-2.5 py-0.5" style={{ fontSize: 9 }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal)] animate-pulse" />
                      <span>{LANDING_COPY.previewArea}</span>
                    </div>
                  </div>
                </div>

                {/* Header HUD stats */}
                <div className="relative flex justify-between items-start">
                  <div className="space-y-1 bg-[var(--panel)]/80 backdrop-blur-sm p-2 rounded border border-[var(--line)]">
                    <div style={{ fontSize: 11 }} className="font-mono text-[var(--signal)]">
                      {LANDING_COPY.previewTarget}
                    </div>
                    <div className="text-xl font-bold font-cond text-[var(--ink)]">
                      {LANDING_COPY.previewArea}
                    </div>
                    <div style={{ fontSize: 10 }} className="font-mono text-[var(--measured-text)]">
                      {LANDING_COPY.previewMeasured}
                    </div>
                  </div>
                  <div className="px-2.5 py-1.5 bg-[var(--panel)]/80 backdrop-blur-sm border border-[var(--line)] rounded text-right">
                    <div style={{ fontSize: 9 }} className="font-mono text-[var(--ink-3)]">
                      {LANDING_COPY.previewConfidenceLabel}
                    </div>
                    <div className="text-sm font-bold font-mono text-[var(--signal)]">
                      {LANDING_COPY.previewConfidenceValue}
                    </div>
                  </div>
                </div>

                {/* Triptych Mini Strip with real thumbnails */}
                <div className="relative grid grid-cols-3 gap-2 py-2">
                  <div className="bg-[var(--panel)]/90 backdrop-blur-sm border border-[var(--line)] p-1.5 rounded flex items-center gap-2">
                    <img
                      src="/imagery/jewar_before_satellite.jpg"
                      alt={LANDING_COPY.previewBeforeLabel}
                      className="w-7 h-7 rounded object-cover border border-[var(--line)] shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div style={{ fontSize: 8 }} className="font-mono text-[var(--ink-3)] truncate">
                        {LANDING_COPY.previewBeforeLabel}
                      </div>
                      <div style={{ fontSize: 10 }} className="font-mono text-[var(--ink-2)] truncate">
                        {LANDING_COPY.previewBeforeClass}
                      </div>
                    </div>
                  </div>
                  <div className="bg-[var(--panel)]/90 backdrop-blur-sm border border-[var(--signal)]/50 p-1.5 rounded flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-[var(--well)] border border-[var(--signal)]/40 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[var(--signal)] font-mono">Δ</span>
                    </div>
                    <div className="overflow-hidden">
                      <div style={{ fontSize: 8 }} className="font-mono text-[var(--signal)] truncate">
                        {LANDING_COPY.previewDiffLabel}
                      </div>
                      <div style={{ fontSize: 10 }} className="font-mono text-[var(--signal)] truncate">
                        {LANDING_COPY.previewDiffValue}
                      </div>
                    </div>
                  </div>
                  <div className="bg-[var(--panel)]/90 backdrop-blur-sm border border-[var(--line)] p-1.5 rounded flex items-center gap-2">
                    <img
                      src="/imagery/jewar_after_satellite.jpg"
                      alt={LANDING_COPY.previewAfterLabel}
                      className="w-7 h-7 rounded object-cover border border-[var(--line)] shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div style={{ fontSize: 8 }} className="font-mono text-[var(--ink-3)] truncate">
                        {LANDING_COPY.previewAfterLabel}
                      </div>
                      <div style={{ fontSize: 10 }} className="font-mono text-[var(--ink-2)] truncate">
                        {LANDING_COPY.previewAfterClass}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer HUD line */}
                <div
                  style={{ fontSize: 9 }}
                  className="relative flex justify-between items-center font-mono text-[var(--ink-3)] border-t border-[var(--line)] pt-1.5 bg-[var(--panel)]/80 px-2 py-1 rounded backdrop-blur-sm"
                >
                  <span>{LANDING_COPY.previewCoords}</span>
                  <span className="text-[var(--signal)] font-bold">{LANDING_COPY.previewGsdSensor}</span>
                </div>
              </div>

              {/* Bottom-left caption */}
              <div
                className="mt-2 font-mono text-[var(--signal)] font-bold"
                style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
              >
                {LANDING_COPY.previewLiveBadge}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* W2.2 · Ticker — 32px, full width */}
      <div className="h-8 w-full bg-[var(--panel)] border-y border-[var(--line)] overflow-hidden flex items-center">
        <div className="whitespace-nowrap animate-marquee flex gap-8 text-xs font-mono text-[var(--ink-2)]">
          {/* Duplicate items for seamless loop */}
          {[...LANDING_COPY.tickerItems, ...LANDING_COPY.tickerItems].map((item, idx) => (
            <React.Fragment key={idx}>
              <span>{item}</span>
              <span className="text-[var(--signal)]">{'//'}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
