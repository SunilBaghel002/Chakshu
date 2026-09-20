import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LANDING_COPY } from '../../lib/landingCopy';

/**
 * W2.8 · TEAM + FOOTER
 * Specs: PRD 13 §2 W2.8
 *
 * Team BEYOND ORBIT, six names, roles in --t-tag.
 * Footer 3 columns: product links · PRIVACY & TRACKING NOTICE · SIH refs.
 * Bottom line: copyright.
 */
export const LandingTeamFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="w-full bg-[var(--panel)] px-6 pt-12 pb-8 text-xs font-mono text-[var(--ink-3)]">
      {/* Team section */}
      <div className="mb-12 landing-container">
        <div className="mb-6">
          <span
            className="font-mono text-[var(--signal)] block mb-2"
            style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
          >
            THE TEAM
          </span>
          <h3 className="text-xl font-bold font-cond tracking-wide text-[var(--ink)]">
            {LANDING_COPY.teamName}
          </h3>
          <p style={{ fontSize: 11 }} className="text-[var(--ink-3)] mt-1">
            {LANDING_COPY.teamSub}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {LANDING_COPY.teamMembers.map((member, i) => (
            <div
              key={i}
              className="p-3 bg-[var(--panel-2)] border border-[var(--line)] rounded-[var(--r-panel)] flex flex-col gap-1"
            >
              <div className="text-sm font-semibold text-[var(--ink)]">
                {member.name}
              </div>
              <div
                className="font-mono text-[var(--ink-3)]"
                style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' }}
              >
                {member.role}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer links — 3 columns */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-t border-[var(--line)] pt-8 pb-6 landing-container">
        {/* Column 1: Product links */}
        <div className="flex flex-col gap-2">
          <span className="font-bold text-[var(--ink-2)] uppercase" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
            PRODUCT
          </span>
          <button
            type="button"
            onClick={() => navigate('/console')}
            className="text-left text-[var(--ink-2)] hover:text-[var(--signal)] transition-colors cursor-pointer bg-transparent border-none"
          >
            CONSOLE
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('features');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-left text-[var(--ink-2)] hover:text-[var(--signal)] transition-colors cursor-pointer bg-transparent border-none"
          >
            FEATURES
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('evidence');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-left text-[var(--ink-2)] hover:text-[var(--signal)] transition-colors cursor-pointer bg-transparent border-none"
          >
            EVIDENCE
          </button>
        </div>

        {/* Column 2: Privacy */}
        <div className="flex flex-col gap-2">
          <span className="font-bold text-[var(--ink-2)] uppercase" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
            LEGAL
          </span>
          <button
            type="button"
            onClick={() => navigate('/privacy')}
            className="text-left text-[var(--ink-2)] hover:text-[var(--signal)] transition-colors cursor-pointer bg-transparent border-none"
          >
            {LANDING_COPY.privacyLink}
          </button>
        </div>

        {/* Column 3: SIH references */}
        <div className="flex flex-col gap-2">
          <span className="font-bold text-[var(--ink-2)] uppercase" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
            REFERENCES
          </span>
          <span className="text-[var(--ink-3)]">{LANDING_COPY.sihRef}</span>
          <span className="text-[var(--ink-3)]">PS SIH26227 (MoD)</span>
          <span className="text-[var(--ink-3)]">PS SIH26167 (ISRO/SAC)</span>
        </div>
      </div>

      {/* Copyright line */}
      <div
        style={{ fontSize: 11 }}
        className="pt-4 text-center border-t border-[var(--line)] landing-container"
      >
        {LANDING_COPY.copyright}
      </div>
    </footer>
  );
};
