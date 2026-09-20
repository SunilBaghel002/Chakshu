import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { ClassificationSubObject, RuleTraceItem, ClassificationAlternative } from '../../lib/types';
import { Button } from '../ui/Button';
import { DOSSIER_COPY, FEEDBACK_COPY } from '../../lib/copy';

interface TraceRowsProps {
  classification: ClassificationSubObject;
  traceId?: string;
}

/**
 * TraceRows — SLOT-26 (PRD 10 §4 / L4)
 * Decision table rows + COPY TRACE_ID + Alternatives considered
 */
export const TraceRows: React.FC<TraceRowsProps> = ({
  classification,
  traceId = 'tr_8f3a2b1c',
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyTrace = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(traceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const defaultRules: RuleTraceItem[] = [
    {
      rule: 'ndbi_rise',
      tested_value: 0.21,
      threshold: 0.1,
      comparator: '>=',
      passed: true,
      rationale:
        'Building index (NDBI) jumped above threshold, indicating concrete, roof, or runway pavement.',
    },
    {
      rule: 'ndvi_drop',
      tested_value: -0.34,
      threshold: -0.15,
      comparator: '<=',
      passed: true,
      rationale:
        'Vegetation index (NDVI) fell sharply as farmland was stripped and cleared.',
    },
    {
      rule: 'ndwi_water_check',
      tested_value: -0.28,
      threshold: 0.15,
      comparator: '<',
      passed: true,
      rationale:
        'NDWI remains negative, confirming dry soil excavation and rejecting seasonal flooding.',
    },
  ];

  const rules: RuleTraceItem[] =
    classification.rule_trace && classification.rule_trace.length > 0
      ? classification.rule_trace
      : defaultRules;

  return (
    <div className="space-y-3">
      <div className="dossier-bar" style={{ margin: 0 }}>
        <span>{DOSSIER_COPY.decisionTrace}</span>
      </div>

      <p className="t-body text-xs" style={{ color: 'var(--ink-3)' }}>
        {DOSSIER_COPY.decisionDesc}
      </p>

      <div className="space-y-2">
        {rules.map((ruleItem: RuleTraceItem, rIdx: number) => {
          const isPassed = ruleItem.passed !== false && ruleItem.fired !== false;
          return (
            <div key={rIdx} className="console-panel p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="t-tag" style={{ color: 'var(--amber)', fontSize: 10 }}>
                  {ruleItem.rule} (val: {String(ruleItem.tested_value ?? ruleItem.value)})
                </span>
                <span
                  className="t-tag"
                  style={{
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 9,
                    background: isPassed ? 'var(--measured-fill)' : 'var(--rejected-fill)',
                    border: `1px solid ${isPassed ? 'var(--measured-border)' : 'var(--rejected-border)'}`,
                    color: isPassed ? 'var(--measured-text)' : 'var(--rejected-text)',
                  }}
                >
                  {isPassed ? '✓ PASS' : '✕ FAIL'}
                </span>
              </div>
              <div className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
                Threshold: {ruleItem.comparator ?? '>='} {String(ruleItem.threshold ?? '0.0')}
              </div>
              {ruleItem.rationale && (
                <p className="t-body" style={{ color: 'var(--ink-2)', lineHeight: '16px', fontSize: 11 }}>
                  {ruleItem.rationale}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Copyable Trace ID bar */}
      <div
        className="flex items-center justify-between p-2 rounded t-mono text-xs"
        style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
      >
        <span style={{ color: 'var(--ink-2)' }}>TRACE: {traceId}</span>
        <Button
          variant="icon-ghost"
          size="sm"
          onClick={handleCopyTrace}
          title={copied ? FEEDBACK_COPY.traceCopied : FEEDBACK_COPY.copyTraceId}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Alternatives */}
      {classification.alternatives && classification.alternatives.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="dossier-bar" style={{ margin: 0 }}>
            <span>{DOSSIER_COPY.alternativesTitle}</span>
          </div>
          <div className="space-y-1">
            {classification.alternatives.map((alt: ClassificationAlternative, aIdx: number) => (
              <div key={aIdx} className="console-panel p-2 t-mono text-xs flex justify-between">
                <span className="t-tag" style={{ color: 'var(--amber)', fontSize: 10 }}>
                  {alt.change_type ?? alt.type}
                </span>
                <span className="tabular-nums" style={{ color: 'var(--ink-2)' }}>
                  {((alt.score ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
