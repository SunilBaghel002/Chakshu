import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Send,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Trash2,
  ArrowRight,
  MapPin,
  Crosshair,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ASK_COPY } from '../../lib/copy';
import { FeedbackState } from '../ui/FeedbackState';
import { ChatMessageItem } from './ChatMessageItem';
import type { AskAnswerData, ChatMessage } from '../../lib/types/ask';

export interface AskAnswerPanelProps {
  chatMessages?: ChatMessage[];
  answer?: AskAnswerData | null;
  isLoading?: boolean;
  onAsk: (query: string) => void;
  onClearChat?: () => void;
  onExportReport?: () => void;
  onHighlightEvidence?: (ids: string[], bbox?: number[]) => void;
  selectedEvidenceId?: string | null;
  selectedEvidence?: {
    change_object_id?: string;
    title?: string;
    target_type?: string;
    class_name?: string;
    change_type?: string;
    classification?: { change_type?: string };
    measurement?: { area_m2?: number; area_label?: string; bbox_4326?: number[] };
    area_m2?: number;
    bbox_4326?: number[];
  } | null;
  currentAoiName?: string;
  currentDates?: { beforeDate: string; afterDate: string };
  error?: string | null;
  onRetry?: () => void;
}

const DEFAULT_PRIMARY_PROMPT = 'Kitna area change hua is time interval mein?';
const DEFAULT_PRIMARY_SUBTITLE = 'How much area changed during this time interval?';

const GENERAL_SUGGESTED_QUESTIONS = [
  'Highlight the water bodies in map with notation',
  'Highlight new buildings between the selected dates',
  'Show where vegetation disappeared',
  'Show water bodies with area',
  'Show changed areas',
  'Paani wali jagah mark karo',
  'What changed between the selected dates?',
  'How many buildings were detected?',
];

const TARGET_SUGGESTED_QUESTIONS = [
  'Isko notation ke saath mark karo',
  'Kitna area hai iska?',
  'Yaha kya bana hai?',
  'Pehle kya tha yaha?',
  'What type of structure is this?',
];

const QUICK_FOLLOW_UPS = [
  'With notation',
  'With area',
  'Only the largest one',
  'Zoom there',
  'Clear',
];

/**
 * AskAnswerPanel — Sovereign Satellite Intelligence Chat Panel
 * Natural-language control layer for existing CV/remote-sensing spatial evidence.
 */
export const AskAnswerPanel: React.FC<AskAnswerPanelProps> = ({
  chatMessages = [],
  answer = null,
  isLoading = false,
  onAsk,
  onClearChat,
  onExportReport,
  onHighlightEvidence,
  selectedEvidenceId = null,
  selectedEvidence = null,
  currentAoiName,
  currentDates,
  error = null,
  onRetry,
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
    answer?.traceId ||
    'tr_ask_7c19a2';

  const targetTitle =
    (selectedEvidence as any)?.title ||
    selectedEvidence?.class_name ||
    selectedEvidence?.classification?.change_type ||
    selectedEvidence?.change_type ||
    (selectedEvidence ? 'Selected Target' : null);
  const targetAreaM2 = selectedEvidence?.measurement?.area_m2 ?? selectedEvidence?.area_m2;
  const targetAreaHa = targetAreaM2 ? (targetAreaM2 / 10000).toFixed(2) : null;

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden bg-[var(--panel)]">
      {/* Top Header */}
      <div className="p-3 border-b border-[var(--line)] bg-[var(--bg)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="dossier-bar" style={{ margin: 0 }}>
            <span>{ASK_COPY.chatTitle}</span>
          </div>
          <span
            className="flex items-center gap-1 px-1.5 py-0.5 rounded t-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 shrink-0"
            style={{ fontSize: 9 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{ASK_COPY.groundedCv}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasMessages && onClearChat && (
            <button
              onClick={onClearChat}
              className="p-1 rounded text-[var(--ink-3)] hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Context Banner */}
      <div className="px-3 py-1.5 bg-[var(--well)]/80 border-b border-[var(--line)] flex items-center justify-between text-xs t-mono shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-[var(--ink-3)]" style={{ fontSize: 9 }}>
            {ASK_COPY.activeMapAoi}
          </span>
          <span className="text-[var(--ink-2)] truncate font-semibold" style={{ fontSize: 10 }}>
            {currentAoiName || 'Noida International Airport'}
          </span>
        </div>

        {targetTitle ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--amber)]/15 border border-[var(--amber)]/40 text-[var(--amber)] shrink-0 font-bold" style={{ fontSize: 9 }}>
            <Crosshair className="w-3 h-3 text-[var(--amber)]" />
            <span className="truncate">{targetTitle} {targetAreaHa ? `(${targetAreaHa} ha)` : ''}</span>
          </div>
        ) : (
          <span className="text-[var(--ink-3)] shrink-0" style={{ fontSize: 9 }}>
            {`${currentDates?.beforeDate || '2021-01-15'} → ${currentDates?.afterDate || '2024-06-09'}`}
          </span>
        )}
      </div>

      {/* Main Chat Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {error && (
          <FeedbackState
            state="error"
            errorMessage="QUERY EVALUATION FAILED"
            errorCode="E_QUERY_FAILED"
            onRetry={onRetry}
          />
        )}

        {/* Empty State: Map Status + Dynamic Suggested Questions */}
        {!hasMessages && !isLoading && !error && (
          <div className="space-y-3 py-1">
            {targetTitle ? (
              /* Selected Target State */
              <div className="console-panel p-3 border border-[var(--amber)]/40 bg-[var(--amber)]/5 space-y-2">
                <div className="flex items-center gap-2 text-[var(--amber)]">
                  <Crosshair className="w-4 h-4" />
                  <span className="t-tag font-bold text-xs">{ASK_COPY.selectedTargetBadge}</span>
                </div>
                <div className="t-body text-xs text-[var(--ink)] font-semibold">
                  {targetTitle} {targetAreaHa ? `— ${targetAreaHa} ha` : ''}
                </div>
                <p className="t-body text-xs text-[var(--ink-2)] leading-relaxed">
                  Ask targeted questions about this locked polygon. All measurements are derived from Kruger UTM 43N planar coordinates.
                </p>
              </div>
            ) : (
              /* General AOI State */
              <div className="console-panel p-3 border border-[var(--line)] bg-[var(--well)]/80 space-y-2">
                <div className="flex items-center gap-2 text-[var(--amber)]">
                  <Sparkles className="w-4 h-4" />
                  <span className="t-tag font-bold text-xs">{ASK_COPY.nlController}</span>
                </div>
                <p className="t-body text-xs text-[var(--ink-2)] leading-relaxed">
                  Ask questions about surface changes, detected objects, water bodies, or runways.
                  All responses are mathematically grounded in Kruger UTM 43N satellite evidence.
                </p>
              </div>
            )}

            {/* Prominent Default Question */}
            <div className="space-y-1.5">
              <span
                className="t-tag font-bold text-[var(--ink-3)] tracking-wider"
                style={{ fontSize: 10 }}
              >
                {ASK_COPY.defaultPromptLabel}
              </span>
              <button
                onClick={() => onAsk(targetTitle ? `Kitna area hai iska?` : DEFAULT_PRIMARY_PROMPT)}
                className="w-full text-left p-3 rounded-lg border border-[var(--amber)]/60 bg-[var(--amber)]/10 hover:bg-[var(--amber)]/20 hover:border-[var(--amber)] transition-all group cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="t-body font-bold text-xs text-[var(--ink)] group-hover:text-[var(--amber)] transition-colors">
                      {targetTitle ? `“Kitna area hai iska?”` : `“${DEFAULT_PRIMARY_PROMPT}”`}
                    </div>
                    <div className="t-mono text-[var(--ink-3)]" style={{ fontSize: 10 }}>
                      {targetTitle ? `Query measured area for ${targetTitle}` : DEFAULT_PRIMARY_SUBTITLE}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--amber)] shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            {/* Quick suggested chips */}
            <div className="space-y-1.5 pt-1">
              <span
                className="t-tag font-bold text-[var(--ink-3)] tracking-wider"
                style={{ fontSize: 10 }}
              >
                {ASK_COPY.exploreQuestionsLabel}
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {(targetTitle ? TARGET_SUGGESTED_QUESTIONS : GENERAL_SUGGESTED_QUESTIONS).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAsk(q)}
                    className="w-full text-left px-2.5 py-1.5 rounded bg-[var(--well)] border border-[var(--line)] hover:border-[var(--amber)]/60 hover:bg-[var(--panel-2)] text-[var(--ink-2)] hover:text-[var(--ink)] t-mono text-xs transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <span className="truncate">{q}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--ink-3)] group-hover:text-[var(--amber)] shrink-0 ml-1" />
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
            <div className="flex items-center gap-2 text-[var(--amber)] t-mono text-xs font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{ASK_COPY.analyzingSatelliteData}</span>
            </div>
            <div className="space-y-0.5 t-mono text-[var(--ink-3)] pl-5" style={{ fontSize: 10 }}>
              <div>{`Understanding map state & intent…`}</div>
              <div>{`Evaluating Kruger UTM 43N planar coordinates…`}</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested chips above composer for fast follow-up */}
      {hasMessages && !isLoading && (
        <div className="px-3 py-1.5 bg-[var(--bg)] border-t border-[var(--line)] flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="t-tag text-[var(--ink-3)] shrink-0" style={{ fontSize: 9 }}>
            {ASK_COPY.quickLabel}
          </span>
          {QUICK_FOLLOW_UPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => onAsk(chip)}
              className="shrink-0 px-2 py-0.5 rounded bg-[var(--well)] border border-[var(--line)] hover:border-[var(--amber)] hover:text-[var(--amber)] text-[var(--ink-2)] t-mono transition-colors cursor-pointer"
              style={{ fontSize: 10 }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Chat Composer */}
      <div className="p-2.5 border-t border-[var(--line)] bg-[var(--well)] shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={targetTitle ? `Ask about ${targetTitle} (e.g., Kitna area hai?)...` : `Ask about the satellite scene (e.g., Kitna area change hua?)...`}
            disabled={isLoading}
            className="flex-1 bg-[var(--bg)] text-[var(--ink)] t-body text-xs px-3 py-2 rounded-md border border-[var(--line)] focus:border-[var(--amber)] focus:outline-none placeholder:text-[var(--ink-3)]"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isLoading}
            disabled={!inputText.trim()}
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            <span>{ASK_COPY.ask}</span>
          </Button>
        </form>
      </div>

      {/* Bottom Sticky Action Footer */}
      <div
        data-slot="SLOT-25"
        className="px-3 py-2 border-t border-[var(--line)] bg-[var(--panel)] flex items-center justify-between shrink-0"
      >
        <div className="t-mono text-[var(--ink-3)]" style={{ fontSize: 10 }}>
          {`${ASK_COPY.traceLabel} ${latestTraceId}`}
        </div>

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
