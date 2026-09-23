/**
 * Header (SLOT-01) and Filter Bar (SLOT-02) for Admin Console.
 * Specs: PRD 16 §2 (D2)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RotateCcw, Sparkles, Search, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { ChakshuLogo } from '../ui/ChakshuLogo';
import { ADMIN_PANEL_COPY, LANDING_COPY } from '../../lib/landingCopy';
import { getAdminExportCsvUrl, logoutAdmin } from '../../lib/api';
import type { AdminOverviewResponse, AdminStatusResponse } from '../../lib/types/admin';

interface AdminControlsProps {
  range: string;
  device: string;
  country: string;
  op: string;
  entry: string;
  includeBots: boolean;
  q: string;
  authStatus: AdminStatusResponse | null;
  overview: AdminOverviewResponse | null;
  isSeeded: boolean;
  onUpdate: (updates: Record<string, string | null>) => void;
  onReset: () => void;
}

export const AdminHeader: React.FC<AdminControlsProps> = ({
  range,
  q,
  authStatus,
  overview,
  isSeeded,
  onUpdate,
}) => {
  const navigate = useNavigate();

  return (
    <header className="h-12 border-b border-[var(--line)] bg-[var(--panel)] px-4 flex items-center justify-between shrink-0 gap-4">
      {/* Left: Lockup + ADMIN Tag + Range + Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/console')}>
          <ChakshuLogo size={20} />
          <span className="text-sm font-bold tracking-wider text-[var(--signal)] font-sans">{LANDING_COPY.appNameDevanagari}</span>
        </div>
        <span className="text-xs uppercase font-bold tracking-widest text-[var(--signal)] bg-[var(--signal-wash)] px-2 py-0.5 rounded border border-[var(--signal)]">
          {ADMIN_PANEL_COPY.adminTag}
        </span>

        {/* RANGE Select */}
        <div className="relative">
          <select
            value={range}
            onChange={(e) => onUpdate({ range: e.target.value })}
            className="appearance-none bg-[var(--well)] border border-[var(--line)] text-xs font-mono px-2.5 py-1 pr-6 rounded text-[var(--ink)] cursor-pointer"
          >
            <option value="24h">{'LAST 24 H'}</option>
            <option value="7d">{'LAST 7 D'}</option>
            <option value="30d">{'LAST 30 D'}</option>
            <option value="all">{'ALL TIME'}</option>
          </select>
          <ChevronDown className="w-3 h-3 text-[var(--ink-3)] absolute right-1.5 top-2.5 pointer-events-none" />
        </div>

        {/* Search Box */}
        <div className="relative w-56 hidden sm:block">
          <Search className="w-3.5 h-3.5 text-[var(--ink-3)] absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder={ADMIN_PANEL_COPY.searchPlaceholder}
            value={q}
            onChange={(e) => onUpdate({ q: e.target.value })}
            className="w-full bg-[var(--well)] border border-[var(--line)] rounded pl-8 pr-2 py-1 text-xs font-mono text-[var(--ink)] placeholder-[var(--ink-3)] outline-none focus:border-[var(--signal)]"
          />
        </div>
      </div>

      {/* Right: DEMO DATA badge + Stats + Account */}
      <div className="flex items-center gap-4">
        {isSeeded && (
          <div
            title={ADMIN_PANEL_COPY.demoDataTooltip}
            className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--signal-wash)] border border-[var(--signal)] text-[var(--signal)] rounded text-xs font-bold tracking-wider uppercase animate-pulse cursor-help"
          >
            <Sparkles className="w-3 h-3" />
            {ADMIN_PANEL_COPY.demoData}
          </div>
        )}

        {overview && (
          <div className="hidden md:flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-[var(--ink-3)]">{ADMIN_PANEL_COPY.visitors}: </span>
              <span className="font-bold text-[var(--ink)] tabular-nums">{overview.kpis.visitors.value}</span>
            </div>
            <div>
              <span className="text-[var(--ink-3)]">{ADMIN_PANEL_COPY.visits}: </span>
              <span className="font-bold text-[var(--ink)] tabular-nums">{overview.kpis.visits.value}</span>
            </div>
          </div>
        )}

        <div style={{ maxWidth: '140px' }} className="text-xs font-bold text-[var(--signal)] bg-[var(--well)] px-2 py-1 rounded border border-[var(--line)] truncate">
          {authStatus?.session_label || 'ADMIN'}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await logoutAdmin();
            window.location.reload();
          }}
          title="Sign out of admin session"
        >
          {'LOGOUT'}
        </Button>
      </div>
    </header>
  );
};

export const AdminFilterBar: React.FC<AdminControlsProps> = ({
  range,
  device,
  country,
  op,
  entry,
  includeBots,
  q,
  onUpdate,
  onReset,
}) => {
  return (
    <div className="h-10 border-b border-[var(--line)] bg-[var(--panel-2)] px-4 flex items-center justify-between shrink-0 text-xs">
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {/* Device */}
        <select
          value={device}
          onChange={(e) => onUpdate({ device: e.target.value })}
          className="bg-[var(--panel)] border border-[var(--line)] text-xs font-mono px-2 py-0.5 rounded text-[var(--ink-2)]"
        >
          <option value="">{'DEVICE: ALL'}</option>
          <option value="desktop">{'DESKTOP'}</option>
          <option value="mobile">{'MOBILE'}</option>
          <option value="tablet">{'TABLET'}</option>
        </select>

        {/* Operation */}
        <select
          value={op}
          onChange={(e) => onUpdate({ op: e.target.value })}
          className="bg-[var(--panel)] border border-[var(--line)] text-xs font-mono px-2 py-0.5 rounded text-[var(--ink-2)]"
        >
          <option value="">{'OP: ALL'}</option>
          <option value="change_detect">{'CHANGE DETECT'}</option>
          <option value="ask">{'ASK'}</option>
          <option value="aoi_create">{'AOI CREATE'}</option>
          <option value="search">{'SEARCH'}</option>
          <option value="export">{'EXPORT'}</option>
        </select>

        {/* Bot filter toggle */}
        <button
          type="button"
          onClick={() => onUpdate({ bots: includeBots ? null : 'true' })}
          className={`px-2 py-0.5 text-xs font-mono rounded border ${
            includeBots ? 'bg-[var(--signal)] text-[var(--bg)] font-bold' : 'border-[var(--line)] text-[var(--ink-3)]'
          }`}
        >
          {includeBots ? 'BOTS INCLUDED' : 'BOTS FILTERED'}
        </button>

        {(device || country || op || entry || includeBots || q) && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-[var(--ink-3)] hover:text-[var(--ink)] font-mono ml-1"
          >
            <RotateCcw className="w-3 h-3" />
            {ADMIN_PANEL_COPY.reset}
          </button>
        )}
      </div>

      {/* PRIMARY OWNER: Exactly one primary button in viewport per PRD 16 §2 */}
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          const url = getAdminExportCsvUrl({ range, device: device || undefined, country: country || undefined, op: op || undefined, entry: entry || undefined, include_bots: includeBots, q: q || undefined });
          window.open(url, '_blank');
        }}
      >
        <Download className="w-3.5 h-3.5 mr-1" />
        {ADMIN_PANEL_COPY.exportCsv}
      </Button>
    </div>
  );
};
