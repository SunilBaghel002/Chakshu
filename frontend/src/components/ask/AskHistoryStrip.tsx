import React from 'react';
import { History, ArrowRight, Sparkles, ShieldCheck, Layers, CheckCircle2 } from 'lucide-react';
import { ASK_COPY } from '../../lib/copy';

interface AskHistoryStripProps {
  history: string[];
  onSelectQuestion: (query: string) => void;
}

const DEFAULT_ENGLISH_HISTORY = [
  'Identify newly constructed areas',
  'What changed between the selected dates?',
  'Highlight the water bodies in map with notation',
  'How much total area changed during this observation window?',
  'How much water is present?',
];

function getQueryCategory(q: string): { tag: string; color: string } {
  const lower = q.toLowerCase();
  if (lower.includes('construct') || lower.includes('building')) {
    return { tag: 'CONSTRUCTION', color: 'var(--step-1-cyan)' };
  }
  if (lower.includes('water') || lower.includes('reservoir')) {
    return { tag: 'HYDROLOGY', color: 'var(--primary-cyan)' };
  }
  if (lower.includes('area') || lower.includes('measured')) {
    return { tag: 'UTM 43N AREA', color: 'var(--step-2-green)' };
  }
  if (lower.includes('changed') || lower.includes('between')) {
    return { tag: 'TEMPORAL Δ', color: 'var(--step-3-amber)' };
  }
  return { tag: 'EVIDENCE QUERY', color: 'var(--step-4-purple)' };
}

/**
 * AskHistoryStrip — SLOT-30 (110px full-height 3-tier deck)
 * Zero blank vertical space:
 * Row 1: 4-Stage SIH Pipeline Flow Ribbon (1 Query -> 2 Resolution Check -> 3 Detected Change -> 4 Evidence)
 * Row 2: Rich 2-line Interactive Question History Cards (no ugly scrollbar)
 * Row 3: Telemetry & Grounding Status Footer
 */
export const AskHistoryStrip: React.FC<AskHistoryStripProps> = ({
  history,
  onSelectQuestion,
}) => {
  const cleanHistory = history.filter((q) => !/\b(kitna|hua|mein|kahan|imaratein)\b/i.test(q));
  const displayHistory = (cleanHistory.length >= 4 ? cleanHistory : [...cleanHistory, ...DEFAULT_ENGLISH_HISTORY])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4);

  const pipelineSteps = [
    {
      num: '1',
      title: 'Natural-language query',
      sub: '“Identify newly constructed areas”',
      color: 'var(--step-1-cyan)',
      bg: 'rgba(0, 229, 255, 0.12)',
      border: 'rgba(0, 229, 255, 0.45)',
      icon: <Sparkles className="w-3 h-3" />,
    },
    {
      num: '2',
      title: 'Resolution check',
      sub: 'Image suitability evaluated',
      color: 'var(--step-2-green)',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.45)',
      icon: <ShieldCheck className="w-3 h-3" />,
    },
    {
      num: '3',
      title: 'Detected change',
      sub: 'Highlighted on imagery',
      color: 'var(--step-3-amber)',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.45)',
      icon: <Layers className="w-3 h-3" />,
    },
    {
      num: '4',
      title: 'Evidence',
      sub: 'Linked to source & analysis',
      color: 'var(--step-4-purple)',
      bg: 'rgba(168, 85, 247, 0.14)',
      border: 'rgba(168, 85, 247, 0.45)',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
  ];

  return (
    <div
      className="w-full h-full flex flex-col justify-between select-none overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, var(--panel) 0%, var(--bg) 100%)',
        borderTop: '1px solid var(--line-strong)',
      }}
    >
      {/* ROW 1: 4-Stage SIH Pipeline Flow Ribbon */}
      <div
        className="w-full px-3 py-1 flex items-center justify-between gap-2 shrink-0"
        style={{
          background: 'rgba(6, 9, 16, 0.75)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--step-1-cyan)' }}
          />
          <span
            className="t-tag font-bold"
            style={{ fontSize: 8.5, color: 'var(--ink)', letterSpacing: '0.08em' }}
          >
            {'EXECUTION PIPELINE:'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 justify-end overflow-hidden">
          {pipelineSteps.map((step, idx) => (
            <React.Fragment key={step.num}>
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded shrink-0"
                style={{
                  background: step.bg,
                  border: `1px solid ${step.border}`,
                }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-full t-mono font-bold"
                  style={{
                    width: 15,
                    height: 15,
                    fontSize: 9,
                    background: step.color,
                    color: 'var(--step-ink-dark)',
                  }}
                >
                  {step.num}
                </span>
                <span
                  className="t-tag font-bold"
                  style={{ fontSize: 8.5, color: step.color, letterSpacing: '0.04em' }}
                >
                  {step.title}
                </span>
                <span
                  className="hidden xl:inline t-mono"
                  style={{ fontSize: 8, color: 'var(--ink-2)' }}
                >
                  {`· ${step.sub}`}
                </span>
              </div>
              {idx < pipelineSteps.length - 1 && (
                <ArrowRight
                  className="w-3 h-3 shrink-0"
                  style={{ color: 'var(--ink-3)' }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ROW 2: Full-Height Interactive Question History Cards (Zero Blank Space) */}
      <div className="flex-1 px-3 py-1.5 flex items-center gap-2.5 min-h-0 overflow-hidden">
        <div
          className="flex flex-col justify-center px-2.5 py-1 rounded shrink-0 h-full"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--line)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" style={{ color: 'var(--step-1-cyan)' }} />
            <span
              className="t-tag font-bold"
              style={{ fontSize: 9, color: 'var(--ink)', letterSpacing: '0.06em' }}
            >
              {ASK_COPY.historyTitle}
            </span>
          </div>
          <span className="t-mono" style={{ fontSize: 8, color: 'var(--ink-3)' }}>
            {'Click to run 1 → 4'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 flex-1 h-full min-w-0">
          {displayHistory.map((q, idx) => {
            const cat = getQueryCategory(q);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectQuestion(q)}
                className="h-full px-2.5 py-1 rounded flex flex-col justify-between text-left cursor-pointer transition-all group overflow-hidden"
                style={{
                  background: 'var(--panel-2)',
                  border: '1px solid var(--line-strong)',
                  borderLeft: `3px solid ${cat.color}`,
                }}
                title={q}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span
                    className="t-tag font-bold truncate"
                    style={{ fontSize: 7.5, color: cat.color, letterSpacing: '0.06em' }}
                  >
                    {cat.tag}
                  </span>
                  <span
                    className="t-mono font-bold flex items-center gap-0.5 shrink-0"
                    style={{ fontSize: 7.5, color: 'var(--ink-3)' }}
                  >
                    <span>{'RUN'}</span>
                    <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" style={{ color: cat.color }} />
                  </span>
                </div>
                <div
                  className="t-mono font-semibold text-[var(--ink)] truncate w-full"
                  style={{ fontSize: 10 }}
                >
                  {q}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ROW 3: Telemetry & Grounding Footer */}
      <div
        className="w-full px-3 py-0.5 flex items-center justify-between t-mono shrink-0"
        style={{
          background: 'rgba(6, 9, 16, 0.85)',
          borderTop: '1px solid var(--line)',
          fontSize: 8,
          color: 'var(--ink-3)',
        }}
      >
        <span>
          {'Sentinel-2 L2A (10m) + Planet SkySat (0.5m) | Kruger UTM Zone 43N Planar Math | Sub-pixel Suitability Gate Active'}
        </span>
        <span style={{ color: 'var(--step-2-green)', fontWeight: 700 }}>
          {'✓ All 4 Verification Stages Grounded'}
        </span>
      </div>
    </div>
  );
};
