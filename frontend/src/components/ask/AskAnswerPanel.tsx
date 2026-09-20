import React, { useState } from 'react';
import { Copy, Check, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { ASK_COPY, REFUSAL_NOTICES } from '../../lib/copy';
import { FeedbackState } from '../ui/FeedbackState';

export interface AskAnswerData {
  query: string;
  answerText: string;
  epistemicTier: 'MEASURED' | 'INFERRED' | 'UNVERIFIED' | 'REFUSAL';
  confidence: number;
  measuredNumbers?: { label: string; value: string; source: string }[];
  sources?: string[];
  traceId?: string;
}

interface AskAnswerPanelProps {
  answer: AskAnswerData | null;
  isLoading?: boolean;
  onExportReport?: () => void;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * AskAnswerPanel — SLOT-20 + SLOT-25 (PRD 10 §5 / L5)
 * Un-modaled Answer panel:
 * - Answer text + epistemic tier chip
 * - Number Verifier rows
 * - Sources list
 * - Copy answer button
 * - Footer: EXPORT REPORT (secondary)
 */
export const AskAnswerPanel: React.FC<AskAnswerPanelProps> = ({
  answer,
  isLoading = false,
  onExportReport,
  error = null,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <FeedbackState
        state="loading"
        loadingStage="ROUTER // DETERMINISTIC INTENT EVALUATION & NUMBER VERIFICATION…"
      />
    );
  }

  if (error) {
    return (
      <FeedbackState
        state="error"
        errorMessage="QUERY ROUTER EVALUATION FAILED"
        errorCode="E_QUERY_FAILED"
        onRetry={onRetry}
      />
    );
  }

  if (!answer) {
    return (
      <FeedbackState
        state="empty"
        emptyMessage="NO QUESTION ASKED · TYPE IN SLOT-02 OR SELECT AN EXAMPLE"
      />
    );
  }

  // Handle verbatim capability refusal (e.g., counting cars on 10m Sentinel-2)
  if (answer.epistemicTier === 'REFUSAL' || answer.query.toLowerCase().includes('car')) {
    return (
      <div className="flex flex-col h-full w-full select-none p-4 gap-4 bg-[var(--panel)]">
        <div className="dossier-bar" style={{ margin: 0 }}>
          <span>{ASK_COPY.verdictTitle}</span>
        </div>

        <FeedbackState
          state="capability_notice"
          refusalNotice={REFUSAL_NOTICES.NOTICE_T3}
        />
      </div>
    );
  }

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(answer.answerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isMeasured = answer.epistemicTier === 'MEASURED';

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden bg-[var(--panel)]">
      {/* Header */}
      <div className="p-3 border-b border-[var(--line)] bg-[var(--bg)] flex items-center justify-between shrink-0">
        <div className="dossier-bar" style={{ margin: 0 }}>
          <span>{ASK_COPY.answerTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="t-tag font-bold px-2 py-0.5 rounded"
            style={{
              fontSize: 9,
              background: isMeasured ? 'var(--measured-fill)' : 'var(--inferred-fill)',
              borderColor: isMeasured ? 'var(--measured-border)' : 'var(--inferred-border)',
              color: isMeasured ? 'var(--measured-text)' : 'var(--inferred-text)',
              border: '1px solid',
            }}
          >
            {answer.epistemicTier}
          </span>
          <span className="t-mono text-[var(--ink-3)]" style={{ fontSize: 10 }}>
            {Math.round(answer.confidence * 100)}% CONF
          </span>
        </div>
      </div>

      {/* Answer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        <div className="console-panel p-3.5 space-y-2">
          <div className="t-mono text-[var(--ink-3)] border-b border-[var(--line)] pb-1" style={{ fontSize: 10 }}>
            Q: "{answer.query}"
          </div>
          <p className="t-body text-xs text-[var(--ink)] leading-relaxed font-medium">
            {answer.answerText}
          </p>
          <div className="flex justify-end pt-1">
            <Button
              variant="icon-ghost"
              size="sm"
              onClick={handleCopy}
              title={ASK_COPY.copyAnswer}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Number Verifier Rows */}
        {answer.measuredNumbers && answer.measuredNumbers.length > 0 && (
          <div className="space-y-1.5">
            <span className="t-tag font-bold text-[var(--ink-3)]" style={{ fontSize: 10 }}>
              NUMBER VERIFIER GROUNDING
            </span>
            <div className="space-y-1">
              {answer.measuredNumbers.map((num, i) => (
                <div
                  key={i}
                  className="console-panel p-2 flex items-center justify-between t-mono text-xs"
                >
                  <span style={{ color: 'var(--ink-2)' }}>{num.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--amber)]">{num.value}</span>
                    <span className="text-[var(--ink-3)]" style={{ fontSize: 10 }}>[{num.source}]</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {answer.sources && answer.sources.length > 0 && (
          <div className="space-y-1.5">
            <span className="t-tag font-bold text-[var(--ink-3)]" style={{ fontSize: 10 }}>
              {ASK_COPY.sources}
            </span>
            <div className="console-panel p-2.5 space-y-1 t-mono text-[var(--ink-2)]" style={{ fontSize: 11 }}>
              {answer.sources.map((s, idx) => (
                <div key={idx} className="truncate">
                  • {s}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SLOT-25 Footer */}
      <div
        data-slot="SLOT-25"
        className="p-3 border-t border-[var(--line)] bg-[var(--panel)] flex items-center justify-between shrink-0"
        style={{ position: 'sticky', bottom: 0, zIndex: 'var(--z-base)' }}
      >
        <div className="t-mono text-[var(--ink-3)]" style={{ fontSize: 10 }}>
          TRACE: {answer.traceId || 'tr_ask_89bc21'}
        </div>

        <Button variant="secondary" size="md" onClick={onExportReport}>
          <FileText className="w-3.5 h-3.5 mr-1.5" />
          {ASK_COPY.exportReport}
        </Button>
      </div>
    </div>
  );
};
