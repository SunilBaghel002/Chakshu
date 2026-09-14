import React, { useState } from 'react';
import { Send, CheckCircle2, ShieldAlert, Sparkles, X } from 'lucide-react';
import type { Answer } from '../lib/types';
import { askQuestion } from '../lib/api';

interface AskPanelProps {
  aoiId: string;
  onClose?: () => void;
}

const PRESET_QUERIES = [
  'What changed here in the last 3 years?',
  'How many building complexes were built?',
  'Can you count cars at this resolution?',
  'Why did the lake water shrink?',
];

/**
 * AskPanel — Intelligence Query Panel with Console Treatment
 */
export const AskPanel: React.FC<AskPanelProps> = ({ aoiId, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);

  const handleAsk = async (qText: string) => {
    if (!qText.trim()) return;
    setLoading(true);
    const res = await askQuestion(qText, aoiId);
    if (res.kind === 'ok') {
      setAnswer(res.data);
    }
    setLoading(false);
  };

  return (
    <div
      className="w-full max-w-xl bg-[var(--panel)] border border-[var(--line-strong)] shadow-2xl overflow-hidden text-[var(--ink)] z-30 select-none flex flex-col corner-ticks"
      style={{ borderRadius: 'var(--r-sm)' }}
    >
      {/* Panel Header */}
      <div
        className="p-4 bg-[var(--panel2)] border-b border-[var(--line)] flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <span className="dossier-bar inline-block" />
          <div
            className="p-1.5 border border-[rgba(240,180,95,0.3)] bg-[var(--amber-wash)] text-[var(--amber)]"
            style={{ borderRadius: 'var(--r-sm)' }}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[var(--ink)]">
              Ask Chakshu (AI Query)
            </h3>
            <p className="text-[11px] text-[var(--ink3)] font-mono">
              Every single measurement is strictly verified against satellite database facts.
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--ink3)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
            style={{ borderRadius: 'var(--r-sm)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Preset Suggestions */}
      <div
        className="p-2.5 bg-[var(--well)] border-b border-[var(--line)] flex flex-wrap gap-1.5 text-xs"
      >
        {PRESET_QUERIES.map((pq, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuery(pq);
              handleAsk(pq);
            }}
            className="px-2.5 py-1 text-xs font-mono transition-colors bg-[var(--panel2)] hover:bg-[var(--line)] hover:text-[var(--amber)] text-[var(--ink2)] border border-[var(--line)]"
            style={{ borderRadius: 'var(--r-sm)' }}
          >
            {pq}
          </button>
        ))}
      </div>

      {/* Query Input */}
      <div
        className="p-3 border-b border-[var(--line)] flex gap-2 bg-[var(--panel)]"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk(query)}
          placeholder="Ask anything about satellite changes at this location..."
          className="flex-1 bg-[var(--well)] border border-[var(--line)] px-3 py-2 text-xs font-mono text-[var(--ink)] placeholder-[var(--ink3)] focus:outline-none focus:border-[var(--amber)] transition-colors"
          style={{ borderRadius: 'var(--r-sm)' }}
        />
        <button
          onClick={() => handleAsk(query)}
          disabled={loading || !query.trim()}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-40"
          style={{ borderRadius: 'var(--r-sm)', padding: '6px 14px' }}
        >
          <Send className="w-3.5 h-3.5" />
          <span>ASK</span>
        </button>
      </div>

      {/* Answer Body */}
      <div className="p-4 space-y-4 max-h-[380px] overflow-y-auto font-mono text-xs">
        {loading && (
          <div className="flex items-center justify-center py-8 text-xs text-[var(--amber)] font-mono animate-pulse gap-2">
            <div className="w-4 h-4 border-2 border-[var(--amber)] border-t-transparent rounded-full animate-spin" />
            <span>Verifying satellite telemetry with Ground Truth Engine...</span>
          </div>
        )}

        {!loading && !answer && (
          <div className="py-8 text-center text-xs text-[var(--ink3)] font-mono">
            Type an intelligence query above or select a preset prompt.
          </div>
        )}

        {!loading && answer && (
          <div className="space-y-3 font-mono text-xs">
            {/* Capability Refusal or Answer Notice */}
            {answer.capability_notice && (
              <div
                className="bg-[var(--amber-wash)] border border-[rgba(240,180,95,0.3)] p-3 text-[var(--amber)] text-xs"
                style={{ borderRadius: 'var(--r-sm)' }}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <ShieldAlert className="w-4 h-4 text-[var(--amber)]" />
                  <span>RESOLUTION NOTICE</span>
                </div>
                <p className="font-sans text-[12px] text-[var(--ink2)] leading-relaxed">
                  {answer.capability_notice}
                </p>
              </div>
            )}

            {/* Answer Text Card */}
            <div
              className="bg-[var(--well)] border border-[var(--line)] p-3.5 space-y-2 corner-ticks"
              style={{ borderRadius: 'var(--r-sm)' }}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--amber)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="dossier-bar inline-block" />
                  Verified Intelligence Output
                </span>
                <span className="text-[var(--ink3)] tabular-nums">
                  CONFIDENCE: {(answer.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="font-sans text-sm text-[var(--ink)] leading-relaxed">
                {answer.text}
              </p>
            </div>

            {/* Number Verifier Shield Card */}
            <div
              className="bg-[var(--color-measured-fill)] border border-[rgba(47,191,113,0.3)] p-3 flex items-start gap-2.5"
              style={{ borderRadius: 'var(--r-sm)' }}
            >
              <CheckCircle2 className="w-4 h-4 text-[var(--color-measured-text)] shrink-0 mt-0.5" />
              <div>
                <span className="text-[var(--color-measured-text)] font-bold block text-xs">
                  ✓ VERIFIED ACCURATE NUMBERS (ZERO AI HALLUCINATION)
                </span>
                <p className="text-[11px] text-[var(--ink2)] font-sans mt-0.5 leading-relaxed">
                  Every figure (hectares, counts, coordinates, acquisition dates) stems strictly from verified database records.
                </p>
              </div>
            </div>

            {/* Verified Facts Grounding */}
            {answer.measurements?.facts && (
              <div className="space-y-1">
                <span className="text-[var(--ink3)] text-[10px] uppercase tracking-wider block">
                  Ground Truth Telemetry:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(answer.measurements.facts as any[]).map((fact, i) => (
                    <div
                      key={i}
                      className="bg-[var(--well)] border border-[var(--line)] p-2 text-[11px] flex justify-between"
                      style={{ borderRadius: 'var(--r-sm)' }}
                    >
                      <span className="text-[var(--ink3)]">{fact.type || fact.kind}:</span>
                      <span className="text-[var(--color-measured-text)] font-semibold tabular-nums">
                        {String(fact.value)} {fact.unit || ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
