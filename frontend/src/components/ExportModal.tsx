import React, { useState, useEffect } from 'react';
import { X, Download, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';
import { EXPORT_COPY } from '../lib/copy';
import { track } from '../lib/track';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  targetId?: string;
}

export interface ExportOptions {
  format: 'json' | 'pdf' | 'csv';
  includeGeometry: boolean;
  includeMeasurements: boolean;
  includeProvenance: boolean;
  includeTrace: boolean;
}

/**
 * ExportModal (PRD 10 §5 / L5 & PRD 11 §7 / K9)
 * Centred dialog at --z-modal (720px width, max 80vh):
 * - Header: EXPORT REPORT
 * - Body: format radios (JSON / PDF / CSV) + content checkboxes + provenance preview
 * - Footer: CANCEL ghost left / EXPORT primary right
 */
export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  targetId,
}) => {
  const [format, setFormat] = useState<'json' | 'pdf' | 'csv'>('json');
  const [includeGeometry, setIncludeGeometry] = useState(true);
  const [includeMeasurements, setIncludeMeasurements] = useState(true);
  const [includeProvenance, setIncludeProvenance] = useState(true);
  const [includeTrace, setIncludeTrace] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExportClick = () => {
    const t0 = performance.now();
    track('op.start', { op: 'export', format });
    track('export.complete', {
      format,
      entities: targetId ? 1 : 0,
      with_provenance: includeProvenance,
    });
    onExport({
      format,
      includeGeometry,
      includeMeasurements,
      includeProvenance,
      includeTrace,
    });
    const dur = Math.round(performance.now() - t0);
    track('op.result', { op: 'export', format }, { ok: true, duration_ms: dur });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 flex items-center justify-center p-6 select-none animate-dossier-in"
      style={{
        background: 'rgba(6, 8, 10, 0.72)',
        zIndex: 'var(--z-modal)',
      }}
    >
      <div
        className="w-full flex flex-col rounded shadow-2xl border border-[var(--line-strong)] overflow-hidden"
        style={{ maxWidth: 720, maxHeight: '80vh', background: 'var(--panel)' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--line)] bg-[var(--bg)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[var(--amber)]" />
            <h2 id="export-modal-title" className="t-h1 font-bold text-sm tracking-wider" style={{ color: 'var(--ink)' }}>
              {EXPORT_COPY.title}
            </h2>
          </div>
          <Button variant="icon-ghost" size="sm" onClick={onClose} title="Close (Esc)">
            <X className="w-4 h-4 text-[var(--ink-3)]" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* 1. Format Radios */}
          <div className="space-y-2">
            <span className="t-tag font-bold text-xs" style={{ color: 'var(--ink-2)' }}>
              {EXPORT_COPY.formatLabel}
            </span>
            <div className="grid grid-cols-3 gap-3">
              {(['json', 'pdf', 'csv'] as const).map((fmt) => (
                <label
                  key={fmt}
                  className="flex items-center gap-2.5 p-3 rounded border cursor-pointer transition-colors"
                  style={{
                    background: format === fmt ? 'var(--amber-wash)' : 'var(--well)',
                    borderColor: format === fmt ? 'var(--amber)' : 'var(--line)',
                  }}
                >
                  <input
                    type="radio"
                    name="export-format"
                    value={fmt}
                    checked={format === fmt}
                    onChange={() => setFormat(fmt)}
                    className="accent-[var(--amber)]"
                  />
                  <span className="t-mono text-xs font-bold uppercase" style={{ color: 'var(--ink)' }}>
                    {fmt.toUpperCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Contents Checkboxes */}
          <div className="space-y-2">
            <span className="t-tag font-bold text-xs" style={{ color: 'var(--ink-2)' }}>
              {EXPORT_COPY.contentsLabel}
            </span>
            <div className="grid grid-cols-2 gap-3 t-body text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded bg-[var(--well)] border border-[var(--line)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeGeometry}
                  onChange={(e) => setIncludeGeometry(e.target.checked)}
                  className="accent-[var(--amber)]"
                />
                <span>{EXPORT_COPY.includeGeometry}</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded bg-[var(--well)] border border-[var(--line)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMeasurements}
                  onChange={(e) => setIncludeMeasurements(e.target.checked)}
                  className="accent-[var(--amber)]"
                />
                <span>{EXPORT_COPY.includeMeasurements}</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded bg-[var(--well)] border border-[var(--line)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeProvenance}
                  onChange={(e) => setIncludeProvenance(e.target.checked)}
                  className="accent-[var(--amber)]"
                />
                <span>{EXPORT_COPY.includeProvenance}</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded bg-[var(--well)] border border-[var(--line)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTrace}
                  onChange={(e) => setIncludeTrace(e.target.checked)}
                  className="accent-[var(--amber)]"
                />
                <span>{EXPORT_COPY.includeTrace}</span>
              </label>
            </div>
          </div>

          {/* 3. Provenance Preview */}
          <div className="space-y-2">
            <span className="t-tag font-bold text-xs" style={{ color: 'var(--ink-2)' }}>
              {EXPORT_COPY.provenancePreview}
            </span>
            <div className="console-panel p-3 t-mono text-xs space-y-1 text-[var(--ink-3)]">
              <div className="flex items-center gap-2 text-teal-400 font-bold" style={{ fontSize: 11 }}>
                <ShieldCheck className="w-4 h-4" />
                <span>{EXPORT_COPY.integrityAttested}</span>
              </div>
              <div>Target: {targetId || 'ALL AOI CHANGE OBJECTS'}</div>
              <div>Timestamp: {new Date().toISOString()}</div>
              <div>{EXPORT_COPY.auditorInfo}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--line)] bg-[var(--bg)] flex items-center justify-between shrink-0">
          <Button variant="ghost" size="md" onClick={onClose}>
            {EXPORT_COPY.cancel}
          </Button>

          <Button variant="primary" size="md" onClick={handleExportClick}>
            <Download className="w-4 h-4 mr-1.5" />
            {EXPORT_COPY.export}
          </Button>
        </div>
      </div>
    </div>
  );
};
