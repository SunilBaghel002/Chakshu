import React, { useEffect } from 'react';
import { LandingNav } from './landing/LandingNav';
import { LandingHero } from './landing/LandingHero';
import { LandingFeatures } from './landing/LandingFeatures';
import { LandingDemo } from './landing/LandingDemo';
import { LandingEvidence } from './landing/LandingEvidence';
import { LandingOffline } from './landing/LandingOffline';
import { LandingTeamFooter } from './landing/LandingTeamFooter';
import { PrimaryOwnerProvider } from './ui/PrimaryOwnerContext';

/**
 * / — Public Landing Page
 * Specs: PRD 13 (W1–W7)
 *
 * Section order is FIXED per W2 — never reordered:
 *   Nav → Hero → Ticker → How It Works → Features → Demo → Evidence → Offline → Team+Footer
 *
 * W1.4: No CDN, no Google Fonts, no analytics script, no embed.
 * W1.5: LCP ≤ 1.2s p50.
 * W3: Responsive breakpoints at 1280, 900, 600, <600.
 * Console refuses <1024px (L6); landing page does not.
 */
export const LandingScreen: React.FC = () => {
  // Route-specific title/description (PRD 13 W5)
  useEffect(() => {
    document.title = 'Chakshu — from orbit to evidence | Beyond Orbit · SIH 2026';

    // Remove console-body class so page scrolls
    document.body.classList.remove('console-body');

    return () => {
      // Re-add if navigating to console
      document.body.classList.add('console-body');
    };
  }, []);

  return (
    <PrimaryOwnerProvider>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-sans selection:bg-[var(--signal)] selection:text-[var(--bg)]">
        {/* W2.0 · NAV */}
        <LandingNav />

        <main className="flex-1 flex flex-col">
          {/* W2.1 · HERO + W2.2 · TICKER */}
          <LandingHero />

          {/* W2.3 · HOW IT WORKS + W2.4 · FEATURES */}
          <LandingFeatures />

          {/* W2.5 · THE DEMO */}
          <LandingDemo />

          {/* W2.6 · EVIDENCE */}
          <div className="w-full bg-[var(--bg)]">
            <LandingEvidence />
          </div>

          {/* W2.7 · OFFLINE / SOVEREIGNTY */}
          <div className="w-full bg-[var(--bg)]">
            <LandingOffline />
          </div>
        </main>

        {/* W2.8 · TEAM + FOOTER */}
        <LandingTeamFooter />

        {/* Small screen notice for console (PRD 13 W3 / PRD 10 L6) */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 p-3 bg-[var(--signal-wash)] border border-[var(--signal)] rounded-[var(--r-panel)] text-center font-mono text-xs text-[var(--signal)] font-bold z-[var(--z-toast)]">
          THE CONSOLE NEEDS A DESKTOP · YOU ARE ON THE OVERVIEW
        </div>
      </div>
    </PrimaryOwnerProvider>
  );
};
