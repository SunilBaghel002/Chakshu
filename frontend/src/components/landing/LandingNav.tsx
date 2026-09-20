import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { LANDING_COPY } from '../../lib/landingCopy';
import { ChakshuLogo } from '../ui/ChakshuLogo';

/**
 * W2.0 · Sticky Nav (64px)
 * Specs: PRD 13 §2 W2.0
 * - 64px height, --bg at 88% + 12px backdrop blur, 1px --line bottom
 * - Below 900px nav links collapse into MENU ghost button
 * - OPEN CONSOLE is the page's only primary while nav is visible
 */
export const LandingNav: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: LANDING_COPY.navPlatform, href: '#features' },
    { label: LANDING_COPY.navHow, href: '#how-it-works' },
    { label: LANDING_COPY.navEvidence, href: '#evidence' },
    { label: LANDING_COPY.navOffline, href: '#offline' },
  ];

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    const el = document.getElementById(href.replace('#', ''));
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className="sticky top-0 w-full border-b border-[var(--line)] flex flex-col select-none"
      style={{
        zIndex: 'var(--z-sticky)',
        background: scrolled ? 'rgba(8,12,22,0.92)' : 'rgba(8,12,22,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="h-16 px-6 flex items-center justify-between landing-container">
        {/* Left: Brand Lockup */}
        <div className="flex items-center gap-3 shrink-0">
          <ChakshuLogo size={36} />
          <span className="text-2xl font-bold tracking-wider text-[var(--signal)] font-sans">
            {LANDING_COPY.appNameDevanagari}
          </span>
          <span className="text-xs uppercase tracking-widest text-[var(--ink)] font-mono font-semibold">
            {LANDING_COPY.appName}
          </span>
        </div>

        {/* Center: Nav Links (hidden below 900px) */}
        <nav className="landing-nav-desktop items-center gap-6 text-xs font-mono tracking-wider text-[var(--ink-2)]">
          {navLinks.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => scrollTo(link.href)}
              className="hover:text-[var(--signal)] transition-colors cursor-pointer bg-transparent border-none"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* MENU ghost button (below 900px) */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="landing-nav-mobile-btn text-xs font-mono font-semibold tracking-wider text-[var(--ink-2)] hover:text-[var(--signal)] transition-colors px-3 py-2 border border-[var(--line)] rounded-[var(--r-ctl)] cursor-pointer bg-transparent"
          >
            MENU
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/console')}
            className="text-xs text-[var(--ink-3)] hidden sm:inline-flex"
          >
            {LANDING_COPY.navSignIn}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/console')}
            className="font-bold tracking-wider"
          >
            {LANDING_COPY.openConsole}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="landing-nav-dropdown w-full bg-[var(--panel)] border-t border-[var(--line)] px-6 py-4 flex-col gap-3">
          {navLinks.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => scrollTo(link.href)}
              className="text-left text-sm font-mono tracking-wider text-[var(--ink-2)] hover:text-[var(--signal)] transition-colors py-2 border-b border-[var(--line)] last:border-b-0 cursor-pointer bg-transparent"
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
