import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { LANDING_COPY } from '../../lib/landingCopy';

interface LandingNavProps {
  onOpenConsole?: () => void;
}

/**
 * W2.0 · Sticky Nav (64px)
 * Specs: PRD 13 §2 W2.0
 */
export const LandingNav: React.FC<LandingNavProps> = ({ onOpenConsole }) => {
  const navigate = useNavigate();

  const handleConsole = () => {
    if (onOpenConsole) {
      onOpenConsole();
    } else {
      navigate('/console');
    }
  };

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] h-16 w-full bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)] px-6 flex items-center justify-between">
      {/* Brand Lockup */}
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold tracking-wider text-[var(--signal)] font-sans">
          {LANDING_COPY.appNameDevanagari}
        </span>
        <span className="text-xs uppercase tracking-widest text-[var(--ink)] font-mono font-semibold">
          {LANDING_COPY.appName}
        </span>
        <span
          style={{ fontSize: 10 }}
          className="hidden sm:inline-block text-[var(--ink-3)] font-mono border-l border-[var(--line)] pl-3"
        >
          {LANDING_COPY.orbitToEvidence}
        </span>
      </div>

      {/* Nav Links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-mono tracking-wider text-[var(--ink-2)]">
        <a href="#how-it-works" className="hover:text-[var(--signal)] transition-colors">
          {LANDING_COPY.navHow}
        </a>
        <a href="#features" className="hover:text-[var(--signal)] transition-colors">
          {LANDING_COPY.navFeatures}
        </a>
        <a href="#evidence" className="hover:text-[var(--signal)] transition-colors">
          {LANDING_COPY.navEvidence}
        </a>
        <a href="#offline" className="hover:text-[var(--signal)] transition-colors">
          {LANDING_COPY.navOffline}
        </a>
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/privacy')}
          className="text-xs text-[var(--ink-3)] hidden sm:inline-flex"
        >
          {LANDING_COPY.navPrivacy}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConsole}
          shortcut="G"
          className="font-bold tracking-wider"
        >
          {LANDING_COPY.openConsole}
        </Button>
      </div>
    </header>
  );
};
