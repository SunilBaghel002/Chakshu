import React from 'react';
import { Eye, FileImage, FileText } from 'lucide-react';
import type { DetectionSet, Upload } from '../lib/types';
import { formatClassLabel } from '../lib/palette';

interface UploadCanvasTabProps {
  upload: Upload;
  detectionSet: DetectionSet;
  showAnnotated: boolean;
  setShowAnnotated: (v: boolean) => void;
  annotatedImageUrl: string;
  rawOverviewUrl: string;
  imageLoadFailed: boolean;
  setImageLoadFailed: (v: boolean) => void;
  explanationText?: string;
}

export const UploadCanvasTab: React.FC<UploadCanvasTabProps> = ({
  upload,
  detectionSet,
  showAnnotated,
  setShowAnnotated,
  annotatedImageUrl,
  rawOverviewUrl,
  imageLoadFailed,
  setImageLoadFailed,
  explanationText,
}) => {
  const objectDetections = detectionSet.detections.filter((d) => d.kind === 'box');
  const landcoverDetections = detectionSet.detections.filter((d) => d.kind === 'polygon');

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* Image Toolbar */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">VIEW MODE:</span>
          <button
            onClick={() => setShowAnnotated(!showAnnotated)}
            className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
              showAnnotated
                ? 'bg-[#F2B84B] text-black border-[#F2B84B] shadow-[0_0_10px_rgba(242,184,75,0.4)]'
                : 'bg-[#111622] text-slate-300 border-[#2A3447] hover:border-slate-500'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showAnnotated ? 'ANNOTATED HIGHLIGHTS ON' : 'RAW SATELLITE IMAGE'}</span>
          </button>
        </div>

        {/* Evidence & Semantic Legend */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono flex-wrap">
          {[
            { label: 'Water', bg: 'bg-[#0284C7]/20 border-[#0284C7]/60 text-[#38BDF8]', dot: 'bg-[#0284C7]' },
            { label: 'Building', bg: 'bg-[#EF4444]/20 border-[#EF4444]/60 text-[#FCA5A5]', dot: 'bg-[#EF4444]' },
            { label: 'Vegetation', bg: 'bg-[#10B981]/20 border-[#10B981]/60 text-[#6EE7B7]', dot: 'bg-[#10B981]' },
            { label: 'Bare', bg: 'bg-[#D97706]/20 border-[#D97706]/60 text-[#FCD34D]', dot: 'bg-[#D97706]' },
            { label: 'Road', bg: 'bg-slate-600/20 border-slate-500/60 text-slate-300', dot: 'bg-slate-400' },
          ].map((s) => (
            <span key={s.label} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${s.bg}`}>
              <span className={`w-2 h-2 rounded-sm ${s.dot} inline-block`} /> {s.label}
            </span>
          ))}
        </div>

        <span className="text-[#24C6C8] text-[10px] font-bold tracking-wider uppercase">
          {objectDetections.length} OBJECTS · {landcoverDetections.length} VERIFIED MASKS
        </span>
      </div>

      {/* Visual Container */}
      <div className="relative border border-[#2A3447] rounded-lg overflow-hidden bg-black flex items-center justify-center min-h-[260px] max-h-[380px] shadow-inner tactical-corners">
        {imageLoadFailed ? (
          <div className="flex flex-col items-center justify-center p-8 text-slate-400 text-center select-none">
            <FileImage className="w-10 h-10 text-slate-600 mb-2 opacity-60" />
            <span className="text-xs font-medium text-slate-400">Image preview unavailable for this item</span>
            <span className="text-[10px] text-slate-500 mt-1">Upload a new image or select another sample</span>
          </div>
        ) : (
          <img
            src={showAnnotated ? annotatedImageUrl : rawOverviewUrl}
            alt={upload.filename}
            className="max-h-[380px] w-auto object-contain select-none opacity-95"
            onError={(e) => {
              const target = e.currentTarget;
              if (showAnnotated && !target.src.includes('/overview')) {
                target.src = rawOverviewUrl;
              } else {
                setImageLoadFailed(true);
              }
            }}
          />
        )}
      </div>

      {/* Grounded Evidence Provenance Strip */}
      <div className="bg-[#0B0D10] border border-[#2A3447] px-3.5 py-2 rounded-lg flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[#35D07F] font-bold">✓ Grounded Evidence: Mask IoU Validated (≥ 0.60)</span>
          <span>Geometry: Connected Components</span>
          <span>Coordinates: Image Pixels</span>
        </div>
        <div>
          Physical Area: {upload.gsd_m ? `${(detectionSet.stats?.total_area_m2 ? (detectionSet.stats.total_area_m2 / 10000).toFixed(1) : 'N/A')} ha (GSD ${upload.gsd_m}m)` : 'Unavailable (Visual-Only RGB)'}
        </div>
      </div>

      {/* Canvas Stats Strip */}
      {detectionSet.stats && (
        <div className="bg-[#0B0D10] border border-[#2A3447] px-3.5 py-2 rounded-lg flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-mono text-slate-300">
          <span className="font-bold text-[#24C6C8]">
            {detectionSet.stats.total_objects} objects
            {detectionSet.stats.total_objects > 0 && Object.keys(detectionSet.stats.objects_by_class).length > 0 && (
              <span className="text-slate-400 font-normal">
                {' '}({Object.entries(detectionSet.stats.objects_by_class).map(([cls, cnt]) => `${cls} ${cnt}`).join(', ')})
              </span>
            )}
          </span>
          {Object.entries(detectionSet.stats.landcover_area)
            .filter(([_, data]) => data.pct > 0.05)
            .sort((a, b) => b[1].pct - a[1].pct)
            .map(([cname, data]) => (
              <React.Fragment key={cname}>
                <span className="text-slate-700">|</span>
                <span>
                  <span className="capitalize text-slate-200">{formatClassLabel(cname)}</span>{' '}
                  <span className="text-[#F2B84B] font-bold">{data.pct.toFixed(1)}%</span> ={' '}
                  <span className="text-slate-400">{data.ha === null ? 'N/A' : `${data.ha.toFixed(1)} ha`}</span>
                </span>
              </React.Fragment>
            ))}
        </div>
      )}

      {/* Dynamic Explanation Paragraph Card */}
      {explanationText && (
        <div className="bg-[#0B0D10] border border-[#F2B84B]/30 rounded-lg p-3.5 space-y-1 shadow-lg tactical-corners">
          <div className="flex items-center gap-2 text-[#F2B84B] font-bold text-xs uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            <span>AI Visual Analysis & Land-Use Mix</span>
          </div>
          <p className="text-slate-200 text-xs font-sans leading-relaxed">
            {explanationText}
          </p>
        </div>
      )}
    </div>
  );
};
