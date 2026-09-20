import React, { useState, useRef } from 'react';
import { Aperture, UploadCloud } from 'lucide-react';
import { Button } from '../ui/Button';
import { UPLOAD_COPY } from '../../lib/copy';

interface UploadDropzoneProps {
  onFileSelected?: (file: File) => void;
  previewUrl?: string | null;
  onClear?: () => void;
}

/**
 * UploadDropzone — SLOT-10 (PRD 10 §5 / L5)
 * Centred dropzone in the empty imagery well:
 * - Dashed --line-strong frame
 * - Aperture icon
 * - DROP A GeoTIFF OR PNG · ≤ 40 MB
 * - BROWSE FILES secondary button
 * - Drag-over: frame -> amber, wash 6%, single scan sweep (NO SPINNERS)
 */
export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileSelected,
  previewUrl,
  onClear,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file) onFileSelected?.(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file) onFileSelected?.(file);
    }
  };

  if (previewUrl) {
    return (
      <div className="relative w-full h-full flex items-center justify-center p-4 bg-[var(--well)] overflow-hidden">
        <img
          src={previewUrl}
          alt="Upload preview"
          className="max-w-full max-h-full object-contain rounded border border-[var(--line-strong)]"
        />
        {onClear && (
          <div className="absolute top-4 right-4">
            <Button variant="secondary" size="sm" onClick={onClear}>
              CHANGE FILE
            </Button>
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
      style={{
        background: isDragOver ? 'rgba(240, 180, 95, 0.06)' : 'var(--well)',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".tif,.tiff,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* M2 Single Scan Sweep on drag-over */}
      {isDragOver && (
        <div
          className="absolute inset-x-0 h-0.5 bg-[var(--amber)] pointer-events-none"
          style={{ animation: 'scan-sweep 900ms linear infinite', boxShadow: '0 0 12px var(--amber)' }}
        />
      )}

      <div
        className="w-full max-w-xl h-96 flex flex-col items-center justify-center p-8 text-center rounded border-2 border-dashed transition-colors"
        style={{
          borderColor: isDragOver ? 'var(--amber)' : 'var(--line-strong)',
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{
            background: isDragOver ? 'var(--amber-wash)' : 'var(--panel)',
            border: `1px solid ${isDragOver ? 'var(--amber)' : 'var(--line)'}`,
          }}
        >
          {isDragOver ? (
            <UploadCloud className="w-8 h-8 text-[var(--amber)]" />
          ) : (
            <Aperture className="w-8 h-8 text-[var(--ink-2)]" />
          )}
        </div>

        <h3
          className="t-h2 font-bold mb-2 tracking-wider"
          style={{ color: isDragOver ? 'var(--amber)' : 'var(--ink)' }}
        >
          {UPLOAD_COPY.dropTitle}
        </h3>

        <p className="t-body text-xs mb-6 max-w-sm" style={{ color: 'var(--ink-3)' }}>
          GeoTIFF (.tif) with embedded geospatial tags or aerial high-resolution images (.png, .jpg).
        </p>

        <Button
          variant="secondary"
          size="md"
          onClick={() => fileInputRef.current?.click()}
        >
          {UPLOAD_COPY.browseFiles}
        </Button>
      </div>
    </div>
  );
};
