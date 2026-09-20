import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Filter,
  Info,
  ChevronDown,
  ChevronUp,
  Leaf,
  CloudRain,
  Compass,
  Maximize2,
  Sun,
  Snowflake,
  Activity,
  Layers,
} from 'lucide-react';
import { getSuppression } from '../lib/api';
import type { SuppressionContextSubObject } from '../lib/types';

interface SuppressionReasonMeta {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const REASON_METADATA: Record<string, SuppressionReasonMeta> = {
  seasonal: {
    label: 'Seasonal Crop & Grass Drying',
    description: 'Natural agricultural harvesting or seasonal dry-down with no soil excavation.',
    icon: Leaf,
    color: 'text-[var(--amber)] bg-[var(--amber-wash)] border-[rgba(240,180,95,0.3)]',
  },
  cloud_shadow: {
    label: 'Transient Cloud Shadows',
    description: 'Dark patch caused by cumulus cloud shadows moving between satellite passes.',
    icon: CloudRain,
    color: 'text-[var(--teal)] bg-[var(--teal-wash)] border-[rgba(53,184,192,0.3)]',
  },
  registration: {
    label: 'Satellite Sensor Edge Shift',
    description: 'Sub-pixel sensor alignment offset along high-contrast boundaries.',
    icon: Compass,
    color: 'text-[var(--teal)] bg-[var(--teal-wash)] border-[rgba(53,184,192,0.3)]',
  },
  min_size: {
    label: 'Below Minimum Area Threshold',
    description: 'Artifact smaller than minimum actionable detection limit (< 500 m²).',
    icon: Maximize2,
    color: 'text-[var(--ink3)] bg-[var(--panel2)] border-[var(--line)]',
  },
  cloud: {
    label: 'Cloud & Haze Obstruction',
    description: 'Pixel obscured by high reflectance cloud or thick haze.',
    icon: CloudRain,
    color: 'text-[var(--teal)] bg-[var(--teal-wash)] border-[rgba(53,184,192,0.3)]',
  },
  illumination: {
    label: 'Solar Sun Angle Disparity',
    description: 'Steep variation in solar elevation or azimuth causing differential surface glare.',
    icon: Sun,
    color: 'text-[var(--amber)] bg-[var(--amber-wash)] border-[rgba(240,180,95,0.3)]',
  },
  snow_cover: {
    label: 'Snow or Frost Cover',
    description: 'Temporary snow or heavy frost melting between observations.',
    icon: Snowflake,
    color: 'text-[#85B8FF] bg-[rgba(133,184,255,0.1)] border-[rgba(133,184,255,0.3)]',
  },
  low_confidence: {
    label: 'Weak Multi-Detector Consensus',
    description: 'Candidate lacked agreement between classical difference and spectral index gates.',
    icon: Activity,
    color: 'text-[var(--color-rejected-text)] bg-[var(--color-rejected-fill)] border-[rgba(229,72,77,0.3)]',
  },
};

interface SuppressionPanelProps {
  aoiId?: string;
  suppressionContext?: SuppressionContextSubObject | null;
}

/**
 * SuppressionPanel — Console False Alarm Filter Metrics & Accounting Card
 */
export const SuppressionPanel: React.FC<SuppressionPanelProps> = ({
  aoiId,
  suppressionContext,
}) => {
  const [data, setData] = useState<{
    candidates_generated: number;
    candidates_suppressed: number;
    candidates_retained: number;
    by_reason: Record<string, number>;
    sample_reasons?: Array<{ candidate_id: string; reason: string; detail: string }>;
  } | null>(suppressionContext ?? null);

  const [expandedReason, setExpandedReason] = useState<string | null>(null);

  useEffect(() => {
    if (suppressionContext) {
      setData(suppressionContext);
      return;
    }

    let isMounted = true;
    getSuppression(aoiId).then((res) => {
      if (!isMounted) return;
      if (res.kind === 'ok' && res.data) {
        setData(res.data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [aoiId, suppressionContext]);

  if (!data) {
    return (
      <div
        className="p-4 bg-[var(--panel)] border border-[var(--line)] text-center text-xs text-[var(--ink3)] font-mono"
        style={{ borderRadius: 'var(--r-sm)' }}
      >
        Loading false alarm filter metrics...
      </div>
    );
  }

  const generated = data.candidates_generated || 0;
  const suppressed = data.candidates_suppressed || 0;
  const retained = data.candidates_retained || 0;
  const suppressedPct = generated > 0 ? ((suppressed / generated) * 100).toFixed(1) : '0';
  const retainedPct = generated > 0 ? ((retained / generated) * 100).toFixed(1) : '0';
  const isSumValid = generated === suppressed + retained;

  const reasonsList = Object.entries(data.by_reason || {})
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3 font-sans text-[var(--ink)]">
      {/* Accounting Card */}
      <div
        className="bg-[var(--panel)] border border-[var(--line)] p-3.5 space-y-3 corner-ticks"
        style={{ borderRadius: 'var(--r-sm)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="dossier-bar inline-block" />
            <Filter className="w-3.5 h-3.5 text-[var(--amber)]" />
            <span className="text-xs font-semibold tracking-wider uppercase font-mono text-[var(--ink)]">
              Candidate Accounting
            </span>
          </div>
          {isSumValid && (
            <span
              className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--color-measured-fill)',
                color: 'var(--color-measured-text)',
                border: '1px solid rgba(47,191,113,0.3)',
                borderRadius: 'var(--r-sm)',
              }}
              title="Mathematical invariant: generated = suppressed + retained"
            >
              <CheckCircle2 className="w-3 h-3" />
              100% ACCOUNTED
            </span>
          )}
        </div>

        {/* 3 Metrics Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div
            className="bg-[var(--well)] p-2 border border-[var(--line)]"
            style={{ borderRadius: 'var(--r-sm)' }}
          >
            <div className="text-[10px] font-mono uppercase text-[var(--ink3)]">Generated</div>
            <div className="text-base font-bold font-mono text-[var(--ink)] tabular-nums">{generated}</div>
            <div className="text-[10px] text-[var(--ink3)] font-mono">100% total</div>
          </div>
          <div
            className="bg-[var(--well)] p-2 border border-[rgba(240,180,95,0.3)]"
            style={{ borderRadius: 'var(--r-sm)' }}
          >
            <div className="text-[10px] font-mono uppercase text-[var(--amber)]">Suppressed</div>
            <div className="text-base font-bold font-mono text-[var(--amber)] tabular-nums">{suppressed}</div>
            <div className="text-[10px] text-[rgba(240,180,95,0.7)] font-mono">{suppressedPct}% noise</div>
          </div>
          <div
            className="bg-[var(--well)] p-2 border border-[rgba(47,191,113,0.3)]"
            style={{ borderRadius: 'var(--r-sm)' }}
          >
            <div className="text-[10px] font-mono uppercase text-[var(--color-measured-text)]">Retained</div>
            <div className="text-base font-bold font-mono text-[var(--color-measured-text)] tabular-nums">{retained}</div>
            <div className="text-[10px] text-[rgba(47,191,113,0.7)] font-mono">{retainedPct}% real</div>
          </div>
        </div>

        {/* Distribution Bar */}
        <div className="space-y-1">
          <div
            className="w-full bg-[var(--well)] h-2 overflow-hidden flex border border-[var(--line)]"
            style={{ borderRadius: 'var(--r-sm)' }}
          >
            <div
              className="bg-[var(--amber)] h-full transition-all duration-300"
              style={{ width: `${suppressedPct}%` }}
              title={`Suppressed: ${suppressed} (${suppressedPct}%)`}
            />
            <div
              className="bg-[var(--color-measured)] h-full transition-all duration-300"
              style={{ width: `${retainedPct}%` }}
              title={`Retained: ${retained} (${retainedPct}%)`}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-[var(--ink3)]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)] inline-block" />
              Noise Filtered ({suppressed})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-measured)] inline-block" />
              Actionable Detections ({retained})
            </span>
          </div>
        </div>
      </div>

      {/* Suppression Reasons Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-1.5">
            <span className="dossier-bar inline-block" />
            <span className="font-semibold text-[var(--ink2)] uppercase tracking-wider text-[11px] font-mono">
              Filter Reasons Breakdown
            </span>
          </div>
          <span className="text-[11px] font-mono text-[var(--ink3)]">
            {reasonsList.length} ACTIVE FILTERS
          </span>
        </div>

        <div className="space-y-1.5">
          {reasonsList.map(([reasonKey, count]) => {
            const meta = REASON_METADATA[reasonKey] ?? {
              label: reasonKey.replace('_', ' ').toUpperCase(),
              description: 'Filtered by automated spatial-temporal suppression.',
              icon: ShieldAlert,
              color: 'text-[var(--ink3)] bg-[var(--panel2)] border-[var(--line)]',
            };
            const Icon = meta.icon;
            const pct = suppressed > 0 ? ((count / suppressed) * 100).toFixed(1) : '0';
            const isExpanded = expandedReason === reasonKey;

            return (
              <div
                key={reasonKey}
                className="bg-[var(--panel)] border border-[var(--line)] p-2.5 transition-colors hover:border-[var(--line-strong)]"
                style={{ borderRadius: 'var(--r-sm)' }}
              >
                <div
                  onClick={() => setExpandedReason(isExpanded ? null : reasonKey)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`p-1.5 border ${meta.color}`}
                      style={{ borderRadius: 'var(--r-sm)' }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium text-[var(--ink)] truncate">
                        {meta.label}
                      </div>
                      <div className="text-[10px] text-[var(--ink3)] font-mono">
                        {count} candidates ({pct}% of noise)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-[var(--ink)] tabular-nums">
                      {count}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[var(--ink3)]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--ink3)]" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div
                    className="mt-2 pt-2 border-t border-[var(--line)] text-[11px] text-[var(--ink2)] space-y-1"
                  >
                    <p className="leading-relaxed">{meta.description}</p>
                    <div
                      className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--teal)] bg-[var(--teal-wash)] px-2 py-1 border border-[rgba(53,184,192,0.2)]"
                      style={{ borderRadius: 'var(--r-sm)' }}
                    >
                      <Info className="w-3 h-3 shrink-0" />
                      <span>Rule key: <code>{reasonKey}</code> (Literature threshold applied)</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sample Verbatim Reasons if available */}
      {data.sample_reasons && data.sample_reasons.length > 0 && (
        <div
          className="bg-[var(--panel)] border border-[var(--line)] p-3 space-y-2 corner-ticks"
          style={{ borderRadius: 'var(--r-sm)' }}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink2)]">
            <span className="dossier-bar inline-block" />
            <Layers className="w-3.5 h-3.5 text-[var(--amber)]" />
            <span className="font-mono uppercase tracking-wider text-[11px]">Sample Candidate Explanations</span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {data.sample_reasons.slice(0, 5).map((s, idx) => (
              <div
                key={idx}
                className="bg-[var(--well)] border border-[var(--line)] p-2 text-[10px] font-mono space-y-0.5"
                style={{ borderRadius: 'var(--r-sm)' }}
              >
                <div className="flex justify-between text-[var(--ink3)]">
                  <span className="text-[var(--teal)]">{s.candidate_id.substring(0, 12)}...</span>
                  <span className="uppercase text-[var(--amber)]">{s.reason}</span>
                </div>
                <div className="text-[var(--ink2)] font-sans leading-tight">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
