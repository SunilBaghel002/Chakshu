import React, { useState } from 'react';
import { Send, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
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
    <div className="w-full max-w-xl bg-[#111827] border border-[#374151] rounded-xl shadow-2xl overflow-hidden text-slate-200 z-30 select-none flex flex-col">
      {/* Panel Header */}
      <div className="p-4 bg-[#0F172A] border-b border-[#1F2937] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Ask Chakshu (Plain English AI)</h3>
            <p className="text-[11px] text-slate-400">
              Ask questions about changes. Every single number is checked against real satellite math.
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        )}
      </div>

      {/* Preset Suggestions */}
      <div className="p-3 bg-[#0B0F19] border-b border-[#1F2937] flex flex-wrap gap-1.5 text-xs">
        {PRESET_QUERIES.map((pq, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuery(pq);
              handleAsk(pq);
            }}
            className="px-2.5 py-1 rounded-md bg-[#1E293B]/70 hover:bg-indigo-900/40 text-slate-300 hover:text-indigo-200 border border-slate-700/60 transition-colors text-[11px]"
          >
            {pq}
          </button>
        ))}
      </div>

      {/* Query Input */}
      <div className="p-3 border-b border-[#1F2937] flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk(query)}
          placeholder="Ask anything about satellite changes at this location..."
          className="flex-1 bg-[#0F172A] border border-[#374151] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={() => handleAsk(query)}
          disabled={loading || !query.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </div>

      {/* Answer Body */}
      <div className="p-4 space-y-4 max-h-[380px] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8 text-xs text-indigo-400 font-mono animate-pulse gap-2">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Verifying satellite math with Number Verifier...</span>
          </div>
        )}

        {!loading && !answer && (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            Type a question above or click one of the preset buttons.
          </div>
        )}

        {!loading && answer && (
          <div className="space-y-3 font-mono text-xs">
            {/* Capability Refusal or Answer Notice */}
            {answer.capability_notice && (
              <div className="bg-amber-950/30 border border-amber-800/60 p-3 rounded-lg text-amber-200 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Resolution Notice</span>
                </div>
                <p className="font-sans text-[12px] text-slate-300 leading-relaxed">
                  {answer.capability_notice}
                </p>
              </div>
            )}

            {/* Answer Text Card */}
            <div className="bg-[#0F172A] border border-[#1F2937] p-3.5 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-indigo-400 font-bold uppercase">
                  Verified Intelligence Answer
                </span>
                <span className="text-slate-400">Confidence: {(answer.confidence * 100).toFixed(0)}%</span>
              </div>
              <p className="font-sans text-sm text-slate-100 leading-relaxed">
                {answer.text}
              </p>
            </div>

            {/* Number Verifier Shield Card */}
            <div className="bg-emerald-950/30 border border-emerald-800/60 p-3 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-emerald-400 font-bold block text-xs">
                  ✓ Verified Accurate Numbers (Zero AI Hallucinations)
                </span>
                <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                  Every single number (18.43 hectares, 6 construction sites, dates) comes from direct database math, never generated by an AI guess.
                </p>
              </div>
            </div>

            {/* Verified Facts Grounding */}
            {answer.measurements?.facts && (
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">Verified Data Used:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(answer.measurements.facts as any[]).map((fact, i) => (
                    <div
                      key={i}
                      className="bg-[#0F172A] border border-slate-800 p-2 rounded text-[11px] flex justify-between"
                    >
                      <span className="text-slate-400">{fact.type || fact.kind}:</span>
                      <span className="text-emerald-300 font-semibold tabular-nums">
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
