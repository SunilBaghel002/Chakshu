import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Check,
  Ban,
  Eye,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  Keyboard,
  ShieldCheck,
} from 'lucide-react';
import type { Evidence } from '../lib/types';
import { getClassColor } from '../lib/palette';
import { ChangeCard } from './ChangeCard';

interface ReviewQueueModalProps {
  evidenceList: Evidence[];
  onSelectEvidence: (evidence: Evidence) => void;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onClose: () => void;
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'rejected';
type SortOption = 'area_desc' | 'area_asc' | 'conf_desc' | 'date_desc';

export const ReviewQueueModal: React.FC<ReviewQueueModalProps> = ({
  evidenceList,
  onSelectEvidence,
  onConfirm,
  onReject,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('area_desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const categories = useMemo(() => {
    const set = new Set(evidenceList.map((e) => e.change_type));
    return ['all', ...Array.from(set)];
  }, [evidenceList]);

  const filteredList = useMemo(() => {
    return evidenceList
      .filter((ev) => {
        if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && ev.change_type !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'area_desc') return (b.measurement.area_m2 || 0) - (a.measurement.area_m2 || 0);
        if (sortOption === 'area_asc') return (a.measurement.area_m2 || 0) - (b.measurement.area_m2 || 0);
        if (sortOption === 'conf_desc') return b.confidence.overall - a.confidence.overall;
        if (sortOption === 'date_desc') {
          const da = a.temporal.first_supported || a.sources.after.acquired_at;
          const db = b.temporal.first_supported || b.sources.after.acquired_at;
          return db.localeCompare(da);
        }
        return 0;
      });
  }, [evidenceList, statusFilter, categoryFilter, sortOption]);

  useEffect(() => {
    if (selectedIndex >= filteredList.length) {
      setSelectedIndex(Math.max(0, filteredList.length - 1));
    }
  }, [filteredList.length, selectedIndex]);

  const currentItem = filteredList[selectedIndex];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredList.length - 1))); }
      else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((prev) => Math.max(prev - 1, 0)); }
      else if (e.key === 'c' && currentItem) { e.preventDefault(); onConfirm(currentItem.change_object_id); }
      else if (e.key === 'r' && currentItem) { e.preventDefault(); onReject(currentItem.change_object_id); }
      else if (e.key === 'e' && currentItem) { e.preventDefault(); onSelectEvidence(currentItem); onClose(); }
    },
    [filteredList.length, currentItem, onConfirm, onReject, onSelectEvidence, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const counts = useMemo(() => ({
    total: evidenceList.length,
    pending: evidenceList.filter((e) => e.status === 'pending').length,
    confirmed: evidenceList.filter((e) => e.status === 'confirmed').length,
    rejected: evidenceList.filter((e) => e.status === 'rejected').length,
  }), [evidenceList]);

  const getStatusStyle = (st: StatusFilter, isActive: boolean) => {
    if (!isActive) return { background: 'transparent', color: 'var(--ink-3)', border: 'none' };
    switch (st) {
      case 'confirmed': return { background: 'var(--confirmed-fill)', color: 'var(--confirmed-text)', border: `1px solid var(--confirmed-border)` };
      case 'rejected': return { background: 'var(--rejected-fill)', color: 'var(--rejected-text)', border: `1px solid var(--rejected-border)` };
      default: return { background: 'var(--amber-wash)', color: 'var(--amber)', border: `1px solid var(--amber)` };
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 select-none"
      style={{ background: 'rgba(11, 13, 16, 0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden corner-ticks"
        style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius)' }}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2" style={{ background: 'var(--amber-wash)', border: '1px solid var(--amber)', borderRadius: 'var(--radius)', color: 'var(--amber)' }}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="t-h1" style={{ fontSize: 16 }}>REVIEW QUEUE</h2>
                <span className="t-tag" style={{ padding: '2px 8px', background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--ink-2)', borderRadius: 'var(--radius-sm)', fontSize: 9 }}>
                  {filteredList.length} / {evidenceList.length}
                </span>
              </div>
              <p className="t-body" style={{ color: 'var(--ink-3)', fontSize: 11 }}>
                Rapid analyst triage — approve genuine changes or flag false alarms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
              <button
                onClick={() => setViewMode('table')}
                className="p-1.5 cursor-pointer"
                style={{ background: viewMode === 'table' ? 'var(--amber-wash)' : 'transparent', color: viewMode === 'table' ? 'var(--amber)' : 'var(--ink-3)', borderRadius: 'var(--radius-sm)', border: 'none' }}
                title="Table view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className="p-1.5 cursor-pointer"
                style={{ background: viewMode === 'grid' ? 'var(--amber-wash)' : 'transparent', color: viewMode === 'grid' ? 'var(--amber)' : 'var(--ink-3)', borderRadius: 'var(--radius-sm)', border: 'none' }}
                title="Card view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={onClose} className="p-1.5 cursor-pointer" style={{ background: 'none', border: 'none', color: 'var(--ink-3)', borderRadius: 'var(--radius)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-0.5 p-0.5" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
              {(['all', 'pending', 'confirmed', 'rejected'] as StatusFilter[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className="t-tag px-2 py-0.5 cursor-pointer transition-colors"
                  style={{
                    ...getStatusStyle(st, statusFilter === st),
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 9,
                  }}
                >
                  {st.toUpperCase()} ({st === 'all' ? counts.total : counts[st]})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
              <Filter className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="t-tag cursor-pointer focus:outline-none capitalize"
                style={{ background: 'transparent', color: 'var(--ink-2)', border: 'none', fontSize: 10 }}
              >
                {categories.map((c) => (
                  <option key={c} value={c} style={{ background: 'var(--panel)' }}>
                    {c.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
            <ArrowUpDown className="w-3 h-3" style={{ color: 'var(--amber)' }} />
            <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>SORT:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="t-tag cursor-pointer focus:outline-none"
              style={{ background: 'transparent', color: 'var(--ink-2)', border: 'none', fontSize: 10 }}
            >
              <option value="area_desc" style={{ background: 'var(--panel)' }}>Area ↓</option>
              <option value="area_asc" style={{ background: 'var(--panel)' }}>Area ↑</option>
              <option value="conf_desc" style={{ background: 'var(--panel)' }}>Confidence ↓</option>
              <option value="date_desc" style={{ background: 'var(--panel)' }}>Date ↓</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredList.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center" style={{ color: 'var(--ink-3)' }}>
              <ShieldCheck className="w-8 h-8 mb-2" style={{ color: 'var(--line-strong)' }} />
              <p className="t-mono" style={{ fontSize: 11 }}>No changes match filters.</p>
            </div>
          ) : viewMode === 'table' ? (
            <table className="w-full text-left t-mono border-collapse" style={{ fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <th className="pb-2 pl-2 t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>#</th>
                  <th className="pb-2 t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>ID</th>
                  <th className="pb-2 t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>TYPE</th>
                  <th className="pb-2 text-right t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>AREA</th>
                  <th className="pb-2 text-center t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>DATE</th>
                  <th className="pb-2 text-right t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>CONF</th>
                  <th className="pb-2 text-center t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>STATUS</th>
                  <th className="pb-2 pr-2 text-right t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((ev, idx) => {
                  const isSelected = idx === selectedIndex;
                  const color = getClassColor(ev.change_type);
                  return (
                    <tr
                      key={ev.change_object_id}
                      onClick={() => setSelectedIndex(idx)}
                      className="cursor-pointer transition-all"
                      style={{
                        borderBottom: '1px solid var(--line)',
                        background: isSelected ? 'var(--amber-wash)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--amber)' : '3px solid transparent',
                      }}
                    >
                      <td className="py-2.5 pl-2 tabular-nums" style={{ color: 'var(--ink-3)', fontSize: 10 }}>{idx + 1}</td>
                      <td className="py-2.5 truncate" style={{ color: 'var(--ink-2)', maxWidth: 100, fontWeight: 600 }} title={ev.change_object_id}>
                        {ev.change_object_id.slice(0, 10)}…
                      </td>
                      <td className="py-2.5">
                        <span
                          className="t-tag"
                          style={{
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 9,
                            background: `${color}20`,
                            color,
                            border: `1px solid ${color}50`,
                          }}
                        >
                          {ev.change_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums" style={{ color: 'var(--ink)', fontWeight: 700 }}>
                        {ev.measurement.area_label}
                      </td>
                      <td className="py-2.5 text-center tabular-nums" style={{ color: 'var(--ink-2)' }}>
                        {ev.temporal.first_supported || ev.sources.after.acquired_at}
                      </td>
                      <td className="py-2.5 text-right tabular-nums" style={{ color: 'var(--amber)', fontWeight: 600 }}>
                        {(ev.confidence.overall * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className="t-tag"
                          style={{
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 9,
                            background: ev.status === 'confirmed' ? 'var(--confirmed-fill)' : ev.status === 'rejected' ? 'var(--rejected-fill)' : 'var(--amber-wash)',
                            color: ev.status === 'confirmed' ? 'var(--confirmed-text)' : ev.status === 'rejected' ? 'var(--rejected-text)' : 'var(--amber)',
                            border: `1px solid ${ev.status === 'confirmed' ? 'var(--confirmed-border)' : ev.status === 'rejected' ? 'var(--rejected-border)' : 'var(--amber)'}`,
                          }}
                        >
                          {ev.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { onSelectEvidence(ev); onClose(); }}
                            className="p-1 cursor-pointer transition-colors"
                            style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--ink-2)', borderRadius: 'var(--radius-sm)' }}
                            title="Inspect [e]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onConfirm(ev.change_object_id)}
                            className="p-1 cursor-pointer transition-colors"
                            style={{ background: 'var(--confirmed-fill)', border: '1px solid var(--confirmed-border)', color: 'var(--confirmed-text)', borderRadius: 'var(--radius-sm)' }}
                            title="Confirm [c]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onReject(ev.change_object_id)}
                            className="p-1 cursor-pointer transition-colors"
                            style={{ background: 'var(--rejected-fill)', border: '1px solid var(--rejected-border)', color: 'var(--rejected-text)', borderRadius: 'var(--radius-sm)' }}
                            title="Reject [r]"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredList.map((ev, idx) => (
                <ChangeCard
                  key={ev.change_object_id}
                  evidence={ev}
                  isSelected={idx === selectedIndex}
                  onSelect={() => { setSelectedIndex(idx); onSelectEvidence(ev); onClose(); }}
                  onConfirm={onConfirm}
                  onReject={onReject}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 flex items-center justify-between flex-wrap gap-2" style={{ borderTop: '1px solid var(--line)', background: 'var(--bg)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <Keyboard className="w-4 h-4" style={{ color: 'var(--amber)' }} />
            <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>SHORTCUTS:</span>
            {[
              { key: 'j/k', label: 'Nav', bg: 'var(--panel-2)', color: 'var(--ink-2)', border: 'var(--line)' },
              { key: 'c', label: 'Confirm', bg: 'var(--confirmed-fill)', color: 'var(--confirmed-text)', border: 'var(--confirmed-border)' },
              { key: 'r', label: 'Reject', bg: 'var(--rejected-fill)', color: 'var(--rejected-text)', border: 'var(--rejected-border)' },
              { key: 'e', label: 'Inspect', bg: 'var(--amber-wash)', color: 'var(--amber)', border: 'var(--amber)' },
              { key: 'Esc', label: 'Close', bg: 'var(--panel-2)', color: 'var(--ink-2)', border: 'var(--line)' },
            ].map(({ key, label, bg, color, border }) => (
              <span key={key} className="t-tag px-1.5 py-0.5" style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 'var(--radius-sm)', fontSize: 9 }}>
                <strong style={{ color: 'var(--ink)' }}>{key}</strong> {label}
              </span>
            ))}
          </div>

          <button onClick={onClose} className="btn-primary" style={{ padding: '6px 16px', fontSize: 11 }}>
            <span>DONE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
