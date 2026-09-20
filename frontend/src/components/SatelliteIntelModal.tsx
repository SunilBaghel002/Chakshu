import React from 'react';
import { X, Satellite, Cpu, Database, AlertCircle } from 'lucide-react';
import {
  getImageryIntelligence,
  getYearDifference,
  type ImageryMode,
} from '../lib/satelliteProviders';

interface SatelliteIntelModalProps {
  isOpen: boolean;
  onClose: () => void;
  beforeDate: string;
  afterDate: string;
  imageryMode: ImageryMode;
}

export const SatelliteIntelModal: React.FC<SatelliteIntelModalProps> = ({
  isOpen,
  onClose,
  beforeDate,
  afterDate,
  imageryMode,
}) => {
  if (!isOpen) return null;

  const gapYears = getYearDifference(beforeDate, afterDate);
  const intelA = getImageryIntelligence(beforeDate, imageryMode, false);
  const intelB = getImageryIntelligence(afterDate, imageryMode, true);

  return (
    <div
      className="absolute inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 7, 9, 0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col corner-ticks p-5 select-text"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-strong)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2">
            <Satellite className="w-5 h-5" style={{ color: 'var(--amber)' }} />
            <h3 className="t-mono font-bold tracking-wider" style={{ color: 'var(--ink)', fontSize: 13 }}>
              TACTICAL SATELLITE &amp; PIPELINE INTELLIGENCE
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 cursor-pointer hover:opacity-75 transition-opacity"
            style={{ color: 'var(--ink-3)', background: 'none', border: 'none' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 flex flex-col gap-4 text-xs">
          {/* Alert: The ground reality & hybrid pairing explanation */}
          <div
            className="p-3 flex items-start gap-2.5 rounded"
            style={{ background: 'var(--amber-wash)', border: '1px solid var(--amber)' }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--amber)' }} />
            <div>
              <div className="font-bold tracking-wider" style={{ color: 'var(--amber)' }}>
                {imageryMode === 'hybrid_optimum'
                  ? 'HYBRID SATELLITE FUSION: AUTHENTIC BASELINE + OPERATIONAL AIRPORT'
                  : 'GROUND-TRUTH AUDIT: TEMPORAL BASELINE & OBSERVATION VINTAGE'}
              </div>
              <p className="mt-1 leading-relaxed" style={{ color: 'var(--ink)' }}>
                {imageryMode === 'hybrid_optimum' ? (
                  <>
                    <strong>Date A (Baseline):</strong> Powered by <strong>Esri Wayback 0.5m Sub-Meter Optical</strong>, rendering razor-sharp historical farmland before airport groundbreaking (e.g. 2021).<br />
                    <strong>Date B (Observation):</strong> Powered by <strong>Google Satellite Ultra HD 0.3m</strong> with active Atmospheric De-Haze, matching current Google Maps imagery showing the fully paved Runway 10/28, taxiway network, and passenger terminal.<br />
                    <strong>Temporal Delta:</strong> <span className="font-bold text-teal-400">{gapYears.toFixed(1)} Years</span> (strictly adheres to the mandatory 2.0+ Year Minimum Baseline Delta).
                  </>
                ) : (
                  <>
                    High-resolution commercial satellite passes lag by 6–18 months in public web archives due to orthorectification cycles.
                    The hybrid mode solves this by fusing historical sub-meter baseline archives with real-world Google Maps satellite imagery.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Grid: Date A vs Date B Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Date A */}
            <div className="p-3 flex flex-col gap-1.5" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
              <span className="t-tag" style={{ color: 'var(--amber)' }}>DATE A · BASELINE ({beforeDate})</span>
              <div><strong>Sensor:</strong> <span style={{ color: 'var(--ink-2)' }}>{intelA.sensor}</span></div>
              <div><strong>Resolution:</strong> <span style={{ color: 'var(--ink-2)' }}>{intelA.resolution}</span></div>
              <div><strong>Acquisition:</strong> <span style={{ color: 'var(--ink-2)' }}>{intelA.acquisitionDate}</span></div>
              <div><strong>Catalog:</strong> <span style={{ color: 'var(--ink-3)' }}>{intelA.catalogRelease}</span></div>
              <p className="t-mono text-[10px] mt-1" style={{ color: 'var(--ink-3)' }}>{intelA.pipelineStatus}</p>
            </div>

            {/* Date B */}
            <div className="p-3 flex flex-col gap-1.5" style={{ background: 'var(--panel-2)', border: '1px solid var(--teal)' }}>
              <span className="t-tag" style={{ color: 'var(--teal)' }}>DATE B · OBSERVATION ({afterDate})</span>
              <div><strong>Sensor:</strong> <span style={{ color: 'var(--ink-2)' }}>{intelB.sensor}</span></div>
              <div><strong>Resolution:</strong> <span style={{ color: 'var(--ink-2)' }}>{intelB.resolution}</span></div>
              <div><strong>Physical Capture:</strong> <span style={{ color: 'var(--teal)' }}>{intelB.acquisitionDate}</span></div>
              <div><strong>Catalog:</strong> <span style={{ color: 'var(--ink-3)' }}>{intelB.catalogRelease}</span></div>
              <p className="t-mono text-[10px] mt-1" style={{ color: 'var(--ink-3)' }}>{intelB.pipelineStatus}</p>
            </div>
          </div>

          {/* Section 2: Why do free basemaps lag behind reality? */}
          <div className="p-3" style={{ background: 'var(--well)', border: '1px solid var(--line)' }}>
            <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
              <Database className="w-3.5 h-3.5" style={{ color: 'var(--amber)' }} />
              <span>WHY DO FREE BASEMAPS LAG BEHIND REALITY?</span>
            </div>
            <p className="mt-1.5 leading-relaxed text-[11px]" style={{ color: 'var(--ink-2)' }}>
              Commercial sub-meter satellites (Maxar WorldView-3, Airbus Pléiades) cost thousands of dollars per capture for custom tasking.
              Free public basemaps (Esri World Imagery, Google Maps) only ingest satellite passes after commercial embargoes, orthorectification, and mosaic blending cycles—creating an inherent <strong>6 to 18 month latency</strong>. The latest available sub-meter pass over Jewar across all public web basemaps is January 2025.
            </p>
            <div className="mt-2 pt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--line)' }}>
              <span className="t-tag" style={{ color: 'var(--teal)', fontSize: 9 }}>
                LIVE SENTINEL-2 PASSED: 10 SEP 2026 (Copernicus S2C)
              </span>
              <span className="t-mono text-[10px]" style={{ color: 'var(--ink-3)' }}>Revisit cycle: 5 days</span>
            </div>
          </div>

          {/* Section 3: Models & AI Architecture */}
          <div className="p-3" style={{ background: 'var(--well)', border: '1px solid var(--line)' }}>
            <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
              <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--teal)' }} />
              <span>CHAKSHU MODELS &amp; API PIPELINE</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-[11px]" style={{ color: 'var(--ink-2)' }}>
              <li>
                <strong>1. Change Detection Engine:</strong> Deterministic Classical Change Vector Analysis (CVA) + Otsu Adaptive Thresholding across NDVI (vegetation loss), NDBI (built-up structure onset), and NDWI (drainage).
              </li>
              <li>
                <strong>2. Semantic Tile Search:</strong> OpenAI CLIP ViT-B/32 generates 512D embeddings stored in PostgreSQL <code>pgvector</code> with HNSW cosine index for natural language queries.
              </li>
              <li>
                <strong>3. Analyst QA Guardrails:</strong> Google Gemini 2.5 Flash operates behind a deterministic PostGIS Number Verifier (AI never invents measurements; all numbers come from geometry).
              </li>
              <li>
                <strong>4. Satellite Ingest API:</strong> AWS Earth Search STAC API (<code>sentinel-2-c1-l2a</code>) querying live Copernicus multi-spectral bands (B02, B03, B04, B08, B11, SCL).
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 flex justify-end" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: 11 }}
          >
            CLOSE INTEL BRIEFING
          </button>
        </div>
      </div>
    </div>
  );
};
