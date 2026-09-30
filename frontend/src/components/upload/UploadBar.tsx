import React from 'react';
import { Button } from '../ui/Button';
import { UPLOAD_COPY } from '../../lib/copy';
import { INSIGHT_COPY, type InsightViewMode } from '../../lib/uploadInsightHelpers';

interface UploadBarProps {
  source?: string;
  onSourceChange?: (src: string) => void;
  sensor?: string;
  onSensorChange?: (sensor: string) => void;
  resolutionGsd?: number | null;
  viewMode?: InsightViewMode;
  onViewModeChange?: (mode: InsightViewMode) => void;
  hasImage?: boolean;
  onLoadSample?: () => void;
  onAnalyse?: () => void;
  isAnalysing?: boolean;
  canAnalyse?: boolean;
}

/**
 * UploadBar — SLOT-02 (INSIGHT Mode)
 * SOURCE ▾ · SENSOR ▾ · RESOLUTION readout · View Mode Toggle · SAMPLE SCENE · ANALYSE primary
 */
export const UploadBar: React.FC<UploadBarProps> = ({
  source = 'file',
  onSourceChange,
  sensor = 'drone',
  onSensorChange,
  resolutionGsd = 0.5,
  viewMode = 'overlay',
  onViewModeChange,
  hasImage = false,
  onLoadSample,
  onAnalyse,
  isAnalysing = false,
  canAnalyse = true,
}) => {
  const modes: { key: InsightViewMode; label: string }[] = [
    { key: 'overlay', label: INSIGHT_COPY.viewOverlay },
    { key: 'annotated', label: INSIGHT_COPY.viewAnnotated },
    { key: 'original', label: INSIGHT_COPY.viewOriginal },
  ];

  return (
    <div
      className="flex items-center justify-between px-3 w-full h-full select-none"
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Mode Pill */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded"
          style={{
            background: 'var(--cyan-wash)',
            border: '1px solid rgba(63, 169, 245, 0.35)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--primary-cyan)',
              display: 'inline-block',
            }}
          />
          <span
            className="t-tag font-bold"
            style={{ color: 'var(--primary-cyan)', fontSize: 9.5, letterSpacing: '0.08em' }}
          >
            {INSIGHT_COPY.barTitle}
          </span>
        </div>

        {/* SOURCE selector */}
        <div className="flex items-center gap-1.5">
          <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
            {`${UPLOAD_COPY.sourceLabel}:`}
          </span>
          <select
            value={source}
            onChange={(e) => onSourceChange?.(e.target.value)}
            className="bg-[var(--well)] text-[var(--ink)] t-mono text-xs px-2 py-1 rounded border border-[var(--line)] cursor-pointer"
          >
            <option value="file">{UPLOAD_COPY.pngJpeg}</option>
            <option value="geotiff">{UPLOAD_COPY.geotiffOption}</option>
            <option value="url" disabled>
              {UPLOAD_COPY.urlOffline}
            </option>
          </select>
        </div>

        {/* SENSOR selector */}
        <div className="flex items-center gap-1.5">
          <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
            {`${UPLOAD_COPY.sensorLabel}:`}
          </span>
          <select
            value={sensor}
            onChange={(e) => onSensorChange?.(e.target.value)}
            className="bg-[var(--well)] text-[var(--ink)] t-mono text-xs px-2 py-1 rounded border border-[var(--line)] cursor-pointer"
          >
            <option value="drone">{UPLOAD_COPY.droneOption}</option>
            <option value="planet">{UPLOAD_COPY.planetOption}</option>
            <option value="sentinel2">{UPLOAD_COPY.sentinel2Option}</option>
          </select>
        </div>

        {/* RESOLUTION Readout */}
        <div className="hidden xl:flex items-center gap-1.5 t-mono text-xs">
          <span style={{ color: 'var(--ink-3)' }}>{`${UPLOAD_COPY.resolutionLabel}:`}</span>
          <span className="font-semibold" style={{ color: 'var(--primary-cyan)' }}>
            {resolutionGsd ? `${resolutionGsd.toFixed(2)} m/px` : '0.50 m/px'}
          </span>
        </div>
      </div>

      {/* Right controls: View mode toggle + Sample Scene + Analyse */}
      <div className="flex items-center gap-2">
        {hasImage && onViewModeChange && (
          <div
            className="flex items-center rounded p-0.5"
            style={{
              background: 'var(--well)',
              border: '1px solid var(--line)',
            }}
          >
            {modes.map((m) => {
              const active = viewMode === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onViewModeChange(m.key)}
                  className="t-tag px-2 py-1 rounded cursor-pointer transition-colors"
                  style={{
                    fontSize: 9,
                    fontWeight: active ? 700 : 500,
                    background: active ? 'var(--cyan-wash)' : 'transparent',
                    color: active ? 'var(--primary-cyan)' : 'var(--ink-3)',
                    border: active
                      ? '1px solid rgba(63, 169, 245, 0.4)'
                      : '1px solid transparent',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        )}

        {onLoadSample && (
          <Button variant="secondary" size="sm" onClick={onLoadSample} disabled={isAnalysing}>
            {INSIGHT_COPY.loadSampleBtn}
          </Button>
        )}

        <Button
          id="upload-analyse-primary"
          variant="primary"
          size="md"
          loading={isAnalysing}
          disabled={!canAnalyse}
          reason={!canAnalyse ? 'no-selection' : undefined}
          onClick={onAnalyse}
        >
          {UPLOAD_COPY.analyse}
        </Button>
      </div>
    </div>
  );
};
