import React, { useState, useRef } from 'react';
import { Aperture, UploadCloud } from 'lucide-react';
import { Button } from '../ui/Button';
import { UPLOAD_COPY } from '../../lib/copy';
import type { Detection, DetectionSet } from '../../lib/types';
import {
  INSIGHT_COPY,
  computeInsightBreakdown,
  mapDetectionToInsightClass,
  type InsightLayerFilter,
  type InsightViewMode,
} from '../../lib/uploadInsightHelpers';

interface UploadDropzoneProps {
  onFileSelected?: (file: File) => void;
  onLoadSample?: () => void;
  previewUrl?: string | null;
  annotatedUrl?: string | null;
  detectionSet?: DetectionSet | null;
  selectedDetectionId?: string | null;
  onSelectDetection?: (id: string | null) => void;
  viewMode?: InsightViewMode;
  layerFilter?: InsightLayerFilter;
  onLayerFilterChange?: (filter: InsightLayerFilter) => void;
  isAnalysing?: boolean;
  onClear?: () => void;
}

const CLASS_STROKE: Record<Exclude<InsightLayerFilter, 'all'>, string> = {
  building: 'rgba(239, 68, 68, 0.96)',
  vegetation: 'rgba(16, 185, 129, 0.94)',
  road: 'rgba(245, 158, 11, 0.96)',
  water: 'rgba(56, 189, 248, 0.96)',
  crop: 'rgba(163, 230, 53, 0.92)',
  bare: 'rgba(148, 163, 184, 0.85)',
};

const CLASS_FILL: Record<Exclude<InsightLayerFilter, 'all'>, string> = {
  building: 'rgba(239, 68, 68, 0.28)',
  vegetation: 'rgba(16, 185, 129, 0.20)',
  road: 'rgba(245, 158, 11, 0.30)',
  water: 'rgba(56, 189, 248, 0.28)',
  crop: 'rgba(163, 230, 53, 0.16)',
  bare: 'rgba(148, 163, 184, 0.14)',
};

function extractPolygonRings(det: Detection): number[][][] {
  const geom = det.geom_px;
  if (!geom || !geom.coordinates) return [];
  if (geom.type === 'Polygon') return geom.coordinates as number[][][];
  if (geom.type === 'MultiPolygon') return (geom.coordinates as number[][][][]).flatMap((p) => p);
  return [];
}

function getPolygonCentroid(ring: number[][]): [number, number] {
  if (!ring.length) return [0, 0];
  let sx = 0, sy = 0;
  for (const pt of ring) {
    sx += pt[0] ?? 0;
    sy += pt[1] ?? 0;
  }
  return [sx / ring.length, sy / ring.length];
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileSelected,
  onLoadSample,
  previewUrl,
  annotatedUrl,
  detectionSet = null,
  selectedDetectionId = null,
  onSelectDetection,
  viewMode = 'overlay',
  layerFilter = 'all',
  onLayerFilterChange,
  isAnalysing = false,
  onClear,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected?.(file);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected?.(file);
    e.target.value = '';
  };

  const metrics = React.useMemo(() => computeInsightBreakdown(detectionSet), [detectionSet]);
  const filteredDetections = React.useMemo(() => {
    const all = detectionSet?.detections ?? [];
    return layerFilter === 'all' ? all : all.filter((d) => mapDetectionToInsightClass(d) === layerFilter);
  }, [detectionSet, layerFilter]);

  if (previewUrl) {
    const imgW = metrics?.imageWidth || detectionSet?.upload?.width_px || 800;
    const imgH = metrics?.imageHeight || detectionSet?.upload?.height_px || 600;
    const displaySrc = viewMode === 'annotated' && annotatedUrl ? annotatedUrl : previewUrl;

    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative w-full h-full flex flex-col justify-between p-3 bg-[var(--well)] overflow-hidden select-none"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".tif,.tiff,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Top Filter & Action Bar */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 rounded shrink-0"
          style={{
            background: 'rgba(14, 22, 38, 0.92)',
            border: '1px solid var(--line)',
            zIndex: 'var(--z-map-overlay)',
          }}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onLayerFilterChange?.('all')}
              className="t-tag px-2.5 py-1 rounded cursor-pointer transition-colors"
              style={{
                fontSize: 9,
                fontWeight: layerFilter === 'all' ? 700 : 500,
                background: layerFilter === 'all' ? 'var(--cyan-wash)' : 'var(--panel-2)',
                color: layerFilter === 'all' ? 'var(--primary-cyan)' : 'var(--ink-2)',
                border: layerFilter === 'all' ? '1px solid rgba(63, 169, 245, 0.45)' : '1px solid var(--line)',
              }}
            >
              {`${INSIGHT_COPY.filterAll} (${detectionSet?.detections?.length ?? 0})`}
            </button>

            {(metrics?.rows ?? []).map((row) => {
              const active = layerFilter === row.key;
              return (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => onLayerFilterChange?.(active ? 'all' : row.key)}
                  className="t-mono px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1.5"
                  style={{
                    fontSize: 9.5,
                    fontWeight: active ? 700 : 600,
                    background: active ? row.badgeBg : 'var(--panel-2)',
                    color: active ? 'var(--ink)' : 'var(--ink-2)',
                    border: active ? `1px solid ${row.strokeColor}` : '1px solid var(--line)',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: row.strokeColor, display: 'inline-block' }} />
                  <span>{`${row.shortLabel}:`}</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{`${row.pct.toFixed(1)}%`}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              {INSIGHT_COPY.uploadNewBtn}
            </Button>
            {onClear && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                {INSIGHT_COPY.clearBtn}
              </Button>
            )}
          </div>
        </div>

        {/* Center Image + Vector Overlay Stage */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center my-2 overflow-hidden">
          <div
            className="relative inline-flex items-center justify-center rounded overflow-hidden"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              border: '1px solid var(--line-strong)',
              boxShadow: '0 8px 28px rgba(0, 0, 0, 0.55)',
            }}
          >
            <img
              src={displaySrc}
              alt={UPLOAD_COPY.manifestTitle}
              className="block object-contain"
              style={{ maxHeight: 'calc(100vh - 285px)', maxWidth: '100%' }}
            />

            {viewMode === 'overlay' && filteredDetections.length > 0 && (
              <svg
                viewBox={`0 0 ${imgW} ${imgH}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'auto' }}
              >
                {filteredDetections.map((det) => {
                  const cls = mapDetectionToInsightClass(det);
                  const firstRing = extractPolygonRings(det)[0];
                  if (!firstRing || firstRing.length < 3) return null;

                  const pointsAttr = firstRing.map((pt) => `${pt[0] ?? 0},${pt[1] ?? 0}`).join(' ');
                  const [cx, cy] = getPolygonCentroid(firstRing);
                  const isSelected = selectedDetectionId === det.id;
                  const stroke = CLASS_STROKE[cls];
                  const fill = CLASS_FILL[cls];
                  const areaTxt = det.area_m2 ? `${Math.round(det.area_m2)} m²` : `${Math.round(det.score * 100)}%`;
                  const showLabel = cls === 'building' || cls === 'road' || cls === 'water' || isSelected;

                  return (
                    <g key={det.id} onClick={() => onSelectDetection?.(isSelected ? null : det.id)} style={{ cursor: 'pointer' }}>
                      <polygon
                        points={pointsAttr}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSelected ? 3.2 : 2.0}
                        strokeDasharray={cls === 'vegetation' || cls === 'crop' || cls === 'bare' ? '6 3' : undefined}
                      />
                      {showLabel && (
                        <g transform={`translate(${cx}, ${cy})`}>
                          <rect x={-48} y={-11} width={96} height={18} rx={3} fill="rgba(8, 12, 22, 0.86)" stroke={stroke} strokeWidth={1} />
                          <text x={0} y={1} textAnchor="middle" fill="rgba(241, 245, 249, 0.98)" fontSize={9.5} fontWeight={700} fontFamily="monospace">
                            {`${cls.toUpperCase()} · ${areaTxt}`}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}

            {isAnalysing && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(8, 12, 22, 0.68)', zIndex: 'var(--z-toolbar)' }}
              >
                <div
                  className="px-4 py-2.5 rounded t-mono font-bold"
                  style={{ background: 'var(--panel)', border: '1px solid var(--primary-cyan)', color: 'var(--primary-cyan)', fontSize: 11 }}
                >
                  {INSIGHT_COPY.analyzingBanner}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Stacked Coverage Distribution Bar */}
        {metrics && (
          <div
            className="px-3 py-2 rounded shrink-0 flex flex-col gap-1.5"
            style={{ background: 'rgba(14, 22, 38, 0.92)', border: '1px solid var(--line)', zIndex: 'var(--z-map-overlay)' }}
          >
            <div className="flex items-center justify-between t-mono" style={{ fontSize: 9.5 }}>
              <span className="font-bold" style={{ color: 'var(--ink-2)' }}>{INSIGHT_COPY.coverageHeader}</span>
              <span style={{ color: 'var(--primary-cyan)', fontWeight: 700 }}>
                {`Total Area: ${metrics.totalAreaHa ?? 12.0} ha · ${metrics.buildingCount} Buildings · ${metrics.roadCount} Roads · ${metrics.waterBodyCount} Water Bodies`}
              </span>
            </div>

            <div className="w-full h-2.5 rounded overflow-hidden flex" style={{ background: 'var(--well)', border: '1px solid var(--line)' }}>
              {metrics.rows.map((r) =>
                r.pct > 0 ? (
                  <div key={r.key} title={`${r.label}: ${r.pct.toFixed(1)}%`} style={{ width: `${Math.max(1.5, r.pct)}%`, background: r.strokeColor }} />
                ) : null
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="w-full h-full flex items-center justify-center p-8 transition-colors select-none relative overflow-hidden"
      style={{ background: isDragOver ? 'rgba(63, 169, 245, 0.06)' : 'var(--well)' }}
    >
      <input ref={fileInputRef} type="file" accept=".tif,.tiff,.png,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
      {isDragOver && (
        <div
          className="absolute inset-x-0 h-0.5 bg-[var(--primary-cyan)] pointer-events-none"
          style={{ animation: 'scan-sweep 900ms linear infinite', boxShadow: '0 0 12px var(--primary-cyan)' }}
        />
      )}
      <div
        className="w-full max-w-xl h-96 flex flex-col items-center justify-center p-8 text-center rounded border-2 border-dashed transition-colors"
        style={{ borderColor: isDragOver ? 'var(--primary-cyan)' : 'var(--line-strong)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: isDragOver ? 'var(--cyan-wash)' : 'var(--panel)', border: `1px solid ${isDragOver ? 'var(--primary-cyan)' : 'var(--line)'}` }}
        >
          {isDragOver ? <UploadCloud className="w-8 h-8 text-[var(--primary-cyan)]" /> : <Aperture className="w-8 h-8 text-[var(--primary-cyan)]" />}
        </div>
        <h3 className="t-h2 font-bold mb-2 tracking-wider" style={{ color: isDragOver ? 'var(--primary-cyan)' : 'var(--ink)' }}>
          {INSIGHT_COPY.dropHeadline}
        </h3>
        <p className="t-body text-xs mb-6 max-w-md" style={{ color: 'var(--ink-3)' }}>{INSIGHT_COPY.dropSubtext}</p>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="md" onClick={() => fileInputRef.current?.click()}>{UPLOAD_COPY.browseFiles}</Button>
          {onLoadSample && <Button variant="secondary" size="md" onClick={onLoadSample}>{INSIGHT_COPY.sampleBtnLabel}</Button>}
        </div>
      </div>
    </div>
  );
};
