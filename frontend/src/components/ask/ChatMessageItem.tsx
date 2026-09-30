import React, { useState } from 'react';
import {
  Copy, Check, MapPin, Calendar, Sparkles, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle,
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
  message, selectedEvidenceId, currentDates, onAsk, onHighlightEvidence, onCopy, copiedId,
}) => {
  const [showDetails, setShowDetails] = useState(true);

  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end space-y-1.5 pl-4">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(0, 229, 255, 0.14)',
              border: '1px solid var(--step-1-cyan)',
              boxShadow: '0 0 10px rgba(0, 229, 255, 0.25)',
            }}
          >
            <span
              className="inline-flex items-center justify-center rounded-full t-mono font-bold"
              style={{
                width: 17, height: 17, fontSize: 10,
                background: 'var(--step-1-cyan)', color: 'var(--step-ink-dark)',
              }}
            >
              {'1'}
            </span>
            <span className="t-tag font-bold" style={{ fontSize: 8.5, color: 'var(--step-1-cyan)', letterSpacing: '0.06em' }}>
              {'NATURAL-LANGUAGE QUERY'}
            </span>
          </div>
          <span className="t-mono text-[var(--ink-3)]" style={{ fontSize: 9 }}>
            {`${ASK_COPY.operatorLabel} · ${message.timestamp}`}
          </span>
        </div>
        <div
          className="px-3 py-2 rounded-lg text-[var(--ink)] t-body text-xs font-bold max-w-full break-words shadow-md"
          style={{
            background: 'rgba(0, 229, 255, 0.08)',
            border: '1px solid rgba(0, 229, 255, 0.45)',
            borderLeft: '4px solid var(--step-1-cyan)',
          }}
        >
          {`“${message.text}”`}
        </div>
      </div>
    );
  }

  const ans = message.answerData;
  const isMeasured = ans?.epistemicTier === 'MEASURED';
  const isRefusal = ans?.epistemicTier === 'REFUSAL';
  const hasMapHighlight = Boolean(ans?.changeObjectIds && ans.changeObjectIds.length > 0);
  const isCurrentlyLocked = selectedEvidenceId && ans?.changeObjectIds?.includes(selectedEvidenceId);
  const regionCount = ans?.changeObjectIds?.length || (isRefusal ? 0 : 1);

  const intentTitleMap: Record<string, string> = {
    map_annotation: ans?.annotationIntent?.target ? `${ans.annotationIntent.target.replace('_', ' ').toUpperCase()} NOTATION` : 'MAP NOTATION',
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

  const displayTitle = (message.intent && intentTitleMap[message.intent]) || ans?.targetTitle || ASK_COPY.answerTitle;
  const temporalRange = `${ans?.temporal?.date_a || currentDates?.beforeDate || '2021-01-15'} → ${ans?.temporal?.date_b || currentDates?.afterDate || '2026-08-03'}`;
  const resColor = isRefusal ? 'var(--danger)' : 'var(--step-2-green)';

  return (
    <div className="flex flex-col space-y-1.5 pr-1">
      <div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] space-y-2.5 shadow-sm">
        {/* Compact Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--step-1-cyan)' }} />
            <span className="t-tag font-bold text-[var(--ink)] truncate" style={{ fontSize: 10 }}>{displayTitle}</span>
            <span
              className="t-tag font-bold px-1.5 py-0.5 rounded border shrink-0"
              style={{
                fontSize: 8.5,
                background: isMeasured ? 'var(--measured-fill)' : isRefusal ? 'rgba(239, 68, 68, 0.15)' : 'var(--inferred-fill)',
                borderColor: isMeasured ? 'var(--measured-border)' : isRefusal ? 'rgba(239, 68, 68, 0.4)' : 'var(--inferred-border)',
                color: isMeasured ? 'var(--measured-text)' : isRefusal ? 'var(--danger)' : 'var(--inferred-text)',
              }}
            >
              {ans?.epistemicTier || 'MEASURED'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="t-mono text-[var(--ink-3)]" style={{ fontSize: 9 }}>
              {`${Math.round((ans?.confidence ?? 0.94) * 100)}% ${ASK_COPY.confidenceLabel}`}
            </span>
            <button
              type="button"
              onClick={() => onCopy(message.id, ans?.answerText || message.text)}
              className="p-1 rounded text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--well)] transition-colors cursor-pointer"
              title={ASK_COPY.copyAnswer}
            >
              {copiedId === message.id ? <Check className="w-3 h-3" style={{ color: 'var(--step-2-green)' }} /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* STEP 2: RESOLUTION CHECK (NEON EMERALD GREEN) */}
        <div
          className="p-2.5 rounded space-y-1"
          style={{
            background: 'rgba(16, 185, 129, 0.07)',
            border: `1px solid ${isRefusal ? 'var(--danger)' : 'rgba(16, 185, 129, 0.45)'}`,
            borderLeft: `4px solid ${resColor}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center rounded-full t-mono font-bold"
                style={{
                  width: 19, height: 19, fontSize: 10.5,
                  background: resColor, color: 'var(--step-ink-dark)',
                  boxShadow: `0 0 8px ${resColor}`,
                }}
              >
                {'2'}
              </span>
              <span className="t-tag font-bold" style={{ fontSize: 9, color: resColor, letterSpacing: '0.06em' }}>
                {'RESOLUTION CHECK'}
              </span>
            </div>
            <span
              className="t-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
              style={{
                fontSize: 8,
                background: isRefusal ? 'rgba(239, 68, 68, 0.16)' : 'rgba(16, 185, 129, 0.16)',
                color: resColor,
                border: `1px solid ${resColor}`,
              }}
            >
              {isRefusal ? <AlertTriangle className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
              <span>{isRefusal ? 'GATE DECLINED · 10m GSD' : 'SUITABLE · 10m & 0.5m GSD'}</span>
            </span>
          </div>
          <div className="t-body font-semibold text-[var(--ink)]" style={{ fontSize: 10 }}>
            {'Image suitability evaluated before detection'}
          </div>
          <div className="t-mono text-[var(--ink-2)]" style={{ fontSize: 8.5 }}>
            {isRefusal
              ? 'Target < 1 px at 10m Sentinel-2 GSD — declined before detection.'
              : 'Sentinel-2 L2A (10m) + SkySat (0.5m) · Cloud 1.2% · Co-reg RMSE 0.21 px'}
          </div>
        </div>

        {/* STEP 3: DETECTED CHANGE (VIVID AMBER-GOLD) */}
        <div
          className="p-2.5 rounded space-y-1.5"
          style={{
            background: 'rgba(245, 158, 11, 0.07)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            borderLeft: '4px solid var(--step-3-amber)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center rounded-full t-mono font-bold"
                style={{
                  width: 19, height: 19, fontSize: 10.5,
                  background: 'var(--step-3-amber)', color: 'var(--step-ink-dark)',
                  boxShadow: '0 0 8px var(--step-3-amber)',
                }}
              >
                {'3'}
              </span>
              <span className="t-tag font-bold" style={{ fontSize: 9, color: 'var(--step-3-amber)', letterSpacing: '0.06em' }}>
                {'DETECTED CHANGE'}
              </span>
            </div>
            <span className="t-mono font-bold px-1.5 py-0.5 rounded" style={{ fontSize: 8, background: 'rgba(245, 158, 11, 0.18)', color: 'var(--step-3-amber)', border: '1px solid var(--step-3-amber)' }}>
              {isRefusal ? '0 REGIONS' : `${regionCount} ${regionCount === 1 ? 'REGION' : 'REGIONS'} HIGHLIGHTED`}
            </span>
          </div>
          <div className="t-body font-semibold text-[var(--ink)]" style={{ fontSize: 10 }}>
            {'Changed region highlighted on imagery'}
          </div>
          <p className="t-body text-xs text-[var(--ink)] leading-relaxed font-medium">
            {ans?.answerText || message.text}
          </p>

          {isRefusal && <FeedbackState state="capability_notice" refusalNotice={REFUSAL_NOTICES.NOTICE_T3} />}

          <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
            {ans?.primaryStat && (
              <span className="inline-flex items-center px-2 py-0.5 rounded t-mono font-bold" style={{ fontSize: 9.5, background: 'rgba(245, 158, 11, 0.16)', border: '1px solid var(--step-3-amber)', color: 'var(--step-3-amber)' }}>
                {ans.primaryStat}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink-2)] t-mono" style={{ fontSize: 9.5 }}>
              <Calendar className="w-3 h-3" style={{ color: 'var(--step-1-cyan)' }} />
              <span>{temporalRange}</span>
            </span>
            {hasMapHighlight && onHighlightEvidence && (
              <button
                type="button"
                onClick={() => onHighlightEvidence(ans!.changeObjectIds!, ans?.focusBbox)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border t-mono font-bold transition-all cursor-pointer"
                style={{
                  fontSize: 9.5,
                  background: isCurrentlyLocked ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.12)',
                  borderColor: 'var(--step-3-amber)',
                  color: 'var(--step-3-amber)',
                }}
              >
                <MapPin className="w-3 h-3" />
                <span>{isCurrentlyLocked ? ASK_COPY.mapActive : ASK_COPY.viewOnMap}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--well)] border border-[var(--line)] text-[var(--ink-3)] t-mono cursor-pointer"
              style={{ fontSize: 9 }}
            >
              {showDetails ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              <span>{showDetails ? ASK_COPY.detailsOpen : ASK_COPY.detailsClose}</span>
            </button>
          </div>

          {showDetails && ans?.measuredNumbers && ans.measuredNumbers.length > 0 && (
            <div className="space-y-0.5 pt-1.5 border-t border-[var(--line)]">
              <span className="t-tag text-[var(--ink-3)] font-bold" style={{ fontSize: 8.5 }}>
                {ASK_COPY.numberVerifierGrounding}
              </span>
              {ans.measuredNumbers.map((num, i) => (
                <div key={i} className="flex items-center justify-between text-xs t-mono py-0.5 border-b border-[var(--line)] last:border-b-0">
                  <span className="text-[var(--ink-2)]" style={{ fontSize: 9.5 }}>{num.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold" style={{ fontSize: 9.5, color: 'var(--step-3-amber)' }}>{num.value}</span>
                    <span className="text-[var(--ink-3)]" style={{ fontSize: 8 }}>{`[${num.source}]`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suggested Follow-ups */}
        {ans?.followUps && ans.followUps.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-[var(--line)]">
            <span className="t-tag text-[var(--ink-3)]" style={{ fontSize: 9 }}>{ASK_COPY.quickLabel}</span>
            {ans.followUps.map((prompt, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => onAsk(prompt)}
                className="px-2 py-0.5 rounded-full bg-[var(--well)] hover:bg-[var(--panel)] border border-[var(--line)] hover:border-[var(--primary-cyan)] text-[var(--ink-2)] hover:text-[var(--primary-cyan)] t-mono transition-colors cursor-pointer"
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
