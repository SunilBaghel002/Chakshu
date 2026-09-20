import React from 'react';
import { History } from 'lucide-react';
import { ASK_COPY } from '../../lib/copy';

interface AskHistoryStripProps {
  history: string[];
  onSelectQuestion: (query: string) => void;
}

/**
 * AskHistoryStrip — SLOT-30 (PRD 10 §5 / L5)
 * Shows last 8 questions as truncated monospace chips; click to restore.
 */
export const AskHistoryStrip: React.FC<AskHistoryStripProps> = ({
  history,
  onSelectQuestion,
}) => {
  const displayHistory =
    history.length > 0
      ? history.slice(-8)
      : [
          'How much land was cleared between 2021 and 2024?',
          'What is the runway area in hectares?',
          'How many buildings were detected at Jewar?',
        ];

  return (
    <div
      className="flex items-center px-4 gap-3 h-full w-full select-none overflow-x-auto"
      style={{
        background: 'var(--well)',
        borderTop: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-1.5 shrink-0 text-[var(--ink-3)]">
        <History className="w-3.5 h-3.5" />
        <span className="t-tag font-bold" style={{ fontSize: 9 }}>{ASK_COPY.historyTitle}:</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {displayHistory.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelectQuestion(q)}
            className="shrink-0 px-2 py-1 rounded bg-[var(--panel)] border border-[var(--line)] hover:border-[var(--amber)] hover:text-[var(--amber)] text-[var(--ink-2)] t-mono truncate max-w-xs transition-colors cursor-pointer"
            style={{ fontSize: 11 }}
            title={q}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};
