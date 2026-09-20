import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { ChakshuLogo } from './ui/ChakshuLogo';
import { PRIVACY_COPY, LANDING_COPY } from '../lib/landingCopy';

/**
 * /privacy — Sovereign Privacy & Data Sovereignty Notice
 * Specs: PRD 15 §8 (T8), PRD 9 v3 Sovereign Console & PRD 13 §2.8
 */
export const PrivacyScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/console');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-sans selection:bg-[var(--signal)] selection:text-[var(--bg)]">
      {/* 3px Sovereign Tricolour Rule */}
      <div className="tricolour-rule shrink-0" />

      {/* Header */}
      <header className="h-14 border-b border-[var(--line)] bg-[var(--panel)] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ChakshuLogo size={24} />
            <span className="text-lg font-bold tracking-wider text-[var(--signal)] font-sans">
              {LANDING_COPY.appNameDevanagari}
            </span>
            <span className="text-xs tracking-widest text-[var(--steel)] font-cond font-bold">
              {LANDING_COPY.appName}
            </span>
          </div>
          <span className="text-xs uppercase tracking-widest text-[var(--signal)] bg-[var(--signal-wash)] px-2 py-0.5 rounded-[var(--r-tag)] border border-[var(--signal)] font-mono">
            {PRIVACY_COPY.headerTag}
          </span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/console')}
          shortcut="Esc"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          {PRIVACY_COPY.returnBtn}
        </Button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex justify-center p-6 md:p-12 overflow-y-auto dot-grid">
        <div className="w-full max-w-3xl flex flex-col gap-6">
          <div className="p-8 bg-[var(--panel)] border border-[var(--line-strong)] rounded-[var(--r-panel)] shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-[var(--line)] pb-4">
              <div className="w-9 h-9 rounded-full border border-[var(--ion)] bg-[var(--ion-wash)] flex items-center justify-center text-[var(--ion)]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--ink)] font-cond">
                  {PRIVACY_COPY.title}
                </h1>
                <p className="text-xs text-[var(--steel)] font-mono">
                  {PRIVACY_COPY.sihRef}
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-[var(--ink-2)]">
              {PRIVACY_COPY.intro}
            </p>

            <div className="space-y-3">
              <h2 className="text-sm font-bold text-[var(--ink)] font-cond tracking-wide uppercase">
                {PRIVACY_COPY.storeTitle}
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-xs text-[var(--ink-2)] leading-relaxed">
                {PRIVACY_COPY.storeItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-[var(--ink-2)] italic leading-relaxed border-l-2 border-[var(--signal)] pl-3">
              {PRIVACY_COPY.notRecorded}
            </p>

            {/* Retention & Controls Card */}
            <div className="p-4 bg-[var(--well)] border border-[var(--line)] rounded-[var(--r-panel)] space-y-2 text-xs font-mono">
              <div>
                <strong className="text-[var(--signal)]">{PRIVACY_COPY.retentionLabel}</strong>{' '}
                <span className="text-[var(--ink-2)]">{PRIVACY_COPY.retentionText}</span>
              </div>
              <div>
                <strong className="text-[var(--ion)]">{PRIVACY_COPY.sharingLabel}</strong>{' '}
                <span className="text-[var(--ink-2)]">{PRIVACY_COPY.sharingText}</span>
              </div>
              <div>
                <strong className="text-[var(--steel)]">{PRIVACY_COPY.controlLabel}</strong>{' '}
                <span className="text-[var(--ink-2)]">{PRIVACY_COPY.controlText}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--line)] text-xs text-[var(--ink-3)] font-mono">
              <span>{PRIVACY_COPY.attributionText}</span>{' '}
              <a
                href="https://www.maxmind.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--signal)] underline hover:text-[var(--signal-hot)]"
              >
                {'https://www.maxmind.com'}
              </a>
              {'.'}
            </div>
          </div>

          {/* Institutional Footer */}
          <footer className="flex justify-between items-center text-xs text-[var(--ink-3)] font-mono px-2">
            <span>{PRIVACY_COPY.footerTag}</span>
            <span>{PRIVACY_COPY.sihRef}</span>
          </footer>
        </div>
      </main>
    </div>
  );
};
