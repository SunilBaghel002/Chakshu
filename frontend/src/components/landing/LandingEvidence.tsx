import React from 'react';
import { LANDING_COPY } from '../../lib/landingCopy';

interface MetricRow {
  metric: string;
  value: string;
  source: string;
}

const MEASURED_METRICS: MetricRow[] = [
  {
    metric: 'Calibration ECE',
    value: '0.0235 (baseline 0.043)',
    source: 'scripts/label_session.py, n = 147',
  },
  {
    metric: 'Hand-labelled polygons',
    value: '147',
    source: 'scripts/label_session.py',
  },
  {
    metric: 'Onset vs published construction date',
    value: 'Within bracket',
    source: 'manual comparison + test_onset.py',
  },
  {
    metric: 'First useful view',
    value: '0 clicks',
    source: 'ux-rules §5 evaluation',
  },
  {
    metric: 'Compare two years',
    value: '2 clicks',
    source: 'ux-rules §5 evaluation',
  },
  {
    metric: 'Inspect a change',
    value: '1 click',
    source: 'ux-rules §5 evaluation',
  },
  {
    metric: 'Reject 5 targets',
    value: '6 clicks (J×5 + ⌫×5)',
    source: 'ux-rules §5 evaluation',
  },
  {
    metric: 'Ask a question',
    value: '2 actions (type + ⏎)',
    source: 'ux-rules §5 evaluation',
  },
  {
    metric: 'Upload and analyse',
    value: '3 actions',
    source: 'ux-rules §5 evaluation',
  },
  {
    metric: 'Export a report',
    value: '3 clicks',
    source: 'ux-rules §5 evaluation',
  },
];

/**
 * W2.6 · Evidence Table (Console Dossier Telemetry Table)
 */
export const LandingEvidence: React.FC = () => {
  return (
    <section id="evidence" className="px-6 py-16 md:py-20 border-b border-[var(--line)] landing-container">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <span
            className="font-mono block mb-2"
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--primary-cyan)',
            }}
          >
            {LANDING_COPY.rigourLabel}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-cond tracking-tight text-[var(--ink)]">
            {LANDING_COPY.evidenceTitle}
          </h2>
          <p className="text-xs font-mono text-[var(--ink-3)] mt-1">
            {LANDING_COPY.evidenceSub}
          </p>
        </div>
        <div className="dossier-bar" style={{ margin: 0 }}>
          <span>{'VERIFIED EVALUATION LEDGER'}</span>
        </div>
      </div>

      {/* Console Evidence Table */}
      <div className="overflow-x-auto border border-[var(--line-strong)] rounded bg-[var(--panel)]">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-3)] uppercase tracking-wider">
              <th className="p-3.5" style={{ letterSpacing: '0.1em' }}>{LANDING_COPY.thMetric}</th>
              <th className="p-3.5" style={{ letterSpacing: '0.1em' }}>{LANDING_COPY.thValue}</th>
              <th className="p-3.5" style={{ letterSpacing: '0.1em' }}>{LANDING_COPY.thSource}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {MEASURED_METRICS.map((row) => (
              <tr key={row.metric} className="hover:bg-[var(--panel-2)]">
                <td className="p-3.5 text-[var(--ink)] font-semibold">{row.metric}</td>
                <td
                  className="p-3.5 font-bold tabular-nums"
                  style={{ color: 'var(--primary-cyan)' }}
                >
                  {row.value}
                </td>
                <td className="p-3.5 text-[var(--ink-3)]">{row.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* WHAT WE DID NOT BUILD — Console cyan-wash notice */}
      <div
        className="mt-8 p-5 rounded flex flex-col gap-2"
        style={{
          background: 'var(--cyan-wash)',
          border: '1px solid rgba(63, 169, 245, 0.45)',
        }}
      >
        <div
          className="font-mono font-bold tracking-wider uppercase"
          style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--primary-cyan)' }}
        >
          {LANDING_COPY.gapsTitle}
        </div>
        <p className="text-xs font-sans text-[var(--ink)] leading-relaxed">
          {LANDING_COPY.gapsText}
        </p>
      </div>
    </section>
  );
};
