import React from 'react';
import { UPLOAD_COPY, REFUSAL_NOTICES } from '../../lib/copy';
import { FeedbackState } from '../ui/FeedbackState';
import type { DetectionSet } from '../../lib/types';
import {
  INSIGHT_COPY,
  computeInsightBreakdown,
  mapDetectionToInsightClass,
  type InsightLayerFilter,
} from '../../lib/uploadInsightHelpers';

export interface UploadManifestData {
  filename: string;
  sizeBytes: number;
  crs?: string;
  resolutionMPerPx?: number;
  bands?: number;
  checksum?: string;
  gateVerdict?: 'PERMITTED' | 'REFUSED_T3' | 'REFUSED_T0' | 'UNKNOWN';
}

interface UploadManifestPanelProps {
  manifest: UploadManifestData | null;
  detectionSet?: DetectionSet | null;
  selectedDetectionId?: string | null;
  onSelectDetection?: (id: string | null) => void;
  layerFilter?: InsightLayerFilter;
  onLayerFilterChange?: (filter: InsightLayerFilter) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const UploadManifestPanel: React.FC<UploadManifestPanelProps> = ({
  manifest,
  detectionSet = null,
  selectedDetectionId = null,
  onSelectDetection,
  layerFilter = 'all',
  onLayerFilterChange,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const metrics = React.useMemo(() => computeInsightBreakdown(detectionSet), [detectionSet]);

  if (isLoading && !detectionSet) {
    return <FeedbackState state="loading" loadingStage="SEGMENTING SATELLITE PIXELS & EXTRACTING OBJECTS…" />;
  }

  if (error) {
    return <FeedbackState state="error" errorMessage="IMAGE INSIGHT ANALYSIS FAILED" errorCode="E_SEGMENTATION_ERROR" onRetry={onRetry} />;
  }

  if (!manifest && !detectionSet) {
    return <FeedbackState state="empty" emptyMessage="NO IMAGE LOADED · DROP A SATELLITE IMAGE OR LOAD SAMPLE SCENE" />;
  }

  const isRefusedT3 = manifest?.gateVerdict === 'REFUSED_T3';
  const isRefusedT0 = manifest?.gateVerdict === 'REFUSED_T0';
  const isRefused = isRefusedT3 || isRefusedT0;
  const refusalText = isRefusedT3 ? REFUSAL_NOTICES.NOTICE_T3 : isRefusedT0 ? REFUSAL_NOTICES.NOTICE_T0 : undefined;
  const sizeMB = manifest ? (manifest.sizeBytes / (1024 * 1024)).toFixed(2) : '1.42';

  const rowByKey = (k: Exclude<InsightLayerFilter, 'all'>) => metrics?.rows.find((r) => r.key === k);
  const bldRow = rowByKey('building');
  const vegRow = rowByKey('vegetation');
  const roadRow = rowByKey('road');
  const waterRow = rowByKey('water');

  const kpiCards = [
    { key: 'building' as const, title: 'BUILDINGS', pct: bldRow?.pct ?? 0, sub: `${metrics?.buildingCount ?? 0} structures`, color: 'rgba(239, 68, 68, 0.95)', bg: 'rgba(239, 68, 68, 0.10)' },
    { key: 'vegetation' as const, title: 'VEGETATION', pct: vegRow?.pct ?? 0, sub: `${((vegRow?.areaM2 ?? 0) / 10000).toFixed(2)} ha canopy`, color: 'rgba(16, 185, 129, 0.95)', bg: 'rgba(16, 185, 129, 0.10)' },
    { key: 'road' as const, title: 'ROADS', pct: roadRow?.pct ?? 0, sub: `${metrics?.roadCount ?? 0} corridors`, color: 'rgba(245, 158, 11, 0.95)', bg: 'rgba(245, 158, 11, 0.10)' },
    { key: 'water' as const, title: 'WATER BODIES', pct: waterRow?.pct ?? 0, sub: `${metrics?.waterBodyCount ?? 0} reservoirs`, color: 'rgba(56, 189, 248, 0.95)', bg: 'rgba(56, 189, 248, 0.10)' },
  ];

  const detectionsList = detectionSet?.detections ?? [];

  return (
    <div className="flex flex-col h-full w-full select-none overflow-y-auto p-3.5 gap-3.5 bg-[var(--panel)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="dossier-bar" style={{ margin: 0 }}>
          <span>{INSIGHT_COPY.panelTitle}</span>
        </div>
        <span
          className="t-tag px-2 py-0.5 rounded font-bold"
          style={{
            background: 'rgba(16, 185, 129, 0.14)',
            color: 'var(--verified-green)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            fontSize: 8.5,
          }}
        >
          {'PIXEL GROUNDED'}
        </span>
      </div>

      {/* 4 Key Category Cards */}
      {metrics && (
        <div className="grid grid-cols-2 gap-2">
          {kpiCards.map((card) => {
            const active = layerFilter === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => onLayerFilterChange?.(active ? 'all' : card.key)}
                className="p-2.5 rounded text-left cursor-pointer transition-all"
                style={{
                  background: active ? card.bg : 'var(--panel-2)',
                  border: active ? `1px solid ${card.color}` : '1px solid var(--line)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="t-tag font-bold" style={{ color: card.color, fontSize: 8.5, letterSpacing: '0.08em' }}>
                    {card.title}
                  </span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: card.color, display: 'inline-block' }} />
                </div>
                <div className="t-figure tabular-nums font-bold" style={{ color: 'var(--ink)', fontSize: 20, lineHeight: '24px' }}>
                  {`${card.pct.toFixed(1)}%`}
                </div>
                <div className="t-mono mt-0.5" style={{ color: 'var(--ink-3)', fontSize: 9.5 }}>
                  {card.sub}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Full Land-Cover & Object Breakdown Table */}
      {metrics && (
        <div className="console-panel p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="t-tag font-bold" style={{ color: 'var(--ink-2)', fontSize: 9.5 }}>
              {INSIGHT_COPY.coverageHeader}
            </span>
            <span className="t-mono" style={{ color: 'var(--primary-cyan)', fontSize: 9.5, fontWeight: 700 }}>
              {`${metrics.imageWidth}×${metrics.imageHeight} px`}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {metrics.rows.map((row) => {
              const active = layerFilter === row.key;
              const areaStr = row.areaM2 !== null ? `${row.areaM2.toLocaleString()} m²` : `${row.px.toLocaleString()} px`;
              return (
                <div
                  key={row.key}
                  onClick={() => onLayerFilterChange?.(active ? 'all' : row.key)}
                  className="p-2 rounded cursor-pointer transition-colors"
                  style={{
                    background: active ? row.badgeBg : 'var(--well)',
                    border: active ? `1px solid ${row.strokeColor}` : '1px solid var(--line)',
                  }}
                >
                  <div className="flex items-center justify-between t-mono text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: row.strokeColor, display: 'inline-block' }} />
                      <span className="font-bold" style={{ color: 'var(--ink)' }}>{row.label}</span>
                      {row.objectCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--panel-2)', color: 'var(--ink-2)', fontSize: 8.5 }}>
                          {`${row.objectCount} det`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>{areaStr}</span>
                      <span className="font-bold" style={{ color: row.strokeColor, fontSize: 12 }}>{`${row.pct.toFixed(1)}%`}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded overflow-hidden" style={{ background: 'var(--panel)' }}>
                    <div style={{ width: `${Math.min(100, Math.max(1, row.pct))}%`, height: '100%', background: row.strokeColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detected Objects & Footprints List */}
      {detectionsList.length > 0 && (
        <div className="console-panel p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="t-tag font-bold" style={{ color: 'var(--ink-2)', fontSize: 9.5 }}>
              {INSIGHT_COPY.objectsHeader}
            </span>
            <span className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 9.5 }}>
              {`${detectionsList.length} polygons`}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto pr-1" style={{ maxHeight: 165 }}>
            {detectionsList.map((det, idx) => {
              const cls = mapDetectionToInsightClass(det);
              const isSelected = selectedDetectionId === det.id;
              const areaVal = det.area_m2 ? `${Math.round(det.area_m2).toLocaleString()} m²` : `${det.area_px.toLocaleString()} px`;
              const confPct = `${Math.round((det.score || 0.88) * 100)}%`;

              return (
                <button
                  key={det.id}
                  type="button"
                  onClick={() => onSelectDetection?.(isSelected ? null : det.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded t-mono cursor-pointer text-left transition-colors"
                  style={{
                    fontSize: 10,
                    background: isSelected ? 'var(--cyan-wash)' : 'var(--well)',
                    border: isSelected ? '1px solid var(--primary-cyan)' : '1px solid var(--line)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase" style={{ color: 'var(--primary-cyan)' }}>
                      {`#${idx + 1} ${cls}`}
                    </span>
                    <span style={{ color: 'var(--ink-3)' }}>
                      {cls === 'building' || cls === 'road' ? 'FOOTPRINT' : 'ZONE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 tabular-nums">
                    <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{areaVal}</span>
                    <span style={{ color: 'var(--verified-green)', fontWeight: 700 }}>{confPct}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact Image Telemetry & Resolution Gate */}
      {manifest && (
        <div className="console-panel p-3 flex flex-col gap-2 t-mono text-xs">
          <span className="t-tag font-bold" style={{ color: 'var(--ink-2)', fontSize: 9.5 }}>
            {INSIGHT_COPY.manifestHeader}
          </span>
          <div className="flex justify-between border-b border-[var(--line)] pb-1">
            <span style={{ color: 'var(--ink-3)' }}>{`${UPLOAD_COPY.filename}:`}</span>
            <span className="font-bold truncate" style={{ maxWidth: 190 }} title={manifest.filename}>{manifest.filename}</span>
          </div>
          <div className="flex justify-between border-b border-[var(--line)] pb-1">
            <span style={{ color: 'var(--ink-3)' }}>{`${UPLOAD_COPY.size} / ${UPLOAD_COPY.crs}:`}</span>
            <span>{`${sizeMB} MB · ${manifest.crs || 'UTM 43N'}`}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--ink-3)' }}>{`${UPLOAD_COPY.resolution}:`}</span>
            <span className="font-semibold" style={{ color: 'var(--primary-cyan)' }}>
              {manifest.resolutionMPerPx ? `${manifest.resolutionMPerPx.toFixed(2)} m/px` : '0.50 m/px'}
            </span>
          </div>
          {isRefused && <FeedbackState state="capability_notice" refusalNotice={refusalText} />}
        </div>
      )}
    </div>
  );
};
