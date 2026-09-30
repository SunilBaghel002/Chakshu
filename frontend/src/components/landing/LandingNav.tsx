import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { LANDING_COPY } from '../../lib/landingCopy';
import { ChakshuLogo } from '../ui/ChakshuLogo';

/**
 * W2.0 · Sticky Console Command Nav (64px)
 * Styled to match the Chakshu Console AppHeader (SLOT-01 Command Bar)
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
        background: scrolled
          ? 'rgba(8, 12, 22, 0.96)'
          : 'linear-gradient(180deg, var(--panel) 0%, rgba(14, 22, 38, 0.95) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.35)',
      }}
    >
      <div className="h-16 px-6 flex items-center justify-between landing-container">
        {/* Left: Console Brand Lockup */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full blur-sm opacity-35"
              style={{ background: 'var(--primary-cyan)' }}
            />
            <ChakshuLogo size={34} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                className="font-bold tracking-wider"
                style={{
                  color: 'var(--ink)',
                  fontSize: 15,
                  fontFamily: 'var(--font-cond)',
                  letterSpacing: '0.06em',
                }}
              >
                {LANDING_COPY.appName}
              </span>
              <span
                className="font-bold"
                style={{ color: 'var(--primary-cyan)', fontSize: 12 }}
              >
                {`(${LANDING_COPY.appNameDevanagari})`}
              </span>
            </div>
            <span
              className="t-tag"
              style={{
                color: 'var(--primary-cyan)',
                fontSize: 8.5,
                letterSpacing: '0.12em',
              }}
            >
              {'SATELLITE INTELLIGENCE CONSOLE'}
            </span>
          </div>
        </div>

        {/* Center: Console Slot Navigation Pills */}
        <nav className="landing-nav-desktop items-center gap-2 text-xs font-mono tracking-wider">
          {navLinks.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => scrollTo(link.href)}
              className="px-3 py-1.5 rounded transition-all cursor-pointer"
              style={{
                background: 'var(--panel-2)',
                color: 'var(--ink-2)',
                border: '1px solid var(--line)',
                fontSize: 10.5,
                letterSpacing: '0.08em',
              }}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right: Telemetry Chips & Console Launch */}
        <div className="flex items-center gap-2.5">
          <div className="hidden xl:flex items-center gap-1.5">
            <span
              className="t-tag px-2 py-1 rounded flex items-center gap-1"
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--verified-green)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: 8.5,
                fontWeight: 700,
              }}
            >
              {'✓ 96% USABLE'}
            </span>
            <span
              className="t-tag px-2 py-1 rounded flex items-center gap-1.5"
              style={{
                background: 'var(--cyan-wash)',
                color: 'var(--primary-cyan)',
                border: '1px solid rgba(63, 169, 245, 0.3)',
                fontSize: 8.5,
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--primary-cyan)',
                  display: 'inline-block',
                }}
              />
              {'UTM 43N · ON-PREM'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="landing-nav-mobile-btn text-xs font-mono font-semibold tracking-wider text-[var(--ink-2)] hover:text-[var(--primary-cyan)] transition-colors px-3 py-2 border border-[var(--line)] rounded-[var(--r-ctl)] cursor-pointer bg-transparent"
          >
            {'MENU'}
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/console')}
            className="text-xs text-[var(--ink-2)] hidden sm:inline-flex"
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
              className="text-left text-sm font-mono tracking-wider text-[var(--ink-2)] hover:text-[var(--primary-cyan)] transition-colors py-2 border-b border-[var(--line)] last:border-b-0 cursor-pointer bg-transparent"
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
