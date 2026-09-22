import React, { useEffect } from 'react';
import { LandingNav } from './landing/LandingNav';
import { LandingHero } from './landing/LandingHero';
import { LandingFeatures } from './landing/LandingFeatures';
import { LandingDemo } from './landing/LandingDemo';
import { LandingEvidence } from './landing/LandingEvidence';
import { LandingOffline } from './landing/LandingOffline';
import { LandingTeamFooter } from './landing/LandingTeamFooter';
import { PrimaryOwnerProvider } from './ui/PrimaryOwnerContext';
import { trackOnce } from '../lib/track';

/**
 * / — Public Landing Page
 * Specs: PRD 13 (W1–W7), PRD 15 §3 (T3)
 * - Section tracking: >=50% visible for >=800ms
 * - Scroll depth tracking: 25%, 50%, 75%, 100%
 */
export const LandingScreen: React.FC = () => {
  useEffect(() => {
    document.title = 'Chakshu — from orbit to evidence | Beyond Orbit · SIH 2026';
    document.body.classList.remove('console-body');
    return () => {
      document.body.classList.add('console-body');
    };
  }, []);

  // Scroll depth tracking per PRD 15 §3 (T3)
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const scrollPct = (window.scrollY / scrollHeight) * 100;

      if (scrollPct >= 25) trackOnce('scroll.depth', { pct: 25 });
      if (scrollPct >= 50) trackOnce('scroll.depth', { pct: 50 });
      if (scrollPct >= 75) trackOnce('scroll.depth', { pct: 75 });
      if (scrollPct >= 99) trackOnce('scroll.depth', { pct: 100 });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Section visibility tracking per PRD 15 §3 (>=50% visible for >=800ms)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.getAttribute('data-section-id');
          if (!sectionId) return;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!timers.has(sectionId)) {
              const timer = setTimeout(() => {
                trackOnce('landing.section.view', { section: sectionId });
                timers.delete(sectionId);
              }, 800);
              timers.set(sectionId, timer);
            }
          } else {
            const timer = timers.get(sectionId);
            if (timer) {
              clearTimeout(timer);
              timers.delete(sectionId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const sections = document.querySelectorAll('[data-section-id]');
    sections.forEach((s) => observer.observe(s));

    return () => {
      observer.disconnect();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <PrimaryOwnerProvider>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-sans selection:bg-[var(--signal)] selection:text-[var(--bg)]">
        <LandingNav />

        <main className="flex-1 flex flex-col">
          <div data-section-id="hero">
            <LandingHero />
          </div>

          <div data-section-id="features">
            <LandingFeatures />
          </div>

          <div data-section-id="demo">
            <LandingDemo />
          </div>

          <div data-section-id="evidence" className="w-full bg-[var(--bg)]">
            <LandingEvidence />
          </div>

          <div data-section-id="offline" className="w-full bg-[var(--bg)]">
            <LandingOffline />
          </div>
        </main>

        <div data-section-id="team">
          <LandingTeamFooter />
        </div>

        {/* Small screen notice for console */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 p-3 bg-[var(--signal-wash)] border border-[var(--signal)] rounded-[var(--r-panel)] text-center font-mono text-xs text-[var(--signal)] font-bold z-[var(--z-toast)]">
          THE CONSOLE NEEDS A DESKTOP · YOU ARE ON THE OVERVIEW
        </div>
      </div>
    </PrimaryOwnerProvider>
  );
};
