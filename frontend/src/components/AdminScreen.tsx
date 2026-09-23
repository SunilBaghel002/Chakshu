/**
 * Sovereign Admin Panel & Telemetry Console (/admin).
 * Specs: PRD 16 §1–§9 (D1–D9), PRD 14 §4/§6 (S4, S6)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { OverviewView } from './admin/OverviewView';
import { VisitorsView } from './admin/VisitorsView';
import { DetailPanel } from './admin/DetailPanel';
import { Sparkline } from './admin/charts';
import { AdminHeader, AdminFilterBar } from './admin/AdminControls';
import { UnconfiguredScreen, ClearanceScreen } from './admin/AdminErrorState';
import { ADMIN_PANEL_COPY } from '../lib/landingCopy';
import {
  fetchAdminStatus,
  fetchAdminOverview,
  fetchAdminSessions,
} from '../lib/api';
import type {
  AdminOverviewResponse,
  AdminStatusResponse,
  SessionRow,
} from '../lib/types/admin';

export const AdminScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Status & clearance state
  const [authStatus, setAuthStatus] = useState<AdminStatusResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Active view & filters (synced with URL)
  const activeTab = (searchParams.get('tab') as 'OVERVIEW' | 'VISITORS') || 'OVERVIEW';
  const range = searchParams.get('range') || '7d';
  const device = searchParams.get('device') || '';
  const country = searchParams.get('country') || '';
  const op = searchParams.get('op') || '';
  const entry = searchParams.get('entry') || '';
  const includeBots = searchParams.get('bots') === 'true';
  const q = searchParams.get('q') || '';

  // Data state
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [queryMetrics, setQueryMetrics] = useState<{ ms: number; rows: number }>({ ms: 0, rows: 0 });

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      return next;
    });
  }, [setSearchParams]);

  // Initial Auth Check
  const checkAuth = useCallback(() => {
    fetchAdminStatus()
      .then((res) => {
        if (res.kind === 'ok') {
          setAuthStatus(res.data);
          if (res.data.role === 'admin') setAuthError(null);
          else setAuthError(res.data.role === 'analyst' ? 'ROLE_REQUIRED' : 'AUTH_REQUIRED');
        } else if (res.kind === 'error') {
          setAuthError(res.code);
        }
        setCheckingAuth(false);
      })
      .catch(() => {
        setAuthError('AUTH_REQUIRED');
        setCheckingAuth(false);
      });
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch view data
  const loadData = useCallback(() => {
    if (checkingAuth || !authStatus || authStatus.role !== 'admin') return;

    setLoading(true);
    const sessionParams = {
      range,
      device: device || undefined,
      country: country || undefined,
      op: op || undefined,
      entry: entry || undefined,
      include_bots: includeBots,
      q: q || undefined,
    };

    if (activeTab === 'OVERVIEW') {
      fetchAdminOverview(range).then((res) => {
        if (res.kind === 'ok') {
          setOverview(res.data);
          setQueryMetrics({ ms: res.data.query_ms, rows: res.data.rows_scanned });
        }
        setLoading(false);
      });
    } else if (activeTab === 'VISITORS') {
      fetchAdminSessions(sessionParams).then((res) => {
        if (res.kind === 'ok') {
          setSessions(res.data.items);
          setNextCursor(res.data.next_cursor);
          setQueryMetrics({ ms: res.data.query_ms, rows: res.data.rows_scanned });
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [checkingAuth, authStatus, activeTab, range, device, country, op, entry, includeBots, q]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMoreSessions = () => {
    if (!nextCursor) return;
    fetchAdminSessions({
      range,
      device: device || undefined,
      country: country || undefined,
      op: op || undefined,
      entry: entry || undefined,
      include_bots: includeBots,
      q: q || undefined,
      cursor: nextCursor,
    }).then((res) => {
      if (res.kind === 'ok') {
        setSessions((prev) => [...prev, ...res.data.items]);
        setNextCursor(res.data.next_cursor);
      }
    });
  };

  const resetFilters = () => {
    updateParams({ device: null, country: null, op: null, entry: null, bots: null, q: null });
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-mono select-none">
        <div className="tricolour-rule shrink-0" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 dot-grid">
          <div className="w-full max-w-lg p-8 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] text-center space-y-4">
            <div className="w-10 h-10 mx-auto rounded-full bg-[var(--well)] border border-[var(--line)] flex items-center justify-center text-[var(--signal)]">
              <span className="w-2 h-2 rounded-full bg-[var(--signal)] animate-ping" />
            </div>
            <div className="text-xs uppercase tracking-widest text-[var(--ink-3)]">
              {'VERIFYING ADMIN CLEARANCE…'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if ((authStatus && !authStatus.admin_configured) || authError === 'NO_ADMIN_CONFIGURED') {
    return <UnconfiguredScreen />;
  }

  if (authError || !authStatus || authStatus.role !== 'admin') {
    return <ClearanceScreen authError={authError} onLoginSuccess={checkAuth} />;
  }

  const isSeeded = Boolean(overview?.seeded || sessions.some((s) => s.seeded));

  return (
    <div className="h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-mono select-none overflow-hidden">
      <div className="tricolour-rule shrink-0" />

      {/* SLOT-00: Telemetry Marquee Stream */}
      <div style={{ height: '18px' }} className="bg-[var(--well)] border-b border-[var(--line)] px-4 flex items-center justify-between text-xs text-[var(--ink-3)] shrink-0 overflow-hidden">
        <div className="flex items-center gap-3 truncate">
          <span className="flex items-center gap-1 text-[var(--ok)] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] animate-pulse" />
            {'INGEST NOMINAL'}
          </span>
          <span>·</span>
          <span className="truncate">{'LIVE TELEMETRY STREAM · IN-MEMORY & DB CLUSTERING (30-MIN WINDOW)'}</span>
        </div>
        <div className="tabular-nums">{'SLOT-00 · RETENTION 30D'}</div>
      </div>

      {/* SLOT-01: Header */}
      <AdminHeader
        range={range}
        device={device}
        country={country}
        op={op}
        entry={entry}
        includeBots={includeBots}
        q={q}
        authStatus={authStatus}
        overview={overview}
        isSeeded={isSeeded}
        onUpdate={updateParams}
        onReset={resetFilters}
      />

      {/* SLOT-02: Filter Bar */}
      <AdminFilterBar
        range={range}
        device={device}
        country={country}
        op={op}
        entry={entry}
        includeBots={includeBots}
        q={q}
        authStatus={authStatus}
        overview={overview}
        isSeeded={isSeeded}
        onUpdate={updateParams}
        onReset={resetFilters}
      />

      {/* Main Grid: SLOT-05 Rail + SLOT-10 Main View + SLOT-20..26 Detail Dossier */}
      <div className="flex-1 flex overflow-hidden">
        {/* SLOT-05: Navigation Rail */}
        <nav className="w-40 border-r border-[var(--line)] bg-[var(--panel)] flex flex-col justify-between shrink-0 text-xs font-mono">
          <div className="py-2 flex flex-col">
            <button
              type="button"
              onClick={() => updateParams({ tab: 'OVERVIEW' })}
              className={`px-4 py-2.5 text-left font-medium flex items-center justify-between border-l-2 transition-colors ${
                activeTab === 'OVERVIEW'
                  ? 'border-l-[var(--signal)] text-[var(--signal)] bg-[var(--panel-2)] font-bold'
                  : 'border-l-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
              }`}
            >
              <span>{ADMIN_PANEL_COPY.overview}</span>
              <span className="text-xs text-[var(--ink-3)]">{'G 1'}</span>
            </button>

            <button
              type="button"
              onClick={() => updateParams({ tab: 'VISITORS' })}
              className={`px-4 py-2.5 text-left font-medium flex items-center justify-between border-l-2 transition-colors ${
                activeTab === 'VISITORS'
                  ? 'border-l-[var(--signal)] text-[var(--signal)] bg-[var(--panel-2)] font-bold'
                  : 'border-l-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
              }`}
            >
              <span>{ADMIN_PANEL_COPY.visitorsTab}</span>
              <span className="text-xs text-[var(--ink-3)]">{'G 2'}</span>
            </button>

            <div className="my-2 border-b border-[var(--line)]" />

            {/* Stage B Deferred Views */}
            {[ADMIN_PANEL_COPY.live, ADMIN_PANEL_COPY.operations, ADMIN_PANEL_COPY.pages, ADMIN_PANEL_COPY.audit].map((view) => (
              <div
                key={view}
                className="px-4 py-2 text-[var(--ink-3)] flex items-center justify-between text-xs cursor-not-allowed opacity-60"
                title="Deferred to Stage B per build-order"
              >
                <span>{view}</span>
                <span className="text-xs bg-[var(--well)] px-1 rounded border border-[var(--line)]">{ADMIN_PANEL_COPY.stageB}</span>
              </div>
            ))}
          </div>

          {/* Bottom Rail Action */}
          <div className="p-3 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={() => navigate('/console')}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono text-[var(--ink-2)] hover:text-[var(--ink)] border border-[var(--line)] rounded bg-[var(--well)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {ADMIN_PANEL_COPY.console}
            </button>
          </div>
        </nav>

        {/* SLOT-10: Main Content View */}
        <main className="flex-1 overflow-y-auto p-6 dot-grid">
          {loading && !overview && sessions.length === 0 ? (
            <div className="py-24 text-center text-xs font-mono text-[var(--ink-3)]">
              {'LOADING SYSTEM TELEMETRY…'}
            </div>
          ) : activeTab === 'OVERVIEW' && overview ? (
            <OverviewView data={overview} />
          ) : (
            <VisitorsView
              sessions={sessions}
              selectedId={selectedSessionId}
              onSelect={(id) => setSelectedSessionId(id)}
              nextCursor={nextCursor}
              onLoadMore={loadMoreSessions}
              loading={loading}
            />
          )}
        </main>

        {/* SLOT-20..26: Detail Panel */}
        {selectedSessionId && (
          <DetailPanel
            sessionId={selectedSessionId}
            onClose={() => setSelectedSessionId(null)}
            onDeleted={() => {
              setSelectedSessionId(null);
              loadData();
            }}
          />
        )}
      </div>

      {/* SLOT-30: Activity Strip */}
      <div style={{ height: '28px' }} className="border-t border-[var(--line)] bg-[var(--panel)] px-4 flex items-center justify-between shrink-0 text-xs text-[var(--ink-3)]">
        <div className="flex items-center gap-2">
          <span>{'ACTIVITY STRIP:'}</span>
          <Sparkline values={[4, 7, 3, 12, 18, 9, 14, 22, 19, 28, 32, 24, 18, 30]} w={140} h={18} />
        </div>
        <div className="tabular-nums">{'24 H × 30 MIN BUCKETS'}</div>
      </div>

      {/* SLOT-40: Cost & Attribution Footer */}
      <footer className="h-6 bg-[var(--well)] border-t border-[var(--line)] px-4 flex items-center justify-between text-xs text-[var(--ink-3)] shrink-0 font-mono">
        <div className="flex items-center gap-4">
          <span className="tabular-nums">ROWS SCANNED: {queryMetrics.rows}</span>
          <span className="tabular-nums">QUERY: {queryMetrics.ms}ms</span>
          <span>{'RETENTION: 30D SLIDING'}</span>
        </div>
        <div>
          {'This product includes GeoLite2 data created by MaxMind, available from '}
          <a href="https://www.maxmind.com" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">
            {'https://www.maxmind.com'}
          </a>
          {'.'}
        </div>
      </footer>
    </div>
  );
};
