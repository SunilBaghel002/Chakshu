/**
 * Visitors table view (SLOT-10 per PRD 16 D3.2).
 * Formatted columns, hover per M6, cursor pagination, selection -> dossier.
 */

import React from 'react';
import { Button } from '../ui/Button';
import { ADMIN_PANEL_COPY } from '../../lib/landingCopy';
import type { SessionRow } from '../../lib/types/admin';

interface VisitorsViewProps {
  sessions: SessionRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  nextCursor: string | null;
  onLoadMore: () => void;
  loading: boolean;
}

export const VisitorsView: React.FC<VisitorsViewProps> = ({
  sessions,
  selectedId,
  onSelect,
  nextCursor,
  onLoadMore,
  loading,
}) => {
  if (sessions.length === 0 && !loading) {
    return (
      <div className="p-12 text-center bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] font-mono space-y-2">
        <div className="text-sm font-bold text-[var(--ink-2)]">
          {ADMIN_PANEL_COPY.noVisitors}
        </div>
        <div className="text-xs text-[var(--ink-3)]">
          {ADMIN_PANEL_COPY.noVisitorsSub}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] overflow-hidden flex flex-col font-mono text-xs select-text">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--panel-2)] text-xs text-[var(--ink-3)] uppercase tracking-wider h-9">
              <th style={{ width: '140px' }} className="px-3">{ADMIN_PANEL_COPY.session}</th>
              <th style={{ width: '140px' }} className="px-3">{ADMIN_PANEL_COPY.firstSeen}</th>
              <th style={{ width: '130px' }} className="px-3">{ADMIN_PANEL_COPY.lastSeen}</th>
              <th style={{ width: '70px' }} className="px-3 text-right">{ADMIN_PANEL_COPY.visits}</th>
              <th style={{ width: '80px' }} className="px-3 text-right">{ADMIN_PANEL_COPY.events}</th>
              <th style={{ width: '160px' }} className="px-3">{ADMIN_PANEL_COPY.ops}</th>
              <th style={{ width: '200px' }} className="px-3">{ADMIN_PANEL_COPY.device}</th>
              <th style={{ width: '160px' }} className="px-3">{ADMIN_PANEL_COPY.location}</th>
              <th style={{ width: '140px' }} className="px-3">{ADMIN_PANEL_COPY.entry}</th>
              <th style={{ width: '90px' }} className="px-3 text-center">{ADMIN_PANEL_COPY.state}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {sessions.map((row) => {
              const isSelected = selectedId === row.id;
              const isSeeded = row.seeded;

              return (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.id)}
                  className={`h-9 cursor-pointer transition-all duration-150 relative ${
                    isSelected
                      ? 'bg-[var(--signal-wash)] border-l-2 border-l-[var(--signal)]'
                      : 'hover:bg-[var(--well)] hover:translate-x-0.5'
                  }`}
                >
                  {/* SESSION */}
                  <td style={{ maxWidth: '140px' }} className="px-3 font-bold text-[var(--ink)] truncate">
                    <div className="flex items-center gap-1.5">
                      <span>{row.session}</span>
                      {isSeeded && (
                        <span className="text-xs px-1 bg-[var(--well)] text-[var(--signal)] border border-[var(--signal)] rounded">
                          {'DEMO'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* FIRST SEEN */}
                  <td className="px-3 text-[var(--ink-2)] truncate tabular-nums">
                    {new Date(row.first_seen).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>

                  {/* LAST SEEN */}
                  <td className="px-3 text-[var(--ink-2)] truncate tabular-nums">
                    {new Date(row.last_seen).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>

                  {/* VISITS */}
                  <td className="px-3 text-right text-[var(--ink)] tabular-nums">
                    {row.visits}
                  </td>

                  {/* EVENTS */}
                  <td className="px-3 text-right text-[var(--ink)] tabular-nums">
                    {row.events}
                  </td>

                  {/* OPS */}
                  <td style={{ maxWidth: '160px' }} className="px-3 truncate text-[var(--ink-2)]">
                    {row.ops !== '—' ? (
                      <span className="px-1.5 py-0.5 rounded bg-[var(--well)] border border-[var(--line)] text-xs font-bold text-[var(--signal)]">
                        {row.ops}
                      </span>
                    ) : (
                      <span className="text-[var(--ink-3)]">{'—'}</span>
                    )}
                  </td>

                  {/* DEVICE */}
                  <td style={{ maxWidth: '200px' }} className="px-3 text-[var(--ink-2)] truncate" title={row.device}>
                    {row.device}
                  </td>

                  {/* LOCATION */}
                  <td style={{ maxWidth: '160px' }} className="px-3 text-[var(--ink-2)] truncate">
                    {row.location}
                  </td>

                  {/* ENTRY */}
                  <td style={{ maxWidth: '140px' }} className="px-3 text-[var(--ink-2)] truncate" title={row.entry}>
                    {row.entry}
                  </td>

                  {/* STATE */}
                  <td className="px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold ${
                        row.state === 'ACTIVE'
                          ? 'bg-[var(--ok-wash)] text-[var(--ok)] border border-[var(--ok)]'
                          : row.state === 'SIGNED UP'
                          ? 'bg-[var(--signal-wash)] text-[var(--signal)] border border-[var(--signal)]'
                          : 'bg-[var(--well)] text-[var(--ink-3)] border border-[var(--line)]'
                      }`}
                    >
                      {row.state === 'ACTIVE' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] animate-pulse" />
                      )}
                      {row.state}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {nextCursor && (
        <div className="p-3 border-t border-[var(--line)] bg-[var(--panel-2)] flex items-center justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? ADMIN_PANEL_COPY.loadingMore : ADMIN_PANEL_COPY.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
};
