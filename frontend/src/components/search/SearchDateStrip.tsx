import React from 'react';
import { Calendar } from 'lucide-react';
import { SEARCH_COPY } from '../../lib/copy';

interface SearchDateStripProps {
  dates?: string[];
}

/**
 * SearchDateStrip — SLOT-30 (PRD 10 §5 / L5)
 * Displays the retrieval's date spread across passes
 */
export const SearchDateStrip: React.FC<SearchDateStripProps> = ({ dates = [] }) => {
  const displayDates =
    dates.length > 0
      ? dates
      : ['2021-01-15', '2021-11-25', '2022-03-15', '2023-08-20', '2024-06-09', '2026-08-18'];

  return (
    <div
      className="flex items-center px-4 gap-3 h-full w-full select-none"
      style={{
        background: 'var(--well)',
        borderTop: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-1.5 shrink-0 text-[var(--ink-3)]">
        <Calendar className="w-3.5 h-3.5" />
        <span className="t-tag font-bold" style={{ fontSize: 9 }}>
          {SEARCH_COPY.retrievalSpread}
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-1 flex-1">
        {displayDates.map((d, idx) => (
          <div
            key={idx}
            className="px-2 py-0.5 rounded bg-[var(--panel)] border border-[var(--line)] t-mono text-[var(--ink-2)]"
            style={{ fontSize: 11 }}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
};
