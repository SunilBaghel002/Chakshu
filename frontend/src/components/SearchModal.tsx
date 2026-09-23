import React, { useState } from 'react';
import { Search, X, Database, Sparkles } from 'lucide-react';
import { searchSemantic, type SemanticSearchResultItem } from '../lib/api';
import { track } from '../lib/track';

interface SearchModalProps {
  aoiId?: string;
  onClose: () => void;
  onSelectTile?: (tile: SemanticSearchResultItem) => void;
}

const PRESET_QUERIES = [
  'newly built structures near a river',
  'runway construction earthworks',
  'deep lake water reservoir',
  'dense agricultural cropland',
  'solar panels in desert',
];

export const SearchModal: React.FC<SearchModalProps> = ({ aoiId, onClose, onSelectTile }) => {
  const [query, setQuery] = useState<string>('newly built structures near a river');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SemanticSearchResultItem[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  const handleSearch = async (textToSearch: string) => {
    if (!textToSearch.trim()) return;
    setLoading(true);
    setSearchedQuery(textToSearch);

    const t0 = performance.now();
    track('op.start', { op: 'search', query: textToSearch.trim() });
    const res = await searchSemantic(textToSearch, aoiId, 12);
    const duration = Math.round(performance.now() - t0);

    if (res.kind === 'ok') {
      setResults(res.data.results || []);
      track('op.result', { op: 'search', count: res.data.count }, { duration_ms: duration, ok: true });
    } else {
      setResults([]);
      track('op.error', { op: 'search', error: res.kind }, { duration_ms: duration, ok: false });
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 select-none animate-stage-fade"
      style={{ background: 'rgba(11, 13, 16, 0.88)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-[var(--ink)] corner-ticks"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--panel-2)', borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-1.5 rounded flex items-center justify-center"
              style={{ background: 'var(--amber-wash)', border: '1px solid var(--amber)', color: 'var(--amber)' }}
            >
              <Search className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold tracking-wider uppercase font-mono" style={{ color: 'var(--ink)' }}>
                  SEMANTIC TILE RETRIEVAL
                </h2>
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                  style={{ background: 'var(--teal-wash)', color: 'var(--teal)', border: '1px solid var(--teal)' }}
                >
                  OpenCLIP ViT-B-32
                </span>
              </div>
              <p className="text-[10px] font-sans" style={{ color: 'var(--ink-3)' }}>
                Natural Language text-to-imagery vector search with cosine kNN ranking (Phase 4, PRD 3 §A3)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--ink-3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Query Chips */}
        <div
          className="px-3 py-2 flex flex-wrap items-center gap-1.5 text-xs font-mono"
          style={{ background: 'var(--well)', borderBottom: '1px solid var(--line)' }}
        >
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
            PRESETS:
          </span>
          {PRESET_QUERIES.map((pq, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(pq);
                handleSearch(pq);
              }}
              className="px-2 py-0.5 text-[10px] transition-all"
              style={{
                background: 'var(--panel-2)',
                border: '1px solid var(--line)',
                color: query === pq ? 'var(--amber)' : 'var(--ink-2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {pq}
            </button>
          ))}
        </div>

        {/* Search Input Bar */}
        <div
          className="p-3 flex gap-2"
          style={{ background: 'var(--panel-2)', borderBottom: '1px solid var(--line)' }}
        >
          <div className="relative flex-1">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-2.5"
              style={{ color: 'var(--ink-3)' }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
              placeholder="Search satellite imagery (e.g. 'newly built structures near a river', 'water lake')..."
              className="w-full text-xs font-mono pl-9 pr-3 py-2 outline-none"
              style={{
                background: 'var(--well)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
              }}
            />
          </div>
          <button
            onClick={() => handleSearch(query)}
            disabled={loading || !query.trim()}
            className="btn-primary flex items-center gap-1.5 px-4 text-xs font-mono uppercase tracking-wider"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'RETRIEVING…' : 'RETRIEVE'}</span>
          </button>
        </div>

        {/* Results Body */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ background: 'var(--bg)' }}
        >
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: 'var(--amber)' }}>
              <span className="text-[11px] font-mono uppercase tracking-wider">
                COMPUTING OPENCLIP 512-DIM COSINE DISTANCE…
              </span>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="py-16 text-center text-xs font-mono" style={{ color: 'var(--ink-3)' }}>
              {searchedQuery
                ? `No satellite tiles matched "${searchedQuery}". Try another descriptive prompt.`
                : 'Enter a visual description or select a preset above to search tiles.'}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {results.map((tile, idx) => (
                <div
                  key={tile.tile_id || idx}
                  onClick={() => onSelectTile?.(tile)}
                  className="p-2.5 transition-all cursor-pointer corner-ticks"
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div
                    className="w-full h-32 overflow-hidden mb-2 relative flex items-center justify-center"
                    style={{ background: 'var(--well)', border: '1px solid var(--line)' }}
                  >
                    <img
                      src={tile.png_url || `/api/v1/tiles/imagery/14/11956/6789.png?scene_id=${tile.scene_id}`}
                      alt={tile.tile_id}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span
                      className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                      style={{
                        background: 'var(--teal-wash)',
                        border: '1px solid var(--teal)',
                        color: 'var(--teal)',
                      }}
                    >
                      {(tile.score * 100).toFixed(1)}% Match
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="font-bold truncate" style={{ color: 'var(--ink)' }}>
                        {tile.tile_id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--ink-3)' }}>
                      <span>NDVI: <strong style={{ color: 'var(--ink-2)' }}>{tile.ndvi_mean?.toFixed(2) ?? '0.00'}</strong></span>
                      <span>NDBI: <strong style={{ color: 'var(--ink-2)' }}>{tile.ndbi_mean?.toFixed(2) ?? '0.00'}</strong></span>
                      <span>Cloud: <strong style={{ color: 'var(--ink-2)' }}>{tile.cloud_pct?.toFixed(0) ?? '0'}%</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2.5 flex items-center justify-between text-[10px] font-mono"
          style={{ background: 'var(--panel-2)', borderBottom: 'none', borderTop: '1px solid var(--line)' }}
        >
          <span className="flex items-center gap-1.5" style={{ color: 'var(--ink-3)' }}>
            <Database className="w-3.5 h-3.5 text-[var(--teal)]" />
            <span>Hybrid vector kNN search · Sub-200ms p95 latency · Zero index rebuild</span>
          </span>
          <button
            onClick={onClose}
            className="btn-secondary text-[10px] uppercase font-mono px-3 py-1"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
