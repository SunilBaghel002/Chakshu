import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App';

describe('Application Routing (PRD 5 §1.2 & PRD 7 Task 8.0)', () => {
  it('renders LandingScreen on root route "/"', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText(/FROM ORBIT TO EVIDENCE/i)).toBeDefined();
    expect(screen.getAllByText(/CHAKSHU/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OPEN CONSOLE/i).length).toBeGreaterThan(0);
  });

  it('renders PrivacyScreen on route "/privacy"', () => {
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText(/WHAT WE RECORD, AND WHY/i)).toBeDefined();
    expect(screen.getByText(/CHAKSHU · PRIVACY NOTICE/i)).toBeDefined();
    expect(screen.getAllByText(/MaxMind/i).length).toBeGreaterThan(0);
  });

  it('renders AdminScreen on route "/admin"', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText(/ADMIN ONLY · 403 FORBIDDEN/i)).toBeDefined();
    expect(screen.getByText(/make_admin\.py/i)).toBeDefined();
  });

  it('renders NotFoundScreen on unknown route "/some-random-route"', () => {
    render(
      <MemoryRouter initialEntries={['/some-random-route']}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText(/404 · NOT FOUND/i)).toBeDefined();
    expect(screen.getByText(/RETURN TO CONSOLE/i)).toBeDefined();
  });

  it('renders ContactSheet on route "/controls"', () => {
    render(
      <MemoryRouter initialEntries={['/controls']}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText(/CONTROLS CONTACT SHEET/i)).toBeDefined();
  });

  it('renders StatesContactSheet on route "/states"', () => {
    render(
      <MemoryRouter initialEntries={['/states']}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText(/FIVE FEEDBACK STATES CONTACT SHEET/i)).toBeDefined();
  });
});
