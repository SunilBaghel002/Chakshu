import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LANDING_COPY } from '../../lib/landingCopy';

interface Step {
  num: string;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    num: '01',
    title: 'INGEST',
    desc: 'GeoTIFF and COG scenes enter the archive; each gets a checksum and a provenance record.',
  },
  {
    num: '02',
    title: 'GATE',
    desc: 'The Resolution Gate measures actual ground sampling distance and decides what the system is allowed to claim about this image.',
  },
  {
    num: '03',
    title: 'DETECT',
    desc: 'Three tracks: a deterministic land-cover index, WorldCover labels, and a vision model for objects. Deterministic first.',
  },
  {
    num: '04',
    title: 'VERIFY',
    desc: 'Every number is recomputed from geometry in the measurement CRS. If the model says "about 40 buildings", the verifier says what it actually measured.',
  },
  {
    num: '05',
    title: 'DECIDE',
    desc: 'An analyst confirms or rejects; the decision, the reason and the trace are written to an audit log and exported with the report.',
  },
];

interface FeatureCard {
  title: string;
  desc: string;
  link: string;
}

const CARDS: FeatureCard[] = [
  {
    title: 'SEMANTIC SEARCH',
    desc: 'Find scenes by meaning, not just by date and cloud cover.',
    link: '/console?view=search',
  },
  {
    title: 'CHANGE DETECTION',
    desc: 'Appear, disappear, expand, contract — with the earliest observation interval.',
    link: '/console?view=map&preset=change',
  },
  {
    title: 'FALSE-ALARM SUPPRESSION',
    desc: 'Suppressed candidates are shown with reasons and counts. Precision over recall.',
    link: '/console?view=map&tab=suppressed',
  },
  {
    title: 'ASK',
    desc: 'Plain-language questions answered with a trace and a confidence tier.',
    link: '/console?view=ask',
  },
  {
    title: 'UPLOAD & DETECT',
    desc: 'Drop a GeoTIFF or a drone frame; get labels, boxes and highlights.',
    link: '/console?view=upload',
  },
  {
    title: 'AUDIT & EXPORT',
    desc: 'Decisions, provenance and model BOM exported with the report.',
    link: '/console?view=audit',
  },
];

/**
 * W2.3 · How It Works & W2.4 · Feature Cards
 * Specs: PRD 13 §2 W2.3, W2.4
 */
export const LandingFeatures: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full bg-[var(--bg)] flex flex-col">
      {/* W2.3 · How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto w-full px-6 py-16 md:py-24 border-b border-[var(--line)]">
        <div className="mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-[var(--signal)] block mb-2">
            {LANDING_COPY.methodologyLabel}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-cond tracking-tight text-[var(--ink)]">
            {LANDING_COPY.howTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="p-5 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] flex flex-col gap-3 relative"
            >
              <span className="text-3xl font-extrabold font-mono text-[var(--signal)]/30">
                {step.num}
              </span>
              <h3 className="text-base font-bold font-cond tracking-wide text-[var(--ink)]">
                {step.title}
              </h3>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed font-sans">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* W2.4 · Features */}
      <section id="features" className="max-w-7xl mx-auto w-full px-6 py-16 md:py-24 border-b border-[var(--line)]">
        <div className="mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-[var(--signal)] block mb-2">
            {LANDING_COPY.capabilitiesLabel}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-cond tracking-tight text-[var(--ink)]">
            {LANDING_COPY.capabilitiesTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="p-6 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] flex flex-col justify-between gap-4 transition-all duration-160 hover:border-[var(--signal)]/60 hover:-translate-y-0.5"
            >
              <div>
                <h3 className="text-base font-bold font-cond tracking-wide text-[var(--ink)] mb-2">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed font-sans">
                  {card.desc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(card.link)}
                className="text-xs font-mono font-semibold tracking-wider text-[var(--signal)] hover:text-[var(--signal-hot)] flex items-center gap-1.5 pt-3 border-t border-[var(--line)] cursor-pointer"
              >
                <span>{LANDING_COPY.seeIt}</span>
                <span>{'→'}</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
