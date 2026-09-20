import React from 'react';
import { SEARCH_COPY } from '../../lib/copy';
import { FeedbackState } from '../ui/FeedbackState';

export interface SearchResultItem {
  id: string;
  title: string;
  date: string;
  similarity: number;
  previewUrl?: string;
  sensor: string;
}

interface SearchResultsPanelProps {
  results: SearchResultItem[];
  selectedId: string | null;
  onSelectResult: (item: SearchResultItem) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * SearchResultsPanel — SLOT-20 (PRD 10 §5 / L5)
 * Ranked catalog results with similarity score bars
 */
export const SearchResultsPanel: React.FC<SearchResultsPanelProps> = ({
  results,
  selectedId,
  onSelectResult,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  if (isLoading) {
    return <FeedbackState state="loading" loadingStage="RETRIEVING OPENCLIP EMBEDDINGS & RANKING…" />;
  }

  if (error) {
    return (
      <FeedbackState
        state="error"
        errorMessage="CATALOG SEARCH FAILED"
        errorCode="E_SEARCH_FAILED"
        onRetry={onRetry}
      />
    );
  }

  if (results.length === 0) {
    return (
      <FeedbackState
        state="empty"
        emptyMessage="NO MATCHING SCENES FOUND · TRY EXPANDING YOUR QUERY OR DATE WINDOW"
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden bg-[var(--panel)]">
      <div className="p-3 border-b border-[var(--line)] bg-[var(--bg)] flex items-center justify-between shrink-0">
        <div className="dossier-bar" style={{ margin: 0 }}>
          <span>{SEARCH_COPY.rankedResults}</span>
        </div>
        <span className="t-mono text-[var(--ink-3)]" style={{ fontSize: 10 }}>
          {results.length} SCENES
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0">
        {results.map((res) => {
          const isSelected = res.id === selectedId;
          const pct = Math.round(res.similarity * 100);

          return (
            <div
              key={res.id}
              onClick={() => onSelectResult(res)}
              className="console-panel p-2.5 flex flex-col gap-1.5 cursor-pointer transition-all duration-150"
              style={{
                borderLeft: isSelected ? '3px solid var(--amber)' : '1px solid var(--line)',
                background: isSelected ? 'var(--amber-wash)' : 'var(--panel)',
                transform: isSelected ? 'translateX(2px)' : 'none',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--ink)] truncate" style={{ maxWidth: 200 }} title={res.title}>
                  {res.title}
                </span>
                <span className="t-mono font-bold text-[var(--amber)]" style={{ fontSize: 10 }}>
                  {pct}% MATCH
                </span>
              </div>

              {/* Similarity score bar */}
              <div className="w-full h-1.5 rounded bg-[var(--well)] overflow-hidden">
                <div
                  className="h-full bg-[var(--amber)] transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between t-mono text-[var(--ink-3)] pt-0.5" style={{ fontSize: 10 }}>
                <span>{res.date}</span>
                <span>{res.sensor.toUpperCase()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
