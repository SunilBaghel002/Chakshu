/**
 * Component and interaction tests for /admin route.
 * Specs: PRD 16 §1–§9 (D1–D9), PRD 14 §4, §6 (S4, S6)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminScreen } from './AdminScreen';
import * as api from '../lib/api';

describe('AdminScreen (/admin route)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders NO ADMIN CONFIGURED when database is fresh and no admin exists', async () => {
    vi.spyOn(api, 'fetchAdminStatus').mockResolvedValue({
      kind: 'ok',
      data: { admin_configured: false, role: 'guest', session_label: 'GUEST-XXXX' },
    });

    render(
      <MemoryRouter>
        <AdminScreen />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('NO ADMIN CONFIGURED')).toBeTruthy();
      expect(screen.getByText(/scripts\/make_admin\.py/)).toBeTruthy();
    });
  });

  it('renders 401 AUTHENTICATION REQUIRED for unauthenticated guest sessions', async () => {
    vi.spyOn(api, 'fetchAdminStatus').mockResolvedValue({
      kind: 'ok',
      data: { admin_configured: true, role: 'guest', session_label: 'GUEST-7F3A' },
    });

    render(
      <MemoryRouter>
        <AdminScreen />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('401 · AUTHENTICATION REQUIRED')).toBeTruthy();
      expect(screen.getByText(/scripts\/make_admin\.py elevate-latest/)).toBeTruthy();
    });
  });

  it('renders 403 ADMIN ROLE REQUIRED for analyst sessions', async () => {
    vi.spyOn(api, 'fetchAdminStatus').mockResolvedValue({
      kind: 'ok',
      data: { admin_configured: true, role: 'analyst', session_label: 'Analyst 1' },
    });

    render(
      <MemoryRouter>
        <AdminScreen />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('403 · ADMIN ROLE REQUIRED')).toBeTruthy();
    });
  });

  it('renders console slot grid with EXPORT CSV primary for sovereign admins', async () => {
    vi.spyOn(api, 'fetchAdminStatus').mockResolvedValue({
      kind: 'ok',
      data: { admin_configured: true, role: 'admin', session_label: 'admin@chakshu.internal' },
    });

    vi.spyOn(api, 'fetchAdminOverview').mockResolvedValue({
      kind: 'ok',
      data: {
        range: '7d',
        kpis: {
          visitors: { value: 42, delta: { text: '+12%', n: 37, direction: 'up' } },
          visits: { value: 68, delta: { text: '+8%', n: 62, direction: 'up' } },
          median_dwell_s: { value: 372, delta: { text: '—', n: 0, direction: 'neutral' } },
          operations_run: { value: 114, delta: { text: '+25%', n: 91, direction: 'up' } },
          error_rate: { value: '2.6%', delta: { text: '-0.4%', n: 3, direction: 'down' } },
        },
        ops: [
          { op: 'change_detect', count: 48, p50_ms: 420, p95_ms: 1100, success_pct: 95.8 },
          { op: 'ask', count: 32, p50_ms: 150, p95_ms: 450, success_pct: 100 },
        ],
        devices: [
          { label: 'DESKTOP', count: 35 },
          { label: 'MOBILE', count: 7 },
        ],
        locations: [
          { label: 'IN · Delhi', count: 22 },
        ],
        entry: [{ path: '/', count: 38 }],
        exit: [{ path: '/console', count: 30 }],
        dropped_after_landing: { count: 6, pct: 14.3 },
        seeded: true,
        filtered_bots: 4,
        query_ms: 12,
        rows_scanned: 240,
      },
    });

    render(
      <MemoryRouter initialEntries={['/admin?tab=OVERVIEW']}>
        <AdminScreen />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Slot-00
      expect(screen.getByText('INGEST NOMINAL')).toBeTruthy();
      // Slot-01
      expect(screen.getByText('ADMIN')).toBeTruthy();
      expect(screen.getByText('DEMO DATA')).toBeTruthy();
      // Slot-02
      expect(screen.getByText('EXPORT CSV')).toBeTruthy();
      // Slot-05 Rail
      expect(screen.getAllByText('OVERVIEW').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('VISITORS').length).toBeGreaterThanOrEqual(1);
      // Slot-10 KPIs
      expect(screen.getByText('MEDIAN DWELL')).toBeTruthy();
      expect(screen.getByText('OPERATIONS BREAKDOWN')).toBeTruthy();
      // Slot-40
      expect(screen.getByText(/ROWS SCANNED: 240/)).toBeTruthy();
      expect(screen.getByText(/MaxMind/)).toBeTruthy();
    });
  });
});
