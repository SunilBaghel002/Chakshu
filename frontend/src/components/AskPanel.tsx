import React, { useState } from 'react';
import { Send, CheckCircle2, ShieldAlert, Sparkles, Terminal, Activity, X } from 'lucide-react';
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
  const [lastQuery, setLastQuery] = useState('');

  const handleAsk = async (qText: string) => {
    if (!qText.trim()) return;
    setLoading(true);
    setLastQuery(qText);
    const res = await askQuestion(qText, aoiId);
    if (res.kind === 'ok') {
      setAnswer(res.data);
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-xl bg-[#0E131F] border border-[#2A3447] rounded-lg shadow-2xl overflow-hidden text-slate-200 z-30 select-none flex flex-col font-mono tactical-corners">
      {/* Tactical Top Bar */}
      <div className="px-4 py-3 bg-[#0B0D10] border-b border-[#1E2638] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-[#F2B84B]/10 text-[#F2B84B] border border-[#F2B84B]/30">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-widest uppercase">
                ASK SATELLITE ANALYSIS
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#24C6C8]/15 text-[#24C6C8] border border-[#24C6C8]/40">
                AI RECON
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Natural language queries verified against deterministic vector measurements
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Preset Queries Strip */}
      <div className="px-3 py-2 bg-[#070A10] border-b border-[#1E2638] flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-slate-500 text-[10px] uppercase tracking-wider mr-1">PRESETS:</span>
        {PRESET_QUERIES.map((pq, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuery(pq);
              handleAsk(pq);
            }}
            className="px-2 py-0.5 rounded bg-[#161D2B] hover:bg-[#F2B84B]/20 hover:text-[#F2B84B] hover:border-[#F2B84B]/40 text-slate-300 border border-slate-800 transition-all text-[10px]"
          >
            {pq}
          </button>
        ))}
      </div>

      {/* Query Input */}
      <div className="p-3 border-b border-[#1E2638] flex gap-2 bg-[#0B0F19]">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk(query)}
            placeholder="Type satellite analysis query..."
            className="w-full bg-[#111827] border border-[#2A3447] rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F2B84B] font-mono"
          />
        </div>
        <button
          onClick={() => handleAsk(query)}
          disabled={loading || !query.trim()}
          className="px-4 py-2 rounded bg-[#F2B84B] hover:bg-[#f5c76d] disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:translate-y-0.5"
        >
          {loading ? (
            <Activity className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>ANALYZE</span>
        </button>
      </div>

      {/* Console Results Output */}
      <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto bg-[#070A10]">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 text-xs text-[#24C6C8] font-mono gap-2">
            <div className="w-5 h-5 border-2 border-[#24C6C8] border-t-transparent rounded-full animate-spin" />
            <span className="tracking-wider uppercase text-[11px]">
              Verifying spatial geometry & bounding proofs...
            </span>
          </div>
        )}

        {!loading && !answer && (
          <div className="py-10 text-center text-xs text-slate-500 font-mono">
            Enter satellite query above or select a preset mission prompt.
          </div>
        )}

        {!loading && answer && (
          <div className="space-y-3 text-xs">
            {/* TASK / STATUS Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 uppercase">TASK:</span>
                <span className="text-[#F2B84B] font-semibold truncate max-w-[280px]">
                  {lastQuery || 'Query'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#35D07F]/15 text-[#35D07F] border border-[#35D07F]/40 uppercase">
                  STATUS: VERIFIED
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300">
                  {(answer.confidence * 100).toFixed(0)}% CONF
                </span>
              </div>
            </div>

            {/* Resolution Gate Policy */}
            {answer.capability_notice && (
              <div className="bg-[#F2B84B]/10 border border-[#F2B84B]/40 p-3 rounded text-slate-300 text-xs">
                <div className="flex items-center gap-2 text-[#F2B84B] font-bold text-[11px] mb-1">
                  <ShieldAlert className="w-4 h-4" />
                  <span>RESOLUTION CONSTRAINT NOTICE</span>
                </div>
                <p className="font-sans text-[11px] leading-relaxed text-slate-300">
                  {answer.capability_notice}
                </p>
              </div>
            )}

            {/* Structured ANSWER Block */}
            <div className="bg-[#111827] border border-[#2A3447] p-3.5 rounded space-y-2 tactical-corners">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                <span className="text-[#24C6C8] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  ANALYSIS ANSWER
                </span>
                <span>CHAKSHU RECON V2</span>
              </div>
              <p className="font-sans text-xs text-slate-100 leading-relaxed font-normal">
                {answer.text}
              </p>
            </div>

            {/* Grounding & Verification Proof */}
            <div className="bg-[#0D1E16] border border-[#35D07F]/40 p-3 rounded flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#35D07F] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#35D07F] font-bold block text-[11px] uppercase tracking-wider">
                  DETERMINISTIC SPATIAL PROOF
                </span>
                <p className="text-[10px] text-slate-300 font-sans mt-0.5">
                  All quantitative measurements, hectare counts, and detection timestamps are computed from deterministic spatial vector indices, never hallucinated.
                </p>
              </div>
            </div>

            {/* Verified Measurements Table */}
            {answer.measurements?.facts && (
              <div className="space-y-1 pt-1">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block">
                  EVIDENCE MEASUREMENTS:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(answer.measurements.facts as any[]).map((fact, i) => (
                    <div
                      key={i}
                      className="bg-[#111827] border border-slate-800 px-2.5 py-1.5 rounded text-[11px] flex justify-between items-center"
                    >
                      <span className="text-slate-400 text-[10px] uppercase">{fact.type || fact.kind}:</span>
                      <span className="text-[#35D07F] font-bold tabular-nums">
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
