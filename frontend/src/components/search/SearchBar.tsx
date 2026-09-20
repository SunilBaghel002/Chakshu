import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { SEARCH_COPY } from '../../lib/copy';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isSearching?: boolean;
}

/**
 * SearchBar — SLOT-02 (PRD 10 §5 / L5)
 * Query input + AOI ▾ + DATE RANGE + SENSOR ▾ + SEARCH primary
 */
export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isSearching = false }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isSearching) return;
    onSearch(query.trim());
  };

  return (
    <div
      className="flex items-center gap-3 px-3 w-full h-full select-none"
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-3">
        <div className="flex-1 relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[var(--ink-3)] absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={SEARCH_COPY.searchPlaceholder}
            className="w-full bg-[var(--well)] text-[var(--ink)] t-body text-xs pl-8 pr-3 py-1.5 rounded border border-[var(--line)] focus:border-[var(--amber)] focus:outline-none"
          />
        </div>

        {/* AOI selector */}
        <div className="flex items-center gap-1">
          <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>
            {SEARCH_COPY.aoiLabel}:
          </span>
          <select className="bg-[var(--well)] text-[var(--ink)] t-mono text-xs px-2 py-1 rounded border border-[var(--line)]">
            <option value="jewar">{SEARCH_COPY.jewarAirport}</option>
            <option value="koderi">{SEARCH_COPY.koderiPort}</option>
          </select>
        </div>

        {/* SENSOR selector */}
        <div className="flex items-center gap-1">
          <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>
            {SEARCH_COPY.sensor}:
          </span>
          <select className="bg-[var(--well)] text-[var(--ink)] t-mono text-xs px-2 py-1 rounded border border-[var(--line)]">
            <option value="all">{SEARCH_COPY.allSensors}</option>
            <option value="s2">{SEARCH_COPY.sentinel2}</option>
            <option value="ps">{SEARCH_COPY.planetScope}</option>
          </select>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isSearching}
          disabled={!query.trim()}
          reason={!query.trim() ? 'no-selection' : undefined}
        >
          {SEARCH_COPY.search}
        </Button>
      </form>
    </div>
  );
};
