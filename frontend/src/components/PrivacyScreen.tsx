import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { PRIVACY_COPY } from '../lib/landingCopy';

/**
 * /privacy — Verbatim Privacy Notice
 * Specs: PRD 15 §8 (T8) & PRD 13 §2.8
 */
export const PrivacyScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col items-center p-6 md:p-12 font-sans selection:bg-[var(--signal)] selection:text-[var(--bg)]">
      <div style={{ maxWidth: 720 }} className="w-full flex flex-col gap-8">
        {/* Navigation back */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-wider text-[var(--signal)] font-sans">
              {'चक्षु'}
            </span>
            <span className="text-xs uppercase tracking-widest text-[var(--ink-3)] font-mono">
              {PRIVACY_COPY.headerTag}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/console')}
            shortcut="Esc"
          >
            {PRIVACY_COPY.returnBtn}
          </Button>
        </div>

        {/* Verbatim Content */}
        <article className="prose prose-invert max-w-none text-base leading-relaxed text-[var(--ink-2)] space-y-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)] font-cond">
            {PRIVACY_COPY.title}
          </h1>

          <p>{PRIVACY_COPY.intro}</p>

          <p className="font-semibold text-[var(--ink)]">{PRIVACY_COPY.storeTitle}</p>
          <ul className="list-disc pl-6 space-y-2">
            {PRIVACY_COPY.storeItems.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>

          <p>{PRIVACY_COPY.notRecorded}</p>

          <div className="p-4 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] space-y-2 text-xs font-mono">
            <div>
              <strong className="text-[var(--ink)]">{PRIVACY_COPY.retentionLabel}</strong>{' '}
              <span>{PRIVACY_COPY.retentionText}</span>
            </div>
            <div>
              <strong className="text-[var(--ink)]">{PRIVACY_COPY.sharingLabel}</strong>{' '}
              <span>{PRIVACY_COPY.sharingText}</span>
            </div>
            <div>
              <strong className="text-[var(--ink)]">{PRIVACY_COPY.controlLabel}</strong>{' '}
              <span>{PRIVACY_COPY.controlText}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--line)] text-xs text-[var(--ink-3)] font-mono">
            <span>{PRIVACY_COPY.attributionText}</span>{' '}
            <a
              href="https://www.maxmind.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--signal)] underline"
            >
              {'https://www.maxmind.com'}
            </a>
            {'.'}
          </div>
        </article>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-[var(--line)] flex justify-between items-center text-xs text-[var(--ink-3)] font-mono">
          <span>{PRIVACY_COPY.footerTag}</span>
          <span>{PRIVACY_COPY.sihRef}</span>
        </div>
      </div>
    </div>
  );
};
