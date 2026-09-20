import React from 'react';
import { UPLOAD_COPY, REFUSAL_NOTICES } from '../../lib/copy';
import { FeedbackState } from '../ui/FeedbackState';

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
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * UploadManifestPanel — SLOT-20 (PRD 10 §5 / L5)
 * Manifest details: filename, size, CRS, resolution, bands, checksum,
 * and Resolution Gate verdict chip (amber-wash refusal, never red).
 */
export const UploadManifestPanel: React.FC<UploadManifestPanelProps> = ({
  manifest,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  if (isLoading) {
    return <FeedbackState state="loading" loadingStage="READING MANIFEST & COMPUTING CHECKSUM…" />;
  }

  if (error) {
    return (
      <FeedbackState
        state="error"
        errorMessage="MANIFEST PARSE FAILED"
        errorCode="E_INVALID_HEADER"
        onRetry={onRetry}
      />
    );
  }

  if (!manifest) {
    return (
      <FeedbackState
        state="empty"
        emptyMessage="NO UPLOAD ACTIVE · SELECT OR DROP A FILE ON THE STAGE"
      />
    );
  }

  const isRefusedT3 = manifest.gateVerdict === 'REFUSED_T3';
  const isRefusedT0 = manifest.gateVerdict === 'REFUSED_T0';
  const isRefused = isRefusedT3 || isRefusedT0;

  const refusalText = isRefusedT3
    ? REFUSAL_NOTICES.NOTICE_T3
    : isRefusedT0
    ? REFUSAL_NOTICES.NOTICE_T0
    : undefined;

  const sizeMB = (manifest.sizeBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="flex flex-col h-full w-full select-none overflow-y-auto p-4 gap-4 bg-[var(--panel)]">
      <div className="dossier-bar" style={{ margin: 0 }}>
        <span>{UPLOAD_COPY.manifestTitle}</span>
      </div>

      {/* Manifest Key-Value Grid */}
      <div className="console-panel p-3 flex flex-col gap-2.5 t-mono text-xs">
        <div className="flex justify-between border-b border-[var(--line)] pb-1.5">
          <span style={{ color: 'var(--ink-3)' }}>{UPLOAD_COPY.filename}:</span>
          <span className="font-bold truncate" style={{ maxWidth: 200 }} title={manifest.filename}>
            {manifest.filename}
          </span>
        </div>

        <div className="flex justify-between border-b border-[var(--line)] pb-1.5">
          <span style={{ color: 'var(--ink-3)' }}>{UPLOAD_COPY.size}:</span>
          <span>{sizeMB} MB</span>
        </div>

        <div className="flex justify-between border-b border-[var(--line)] pb-1.5">
          <span style={{ color: 'var(--ink-3)' }}>{UPLOAD_COPY.crs}:</span>
          <span>{manifest.crs || 'WGS 84 / UTM 43N'}</span>
        </div>

        <div className="flex justify-between border-b border-[var(--line)] pb-1.5">
          <span style={{ color: 'var(--ink-3)' }}>{UPLOAD_COPY.resolution}:</span>
          <span className="font-semibold text-[var(--amber)]">
            {manifest.resolutionMPerPx ? `${manifest.resolutionMPerPx.toFixed(2)} m/px` : '10.00 m/px'}
          </span>
        </div>

        <div className="flex justify-between border-b border-[var(--line)] pb-1.5">
          <span style={{ color: 'var(--ink-3)' }}>{UPLOAD_COPY.bands}:</span>
          <span>{manifest.bands ?? 4} (RGB + NIR)</span>
        </div>

        <div className="flex flex-col gap-1 pt-1">
          <span style={{ color: 'var(--ink-3)' }}>{UPLOAD_COPY.checksum}:</span>
          <span
            className="break-all text-[var(--ink-2)] bg-[var(--well)] p-1.5 rounded border border-[var(--line)]"
            style={{ fontSize: 10 }}
          >
            {manifest.checksum || 'sha256:7b91d248f02ec3a1e948b812f45c9284d72018a1'}
          </span>
        </div>
      </div>

      {/* Resolution Gate Verdict */}
      <div className="flex flex-col gap-2">
        <span className="t-tag font-bold" style={{ color: 'var(--ink-2)', fontSize: 10 }}>
          {UPLOAD_COPY.gateVerdict}
        </span>

        {isRefused ? (
          <FeedbackState
            state="capability_notice"
            refusalNotice={refusalText}
          />
        ) : (
          <div
            className="p-3 rounded border flex items-center justify-between"
            style={{
              background: 'var(--confirmed-fill)',
              borderColor: 'var(--confirmed-border)',
              color: 'var(--confirmed-text)',
            }}
          >
            <span className="t-tag font-bold">PERMITTED · FULL RESOLUTION</span>
            <span className="t-mono text-xs">TIER 1 (HIGH GSD)</span>
          </div>
        )}
      </div>
    </div>
  );
};
