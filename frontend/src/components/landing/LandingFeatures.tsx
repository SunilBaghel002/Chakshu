import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LANDING_COPY } from '../../lib/landingCopy';

/* ── Inline SVG icons (W4: no icon font, no CDN, 1.5px stroke, currentColor) ── */
const IngestIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const GateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const DetectIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const VerifyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

const DecideIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

/* ── Feature card icons ── */
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ChangeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const SuppressionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

const AskIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const AuditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const STEP_ICONS = [IngestIcon, GateIcon, DetectIcon, VerifyIcon, DecideIcon];

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
  Icon: React.FC;
}

const CARDS: FeatureCard[] = [
  {
    title: 'SEMANTIC SEARCH',
    desc: 'Find scenes by meaning, not just by date and cloud cover.',
    link: '/console?view=search',
    Icon: SearchIcon,
  },
  {
    title: 'CHANGE DETECTION',
    desc: 'Appear, disappear, expand, contract — with the earliest observation interval.',
    link: '/console?view=map&preset=change',
    Icon: ChangeIcon,
  },
  {
    title: 'FALSE-ALARM SUPPRESSION',
    desc: 'Suppressed candidates are shown with reasons and counts. Precision over recall.',
    link: '/console?view=map&tab=suppressed',
    Icon: SuppressionIcon,
  },
  {
    title: 'ASK',
    desc: 'Plain-language questions answered with a trace and a confidence tier.',
    link: '/console?view=ask',
    Icon: AskIcon,
  },
  {
    title: 'UPLOAD & DETECT',
    desc: 'Drop a GeoTIFF or a drone frame; get labels, boxes and highlights.',
    link: '/console?view=upload',
    Icon: UploadIcon,
  },
  {
    title: 'AUDIT & EXPORT',
    desc: 'Decisions, provenance and model BOM exported with the report.',
    link: '/console?view=audit',
    Icon: AuditIcon,
  },
];

/**
 * W2.3 · How It Works (5 steps) & W2.4 · Feature Cards (6 cards)
 * Specs: PRD 13 §2 W2.3, W2.4
 */
export const LandingFeatures: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full bg-[var(--bg)] flex flex-col">
      {/* W2.3 · How It Works */}
      <section id="how-it-works" className="px-6 py-16 md:py-24 border-b border-[var(--line)] landing-container">
        <div className="mb-12">
          <span
            className="font-mono text-[var(--signal)] block mb-2"
            style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
          >
            {LANDING_COPY.methodologyLabel}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-cond tracking-tight text-[var(--ink)]">
            {LANDING_COPY.howTitle}
          </h2>
        </div>

        {/* Horizontal above 1024px, vertical below */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {STEPS.map((step, i) => {
            const StepIcon = STEP_ICONS[i] as React.FC;
            return (
              <div
                key={step.num}
                className="p-5 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] flex flex-col gap-3 relative group"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="font-extrabold font-mono"
                    style={{ fontSize: 32, color: 'rgba(255,148,38,0.25)', lineHeight: 1 }}
                  >
                    {step.num}
                  </span>
                  <span className="text-[var(--signal)]">
                    {StepIcon && <StepIcon />}
                  </span>
                </div>
                <h3 className="text-base font-bold font-cond tracking-wide text-[var(--ink)]">
                  {step.title}
                </h3>
                <p className="text-xs text-[var(--ink-2)] leading-relaxed font-sans">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Pipeline diagram caption */}
        <div className="mt-8 p-4 border border-[var(--line)] rounded-[var(--r-panel)] bg-[var(--panel)]">
          <div
            className="font-mono text-[var(--ink-3)] text-center"
            style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
          >
            ARCHITECTURE · FULL VERSION IN THE SUBMISSION
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-mono text-[var(--ink-2)]">
            {STEPS.map((step, i) => (
              <React.Fragment key={step.num}>
                <span className="px-2 py-1 bg-[var(--panel-2)] border border-[var(--line)] rounded text-[var(--signal)] font-bold">
                  {step.title}
                </span>
                {i < STEPS.length - 1 && <span className="text-[var(--ink-3)]">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* W2.4 · Features — 6 cards */}
      <section id="features" className="px-6 py-16 md:py-24 border-b border-[var(--line)] landing-container">
        <div className="mb-12">
          <span
            className="font-mono text-[var(--signal)] block mb-2"
            style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
          >
            {LANDING_COPY.capabilitiesLabel}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-cond tracking-tight text-[var(--ink)]">
            {LANDING_COPY.capabilitiesTitle}
          </h2>
        </div>

        {/* 3×2 above 1024, 2×3 at 768, 1 column below */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="group p-5 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] flex flex-col justify-between gap-4 transition-all duration-150 hover:border-[var(--signal)]/60 hover:-translate-y-0.5 relative"
              style={{ padding: 20 }}
            >
              {/* Corner ticks on hover only */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[var(--signal)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[var(--signal)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[var(--signal)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[var(--signal)] opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                <div className="text-[var(--signal)] mb-3">
                  <card.Icon />
                </div>
                <h3
                  className="font-bold font-cond tracking-wide text-[var(--ink)] mb-2"
                  style={{ fontSize: 17 }}
                >
                  {card.title}
                </h3>
                <p
                  className="text-[var(--ink-2)] leading-relaxed font-sans"
                  style={{ fontSize: 14, lineHeight: '21px' }}
                >
                  {card.desc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(card.link)}
                className="font-mono font-semibold tracking-wider text-[var(--signal)] hover:text-[var(--signal-hot)] flex items-center gap-1.5 pt-3 border-t border-[var(--line)] cursor-pointer bg-transparent border-b-0 border-l-0 border-r-0"
                style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
              >
                <span>{LANDING_COPY.seeIt}</span>
                <span>→</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
