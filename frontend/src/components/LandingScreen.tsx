import React from 'react';
import { LandingNav } from './landing/LandingNav';
import { LandingHero } from './landing/LandingHero';
import { LandingFeatures } from './landing/LandingFeatures';
import { LandingEvidence } from './landing/LandingEvidence';

/**
 * / — Public Landing Page
 * Specs: PRD 13 (W1–W7)
 */
export const LandingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-sans selection:bg-[var(--signal)] selection:text-[var(--bg)]">
      <LandingNav />
      <main className="flex-1 flex flex-col">
        <LandingHero />
        <LandingFeatures />
        <LandingEvidence />
      </main>
    </div>
  );
};
