import React from 'react';
import { LANDING_COPY } from '../../lib/landingCopy';

/**
 * Measured metrics — STRICTLY from PROGRESS.md §I.
 * W1.2: No estimates, no "≈", no superlatives.
 * If a metric does not exist in PROGRESS.md §I, it is ABSENT.
 */
interface MetricRow {
  metric: string;
  value: string;
  source: string;
}

const MEASURED_METRICS: MetricRow[] = [
  // From PROGRESS.md §I, line 190
  {
    metric: 'Calibration ECE',
    value: '0.0235 (baseline 0.043)',
    source: 'scripts/label_session.py, n = 147',
  },
  // From PROGRESS.md §I, line 191
  {
    metric: 'Hand-labelled polygons',
    value: '147',
    source: 'scripts/label_session.py',
  },
  // From PROGRESS.md §I, line 192
  {
    metric: 'Onset vs published construction date',
    value: 'Within bracket',
    source: 'manual comparison + test_onset.py',
  },
  // From PROGRESS.md §I, line 193
  {
    metric: 'First useful view',
    value: '0 clicks',
    source: 'ux-rules §5 evaluation',
  },
  // From PROGRESS.md §I, line 194
  {
    metric: 'Compare two years',
    value: '2 clicks',
    source: 'ux-rules §5 evaluation',
  },
  // From PROGRESS.md §I, line 195
  {
    metric: 'Inspect a change',
    value: '1 click',
    source: 'ux-rules §5 evaluation',
  },
  // From PROGRESS.md §I, line 196
  {
    metric: 'Reject 5 targets',
    value: '6 clicks (J×5 + ⌫×5)',
    source: 'ux-rules §5 evaluation',
  },
  // From PROGRESS.md §I, line 197
  {
    metric: 'Ask a question',
    value: '2 actions (type + ⏎)',
    source: 'ux-rules §5 evaluation',
  },
  // From PROGRESS.md §I, line 198
  {
    metric: 'Upload and analyse',
    value: '3 actions',
    source: 'ux-rules §5 evaluation',
  },
  // From PROGRESS.md §I, line 199
  {
    metric: 'Export a report',
    value: '3 clicks',
    source: 'ux-rules §5 evaluation',
  },
];

/**
 * W2.6 · Evidence Table
 * Specs: PRD 13 §2 W2.6
 *
 * Two columns: WHAT WE MEASURED and VALUE, plus SOURCE.
 * Rows come ONLY from PROGRESS.md §I.
 * Every row's SOURCE cell names the eval script and the report file.
 * Beneath: WHAT WE DID NOT BUILD panel.
 */
export const LandingEvidence: React.FC = () => {
  return (
    <section id="evidence" className="px-6 py-16 md:py-24 border-b border-[var(--line)] landing-container">
      <div className="mb-8">
        <span
          className="font-mono text-[var(--signal)] block mb-2"
          style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
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

      {/* Evidence table */}
      <div className="overflow-x-auto border border-[var(--line)] rounded-[var(--r-panel)] bg-[var(--panel)]">
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
              <tr key={row.metric} className="hover:bg-[var(--panel-2)]/50">
                <td className="p-3.5 text-[var(--ink)] font-semibold">{row.metric}</td>
                <td className="p-3.5 text-[var(--signal)] font-bold tabular-nums">{row.value}</td>
                <td className="p-3.5 text-[var(--ink-3)]">{row.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* WHAT WE DID NOT BUILD — signal-wash panel */}
      <div className="mt-8 p-5 rounded-[var(--r-panel)] bg-[var(--signal-wash)] border border-[var(--signal)] flex flex-col gap-2">
        <div
          className="font-mono font-bold tracking-wider text-[var(--signal)] uppercase"
          style={{ fontSize: 10, letterSpacing: '0.14em' }}
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
