import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { LANDING_COPY } from '../../lib/landingCopy';

/**
 * W2.1 · Hero & W2.2 · Ticker
 * Specs: PRD 13 §2 W2.1, W2.2 & PRD 9 §5.8 (Tricolour rule)
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

      {/* Hero Body */}
      <div className="max-w-7xl mx-auto w-full px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Copy & CTAs */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 text-xs font-mono tracking-wider text-[var(--signal)]">
            <span className="w-2 h-2 rounded-full bg-[var(--signal)] animate-pulse" />
            <span>{LANDING_COPY.heroEyebrow}</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-cond leading-tight text-[var(--ink)]">
            <span>{LANDING_COPY.heroH1Line1}</span>{' '}
            <span className="text-[var(--signal)] block mt-1">
              {LANDING_COPY.heroH1Line2}
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-base sm:text-lg text-[var(--ink-2)] leading-relaxed max-w-xl font-sans">
            {LANDING_COPY.heroSub}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              variant="bar"
              size="lg"
              onClick={() => navigate('/console')}
              className="h-11 px-6 font-bold"
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
              className="h-11 px-5"
            >
              {LANDING_COPY.heroCtaHow}
            </Button>
          </div>

          {/* Trust Row */}
          <div className="pt-4 border-t border-[var(--line)] flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono text-[var(--ink-3)]">
            {LANDING_COPY.trustItems.map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        </div>

        {/* Right Column: Live Console Preview */}
        <div className="lg:col-span-6">
          <div className="relative rounded-[var(--r-panel)] border border-[var(--line-strong)] bg-[var(--well)] p-4 shadow-2xl overflow-hidden">
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
              <div className="flex justify-between items-start">
                <div className="space-y-1">
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
                <div className="px-2 py-1 bg-[var(--panel-2)] border border-[var(--line)] rounded text-right">
                  <div style={{ fontSize: 9 }} className="font-mono text-[var(--ink-3)]">
                    {LANDING_COPY.previewConfidenceLabel}
                  </div>
                  <div className="text-sm font-bold font-mono text-[var(--signal)]">
                    {LANDING_COPY.previewConfidenceValue}
                  </div>
                </div>
              </div>

              {/* Triptych Mini Strip */}
              <div className="grid grid-cols-3 gap-2 py-2">
                <div className="bg-[var(--well)] border border-[var(--line)] p-1.5 rounded text-center">
                  <div style={{ fontSize: 9 }} className="font-mono text-[var(--ink-3)]">
                    {LANDING_COPY.previewBeforeLabel}
                  </div>
                  <div style={{ fontSize: 11 }} className="font-mono text-[var(--ink-2)] mt-1">
                    {LANDING_COPY.previewBeforeClass}
                  </div>
                </div>
                <div className="bg-[var(--well)] border border-[var(--signal)]/40 p-1.5 rounded text-center">
                  <div style={{ fontSize: 9 }} className="font-mono text-[var(--signal)]">
                    {LANDING_COPY.previewDiffLabel}
                  </div>
                  <div style={{ fontSize: 11 }} className="font-mono text-[var(--signal)] mt-1">
                    {LANDING_COPY.previewDiffValue}
                  </div>
                </div>
                <div className="bg-[var(--well)] border border-[var(--line)] p-1.5 rounded text-center">
                  <div style={{ fontSize: 9 }} className="font-mono text-[var(--ink-3)]">
                    {LANDING_COPY.previewAfterLabel}
                  </div>
                  <div style={{ fontSize: 11 }} className="font-mono text-[var(--ink-2)] mt-1">
                    {LANDING_COPY.previewAfterClass}
                  </div>
                </div>
              </div>

              <div
                style={{ fontSize: 10 }}
                className="flex justify-between items-center font-mono text-[var(--ink-3)] border-t border-[var(--line)] pt-2"
              >
                <span>{LANDING_COPY.previewOnset}</span>
                <span className="text-[var(--signal)]">{LANDING_COPY.previewStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* W2.2 · Ticker */}
      <div className="h-8 w-full bg-[var(--panel)] border-y border-[var(--line)] overflow-hidden flex items-center">
        <div className="whitespace-nowrap animate-marquee flex gap-8 text-xs font-mono text-[var(--ink-2)]">
          {LANDING_COPY.tickerItems.map((item, idx) => (
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
