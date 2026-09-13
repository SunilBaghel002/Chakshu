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
import { getClassColor, PALETTE } from '../lib/palette';
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

  // Derive unique categories from evidenceList
  const categories = useMemo(() => {
    const set = new Set(evidenceList.map((e) => e.change_type));
    return ['all', ...Array.from(set)];
  }, [evidenceList]);

  // Filter and Sort evidence items
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

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= filteredList.length) {
      setSelectedIndex(Math.max(0, filteredList.length - 1));
    }
  }, [filteredList.length, selectedIndex]);

  const currentItem = filteredList[selectedIndex];

  // Keyboard navigation shortcuts: j, k, c, r, e, Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredList.length - 1)));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'c' && currentItem) {
        e.preventDefault();
        onConfirm(currentItem.change_object_id);
      } else if (e.key === 'r' && currentItem) {
        e.preventDefault();
        onReject(currentItem.change_object_id);
      } else if (e.key === 'e' && currentItem) {
        e.preventDefault();
        onSelectEvidence(currentItem);
        onClose();
      }
    },
    [filteredList.length, currentItem, onConfirm, onReject, onSelectEvidence, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Summary counts
  const counts = useMemo(() => {
    return {
      total: evidenceList.length,
      pending: evidenceList.filter((e) => e.status === 'pending').length,
      confirmed: evidenceList.filter((e) => e.status === 'confirmed').length,
      rejected: evidenceList.filter((e) => e.status === 'rejected').length,
    };
  }, [evidenceList]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md select-none animate-fadeIn">
      <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 bg-[#111827] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Review Queue</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {filteredList.length} of {evidenceList.length} changes
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Rapid analyst triage: approve genuine ground changes or flag false alarms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Table view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Card grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Sort Controls Bar */}
        <div className="px-4 py-2.5 bg-[#0B0F19] border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap text-xs font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
              {(['all', 'pending', 'confirmed', 'rejected'] as StatusFilter[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase transition-colors ${
                    statusFilter === st
                      ? st === 'confirmed'
                        ? 'bg-emerald-600 text-white'
                        : st === 'rejected'
                        ? 'bg-rose-600 text-white'
                        : 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st} ({st === 'all' ? counts.total : counts[st]})
                </button>
              ))}
            </div>

            {/* Category dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer capitalize"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-slate-200 capitalize">
                    {c.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
            <ArrowUpDown className="w-3 h-3 text-indigo-400" />
            <span className="text-slate-400 text-[11px]">SORT:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="area_desc" className="bg-slate-900 text-slate-200">Area (High to Low)</option>
              <option value="area_asc" className="bg-slate-900 text-slate-200">Area (Low to High)</option>
              <option value="conf_desc" className="bg-slate-900 text-slate-200">Confidence (High to Low)</option>
              <option value="date_desc" className="bg-slate-900 text-slate-200">Date (Newest First)</option>
            </select>
          </div>
        </div>

        {/* Content Body: Table or Card Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredList.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
              <ShieldCheck className="w-8 h-8 mb-2 text-slate-600" />
              <p>No changes match the selected filters.</p>
            </div>
          ) : viewMode === 'table' ? (
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="pb-2 pl-2">#</th>
                  <th className="pb-2">Change ID</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-right">Ground Area</th>
                  <th className="pb-2 text-center">First Seen</th>
                  <th className="pb-2 text-right">Confidence</th>
                  <th className="pb-2 text-center">Status</th>
                  <th className="pb-2 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredList.map((ev, idx) => {
                  const isSelected = idx === selectedIndex;
                  const color = getClassColor(ev.change_type);
                  return (
                    <tr
                      key={ev.change_object_id}
                      onClick={() => setSelectedIndex(idx)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-950/40 border-l-2 border-indigo-500'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 pl-2 text-slate-500 text-[10px] tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 text-slate-300 font-semibold truncate max-w-[120px]" title={ev.change_object_id}>
                        {ev.change_object_id.slice(0, 10)}...
                      </td>
                      <td className="py-2.5">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${color}25`,
                            color: color,
                            border: `1px solid ${color}50`,
                          }}
                        >
                          {ev.change_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-white tabular-nums">
                        {ev.measurement.area_label}
                      </td>
                      <td className="py-2.5 text-center text-slate-300 tabular-nums">
                        {ev.temporal.first_supported || ev.sources.after.acquired_at}
                      </td>
                      <td className="py-2.5 text-right text-emerald-400 font-semibold tabular-nums">
                        {(ev.confidence.overall * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            ev.status === 'confirmed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : ev.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              onSelectEvidence(ev);
                              onClose();
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Inspect on map [e]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onConfirm(ev.change_object_id)}
                            className="p-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/50"
                            title="Confirm genuine change [c]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onReject(ev.change_object_id)}
                            className="p-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-800/50"
                            title="Reject false alarm [r]"
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
                  onSelect={() => {
                    setSelectedIndex(idx);
                    onSelectEvidence(ev);
                    onClose();
                  }}
                  onConfirm={onConfirm}
                  onReject={onReject}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer with Discoverable Keyboard Shortcuts */}
        <div className="p-3 bg-[#111827] border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400 flex-wrap">
            <Keyboard className="w-4 h-4 text-indigo-400 inline" />
            <span className="text-[11px] text-slate-400">Shortcuts:</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
              <strong className="text-white">j</strong>/<strong>k</strong> Nav
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[10px]">
              <strong className="text-white">c</strong> Confirm
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-800 text-rose-300 text-[10px]">
              <strong className="text-white">r</strong> Reject
            </span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-800 text-indigo-300 text-[10px]">
              <strong className="text-white">e</strong> Inspect
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
              <strong className="text-white">Esc</strong> Close
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Done Reviewing
          </button>
        </div>
      </div>
    </div>
  );
};
