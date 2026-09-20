import React from 'react';
import { Button } from '../ui/Button';
import { UPLOAD_COPY } from '../../lib/copy';

interface UploadBarProps {
  source?: string;
  onSourceChange?: (src: string) => void;
  sensor?: string;
  onSensorChange?: (sensor: string) => void;
  resolutionGsd?: number | null;
  onAnalyse?: () => void;
  isAnalysing?: boolean;
  canAnalyse?: boolean;
}

/**
 * UploadBar — SLOT-02 (PRD 10 §5 / L5)
 * SOURCE ▾ (FILE / GEOTIFF / URL-disabled-offline) · SENSOR ▾ · RESOLUTION readout · ANALYSE primary
 */
export const UploadBar: React.FC<UploadBarProps> = ({
  source = 'geotiff',
  onSourceChange,
  sensor = 'sentinel2',
  onSensorChange,
  resolutionGsd = 10.0,
  onAnalyse,
  isAnalysing = false,
  canAnalyse = true,
}) => {
  return (
    <div
      className="flex items-center justify-between px-3 w-full h-full select-none"
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-4">
        {/* SOURCE selector */}
        <div className="flex items-center gap-1.5">
          <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
            {UPLOAD_COPY.sourceLabel}:
          </span>
          <select
            value={source}
            onChange={(e) => onSourceChange?.(e.target.value)}
            className="bg-[var(--well)] text-[var(--ink)] t-mono text-xs px-2 py-1 rounded border border-[var(--line)] cursor-pointer"
          >
            <option value="geotiff">{UPLOAD_COPY.geotiffOption}</option>
            <option value="file">{UPLOAD_COPY.pngJpeg}</option>
            <option value="url" disabled>{UPLOAD_COPY.urlOffline}</option>
          </select>
        </div>

        {/* SENSOR selector */}
        <div className="flex items-center gap-1.5">
          <span className="t-tag" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
            {UPLOAD_COPY.sensorLabel}:
          </span>
          <select
            value={sensor}
            onChange={(e) => onSensorChange?.(e.target.value)}
            className="bg-[var(--well)] text-[var(--ink)] t-mono text-xs px-2 py-1 rounded border border-[var(--line)] cursor-pointer"
          >
            <option value="sentinel2">{UPLOAD_COPY.sentinel2Option}</option>
            <option value="planet">{UPLOAD_COPY.planetOption}</option>
            <option value="drone">{UPLOAD_COPY.droneOption}</option>
          </select>
        </div>

        {/* RESOLUTION Readout */}
        <div className="flex items-center gap-1.5 t-mono text-xs">
          <span style={{ color: 'var(--ink-3)' }}>{UPLOAD_COPY.resolutionLabel}:</span>
          <span className="font-semibold" style={{ color: 'var(--amber)' }}>
            {resolutionGsd ? `${resolutionGsd.toFixed(2)} m/px` : 'UNKNOWN GSD'}
          </span>
        </div>
      </div>

      {/* ANALYSE primary right */}
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
  );
};
