import React from 'react';
import { Sparkles, Info } from 'lucide-react';
import {
  getSatelliteTileConfig,
  getYearDifference,
  MIN_TEMPORAL_GAP_YEARS,
  type ImageryMode,
} from '../lib/satelliteProviders';

interface MapImageryToolbarProps {
  imageryMode: ImageryMode;
  setImageryMode: (m: ImageryMode) => void;
  dehazeActive: boolean;
  setDehazeActive: (d: boolean) => void;
  onOpenIntel: () => void;
  isSwipeActive: boolean;
  beforeDate: string;
  afterDate: string;
}

export const MapImageryToolbar: React.FC<MapImageryToolbarProps> = ({
  imageryMode,
  setImageryMode,
  dehazeActive,
  setDehazeActive,
  onOpenIntel,
  isSwipeActive,
  beforeDate,
  afterDate,
}) => {
  const gapYears = getYearDifference(beforeDate, afterDate);
  const isGapValid = gapYears >= MIN_TEMPORAL_GAP_YEARS;

  return (
    <>
      {/* SLOT-13: Imagery Mode Switcher */}
      <div
        className="absolute top-3 right-3 z-[400] flex items-center gap-1 p-0.5"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
        }}
      >
        <button
          onClick={() => setImageryMode('hybrid_optimum')}
          className="t-tag px-2 py-1 cursor-pointer transition-colors flex items-center gap-1"
          style={{
            background: imageryMode === 'hybrid_optimum' ? 'var(--amber-wash)' : 'transparent',
            color: imageryMode === 'hybrid_optimum' ? 'var(--amber)' : 'var(--ink-3)',
            border: imageryMode === 'hybrid_optimum' ? '1px solid var(--amber)' : '1px solid transparent',
            borderRadius: 'var(--radius-sm)',
            fontSize: 9,
            fontWeight: 700,
          }}
          title="FUSED OPTIMUM (Recommended): Left/Before = High-Res Temporal 0.5m (2021 Farmland Baseline); Right/After = Google Satellite HD 0.3m (Current Operational Airport)"
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: imageryMode === 'hybrid_optimum' ? 'var(--amber)' : 'var(--ink-3)' }} />
          <span>HYBRID: TEMPORAL + GOOGLE HD</span>
          <span className="text-[8px] px-1 py-0.2 rounded font-bold uppercase tracking-wider" style={{ background: 'var(--panel-2)', color: 'var(--amber)' }}>REC</span>
        </button>
        <button
          onClick={() => setImageryMode('highres_temporal')}
          className="t-tag px-2 py-1 cursor-pointer transition-colors"
          style={{
            background: imageryMode === 'highres_temporal' ? 'var(--amber-wash)' : 'transparent',
            color: imageryMode === 'highres_temporal' ? 'var(--amber)' : 'var(--ink-3)',
            border: imageryMode === 'highres_temporal' ? '1px solid var(--amber)' : '1px solid transparent',
            borderRadius: 'var(--radius-sm)',
            fontSize: 9,
          }}
          title="Sub-meter (0.5m GSD) historical imagery on both sides from Esri Wayback (2018–2025)"
        >
          HIGH-RES TEMPORAL (0.5M)
        </button>
        <button
          onClick={() => setImageryMode('sentinel2')}
          className="t-tag px-2 py-1 cursor-pointer transition-colors"
          style={{
            background: imageryMode === 'sentinel2' ? 'var(--amber-wash)' : 'transparent',
            color: imageryMode === 'sentinel2' ? 'var(--amber)' : 'var(--ink-3)',
            border: imageryMode === 'sentinel2' ? '1px solid var(--amber)' : '1px solid transparent',
            borderRadius: 'var(--radius-sm)',
            fontSize: 9,
          }}
          title="Copernicus Sentinel-2 cloudless multispectral 10m mosaic"
        >
          SENTINEL-2 (10M)
        </button>
        <button
          onClick={() => setImageryMode('google')}
          className="t-tag px-2 py-1 cursor-pointer transition-colors"
          style={{
            background: imageryMode === 'google' ? 'var(--amber-wash)' : 'transparent',
            color: imageryMode === 'google' ? 'var(--amber)' : 'var(--ink-3)',
            border: imageryMode === 'google' ? '1px solid var(--amber)' : '1px solid transparent',
            borderRadius: 'var(--radius-sm)',
            fontSize: 9,
          }}
          title="Google Satellite ultra high-resolution basemap on both sides"
        >
          GOOGLE HD
        </button>
        <button
          onClick={() => setDehazeActive(!dehazeActive)}
          className="t-tag px-2 py-1 cursor-pointer transition-colors flex items-center gap-1"
          style={{
            background: dehazeActive ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
            color: dehazeActive ? 'var(--teal)' : 'var(--ink-3)',
            border: dehazeActive ? '1px solid var(--teal)' : '1px solid transparent',
            borderRadius: 'var(--radius-sm)',
            fontSize: 9,
          }}
          title="Toggle atmospheric cloud mitigation & contrast de-haze filter on Google satellite"
        >
          <Sparkles className="w-3 h-3" />
          <span>DE-HAZE: {dehazeActive ? 'ON' : 'OFF'}</span>
        </button>
        <button
          onClick={onOpenIntel}
          className="t-tag px-2 py-1 cursor-pointer transition-colors flex items-center gap-1"
          style={{
            background: 'transparent',
            color: 'var(--amber)',
            border: '1px solid var(--amber)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 9,
          }}
          title="View exact satellite sensors, capture timestamps, models, and API pipeline details"
        >
          <Info className="w-3 h-3" />
          <span>INTEL</span>
        </button>
      </div>

      {/* Floating Date Watermarks */}
      {isSwipeActive && (
        <>
          <div
            className="absolute bottom-3 left-3 z-[350] pointer-events-none t-tag flex items-center gap-1.5 px-2.5 py-1"
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--amber)',
              color: 'var(--amber)',
              borderRadius: 'var(--radius)',
              fontSize: 9,
            }}
          >
            <span
              className="animate-dot-pulse"
              style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }}
            />
            <span>DATE A: {beforeDate} ({getSatelliteTileConfig(beforeDate, imageryMode, false).sensor})</span>
          </div>

          {/* Center Delta Pill */}
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[350] pointer-events-none t-tag flex items-center gap-1.5 px-2.5 py-1"
            style={{
              background: 'var(--panel)',
              border: isGapValid ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(239, 68, 68, 0.5)',
              color: isGapValid ? '#4ade80' : '#f87171',
              borderRadius: 'var(--radius)',
              fontSize: 9,
            }}
          >
            <span>Δ {gapYears.toFixed(1)} YRS ({isGapValid ? '≥ 2.0Y BASELINE OK' : 'MIN 2Y GAP REQ'})</span>
          </div>

          <div
            className="absolute bottom-3 right-3 z-[350] pointer-events-none t-tag flex items-center gap-1.5 px-2.5 py-1"
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--teal)',
              color: 'var(--teal)',
              borderRadius: 'var(--radius)',
              fontSize: 9,
            }}
          >
            <span>DATE B: {afterDate} ({getSatelliteTileConfig(afterDate, imageryMode, true).sensor})</span>
            {dehazeActive && (
              <span
                className="px-1 py-0.2 rounded text-[8px] font-bold"
                style={{ background: 'rgba(20, 184, 166, 0.2)', color: 'var(--teal)' }}
              >
                DE-HAZED
              </span>
            )}
            <span
              className="animate-dot-pulse"
              style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }}
            />
          </div>
        </>
      )}
    </>
  );
};
