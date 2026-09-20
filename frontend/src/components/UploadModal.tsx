import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  ShieldAlert,
  Layers,
  FileImage,
  AlertTriangle,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import type { DetectionSet } from '../lib/types';
import { uploadImageFile, getDetections } from '../lib/api';
import { UploadTelemetryTab } from './UploadTelemetryTab';
import { UploadRejectionsTab } from './UploadRejectionsTab';
import { UploadCanvasTab } from './UploadCanvasTab';
import { UploadStart } from './UploadStart';

interface UploadModalProps {
  detectionSet: DetectionSet | null;
  onClose: () => void;
  onDetectionSetUpdate?: (newSet: DetectionSet) => void;
  onLoadSample?: (type: 'georeferenced' | 'visual_only' | 'unknown_gsd') => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  detectionSet,
  onClose,
  onDetectionSetUpdate,
  onLoadSample: _onLoadSample,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customGsd, setCustomGsd] = useState<string>('0.5');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'telemetry' | 'rejections'>('visual');
  const [showAnnotated, setShowAnnotated] = useState<boolean>(true);
  const [imageLoadFailed, setImageLoadFailed] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [detectionSet?.upload.id, showAnnotated]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError(null);
    }
  };

  const handleRunAiAnalysis = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const gsdVal = customGsd ? parseFloat(customGsd) : undefined;
      const uploadRes = await uploadImageFile(selectedFile, selectedFile.name, gsdVal);

      if (uploadRes.kind !== 'ok') {
        const errMsg = 'message' in uploadRes ? uploadRes.message : 'Upload failed';
        setUploadError(errMsg);
        setIsUploading(false);
        return;
      }

      // Fetch dynamically computed detections
      const detRes = await getDetections(uploadRes.data.id, false);
      if (detRes.kind === 'ok') {
        if (onDetectionSetUpdate) {
          onDetectionSetUpdate(detRes.data);
        }
      } else if (detRes.kind === 'error') {
        setUploadError(`${detRes.code}: ${detRes.message}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  if (!detectionSet) return <UploadStart onClose={onClose} onComplete={value => onDetectionSetUpdate?.(value)} />;
  const { upload, coverage, rejections, counts } = detectionSet;
  const objectDetections = detectionSet.detections.filter((d) => d.kind === 'box');
  const rawOverviewUrl = upload.overview_url || `/api/v1/uploads/${upload.id}/overview`;
  const dsRecord = detectionSet as unknown as { stats?: { total_objects?: number; total_area_m2?: number }; annotated_url?: string; explanation?: string };
  const cacheKey = dsRecord.stats ? `${dsRecord.stats.total_objects}_${dsRecord.stats.total_area_m2}` : upload.checksum_sha256 || 'v1';
  const annotatedImageUrl = `${dsRecord.annotated_url || `/api/v1/uploads/${upload.id}/annotated`}?v=${encodeURIComponent(cacheKey)}`;
  const explanationText = dsRecord.explanation;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none font-mono">
      <div className="bg-[#0E131F] border border-[#2A3447] rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200 tactical-corners">
        {/* Top Tactical Header */}
        <div className="px-4 py-3 bg-[#0B0D10] border-b border-[#1E2638] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-[#F2B84B]/15 text-[#F2B84B] border border-[#F2B84B]/30">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  CHAKSHU AI/ML SATELLITE INSPECTOR
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#24C6C8]/15 text-[#24C6C8] border border-[#24C6C8]/40">
                  DYNAMIC ENGINE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                Resolution-Gated Multi-Track Detection, Spectral Land-Cover & Reasoning
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live File Upload Banner */}
        <div className="px-3.5 py-2 bg-[#070A10] border-b border-[#1E2638] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              id="upload-file-input"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".tif,.tiff,.png,.jpg,.jpeg"
              className="hidden"
            />
            <button
              id="choose-image-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 rounded bg-[#161D2B] hover:bg-[#1C2436] text-slate-200 border border-[#2A3447] hover:border-[#F2B84B]/50 flex items-center gap-1.5 text-xs transition-all font-mono"
            >
              <FileImage className="w-3.5 h-3.5 text-[#24C6C8]" />
              <span className="truncate max-w-[220px]">
                {selectedFile ? selectedFile.name : 'Choose Image (GeoTIFF / PNG / JPG)'}
              </span>
            </button>

            <div className="flex items-center gap-1 bg-[#111827] border border-[#2A3447] px-2 py-1 rounded text-[11px] font-mono">
              <span className="text-slate-400">GSD:</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                value={customGsd}
                onChange={(e) => setCustomGsd(e.target.value)}
                placeholder="0.5"
                className="w-12 bg-transparent text-[#F2B84B] font-bold focus:outline-none text-right"
              />
              <span className="text-slate-500">m/px</span>
            </div>

            <button
              id="run-pipeline-btn"
              onClick={handleRunAiAnalysis}
              disabled={!selectedFile || isUploading}
              className="px-3.5 py-1.5 rounded bg-[#F2B84B] hover:bg-[#f5c76d] disabled:opacity-40 text-black font-extrabold uppercase tracking-wider text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(242,184,75,0.35)] transition-all active:translate-y-0.5"
            >
              {isUploading ? (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ANALYSING IMAGE...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>RUN DETECTION PIPELINE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="px-4 py-2 bg-rose-950/40 border-b border-rose-800/60 flex items-center gap-2 text-xs text-rose-300 font-mono">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Tactical Tabs */}
        <div className="flex border-b border-[#1E2638] bg-[#090D13] text-xs font-mono">
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-4 py-2 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'visual'
                ? 'border-[#F2B84B] text-[#F2B84B] bg-[#F2B84B]/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>DETECTION CANVAS ({objectDetections.length} OBJECTS)</span>
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-4 py-2 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'telemetry'
                ? 'border-[#F2B84B] text-[#F2B84B] bg-[#F2B84B]/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>LAND-COVER BREAKDOWN</span>
          </button>
          <button
            onClick={() => setActiveTab('rejections')}
            className={`px-4 py-2 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'rejections'
                ? 'border-[#F2B84B] text-[#F2B84B] bg-[#F2B84B]/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#F2B84B]" />
            <span>RESOLUTION GATE ({rejections?.count ?? 0})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs bg-[#070A10]">
          {/* Metadata Strip */}
          <div className="bg-[#0B0D10] border border-[#1E2638] p-3 rounded grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-slate-500 text-[10px] block uppercase tracking-wider">FILE NAME</span>
              <span className="text-white font-semibold truncate block" title={upload.filename}>
                {upload.filename}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase tracking-wider">RESOLUTION (GSD)</span>
              <span className="text-[#24C6C8] font-bold tabular-nums">
                {upload.gsd_m ? `${upload.gsd_m} m/pixel` : 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase tracking-wider">TIER</span>
              <span className="text-[#F2B84B] font-bold">{upload.capability_tier}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase tracking-wider">COORDINATES</span>
              <span className="text-slate-300 tabular-nums">
                {upload.bounds_4326 ? 'Georeferenced (WGS84)' : 'Visual-Only'}
              </span>
            </div>
          </div>

          {activeTab === 'visual' && (
            <UploadCanvasTab
              upload={upload}
              detectionSet={detectionSet}
              showAnnotated={showAnnotated}
              setShowAnnotated={setShowAnnotated}
              annotatedImageUrl={annotatedImageUrl}
              rawOverviewUrl={rawOverviewUrl}
              imageLoadFailed={imageLoadFailed}
              setImageLoadFailed={setImageLoadFailed}
              explanationText={explanationText}
            />
          )}

          {activeTab === 'telemetry' && (
            <UploadTelemetryTab coverage={coverage} counts={counts} stats={detectionSet.stats} />
          )}

          {activeTab === 'rejections' && (
            <UploadRejectionsTab upload={upload} rejections={rejections} />
          )}
        </div>

        {/* Tactical Footer */}
        <div className="px-4 py-2.5 bg-[#0B0D10] border-t border-[#1E2638] flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500 text-[10px]">
            SHA-256: {upload.checksum_sha256 ? `${upload.checksum_sha256.substring(0, 24)}...` : 'N/A'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#161D2B] hover:bg-[#F2B84B]/20 hover:text-[#F2B84B] hover:border-[#F2B84B]/50 text-slate-200 border border-[#2A3447] font-bold uppercase tracking-wider text-xs transition-all"
          >
            CLOSE INSPECTOR
          </button>
        </div>
      </div>
    </div>
  );
};
