import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Send, Sparkles, ChevronRight, RefreshCw, Trash2, ArrowRight, Crosshair, ShieldCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ASK_COPY } from '../../lib/copy';
import { FeedbackState } from '../ui/FeedbackState';
import { ChatMessageItem } from './ChatMessageItem';
import { getEvidenceDisplayTitle } from '../../lib/mapPolygonHelpers';
import type { Evidence } from '../../lib/types';
import type { AskAnswerData, ChatMessage } from '../../lib/types/ask';

export interface AskAnswerPanelProps {
  chatMessages?: ChatMessage[]; answer?: AskAnswerData | null; isLoading?: boolean;
  onAsk: (query: string) => void; onClearChat?: () => void; onExportReport?: () => void;
  onHighlightEvidence?: (ids: string[], bbox?: number[]) => void;
  selectedEvidenceId?: string | null; selectedEvidence?: any | null;
  evidenceList?: Evidence[]; onSelectEvidence?: (ev: Evidence | null) => void;
  currentAoiName?: string; currentDates?: { beforeDate: string; afterDate: string };
  error?: string | null; onRetry?: () => void;
}

const DEFAULT_PRIMARY_PROMPT = 'Identify newly constructed areas';
const DEFAULT_PRIMARY_SUBTITLE = 'Evaluate image suitability, detect new structures, and link source evidence';
const DEFAULT_TARGET_PROMPT = 'What is the measured area of this selected target?';

const GENERAL_SUGGESTED_QUESTIONS: { query: string; tag: string }[] = [
  { query: 'What changed between the selected dates?', tag: 'SUMMARY' },
  { query: 'Highlight the water bodies in map with notation', tag: 'HYDROLOGY' },
  { query: 'How much total area changed during this observation window?', tag: 'TOTAL AREA' },
  { query: 'How much water is present?', tag: 'WATER AREA' },
  { query: 'Show where vegetation disappeared', tag: 'ECOLOGY' },
  { query: 'How many buildings were detected?', tag: 'DETECTION' },
];

const TARGET_SUGGESTED_QUESTIONS: { query: string; tag: string }[] = [
  { query: 'Mark this selected target with notation', tag: 'ANNOTATION' },
  { query: 'What is the measured area of this selected target?', tag: 'MEASUREMENT' },
  { query: 'What was constructed at this selected target?', tag: 'CLASSIFICATION' },
  { query: 'What land cover existed at this selected polygon before?', tag: 'BASELINE T0' },
  { query: 'When was this selected target constructed?', tag: 'TIMELINE' },
];

const QUICK_FOLLOW_UPS = ['With notation', 'With area', 'Only the largest one', 'Zoom there', 'Clear'];

export const AskAnswerPanel: React.FC<AskAnswerPanelProps> = ({
  chatMessages = [], answer = null, isLoading = false, onAsk, onClearChat,
  onExportReport, onHighlightEvidence, selectedEvidenceId = null, selectedEvidence = null,
  evidenceList = [], onSelectEvidence, currentAoiName, currentDates, error = null, onRetry,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputText.trim();
    if (!query || isLoading) return;
    setInputText('');
    onAsk(query);
  };

  const handleCopy = (id: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const hasMessages = chatMessages.length > 0;
  const latestTraceId =
    chatMessages.slice().reverse().find((m) => m.answerData?.traceId)?.answerData?.traceId ||
    answer?.traceId || 'tr_ask_7c19a2';

  const targetTitle = selectedEvidence ? getEvidenceDisplayTitle(selectedEvidence) : null;
  const targetClass = (selectedEvidence?.classification?.change_type || selectedEvidence?.change_type || 'feature')
    .replace(/_/g, ' ').toUpperCase();
  const targetAreaM2 = selectedEvidence?.measurement?.area_m2 ?? selectedEvidence?.area_m2;
  const targetAreaHa = targetAreaM2 ? (targetAreaM2 / 10000).toFixed(2) : null;

  const activeDefaultQuery = targetTitle ? DEFAULT_TARGET_PROMPT : DEFAULT_PRIMARY_PROMPT;
  const activeDefaultSubtitle = targetTitle
    ? `Calculate verified Kruger UTM 43N planar area for ${targetTitle}`
    : DEFAULT_PRIMARY_SUBTITLE;

  const handleDropdownSelect = (id: string) => {
    if (!onSelectEvidence) return;
    if (!id) { onSelectEvidence(null); return; }
    const found = evidenceList.find((e) => e.change_object_id === id) || null;
    onSelectEvidence(found);
    if (found && onHighlightEvidence) onHighlightEvidence([found.change_object_id], found.measurement?.bbox_4326);
  };

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden bg-[var(--panel)]">
      <div className="px-3 py-2.5 border-b border-[var(--line)] bg-[var(--bg)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="dossier-bar" style={{ margin: 0 }}><span>{ASK_COPY.chatTitle}</span></div>
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded t-mono shrink-0"
            style={{ fontSize: 8.5, fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', color: 'var(--verified-green)', border: '1px solid rgba(16, 185, 129, 0.35)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--verified-green)' }} />
            <span>{ASK_COPY.groundedCv}</span>
          </span>
        </div>
        {hasMessages && onClearChat && (
          <button type="button" onClick={onClearChat} className="p-1 rounded text-[var(--ink-3)] hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer" title="Clear conversation">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="px-3 py-2 border-b border-[var(--line)] flex items-center justify-between gap-2 t-mono shrink-0" style={{ background: 'var(--panel-2)' }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--ink-3)] shrink-0" style={{ fontSize: 8.5 }}>{ASK_COPY.activeMapAoi}</span>
          <span className="text-[var(--ink)] truncate font-bold" style={{ fontSize: 10 }}>{currentAoiName || 'Noida International Airport'}</span>
        </div>

        {evidenceList.length > 0 && onSelectEvidence ? (
          <select
            value={selectedEvidence?.change_object_id || ''}
            onChange={(e) => handleDropdownSelect(e.target.value)}
            className="px-2 py-0.5 rounded font-bold t-mono cursor-pointer focus:outline-none truncate"
            style={{ maxWidth: 195, fontSize: 9, background: 'rgba(63, 169, 245, 0.14)', border: '1px solid rgba(63, 169, 245, 0.45)', color: 'var(--primary-cyan)' }}
            title="Click any polygon on the map or select a target here"
          >
            <option value="" style={{ background: 'var(--panel)', color: 'var(--ink)' }}>{'⊕ Entire AOI (All Polygons)'}</option>
            {evidenceList.map((ev) => {
              const ha = ev.measurement?.area_m2 ? (ev.measurement.area_m2 / 10000).toFixed(2) : '0.00';
              return (
                <option key={ev.change_object_id} value={ev.change_object_id} style={{ background: 'var(--panel)', color: 'var(--ink)' }}>
                  {`${getEvidenceDisplayTitle(ev)} (${ha} ha)`}
                </option>
              );
            })}
          </select>
        ) : targetTitle ? (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded shrink-0 font-bold" style={{ fontSize: 9, background: 'rgba(63, 169, 245, 0.14)', border: '1px solid rgba(63, 169, 245, 0.45)', color: 'var(--primary-cyan)', maxWidth: 195 }}>
            <Crosshair className="w-3 h-3 shrink-0" style={{ color: 'var(--primary-cyan)' }} />
            <span className="truncate">{`${targetTitle}${targetAreaHa ? ` (${targetAreaHa} ha)` : ''}`}</span>
          </div>
        ) : (
          <span className="px-1.5 py-0.5 rounded shrink-0" style={{ fontSize: 8.5, color: 'var(--primary-cyan)', background: 'rgba(63, 169, 245, 0.1)', border: '1px solid rgba(63, 169, 245, 0.28)' }}>
            {`${currentDates?.beforeDate || '2021-01-15'} → ${currentDates?.afterDate || '2026-08-03'}`}
          </span>
        )}
      </div>

      {/* Main Chat Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 min-h-0">
        {error && (
          <FeedbackState state="error" errorMessage="QUERY EVALUATION FAILED" errorCode="E_QUERY_FAILED" onRetry={onRetry} />
        )}

        {/* Empty State */}
        {!hasMessages && !isLoading && !error && (
          <div className="space-y-3.5">
            {targetTitle ? (
              <div
                className="p-3 rounded-md space-y-1.5"
                style={{ background: 'linear-gradient(135deg, rgba(63, 169, 245, 0.1) 0%, rgba(14, 22, 38, 0.92) 100%)', border: '1px solid rgba(63, 169, 245, 0.35)', borderLeft: '3px solid var(--primary-cyan)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--primary-cyan)' }}>
                    <Crosshair className="w-3.5 h-3.5" />
                    <span className="t-tag font-bold" style={{ fontSize: 9.5, letterSpacing: '0.08em' }}>{ASK_COPY.selectedTargetBadge}</span>
                    <span className="t-mono px-1.5 py-0.5 rounded" style={{ fontSize: 8, background: 'var(--panel-2)', color: 'var(--ink-2)', border: '1px solid var(--line)' }}>
                      {targetClass}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {targetAreaHa && (
                      <span
                        className="t-mono font-bold px-1.5 py-0.5 rounded"
                        style={{ fontSize: 9, color: 'var(--verified-green)', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                      >
                        {`${targetAreaHa} ha`}
                      </span>
                    )}
                    {onSelectEvidence && (
                      <button
                        type="button"
                        onClick={() => onSelectEvidence(null)}
                        className="t-mono px-1.5 py-0.5 rounded cursor-pointer hover:bg-[var(--panel-2)]"
                        style={{ fontSize: 8.5, color: 'var(--ink-3)', border: '1px solid var(--line)', background: 'transparent' }}
                        title="Unlock target to query the entire AOI"
                      >
                        {'All AOI'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="t-body text-xs text-[var(--ink)] font-bold">
                  {`${targetTitle}${targetAreaHa ? ` — ${targetAreaHa} ha` : ''}`}
                </div>
                <p className="t-body text-[var(--ink-2)] leading-relaxed" style={{ fontSize: 11 }}>
                  {'Click any polygon on the map to dynamically switch target. All measurements are verified in Kruger UTM 43N planar coordinates.'}
                </p>
              </div>
            ) : (
              <div
                className="p-3 rounded-md space-y-2"
                style={{ background: 'linear-gradient(135deg, rgba(63, 169, 245, 0.08) 0%, rgba(14, 22, 38, 0.92) 100%)', border: '1px solid var(--line-strong)', borderLeft: '3px solid var(--primary-cyan)' }}
              >
                <div className="flex items-center gap-1.5" style={{ color: 'var(--primary-cyan)' }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="t-tag font-bold" style={{ fontSize: 9.5, letterSpacing: '0.08em' }}>{ASK_COPY.nlController}</span>
                </div>
                <p className="t-body text-[var(--ink-2)] leading-relaxed" style={{ fontSize: 11 }}>
                  {'Click any polygon on the map to lock onto a specific structure, or ask questions across the entire AOI. Every numeric answer is grounded in Kruger UTM 43N planar coordinates.'}
                </p>
              </div>
            )}

            {/* Prominent Default Question */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="t-tag font-bold text-[var(--ink-3)] tracking-wider" style={{ fontSize: 9.5 }}>{ASK_COPY.defaultPromptLabel}</span>
                <span className="t-mono flex items-center gap-1" style={{ fontSize: 8.5, color: 'var(--primary-cyan)' }}>
                  <ShieldCheck className="w-3 h-3" />
                  <span>{'RECOMMENDED'}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onAsk(activeDefaultQuery)}
                className="w-full text-left p-3 rounded-md transition-all group cursor-pointer"
                style={{ background: 'linear-gradient(135deg, rgba(63, 169, 245, 0.14) 0%, rgba(20, 31, 51, 0.95) 100%)', border: '1px solid rgba(63, 169, 245, 0.45)', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="t-body font-bold text-[var(--ink)] transition-colors" style={{ fontSize: 12.5 }}>
                      {`“${activeDefaultQuery}”`}
                    </div>
                    <div className="t-mono text-[var(--ink-2)] truncate" style={{ fontSize: 9.5 }}>{activeDefaultSubtitle}</div>
                  </div>
                  <div
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded t-mono font-bold transition-transform group-hover:translate-x-0.5"
                    style={{ fontSize: 8.5, background: 'var(--primary-cyan)', color: 'var(--ink)' }}
                  >
                    <span>{'RUN'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </button>
            </div>

            {/* Quick suggested chips */}
            <div className="space-y-1.5">
              <span className="t-tag font-bold text-[var(--ink-3)] tracking-wider block" style={{ fontSize: 9.5 }}>
                {ASK_COPY.exploreQuestionsLabel}
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {(targetTitle ? TARGET_SUGGESTED_QUESTIONS : GENERAL_SUGGESTED_QUESTIONS).map(({ query, tag }, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onAsk(query)}
                    className="w-full text-left px-2.5 py-2 rounded bg-[var(--well)] border border-[var(--line)] hover:border-[var(--primary-cyan)] hover:bg-[var(--panel-2)] text-[var(--ink-2)] hover:text-[var(--ink)] t-mono transition-all flex items-center justify-between gap-2 group cursor-pointer"
                    style={{ fontSize: 11 }}
                  >
                    <span className="truncate">{query}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="px-1.5 py-0.5 rounded t-tag"
                        style={{ fontSize: 7.5, background: 'var(--panel-2)', color: 'var(--ink-3)', border: '1px solid var(--line)' }}
                      >
                        {tag}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--primary-cyan)' }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conversation Stream */}
        {chatMessages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            selectedEvidenceId={selectedEvidenceId}
            currentDates={currentDates}
            onAsk={onAsk}
            onHighlightEvidence={onHighlightEvidence}
            onCopy={handleCopy}
            copiedId={copiedId}
          />
        ))}

        {/* Loading State */}
        {isLoading && (
          <div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--well)] space-y-1.5 animate-pulse">
            <div className="flex items-center gap-2 t-mono text-xs font-bold" style={{ color: 'var(--primary-cyan)' }}>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{ASK_COPY.analyzingSatelliteData}</span>
            </div>
            <div className="space-y-0.5 t-mono text-[var(--ink-3)] pl-5" style={{ fontSize: 10 }}>
              <div>{'Resolving spatial intent & map state…'}</div>
              <div>{'Verifying Kruger UTM 43N planar measurements…'}</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested chips above composer */}
      {hasMessages && !isLoading && (
        <div className="px-3 py-1.5 bg-[var(--bg)] border-t border-[var(--line)] flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="t-tag text-[var(--ink-3)] shrink-0" style={{ fontSize: 9 }}>{ASK_COPY.quickLabel}</span>
          {QUICK_FOLLOW_UPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onAsk(chip)}
              className="shrink-0 px-2 py-0.5 rounded bg-[var(--well)] border border-[var(--line)] hover:border-[var(--primary-cyan)] hover:text-[var(--primary-cyan)] text-[var(--ink-2)] t-mono transition-colors cursor-pointer"
              style={{ fontSize: 10 }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Single Unified Chat Composer (Marked as Step 1) */}
      <div className="p-2.5 border-t border-[var(--line)] bg-[var(--well)] shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center rounded-full t-mono font-bold shrink-0"
            style={{
              width: 22, height: 22, fontSize: 11,
              background: 'var(--step-1-cyan)', color: 'var(--step-ink-dark)',
              boxShadow: '0 0 10px var(--step-1-cyan)',
            }}
            title="Step 1: Natural-language query"
          >
            {'1'}
          </span>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              targetTitle
                ? `Ask about ${targetTitle} (e.g., What is the measured area?)...`
                : 'Ask about this satellite scene (e.g., Identify newly constructed areas)...'
            }
            disabled={isLoading}
            className="flex-1 bg-[var(--bg)] text-[var(--ink)] t-body text-xs px-3 py-2 rounded-md border border-[var(--step-1-cyan)] focus:outline-none placeholder:text-[var(--ink-3)]"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md t-tag font-bold cursor-pointer transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--step-1-cyan)', color: 'var(--step-ink-dark)', border: '1px solid var(--step-1-cyan)', fontSize: 11, height: 34 }}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{ASK_COPY.ask}</span>
          </button>
        </form>
      </div>

      {/* Bottom Sticky Action Footer */}
      <div data-slot="SLOT-25" className="px-3 py-2 border-t border-[var(--line)] bg-[var(--panel)] flex items-center justify-between shrink-0">
        <div className="t-mono text-[var(--ink-3)]" style={{ fontSize: 10 }}>{`${ASK_COPY.traceLabel} ${latestTraceId}`}</div>
        {onExportReport && (
          <Button variant="secondary" size="sm" onClick={onExportReport}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            <span>{ASK_COPY.exportReport}</span>
          </Button>
        )}
      </div>
    </div>
  );
};
