/**
 * Visitor dossier detail panel (SLOT-20..26).
 * Specs: PRD 16 §4 (D4)
 * - 20 Header: session label, user/guest chip, copy session id.
 * - 21 Tabs: TIMELINE, OPERATIONS, DEVICE, RAW.
 * - 22 Measured block: EVENTS, VISITS, DWELL, OPS, ERRORS.
 * - 23 Device/Geo: ua_raw in mono well, parsed specs, masked ip_hash.
 * - 24 Timeline: visit-grouped action stream with event family icons.
 * - 25 Actions: Export session CSV, clear session data, close.
 * - 26 Raw: Paginated JSON dump.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Trash2,
  Download,
  Clock,
  Compass,
  Zap,
  CheckSquare,
  MapPin,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ADMIN_PANEL_COPY } from '../../lib/landingCopy';
import {
  fetchAdminSessionDetail,
  fetchAdminSessionEvents,
  deleteAdminSession,
} from '../../lib/api';
import type {
  AdminSessionDetailResponse,
  AdminSessionEventsResponse,
  AdminTimelineEvent,
} from '../../lib/types/admin';

interface DetailPanelProps {
  sessionId: string;
  onClose: () => void;
  onDeleted?: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  sessionId,
  onClose,
  onDeleted,
}) => {
  const [tab, setTab] = useState<'TIMELINE' | 'OPERATIONS' | 'DEVICE' | 'RAW'>('TIMELINE');
  const [detail, setDetail] = useState<AdminSessionDetailResponse | null>(null);
  const [timeline, setTimeline] = useState<AdminSessionEventsResponse | null>(null);
  const [familyFilter, setFamilyFilter] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<AdminTimelineEvent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      fetchAdminSessionDetail(sessionId),
      fetchAdminSessionEvents(sessionId, undefined, familyFilter),
    ]).then(([detailRes, eventsRes]) => {
      if (!active) return;
      if (detailRes.kind === 'ok') setDetail(detailRes.data);
      if (eventsRes.kind === 'ok') setTimeline(eventsRes.data);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [sessionId, familyFilter]);

  const copyId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    await deleteAdminSession(sessionId);
    setShowDeleteConfirm(false);
    if (onDeleted) onDeleted();
    onClose();
  };

  const getFamilyIcon = (fam: string) => {
    switch (fam) {
      case 'nav':
        return <Compass className="w-3.5 h-3.5 text-[var(--ink-2)]" />;
      case 'op':
        return <Zap className="w-3.5 h-3.5 text-[var(--signal)]" />;
      case 'decision':
        return <CheckSquare className="w-3.5 h-3.5 text-[var(--ok)]" />;
      case 'map':
        return <MapPin className="w-3.5 h-3.5 text-[var(--ion)]" />;
      case 'auth':
        return <Lock className="w-3.5 h-3.5 text-[var(--steel)]" />;
      case 'error':
        return <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)]" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-[var(--ink-3)]" />;
    }
  };

  return (
    <aside style={{ width: '460px' }} className="w-full bg-[var(--panel)] border-l border-[var(--line)] flex flex-col h-full overflow-hidden select-text text-xs">
      {/* SLOT-20: Header */}
      <div className="p-4 border-b border-[var(--line)] flex items-center justify-between shrink-0 bg-[var(--panel-2)]">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-[var(--ink)]">
            {detail?.header.label || sessionId.slice(0, 8)}
          </span>
          <span className="px-1.5 py-0.5 text-xs font-mono uppercase tracking-wider rounded bg-[var(--well)] border border-[var(--line)] text-[var(--ink-2)]">
            {detail?.header.kind || 'GUEST'}
          </span>
          <button
            type="button"
            onClick={copyId}
            title="Copy Session ID"
            className="p-1 text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--ok)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[var(--ink-3)] hover:text-[var(--ink)] rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* SLOT-21: Tabs */}
      <div className="flex border-b border-[var(--line)] bg-[var(--well)] shrink-0 font-mono text-xs">
        {(['TIMELINE', 'OPERATIONS', 'DEVICE', 'RAW'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-center border-b-2 font-medium transition-colors ${
              tab === t
                ? 'border-[var(--signal)] text-[var(--signal)] bg-[var(--panel)]'
                : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* SLOT-22: Measured Block */}
      {detail && (
        <div className="grid grid-cols-5 p-3 border-b border-[var(--line)] bg-[var(--panel)] font-mono text-center shrink-0">
          <div>
            <div className="text-xs text-[var(--ink-3)]">{ADMIN_PANEL_COPY.events}</div>
            <div className="font-bold text-[var(--ink)]">{detail.measured.events}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--ink-3)]">{ADMIN_PANEL_COPY.visits}</div>
            <div className="font-bold text-[var(--ink)]">{detail.measured.visits}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--ink-3)]">{ADMIN_PANEL_COPY.dwell}</div>
            <div className="font-bold text-[var(--ink)]">{detail.measured.dwell}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--ink-3)]">{ADMIN_PANEL_COPY.ops}</div>
            <div className="font-bold text-[var(--signal)]">{detail.measured.ops}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--ink-3)]">{ADMIN_PANEL_COPY.errors}</div>
            <div className={`font-bold ${detail.measured.errors > 0 ? 'text-[var(--danger)]' : 'text-[var(--ink)]'}`}>
              {detail.measured.errors}
            </div>
          </div>
        </div>
      )}

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-[var(--ink-3)] font-mono">{ADMIN_PANEL_COPY.loadingDossier}</div>
        ) : tab === 'TIMELINE' ? (
          /* SLOT-24: Timeline */
          <div className="space-y-4">
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: 'ALL', fam: undefined },
                { label: 'OPS', fam: 'op' },
                { label: 'DECISIONS', fam: 'decision' },
                { label: 'ERRORS', fam: 'error' },
              ].map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setFamilyFilter(f.fam)}
                  className={`px-2 py-0.5 text-xs font-mono rounded border ${
                    familyFilter === f.fam
                      ? 'bg-[var(--signal)] text-[var(--bg)] border-[var(--signal)] font-bold'
                      : 'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--well)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {timeline?.visits.map((visit) => (
              <div key={visit.visit_id} className="space-y-2">
                <div className="text-xs font-mono font-semibold text-[var(--signal)] bg-[var(--well)] px-2.5 py-1 rounded border border-[var(--line)]">
                  {visit.title}
                </div>
                <div className="space-y-1 pl-2 border-l border-[var(--line)]">
                  {visit.events.map((ev, i) => (
                    <div
                      key={`${ev.name}-${i}`}
                      onMouseEnter={() => setHoveredEvent(ev)}
                      onMouseLeave={() => setHoveredEvent(null)}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-[var(--well)] cursor-pointer text-xs font-mono group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[var(--ink-3)] tabular-nums">{ev.time}</span>
                        {getFamilyIcon(ev.family)}
                        <span className="font-medium text-[var(--ink)]">{ev.name}</span>
                        {ev.salient && (
                          <span className="text-[var(--ink-2)] bg-[var(--well)] px-1 rounded truncate">
                            {ev.salient}
                          </span>
                        )}
                      </div>
                      {ev.duration_ms !== null && ev.duration_ms !== undefined && (
                        <span className="text-[var(--ink-3)] tabular-nums">{ev.duration_ms}ms</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {hoveredEvent && (
              <div className="p-3 bg-[var(--well)] border border-[var(--line-strong)] rounded text-xs font-mono space-y-1">
                <div className="font-bold text-[var(--signal)]">{hoveredEvent.name} Payload:</div>
                <pre className="overflow-x-auto text-[var(--ink-2)]">
                  {JSON.stringify(hoveredEvent.p, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : tab === 'DEVICE' ? (
          /* SLOT-23: Device & Geo */
          <div className="space-y-4">
            <div>
              <div className="text-xs font-mono uppercase text-[var(--ink-3)] mb-1">
                {ADMIN_PANEL_COPY.rawUaTitle}
              </div>
              <div className="p-2.5 bg-[var(--well)] border border-[var(--line)] rounded font-mono text-xs text-[var(--ink-2)] break-all select-all">
                {detail?.device.ua_raw}
              </div>
            </div>

            <div className="space-y-2 divide-y divide-[var(--line)] font-mono">
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--ink-3)]">{ADMIN_PANEL_COPY.deviceOs}</span>
                <span className="font-bold text-[var(--ink)]">
                  {detail?.device.device.toUpperCase()} · {detail?.device.os.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--ink-3)]">{ADMIN_PANEL_COPY.browser}</span>
                <span className="font-bold text-[var(--ink)]">{detail?.device.browser}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--ink-3)]">{ADMIN_PANEL_COPY.screenDpr}</span>
                <span className="font-bold text-[var(--ink)]">
                  {detail?.device.screen} · {detail?.device.dpr}x
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--ink-3)]">{ADMIN_PANEL_COPY.location}</span>
                <span className="font-bold text-[var(--ink)]">
                  {detail?.device.geo_city}, {detail?.device.geo_country}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--ink-3)]">{ADMIN_PANEL_COPY.referrer}</span>
                <span className="font-bold text-[var(--ink)]">{detail?.device.referrer_host}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--ink-3)]">{ADMIN_PANEL_COPY.ipHash}</span>
                <div className="text-right">
                  <span className="font-bold text-[var(--signal)] font-mono">{detail?.device.ip_hash_prefix}</span>
                  <div className="text-xs text-[var(--ink-3)] opacity-75">{detail?.device.ip_note}</div>
                </div>
              </div>
            </div>
          </div>
        ) : tab === 'OPERATIONS' ? (
          <div className="space-y-3 font-mono">
            {timeline?.visits
              .flatMap((v) => v.events.filter((e) => e.family === 'op'))
              .map((ev, i) => (
                <div key={i} className="p-2.5 bg-[var(--well)] border border-[var(--line)] rounded space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-[var(--signal)]">{ev.name}</span>
                    <span className="text-[var(--ink-3)]">{ev.time}</span>
                  </div>
                  <div className="text-xs text-[var(--ink-2)] truncate">Path: {ev.path}</div>
                  <pre className="text-xs text-[var(--steel)]">{JSON.stringify(ev.p, null, 2)}</pre>
                </div>
              ))}
          </div>
        ) : (
          <pre className="p-3 bg-[var(--well)] border border-[var(--line)] rounded font-mono text-xs text-[var(--ink-2)] overflow-x-auto">
            {JSON.stringify(detail, null, 2)}
          </pre>
        )}
      </div>

      {/* SLOT-25: Actions */}
      <div className="p-3 border-t border-[var(--line)] bg-[var(--panel-2)] flex items-center justify-between gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const blob = new Blob([JSON.stringify(detail, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session_${sessionId}.json`;
            a.click();
          }}
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          {ADMIN_PANEL_COPY.exportDossier}
        </Button>

        {showDeleteConfirm ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--danger)] font-mono">{ADMIN_PANEL_COPY.revokePrompt}</span>
            <button
              type="button"
              onClick={handleDelete}
              className="px-2 py-1 bg-[var(--danger)] text-white text-xs font-mono rounded font-bold"
            >
              {ADMIN_PANEL_COPY.yes}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-1 bg-[var(--well)] border border-[var(--line)] text-xs font-mono rounded"
            >
              {ADMIN_PANEL_COPY.no}
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[var(--danger)] hover:bg-[var(--danger-wash)]"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {ADMIN_PANEL_COPY.clearData}
          </Button>
        )}
      </div>
    </aside>
  );
};
