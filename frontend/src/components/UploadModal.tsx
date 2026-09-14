import React, { useRef, useState } from 'react';
import { X, UploadCloud, ShieldAlert, Layers, FileUp } from 'lucide-react';
import type { DetectionSet } from '../lib/types';
import { COPY } from '../lib/copy';
import { getClassColor } from '../lib/palette';
import uploadGeoreferencedFixture from '../fixtures/upload_georeferenced.json';

interface UploadModalProps {
  detectionSet?: DetectionSet | null;
  onClose: () => void;
  onLoadSample: (type: 'georeferenced' | 'visual_only' | 'unknown_gsd') => void;
}

/**
 * UploadModal — Satellite Image Inspector with Console Treatment
 */
export const UploadModal: React.FC<UploadModalProps> = ({
  detectionSet,
  onClose,
  onLoadSample,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customFile, setCustomFile] = useState<string | null>(null);

  const currentSet = detectionSet || (uploadGeoreferencedFixture as unknown as DetectionSet);
  const { upload, coverage, rejections } = currentSet;
  const uploadId = upload.id || '';
  const isVisualOnly = uploadId.includes('visual_only');
  const isUnknownGsd = uploadId.includes('unknown_gsd');
  const isJewar = !isVisualOnly && !isUnknownGsd;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomFile(file.name);
      onLoadSample('georeferenced');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 select-none animate-fadeIn">
      <div
        className="bg-[var(--panel)] border border-[var(--line-strong)] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-[var(--ink)] corner-ticks"
        style={{ borderRadius: 'var(--r-sm)' }}
      >
        {/* Header */}
        <div
          className="p-4 bg-[var(--panel2)] border-b border-[var(--line)] flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="dossier-bar inline-block" />
            <div
              className="p-1.5 border border-[rgba(240,180,95,0.3)] bg-[var(--amber-wash)] text-[var(--amber)]"
              style={{ borderRadius: 'var(--r-sm)' }}
            >
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-[var(--ink)]">
                Satellite Photo Inspector
              </h2>
              <p className="text-[11px] text-[var(--ink3)] font-mono">
                Inspect land cover and detect building complexes in uploaded satellite images.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-xs font-mono font-medium flex items-center gap-1.5 bg-[var(--well)] hover:bg-[var(--line)] text-[var(--amber)] border border-[var(--amber)]/40 transition-colors"
              style={{ borderRadius: 'var(--r-sm)' }}
              title="Upload custom GeoTIFF or satellite image"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>UPLOAD FILE</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tif,.tiff,.png,.jpg,.jpeg,.geojson"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--ink3)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
              style={{ borderRadius: 'var(--r-sm)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sample Switcher Buttons */}
        <div
          className="p-2.5 bg-[var(--well)] border-b border-[var(--line)] flex items-center gap-2 text-xs font-mono flex-wrap"
        >
          <span className="text-[var(--ink3)] text-[10px] uppercase tracking-wider">Feeds:</span>
          <button
            onClick={() => { setCustomFile(null); onLoadSample('georeferenced'); }}
            className={`px-2.5 py-1 text-xs font-mono transition-colors ${
              isJewar && !customFile
                ? 'bg-[var(--amber)] text-black font-semibold'
                : 'bg-[var(--panel2)] hover:bg-[var(--line)] text-[var(--ink2)] hover:text-[var(--ink)] border border-[var(--line)]'
            }`}
            style={{ borderRadius: 'var(--r-sm)' }}
          >
            Jewar Airport (10m GSD)
          </button>
          <button
            onClick={() => { setCustomFile(null); onLoadSample('visual_only'); }}
            className={`px-2.5 py-1 text-xs font-mono transition-colors ${
              isVisualOnly
                ? 'bg-[var(--amber)] text-black font-semibold'
                : 'bg-[var(--panel2)] hover:bg-[var(--line)] text-[var(--ink2)] hover:text-[var(--ink)] border border-[var(--line)]'
            }`}
            style={{ borderRadius: 'var(--r-sm)' }}
          >
            Photo Without GPS Data
          </button>
          <button
            onClick={() => { setCustomFile(null); onLoadSample('unknown_gsd'); }}
            className={`px-2.5 py-1 text-xs font-mono transition-colors ${
              isUnknownGsd
                ? 'bg-[var(--amber)] text-black font-semibold'
                : 'bg-[var(--panel2)] hover:bg-[var(--line)] text-[var(--ink2)] hover:text-[var(--ink)] border border-[var(--line)]'
            }`}
            style={{ borderRadius: 'var(--r-sm)' }}
          >
            Unknown Image Scale
          </button>
          {customFile && (
            <span className="px-2 py-0.5 bg-[var(--teal)]/20 border border-[var(--teal)] text-[var(--teal)] text-[11px]">
              CUSTOM: {customFile}
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {/* Metadata Card */}
          <div
            className="bg-[var(--well)] border border-[var(--line)] p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 corner-ticks"
            style={{ borderRadius: 'var(--r-sm)' }}
          >
            <div>
              <span className="text-[var(--ink3)] text-[10px] block uppercase">File Name</span>
              <span className="text-[var(--ink)] font-semibold truncate block">{upload.filename}</span>
            </div>
            <div>
              <span className="text-[var(--ink3)] text-[10px] block uppercase">Image Detail (GSD)</span>
              <span className="text-[var(--amber)] font-bold tabular-nums">
                {upload.gsd_m ? `${upload.gsd_m} m/pixel` : 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-[var(--ink3)] text-[10px] block uppercase">Capability Level</span>
              <span className="text-[var(--teal)] font-bold">{upload.capability_tier}</span>
            </div>
            <div>
              <span className="text-[var(--ink3)] text-[10px] block uppercase">GPS Coordinate Zone</span>
              <span className="text-[var(--ink2)] tabular-nums">{upload.crs_epsg ? `EPSG:${upload.crs_epsg}` : 'No GPS'}</span>
            </div>
          </div>

          {/* Resolution Gate Notice / Refusal */}
          <div
            className="bg-[var(--amber-wash)] border border-[rgba(240,180,95,0.3)] p-3.5 space-y-1.5 font-sans"
            style={{ borderRadius: 'var(--r-sm)' }}
          >
            <div className="flex items-center gap-2 text-[var(--amber)] font-bold text-xs font-mono">
              <ShieldAlert className="w-4 h-4 text-[var(--amber)]" />
              <span>{COPY.refusalInsufficientResolution}</span>
            </div>
            <p className="text-xs text-[var(--ink2)] leading-relaxed">
              {upload.capability_notice || COPY.refusal10mVehicles}
            </p>
          </div>

          {/* Land-cover Coverage Summary Bar */}
          {coverage && (
            <div
              className="bg-[var(--panel2)] border border-[var(--line)] p-3.5 space-y-2 corner-ticks"
              style={{ borderRadius: 'var(--r-sm)' }}
            >
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--ink)] font-semibold flex items-center gap-1.5 font-mono">
                  <span className="dossier-bar inline-block" />
                  <Layers className="w-3.5 h-3.5 text-[var(--amber)]" />
                  LAND-COVER PERCENTAGE BREAKDOWN
                </span>
                <span className="text-[var(--ink3)] text-[10px] font-mono">
                  TOTAL: 100% COMPUTED
                </span>
              </div>

              {/* Progress Bar Stack */}
              <div
                className="w-full h-3 bg-[var(--well)] overflow-hidden flex border border-[var(--line)]"
                style={{ borderRadius: 'var(--r-sm)' }}
              >
                {coverage.by_class.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      width: `${item.pct}%`,
                      backgroundColor: getClassColor(item.label),
                    }}
                    title={`${item.label}: ${item.pct.toFixed(1)}%`}
                  />
                ))}
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
                {coverage.by_class.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-[var(--ink2)]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: getClassColor(item.label) }}
                      />
                      <span className="capitalize">{item.label}</span>
                    </span>
                    <span className="font-semibold tabular-nums text-[var(--ink)]">
                      {item.pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejections Log */}
          {rejections && rejections.count > 0 && (
            <div
              className="bg-[var(--panel2)] border border-[rgba(229,72,77,0.3)] p-3 space-y-1.5"
              style={{ borderRadius: 'var(--r-sm)' }}
            >
              <div className="flex justify-between text-xs text-[var(--color-rejected-text)] font-semibold font-mono">
                <span className="uppercase tracking-wider">Objects Excluded from Counting</span>
                <span className="tabular-nums">{rejections.count} items filtered</span>
              </div>
              <div className="space-y-1 text-[11px] text-[var(--ink3)] font-sans">
                {rejections.detail.map((rej, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-[var(--well)] p-2 border border-[var(--line)]"
                    style={{ borderRadius: 'var(--r-sm)' }}
                  >
                    <span className="text-[var(--color-rejected-text)] font-bold uppercase font-mono">{rej.label_raw}:</span>
                    <span className="text-[var(--ink2)]">{rej.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-3 bg-[var(--panel2)] border-t border-[var(--line)] flex items-center justify-between text-xs"
        >
          <span className="text-[var(--ink3)] font-mono text-[10px]">
            SECURITY CHECKSUM: {upload.checksum_sha256.substring(0, 24)}...
          </span>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ borderRadius: 'var(--r-sm)', padding: '6px 16px' }}
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
