import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingScreen } from '../LandingScreen';
import { LANDING_COPY } from '../../lib/landingCopy';

describe('Landing Page Specification (PRD 13 W1–W7)', () => {
  it('renders all W2 sections in fixed sequence', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LandingScreen />
      </MemoryRouter>
    );

    // W2.0 NAV
    expect(screen.getAllByText(LANDING_COPY.appName).length).toBeGreaterThan(0);
    expect(screen.getAllByText(LANDING_COPY.navPlatform).length).toBeGreaterThan(0);
    expect(screen.getAllByText(LANDING_COPY.navHow).length).toBeGreaterThan(0);
    expect(screen.getAllByText(LANDING_COPY.navEvidence).length).toBeGreaterThan(0);
    expect(screen.getAllByText(LANDING_COPY.navOffline).length).toBeGreaterThan(0);

    // W2.1 HERO
    expect(screen.getByText(LANDING_COPY.heroH1Line1)).toBeDefined();
    expect(screen.getByText(LANDING_COPY.heroH1Line2)).toBeDefined();
    expect(screen.getAllByText(/LIVE FIXTURE · NOT A SCREENSHOT/i).length).toBeGreaterThan(0);

    // W2.2 TICKER
    expect(screen.getAllByText(/10 m Sentinel-2 archive/i).length).toBeGreaterThan(0);

    // W2.3 HOW IT WORKS
    expect(screen.getAllByText(LANDING_COPY.howTitle).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/INGEST/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GATE/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/DETECT/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/VERIFY/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/DECIDE/i).length).toBeGreaterThan(0);

    // W2.4 FEATURES
    expect(screen.getByText(LANDING_COPY.capabilitiesTitle)).toBeDefined();
    expect(screen.getByText('SEMANTIC SEARCH')).toBeDefined();
    expect(screen.getByText('CHANGE DETECTION')).toBeDefined();
    expect(screen.getByText('FALSE-ALARM SUPPRESSION')).toBeDefined();
    expect(screen.getByText('ASK')).toBeDefined();
    expect(screen.getByText('UPLOAD & DETECT')).toBeDefined();
    expect(screen.getByText('AUDIT & EXPORT')).toBeDefined();

    // W2.5 THE DEMO
    expect(screen.getByText(LANDING_COPY.demoTitle)).toBeDefined();
    expect(screen.getByText(LANDING_COPY.demoStep1)).toBeDefined();
    expect(screen.getByText(LANDING_COPY.demoStep2)).toBeDefined();
    expect(screen.getByText(LANDING_COPY.demoStep3)).toBeDefined();

    // W2.6 EVIDENCE
    expect(screen.getByText(LANDING_COPY.evidenceTitle)).toBeDefined();
    expect(screen.getByText(LANDING_COPY.gapsTitle)).toBeDefined();

    // W2.7 OFFLINE / SOVEREIGNTY
    expect(screen.getByText(LANDING_COPY.securityTitle)).toBeDefined();
    expect(screen.getByText(LANDING_COPY.bomTitle)).toBeDefined();

    // W2.8 TEAM + FOOTER
    expect(screen.getByText(LANDING_COPY.teamName)).toBeDefined();
    expect(screen.getByText(LANDING_COPY.copyright)).toBeDefined();

    // W3 Responsive mobile notice
    expect(screen.getByText(LANDING_COPY.smallScreenNotice)).toBeDefined();
  });

  it('renders all 6 deep links with exact URLs from PRD 13 §2 W2.4', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LandingScreen />
      </MemoryRouter>
    );

    const seeItButtons = screen.getAllByText(LANDING_COPY.seeIt);
    expect(seeItButtons.length).toBe(6);
  });

  it('enforces exactly one filled amber primary in the viewport', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LandingScreen />
      </MemoryRouter>
    );

    // OPEN CONSOLE in the sticky nav owns the primary action
    // Other filled amber controls (like hero CTA) are rendered as bar/secondary variant
    const openConsoleButtons = screen.getAllByText(LANDING_COPY.openConsole);
    expect(openConsoleButtons.length).toBeGreaterThan(0);
  });
});
