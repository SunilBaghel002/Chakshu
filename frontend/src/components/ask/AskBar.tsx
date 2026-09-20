import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { ASK_COPY } from '../../lib/copy';

interface AskBarProps {
  onAsk: (query: string) => void;
  isThinking?: boolean;
}

/**
 * AskBar — SLOT-02 (PRD 10 §5 / L5)
 * Full-width input + EXAMPLES ▾ ghost + ASK primary right
 */
export const AskBar: React.FC<AskBarProps> = ({ onAsk, isThinking = false }) => {
  const [query, setQuery] = useState('');
  const [showExamples, setShowExamples] = useState(false);

  const examples = [
    'How much land was cleared between 2021 and 2024?',
    'How many buildings were detected at Jewar Airport?',
    'What is the area of the runway construction zone?',
    'Was there any water body change during monsoon?',
    'Can you count the individual cars in this scene?',
  ];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isThinking) return;
    onAsk(query.trim());
  };

  const handleSelectExample = (ex: string) => {
    setQuery(ex);
    setShowExamples(false);
    onAsk(ex);
  };

  return (
    <div
      className="flex items-center gap-3 px-3 w-full h-full relative select-none"
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ASK_COPY.questionPlaceholder}
          disabled={isThinking}
          className="flex-1 bg-[var(--well)] text-[var(--ink)] t-body text-xs px-3 py-1.5 rounded border border-[var(--line)] focus:border-[var(--amber)] focus:outline-none"
        />

        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setShowExamples(!showExamples)}
          >
            {ASK_COPY.examples} ▾
          </Button>

          {showExamples && (
            <div
              className="absolute right-0 top-full mt-1 w-80 rounded shadow-xl border border-[var(--line-strong)] p-1.5 space-y-1"
              style={{
                background: 'var(--panel)',
                zIndex: 'var(--z-tooltip)',
              }}
            >
              {examples.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectExample(ex)}
                  className="w-full text-left p-1.5 rounded t-body text-xs text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--amber)] transition-colors cursor-pointer truncate"
                  title={ex}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isThinking}
          disabled={!query.trim()}
          reason={!query.trim() ? 'no-selection' : undefined}
        >
          {ASK_COPY.ask}
        </Button>
      </form>
    </div>
  );
};
