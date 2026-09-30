import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { LANDING_COPY } from '../../lib/landingCopy';
import { track } from '../../lib/track';

const HERO_POLYGONS = [
  { points: '118,112 1222,422 1212,458 108,148', fill: 'rgba(63, 169, 245, 0.24)', stroke: 'rgba(0, 229, 255, 0.96)', width: 3 },
  { points: '94,185 1196,494 1188,524 86,215', fill: 'rgba(245, 158, 11, 0.20)', stroke: 'rgba(245, 158, 11, 0.92)', width: 2.2, dash: '8 4' },
  { points: '98,238 326,302 304,408 76,348', fill: 'rgba(63, 169, 245, 0.18)', stroke: 'rgba(63, 169, 245, 0.9)', width: 2.2 },
  { points: '256,412 302,422 280,558 234,548', fill: 'rgba(16, 185, 129, 0.28)', stroke: 'rgba(16, 185, 129, 0.98)', width: 2.8 },
  { points: '728,442 778,455 766,512 716,499', fill: 'rgba(245, 158, 11, 0.26)', stroke: 'rgba(245, 158, 11, 0.95)', width: 2.4 },
  { points: '980,562 1052,578 1036,658 964,642', fill: 'rgba(63, 169, 245, 0.24)', stroke: 'rgba(0, 229, 255, 0.95)', width: 2.4 },
];

/**
 * W2.1 · Hero (Console-Styled Aerospace Hero + Live Calibrated Jewar Viewport)
 * W2.2 · Telemetry Ticker
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
      <div className="relative w-full dot-grid" style={{ minHeight: '86vh' }}>
        <div
          className="absolute top-6 right-8 select-none pointer-events-none"
          style={{ fontSize: 88, fontFamily: 'var(--font-cond)', fontWeight: 700, color: 'var(--ink-ghost)', lineHeight: 1 }}
        >
          {'01'}
        </div>

        <div className="px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center landing-container">
          {/* Left Column: Console Copy & CTAs */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded self-start font-mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                background: 'var(--cyan-wash)',
                color: 'var(--primary-cyan)',
                border: '1px solid rgba(63, 169, 245, 0.35)',
              }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--primary-cyan)' }} />
              <span>{LANDING_COPY.heroEyebrow}</span>
            </div>

            <h1
              className="font-extrabold tracking-tight font-cond leading-tight text-[var(--ink)]"
              style={{ fontSize: 'clamp(34px, 4.6vw, 48px)', lineHeight: '1.08' }}
            >
              <span>{LANDING_COPY.heroH1Line1}</span>
              <br />
              <span style={{ color: 'var(--primary-cyan)' }}>{LANDING_COPY.heroH1Line2}</span>
            </h1>

            <p className="text-[var(--ink-2)] leading-relaxed font-sans" style={{ fontSize: 16, lineHeight: '25px', maxWidth: '52ch' }}>
              {LANDING_COPY.heroSub}
            </p>

            {/* Console KPI mini-grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded bg-[var(--panel)] border border-[var(--line)]">
                <div className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 8.5 }}>{'CO-REGISTRATION'}</div>
                <div className="t-mono font-bold mt-0.5" style={{ color: 'var(--primary-cyan)', fontSize: 13 }}>{'≤ 0.22 px'}</div>
              </div>
              <div className="p-2.5 rounded bg-[var(--panel)] border border-[var(--line)]">
                <div className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 8.5 }}>{'CALIBRATION ECE'}</div>
                <div className="t-mono font-bold mt-0.5" style={{ color: 'var(--verified-green)', fontSize: 13 }}>{'0.0235'}</div>
              </div>
              <div className="p-2.5 rounded bg-[var(--panel)] border border-[var(--line)]">
                <div className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 8.5 }}>{'PROJECTION'}</div>
                <div className="t-mono font-bold mt-0.5" style={{ color: 'var(--ink)', fontSize: 13 }}>{'UTM 43N'}</div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Button
                variant="bar"
                size="lg"
                onClick={() => {
                  track('landing.cta.click', { cta: 'hero_console' });
                  navigate('/console');
                }}
                className="font-bold tracking-wider"
                iconRight={<span>{'→'}</span>}
              >
                {LANDING_COPY.heroCtaConsole}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  track('landing.cta.click', { cta: 'hero_how' });
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {LANDING_COPY.heroCtaHow}
              </Button>
            </div>

            {/* Trust Row */}
            <div
              className="pt-3 border-t border-[var(--line)] flex flex-wrap gap-x-4 gap-y-2 font-mono text-[var(--ink-3)]"
              style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}
            >
              {LANDING_COPY.trustItems.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span style={{ color: 'var(--verified-green)', fontWeight: 700 }}>{'✓'}</span>
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: Console Shell Viewport Preview */}
          <div className="lg:col-span-7">
            <div
              className="relative rounded border bg-[var(--panel)] p-3 shadow-2xl overflow-hidden"
              style={{ borderColor: 'var(--line-strong)', boxShadow: '0 16px 48px rgba(0, 0, 0, 0.65)' }}
            >
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[var(--primary-cyan)]" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[var(--primary-cyan)]" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[var(--primary-cyan)]" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[var(--primary-cyan)]" />

              {/* Console Command Header Bar */}
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5 mb-2.5 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-cyan)', display: 'inline-block' }} />
                  <span className="font-bold" style={{ color: 'var(--ink)' }}>{LANDING_COPY.previewTitle}</span>
                </div>
                <span
                  className="px-2 py-0.5 rounded font-bold"
                  style={{
                    fontSize: 9.5,
                    background: 'rgba(16, 185, 129, 0.14)',
                    color: 'var(--verified-green)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                  }}
                >
                  {LANDING_COPY.previewLiveBadge}
                </span>
              </div>

              {/* Calibrated 16:9 Satellite Viewport with Exact Angled Polygons */}
              <div style={{ aspectRatio: '16/9' }} className="relative bg-[var(--well)] rounded border border-[var(--line)] overflow-hidden">
                <img
                  src="/imagery/jewar_after_satellite.jpg"
                  alt={LANDING_COPY.previewTitle}
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                />
                <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ clipPath: 'inset(0 78% 0 0)' }}>
                  <img
                    src="/imagery/jewar_before_satellite.jpg"
                    alt={LANDING_COPY.previewBeforeLabel}
                    className="w-full h-full object-cover select-none"
                  />
                </div>
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: '22%', width: 2, background: 'var(--primary-cyan)', boxShadow: '0 0 10px var(--primary-cyan)' }}
                />

                <svg viewBox="0 0 1280 720" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                  {HERO_POLYGONS.map((p, idx) => (
                    <polygon
                      key={idx}
                      points={p.points}
                      fill={p.fill}
                      stroke={p.stroke}
                      strokeWidth={p.width}
                      strokeDasharray={p.dash}
                    />
                  ))}
                  <g transform="translate(650, 245)">
                    <rect x="-105" y="-14" width="210" height="24" rx="4" fill="rgba(8, 12, 22, 0.9)" stroke="rgba(0, 229, 255, 0.9)" strokeWidth="1.5" />
                    <text x="0" y="2" textAnchor="middle" fill="rgba(241, 245, 249, 0.98)" fontSize="12" fontWeight="700" fontFamily="monospace">
                      {'RWY 10/28 · 3,900m · 120.4 ha'}
                    </text>
                  </g>
                  <g transform="translate(270, 392)">
                    <rect x="-65" y="-13" width="130" height="22" rx="4" fill="rgba(8, 12, 22, 0.9)" stroke="rgba(16, 185, 129, 0.9)" strokeWidth="1.5" />
                    <text x="0" y="2" textAnchor="middle" fill="rgba(16, 185, 129, 0.98)" fontSize="11.5" fontWeight="700" fontFamily="monospace">
                      {'TERMINAL T1 · 18.6 ha'}
                    </text>
                  </g>
                </svg>

                {/* Top Overlay HUD Cards */}
                <div className="relative p-3 flex justify-between items-start pointer-events-none">
                  <div className="p-2.5 rounded border" style={{ background: 'rgba(8, 12, 22, 0.88)', borderColor: 'var(--line-strong)' }}>
                    <div style={{ fontSize: 10, color: 'var(--primary-cyan)' }} className="font-mono font-bold">
                      {LANDING_COPY.previewTarget}
                    </div>
                    <div className="text-lg font-bold font-cond text-[var(--ink)]">{LANDING_COPY.previewArea}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--verified-green)' }} className="font-mono font-semibold">
                      {LANDING_COPY.previewMeasured}
                    </div>
                  </div>

                  <div className="px-2.5 py-1.5 rounded border text-right" style={{ background: 'rgba(8, 12, 22, 0.88)', borderColor: 'var(--line-strong)' }}>
                    <div style={{ fontSize: 8.5 }} className="font-mono text-[var(--ink-3)]">{LANDING_COPY.previewConfidenceLabel}</div>
                    <div className="text-sm font-bold font-mono" style={{ color: 'var(--verified-green)' }}>{LANDING_COPY.previewConfidenceValue}</div>
                  </div>
                </div>
              </div>

              {/* Console Triptych Strip + Telemetry Footer */}
              <div className="grid grid-cols-3 gap-2 pt-2.5">
                <div className="bg-[var(--panel-2)] border border-[var(--line)] p-1.5 rounded flex items-center gap-2">
                  <img src="/imagery/jewar_before_satellite.jpg" alt={LANDING_COPY.previewBeforeLabel} className="w-8 h-8 rounded object-cover border border-[var(--line)] shrink-0" />
                  <div className="overflow-hidden">
                    <div style={{ fontSize: 8.5, color: 'var(--warning-orange)' }} className="font-mono font-bold truncate">{LANDING_COPY.previewBeforeLabel}</div>
                    <div style={{ fontSize: 10 }} className="font-mono text-[var(--ink)] truncate">{LANDING_COPY.previewBeforeClass}</div>
                  </div>
                </div>

                <div className="p-1.5 rounded flex items-center gap-2" style={{ background: 'var(--cyan-wash)', border: '1px solid rgba(63, 169, 245, 0.4)' }}>
                  <div className="w-8 h-8 rounded bg-[var(--well)] flex items-center justify-center shrink-0" style={{ border: '1px solid rgba(63, 169, 245, 0.4)' }}>
                    <span className="text-xs font-bold font-mono" style={{ color: 'var(--primary-cyan)' }}>{'Δ'}</span>
                  </div>
                  <div className="overflow-hidden">
                    <div style={{ fontSize: 8.5, color: 'var(--primary-cyan)' }} className="font-mono font-bold truncate">{LANDING_COPY.previewDiffLabel}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink)' }} className="font-mono font-bold truncate">{LANDING_COPY.previewDiffValue}</div>
                  </div>
                </div>

                <div className="bg-[var(--panel-2)] border border-[var(--line)] p-1.5 rounded flex items-center gap-2">
                  <img src="/imagery/jewar_after_satellite.jpg" alt={LANDING_COPY.previewAfterLabel} className="w-8 h-8 rounded object-cover border border-[var(--line)] shrink-0" />
                  <div className="overflow-hidden">
                    <div style={{ fontSize: 8.5, color: 'var(--primary-cyan)' }} className="font-mono font-bold truncate">{LANDING_COPY.previewAfterLabel}</div>
                    <div style={{ fontSize: 10 }} className="font-mono text-[var(--ink)] truncate">{LANDING_COPY.previewAfterClass}</div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 9.5 }} className="mt-2 flex justify-between items-center font-mono text-[var(--ink-3)] border-t border-[var(--line)] pt-2">
                <span>{LANDING_COPY.previewCoords}</span>
                <span className="font-bold" style={{ color: 'var(--primary-cyan)' }}>{LANDING_COPY.previewGsdSensor}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* W2.2 · Console Telemetry Ticker */}
      <div className="h-8 w-full bg-[var(--panel)] border-y border-[var(--line)] overflow-hidden flex items-center">
        <div className="whitespace-nowrap animate-marquee flex gap-8 text-xs font-mono text-[var(--ink-2)]">
          {[...LANDING_COPY.tickerItems, ...LANDING_COPY.tickerItems].map((item, idx) => (
            <React.Fragment key={idx}>
              <span>{item}</span>
              <span style={{ color: 'var(--primary-cyan)' }}>{'//'}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
