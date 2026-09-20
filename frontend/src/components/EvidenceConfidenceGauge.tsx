import React from 'react';

interface ConfidenceParts {
  detector_agreement: number;
  image_quality: number;
  registration: number;
  classification_margin: number;
  temporal_persistence: number;
}

interface EvidenceConfidenceGaugeProps {
  overall: number;
  parts: ConfidenceParts;
  calibrated?: boolean;
  calibrationEce?: number | null;
  calibrationN?: number | null;
}

const COMPONENT_LABELS: { key: keyof ConfidenceParts; label: string }[] = [
  { key: 'detector_agreement', label: 'DETECTOR AGREEMENT' },
  { key: 'image_quality', label: 'IMAGE QUALITY' },
  { key: 'registration', label: 'REGISTRATION' },
  { key: 'classification_margin', label: 'CLASSIFICATION MARGIN' },
  { key: 'temporal_persistence', label: 'TEMPORAL PERSISTENCE' },
];

/**
 * Five-arc iris confidence gauge with animated SVG progress rings,
 * calibration ECE metric, and telemetry-style component bars.
 */
export const EvidenceConfidenceGauge: React.FC<EvidenceConfidenceGaugeProps> = ({
  overall,
  parts,
  calibrated = true,
  calibrationEce = 0.043,
  calibrationN = 147,
}) => {
  const arcColors = ['#8A4B12', '#A86520', '#C4882E', '#E0A840', '#F0B45F'];
  const arcRadius = [10, 11.5, 13, 14.5, 16];
  const arcKeys = COMPONENT_LABELS.map((c) => c.key);

  return (
    <div>
      <div className="dossier-bar" style={{ marginBottom: 8 }}>
        <span>CONFIDENCE</span>
      </div>
      <div className="console-panel corner-ticks p-3 space-y-3">
        <div className="flex items-center gap-3">
          {/* Multi-arc iris gauge */}
          <div
            className="relative shrink-0 flex items-center justify-center"
            style={{ width: 64, height: 64, opacity: calibrated ? 1 : 0.4 }}
          >
            <svg className="w-full h-full" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background arcs */}
              {arcRadius.map((r, i) => (
                <circle
                  key={`bg-${i}`}
                  cx="18"
                  cy="18"
                  r={r}
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="1.5"
                />
              ))}
              {/* Filled arcs per confidence component */}
              {arcKeys.map((key, i) => {
                const val = parts[key] ?? 0;
                const circ = 2 * Math.PI * arcRadius[i]!;
                return (
                  <circle
                    key={`arc-${i}`}
                    cx="18"
                    cy="18"
                    r={arcRadius[i]}
                    fill="none"
                    stroke={arcColors[i]}
                    strokeWidth="1.5"
                    strokeDasharray={`${val * circ} ${circ}`}
                    strokeLinecap="round"
                    style={{
                      transition: 'stroke-dasharray 600ms ease-out',
                    }}
                  />
                );
              })}
              {/* Outer ring for overall */}
              <circle
                cx="18"
                cy="18"
                r="17"
                fill="none"
                stroke={overall >= 0.75 ? 'var(--amber)' : overall >= 0.5 ? 'var(--warning)' : 'var(--danger)'}
                strokeWidth="1"
                strokeDasharray={`${overall * 2 * Math.PI * 17} ${2 * Math.PI * 17}`}
                strokeLinecap="round"
              />
            </svg>
            {/* Center overall value */}
            <span
              className="absolute t-tag tabular-nums"
              style={{ color: 'var(--ink)', fontSize: 13, fontWeight: 700 }}
            >
              {(overall * 100).toFixed(0)}%
            </span>
            {/* Uncalibrated badge */}
            {!calibrated && (
              <span
                className="absolute t-tag"
                style={{
                  bottom: -2,
                  fontSize: 7,
                  color: 'var(--ink-3)',
                  border: '1px dashed var(--ink-3)',
                  borderRadius: 2,
                  padding: '0 3px',
                }}
              >
                UNCALIBRATED
              </span>
            )}
          </div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--ink-3)', lineHeight: '14px' }}>
            Geometric mean · ECE: {calibrationEce} · N={calibrationN}
          </div>
        </div>

        {/* 5 component bars */}
        <div className="space-y-1.5">
          {COMPONENT_LABELS.map((comp) => {
            const val = parts[comp.key] ?? 0;
            return (
              <div key={comp.key}>
                <div className="flex justify-between t-tag" style={{ fontSize: 9 }}>
                  <span style={{ color: 'var(--ink-3)' }}>{comp.label}</span>
                  <span
                    className="tabular-nums"
                    style={{ color: val < 0.6 ? 'var(--warning)' : 'var(--ink-2)' }}
                  >
                    {(val * 100).toFixed(0)}%
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: 'var(--panel-3)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, val * 100))}%`,
                      background:
                        val < 0.6
                          ? 'var(--warning)'
                          : `color-mix(in srgb, var(--amber-deep), var(--amber) ${Math.round(val * 100)}%)`,
                      transition: 'width 300ms ease-out',
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
