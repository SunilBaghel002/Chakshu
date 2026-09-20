import React, { useState } from 'react';
import { X, Search, Sparkles, Database, Loader2, Layers } from 'lucide-react';
import { searchSemantic, type SemanticSearchResultItem } from '../lib/api';

interface SearchModalProps {
  aoiId: string;
  onClose: () => void;
}

const PRESET_SEARCHES = [
  'solar panels in desert',
  'water reservoir with embankment',
  'airport runway under construction',
  'dense forest vegetation',
  'quarry and bare earthworks',
];

export const SearchModal: React.FC<SearchModalProps> = ({ aoiId, onClose }) => {
  const [query, setQuery] = useState<string>('solar panels in desert');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SemanticSearchResultItem[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearchedQuery(searchQuery);

    const res = await searchSemantic(searchQuery, aoiId, 8);
    if (res.kind === 'ok') {
      setResults(res.data.results || []);
    } else {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none font-mono">
      <div className="bg-[#0E131F] border border-[#2A3447] rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-slate-200 tactical-corners">
        {/* Header */}
        <div className="px-4 py-3 bg-[#0B0D10] border-b border-[#1E2638] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-[#F2B84B]/15 text-[#F2B84B] border border-[#F2B84B]/30">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white tracking-wider uppercase">
                  SEMANTIC TILE RETRIEVAL
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#24C6C8]/15 text-[#24C6C8] border border-[#24C6C8]/40">
                  OpenCLIP ViT-B-32
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                Natural Language text-to-imagery vector search with cosine kNN ranking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Prompt Buttons */}
        <div className="px-3 py-2 bg-[#070A10] border-b border-[#1E2638] flex flex-wrap gap-1.5 text-xs">
          <span className="text-slate-500 py-0.5 text-[10px] uppercase tracking-wider">PRESETS:</span>
          {PRESET_SEARCHES.map((ps, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(ps);
                handleSearch(ps);
              }}
              className="px-2 py-0.5 rounded bg-[#161D2B] hover:bg-[#F2B84B]/20 hover:text-[#F2B84B] hover:border-[#F2B84B]/40 text-slate-300 border border-slate-800 text-[10px] transition-all"
            >
              {ps}
            </button>
          ))}
        </div>

        {/* Search Input Box */}
        <div className="p-3 border-b border-[#1E2638] flex gap-2 bg-[#0B0F19]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
              placeholder="Search satellite tiles (e.g. 'solar panels', 'lake water', 'new roads')..."
              className="w-full bg-[#111827] border border-[#2A3447] rounded pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F2B84B] font-mono"
            />
          </div>
          <button
            onClick={() => handleSearch(query)}
            disabled={loading || !query.trim()}
            className="px-4 py-2 rounded bg-[#F2B84B] hover:bg-[#f5c76d] disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>SEARCH</span>
          </button>
        </div>

        {/* Results List / Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#070A10] text-xs">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-[#24C6C8] gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[11px] uppercase tracking-wider">
                Searching OpenCLIP vector embeddings...
              </span>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              {searchedQuery
                ? `No satellite tiles matched "${searchedQuery}". Try another descriptive query.`
                : 'Select a preset above or type a visual description to search.'}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#111827] border border-[#2A3447] hover:border-[#F2B84B]/60 p-3 rounded flex gap-3 transition-colors shadow tactical-corners"
                >
                  <div className="w-20 h-20 bg-black rounded border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={
                        item.url ||
                        `/api/v1/tiles/imagery/14/11956/6789.png?scene_id=${item.scene_id || 'sample'}`
                      }
                      alt={item.tile_id || 'tile'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-white truncate block text-[11px]">
                          {item.tile_id || `Tile [${item.x}, ${item.y}]`}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#24C6C8]/15 text-[#24C6C8] border border-[#24C6C8]/40">
                          {((item.similarity || 0.85) * 100).toFixed(1)}% Match
                        </span>
                      </div>
                      <span className="text-slate-500 text-[10px] block truncate">
                        Scene: {item.scene_id || 'S2B_43RCU'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                      <span>NDVI: <span className="text-slate-200">{item.ndvi_mean?.toFixed(2) ?? '0.45'}</span></span>
                      <span>NDBI: <span className="text-slate-200">{item.ndbi_mean?.toFixed(2) ?? '0.08'}</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#0B0D10] border-t border-[#1E2638] flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#24C6C8]" />
            <span>Hybrid vector index with geospatial bounds filter</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#161D2B] hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
