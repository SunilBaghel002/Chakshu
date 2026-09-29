import React, { useState } from 'react';
import {
  Copy,
  Check,
  MapPin,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ASK_COPY, REFUSAL_NOTICES } from '../../lib/copy';
import { FeedbackState } from '../ui/FeedbackState';
import type { ChatMessage } from '../../lib/types/ask';

interface ChatMessageItemProps {
  message: ChatMessage;
  selectedEvidenceId: string | null;
  currentDates?: { beforeDate: string; afterDate: string };
  onAsk: (query: string) => void;
  onHighlightEvidence?: (ids: string[], bbox?: number[]) => void;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  selectedEvidenceId,
  currentDates,
  onAsk,
  onHighlightEvidence,
  onCopy,
  copiedId,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end space-y-1 pl-8">
        <span className="t-mono text-[var(--ink-3)]" style={{ fontSize: 9 }}>
          {ASK_COPY.operatorLabel} · {message.timestamp}
        </span>
        <div className="px-3 py-2 rounded-lg bg-[var(--well)] border border-[var(--line-strong)] text-[var(--ink)] t-body text-xs font-medium max-w-full break-words shadow-sm">
          {message.text}
        </div>
      </div>
    );
  }

  const ans = message.answerData;
  const isMeasured = ans?.epistemicTier === 'MEASURED';
  const isRefusal = ans?.epistemicTier === 'REFUSAL';
  const hasMapHighlight = Boolean(ans?.changeObjectIds && ans.changeObjectIds.length > 0);
  const isCurrentlyLocked =
    selectedEvidenceId && ans?.changeObjectIds?.includes(selectedEvidenceId);

  const intentTitleMap: Record<string, string> = {
    map_annotation: ans?.annotationIntent?.target
      ? `${ans.annotationIntent.target.replace('_', ' ').toUpperCase()} NOTATION`
      : 'MAP NOTATION',
    water_count: 'WATER BODIES COUNT',
    water_area: 'WATER SURFACE AREA',
    water_location: 'WATER BODIES LOCATION',
    water_temporal_change: 'WATER TEMPORAL EVOLUTION',
    multi_intent: 'WATER BODIES & AREA',
    building_count: 'BUILDING STRUCTURES COUNT',
    building_area: 'BUILT-UP FOOTPRINT AREA',
    building_location: 'BUILDING LOCATIONS',
    land_conversion: 'LAND COVER CONVERSION',
    vegetation_change: 'VEGETATION LOSS',
    vegetation_area: 'VEGETATION SURFACE AREA',
    change_area: 'TOTAL CHANGE FOOTPRINT',
    selected_target_area: ans?.targetTitle ? `${ans.targetTitle} AREA` : 'SELECTED TARGET AREA',
  };

  const displayTitle =
    (message.intent && intentTitleMap[message.intent]) ||
    ans?.targetTitle ||
    ASK_COPY.answerTitle;
  const temporalRange = `${ans?.temporal?.date_a || currentDates?.beforeDate || '2021-01-15'} → ${
    ans?.temporal?.date_b || currentDates?.afterDate || '2024-06-09'
  }`;

  return (
    <div className="flex flex-col space-y-1.5 pr-1">
      <div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)]/90 space-y-2 shadow-sm">
        {/* Compact Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--amber)]" />
            <span className="t-tag font-bold text-[var(--ink)] truncate" style={{ fontSize: 10 }}>
              {displayTitle}
            </span>
            <span
              className="t-tag font-bold px-1.5 py-0.5 rounded border"
              style={{
                fontSize: 9,
                background: isMeasured
                  ? 'var(--measured-fill)'
                  : isRefusal
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'var(--inferred-fill)',
                borderColor: isMeasured
                  ? 'var(--measured-border)'
                  : isRefusal
                  ? 'rgba(239, 68, 68, 0.4)'
                  : 'var(--inferred-border)',
                color: isMeasured
                  ? 'var(--measured-text)'
                  : isRefusal
                  ? 'rgb(248, 113, 113)'
                  : 'var(--inferred-text)',
              }}
            >
              {ans?.epistemicTier || 'MEASURED'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="t-mono text-[var(--ink-3)]" style={{ fontSize: 9 }}>
              {Math.round((ans?.confidence ?? 0.94) * 100)}% {ASK_COPY.confidenceLabel}
            </span>
            <button
              onClick={() => onCopy(message.id, ans?.answerText || message.text)}
              className="p-1 rounded text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--well)] transition-colors cursor-pointer"
              title={ASK_COPY.copyAnswer}
            >
              {copiedId === message.id ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Prose */}
        <p className="t-body text-xs text-[var(--ink)] leading-relaxed font-medium">
          {ans?.answerText || message.text}
        </p>

        {/* Refusal Notice */}
        {isRefusal && (
          <FeedbackState
            state="capability_notice"
            refusalNotice={REFUSAL_NOTICES.NOTICE_T3}
          />
        )}

        {/* Action Pills Row */}
        <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
          {ans?.primaryStat && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded bg-[var(--amber)]/15 border border-[var(--amber)]/40 text-[var(--amber)] t-mono font-bold"
              style={{ fontSize: 10 }}
            >
              {ans.primaryStat}
            </span>
          )}

          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--well)] border border-[var(--line)] text-[var(--ink-2)] t-mono"
            style={{ fontSize: 10 }}
          >
            <Calendar className="w-3 h-3 text-[var(--amber)]" />
            <span>{temporalRange}</span>
          </span>

          {hasMapHighlight && onHighlightEvidence && (
            <button
              onClick={() =>
                onHighlightEvidence(ans!.changeObjectIds!, ans?.focusBbox)
              }
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border t-mono font-bold transition-all cursor-pointer ${
                isCurrentlyLocked
                  ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300'
                  : 'bg-emerald-950/60 hover:bg-emerald-900/70 border-emerald-800 text-emerald-400'
              }`}
              style={{ fontSize: 10 }}
              title={ASK_COPY.showOnMap}
            >
              <MapPin className="w-3 h-3" />
              <span>{isCurrentlyLocked ? ASK_COPY.mapActive : ASK_COPY.viewOnMap}</span>
            </button>
          )}

          {ans?.annotationLabels && Object.keys(ans.annotationLabels).length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {Object.entries(ans.annotationLabels).slice(0, 6).map(([id, lbl]) => (
                <span
                  key={id}
                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--well)] border border-[var(--teal)]/40 text-[var(--teal)] t-mono font-bold"
                  style={{ fontSize: 9 }}
                >
                  {lbl}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--well)] hover:bg-[var(--panel)] border border-[var(--line)] text-[var(--ink-3)] hover:text-[var(--ink)] t-mono transition-colors cursor-pointer"
            style={{ fontSize: 10 }}
          >
            {showDetails ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            <span>{showDetails ? ASK_COPY.detailsOpen : ASK_COPY.detailsClose}</span>
          </button>
        </div>

        {/* Progressive Disclosure: Details */}
        {showDetails && (
          <div className="p-2.5 rounded bg-[var(--well)]/90 border border-[var(--line)] space-y-2 mt-1">
            {ans?.measuredNumbers && ans.measuredNumbers.length > 0 && (
              <div className="space-y-1">
                <span className="t-tag text-[var(--ink-3)] font-bold" style={{ fontSize: 9 }}>
                  {ASK_COPY.numberVerifierGrounding}
                </span>
                <div className="space-y-0.5">
                  {ans.measuredNumbers.map((num, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs t-mono py-0.5 border-b border-[var(--line)]/50 last:border-b-0"
                    >
                      <span className="text-[var(--ink-2)]" style={{ fontSize: 10 }}>
                        {num.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[var(--amber)]" style={{ fontSize: 10 }}>
                          {num.value}
                        </span>
                        <span className="text-[var(--ink-3)]" style={{ fontSize: 8 }}>
                          [{num.source}]
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="flex items-center justify-between t-mono text-[var(--ink-3)] pt-1 border-t border-[var(--line)]/50"
              style={{ fontSize: 9 }}
            >
              <span>{ASK_COPY.projectionLabel}</span>
              <span>{ans?.traceId ? `${ASK_COPY.traceLabel} ${ans.traceId}` : ASK_COPY.modelLabel}</span>
            </div>
          </div>
        )}

        {/* Suggested Follow-ups */}
        {ans?.followUps && ans.followUps.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-[var(--line)]/60">
            <span className="t-tag text-[var(--ink-3)]" style={{ fontSize: 9 }}>
              {ASK_COPY.quickLabel}
            </span>
            {ans.followUps.map((prompt, pIdx) => (
              <button
                key={pIdx}
                onClick={() => onAsk(prompt)}
                className="px-2 py-0.5 rounded-full bg-[var(--well)] hover:bg-[var(--panel)] border border-[var(--line)] hover:border-[var(--amber)] text-[var(--ink-2)] hover:text-[var(--amber)] t-mono transition-colors cursor-pointer"
                style={{ fontSize: 10 }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
