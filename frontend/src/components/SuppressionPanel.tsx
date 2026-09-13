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
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  cloud_shadow: {
    label: 'Transient Cloud Shadows',
    description: 'Dark patch caused by cumulus cloud shadows moving between satellite passes.',
    icon: CloudRain,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  },
  registration: {
    label: 'Satellite Sensor Edge Shift',
    description: 'Sub-pixel sensor alignment offset along high-contrast boundaries.',
    icon: Compass,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  min_size: {
    label: 'Below Minimum Area Threshold',
    description: 'Artifact smaller than minimum actionable detection limit (< 500 m²).',
    icon: Maximize2,
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  },
  cloud: {
    label: 'Cloud & Haze Obstruction',
    description: 'Pixel obscured by high reflectance cloud or thick haze.',
    icon: CloudRain,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  },
  illumination: {
    label: 'Solar Sun Angle Disparity',
    description: 'Steep variation in solar elevation or azimuth causing differential surface glare.',
    icon: Sun,
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  },
  snow_cover: {
    label: 'Snow or Frost Cover',
    description: 'Temporary snow or heavy frost melting between observations.',
    icon: Snowflake,
    color: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
  },
  low_confidence: {
    label: 'Weak Multi-Detector Consensus',
    description: 'Candidate lacked agreement between classical difference and spectral index gates.',
    icon: Activity,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  },
};

interface SuppressionPanelProps {
  aoiId?: string;
  suppressionContext?: SuppressionContextSubObject | null;
}

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
      <div className="p-4 bg-[#0F172A] border border-[#1F2937] rounded-xl text-center text-xs text-slate-400">
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
    <div className="space-y-3 font-sans text-slate-200">
      {/* Accounting Card */}
      <div className="bg-[#0F172A] border border-[#1F2937] p-3.5 rounded-xl shadow-inner space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Candidate Accounting</span>
          </div>
          {isSumValid && (
            <span
              className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
              title="Mathematical invariant: generated = suppressed + retained"
            >
              <CheckCircle2 className="w-3 h-3" />
              100% Accounted
            </span>
          )}
        </div>

        {/* 3 Metrics Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono uppercase text-slate-400">Generated</div>
            <div className="text-base font-bold font-mono text-white tabular-nums">{generated}</div>
            <div className="text-[10px] text-slate-500">100% total</div>
          </div>
          <div className="bg-amber-950/30 p-2 rounded-lg border border-amber-800/40">
            <div className="text-[10px] font-mono uppercase text-amber-300">Suppressed</div>
            <div className="text-base font-bold font-mono text-amber-400 tabular-nums">{suppressed}</div>
            <div className="text-[10px] text-amber-500">{suppressedPct}% filtered</div>
          </div>
          <div className="bg-emerald-950/30 p-2 rounded-lg border border-emerald-800/40">
            <div className="text-[10px] font-mono uppercase text-emerald-300">Retained</div>
            <div className="text-base font-bold font-mono text-emerald-400 tabular-nums">{retained}</div>
            <div className="text-[10px] text-emerald-500">{retainedPct}% real</div>
          </div>
        </div>

        {/* Distribution Bar */}
        <div className="space-y-1">
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${suppressedPct}%` }}
              title={`Suppressed: ${suppressed} (${suppressedPct}%)`}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${retainedPct}%` }}
              title={`Retained: ${retained} (${retainedPct}%)`}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Noise Filtered ({suppressed})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Actionable Detections ({retained})
            </span>
          </div>
        </div>
      </div>

      {/* Suppression Reasons Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-semibold text-slate-300">Filter Reasons Breakdown</span>
          <span className="text-[11px] font-mono text-slate-400">
            {reasonsList.length} Active Filters
          </span>
        </div>

        <div className="space-y-1.5">
          {reasonsList.map(([reasonKey, count]) => {
            const meta = REASON_METADATA[reasonKey] ?? {
              label: reasonKey.replace('_', ' ').toUpperCase(),
              description: 'Filtered by automated spatial-temporal suppression.',
              icon: ShieldAlert,
              color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
            };
            const Icon = meta.icon;
            const pct = suppressed > 0 ? ((count / suppressed) * 100).toFixed(1) : '0';
            const isExpanded = expandedReason === reasonKey;

            return (
              <div
                key={reasonKey}
                className="bg-[#0F172A] border border-[#1F2937] rounded-lg p-2.5 transition-colors hover:border-slate-700"
              >
                <div
                  onClick={() => setExpandedReason(isExpanded ? null : reasonKey)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-md border ${meta.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {meta.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {count} candidates ({pct}% of noise)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-white tabular-nums">
                      {count}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                    <p className="leading-relaxed">{meta.description}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-400 bg-indigo-950/30 px-2 py-1 rounded">
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
        <div className="bg-[#0F172A] border border-[#1F2937] p-3 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sample Candidate Explanations</span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {data.sample_reasons.slice(0, 5).map((s, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 border border-slate-800 p-2 rounded text-[10px] font-mono space-y-0.5"
              >
                <div className="flex justify-between text-slate-400">
                  <span className="text-indigo-300">{s.candidate_id.substring(0, 12)}...</span>
                  <span className="uppercase text-amber-400">{s.reason}</span>
                </div>
                <div className="text-slate-300 font-sans leading-tight">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
