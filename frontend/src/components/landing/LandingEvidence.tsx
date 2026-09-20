import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LANDING_COPY } from '../../lib/landingCopy';

interface MetricRow {
  metric: string;
  value: string;
  source: string;
}

const MEASURED_METRICS: MetricRow[] = [
  {
    metric: 'Calibration ECE (Expected Error)',
    value: '0.0235 (Baseline 0.043)',
    source: 'scripts/label_session.py (n=147)',
  },
  {
    metric: 'Hand-Labelled Polygons',
    value: '147 Polygons',
    source: 'scripts/label_session.py',
  },
  {
    metric: 'Onset vs Ground Truth Date',
    value: 'Within Satellite Bracket',
    source: 'test_onset.py + manual check',
  },
  {
    metric: 'First Useful View',
    value: '0 Clicks',
    source: 'ux-rules.md §5 audit',
  },
  {
    metric: 'Compare Two Temporal Scenes',
    value: '2 Clicks',
    source: 'ux-rules.md §5 audit',
  },
  {
    metric: 'Inspect & Lock-on Change',
    value: '1 Click',
    source: 'ux-rules.md §5 audit',
  },
  {
    metric: 'Reject 5 False Candidates',
    value: '6 Clicks (J×5 + ⌫×5)',
    source: 'ux-rules.md §5 audit',
  },
  {
    metric: 'Plain-Language Question',
    value: '2 Actions (Type + ⏎)',
    source: 'ux-rules.md §5 audit',
  },
  {
    metric: 'Upload & Complete Ingestion',
    value: '3 Actions',
    source: 'ux-rules.md §5 audit',
  },
  {
    metric: 'Export Signed Report',
    value: '3 Clicks',
    source: 'ux-rules.md §5 audit',
  },
];

const MODEL_BOM = [
  { model: 'OpenCLIP ViT-B-32', license: 'MIT', origin: 'OpenAI / LAION-2B', purpose: 'Vector embeddings' },
  { model: 'ESA WorldCover 2021', license: 'CC-BY 4.0', origin: 'ESA / VITO', purpose: '10m Reference map' },
  { model: 'Copernicus Sentinel-2', license: 'Open Access', origin: 'ESA / EC', purpose: 'Multispectral imagery' },
];

/**
 * W2.6 · Evidence Table, W2.7 · Sovereignty & W2.8 · Footer
 * Specs: PRD 13 §2 W2.6, W2.7, W2.8
 */
export const LandingEvidence: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full bg-[var(--bg)] flex flex-col">
      {/* W2.6 · Evidence Table */}
      <section id="evidence" className="max-w-7xl mx-auto w-full px-6 py-16 md:py-24 border-b border-[var(--line)]">
        <div className="mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-[var(--signal)] block mb-2">
            {LANDING_COPY.rigourLabel}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-cond tracking-tight text-[var(--ink)]">
            {LANDING_COPY.evidenceTitle}
          </h2>
          <p className="text-xs font-mono text-[var(--ink-3)] mt-1">
            {LANDING_COPY.evidenceSub}
          </p>
        </div>

        <div className="overflow-x-auto border border-[var(--line)] rounded-[var(--r-panel)] bg-[var(--panel)]">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-3)] uppercase tracking-wider">
                <th className="p-3.5">{LANDING_COPY.thMetric}</th>
                <th className="p-3.5">{LANDING_COPY.thValue}</th>
                <th className="p-3.5">{LANDING_COPY.thSource}</th>
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

        {/* Declared Gaps Panel */}
        <div className="mt-8 p-5 rounded-[var(--r-panel)] bg-[var(--signal-wash)] border border-[var(--signal)] flex flex-col gap-2">
          <div className="text-xs font-mono font-bold tracking-wider text-[var(--signal)] uppercase">
            {LANDING_COPY.gapsTitle}
          </div>
          <p className="text-xs font-sans text-[var(--ink)] leading-relaxed">
            {LANDING_COPY.gapsText}
          </p>
        </div>
      </section>

      {/* W2.7 · Sovereignty & Model BOM */}
      <section id="offline" className="max-w-7xl mx-auto w-full px-6 py-16 md:py-24 border-b border-[var(--line)] grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left: Offline Checklist */}
        <div className="flex flex-col gap-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--signal)] block mb-2">
              {LANDING_COPY.securityLabel}
            </span>
            <h3 className="text-2xl font-bold font-cond tracking-tight text-[var(--ink)]">
              {LANDING_COPY.securityTitle}
            </h3>
          </div>
          <ul className="space-y-3 font-mono text-xs text-[var(--ink-2)]">
            <li className="flex items-center gap-2">
              <span className="text-[var(--measured-text)] font-bold">{'✓'}</span>
              <span>{'Tiles and masks cached on-premise; synthetic offline fallback'}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[var(--measured-text)] font-bold">{'✓'}</span>
              <span>{'Permissive model weights packaged with declared licenses'}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[var(--measured-text)] font-bold">{'✓'}</span>
              <span>{'Zero external runtime requests (no CDNs, no Google Fonts)'}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[var(--measured-text)] font-bold">{'✓'}</span>
              <span>{'First-party PostgreSQL storage (no cloud SaaS dependencies)'}</span>
            </li>
          </ul>
        </div>

        {/* Right: Model Bill of Materials */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold font-cond tracking-wide text-[var(--ink)]">
            {LANDING_COPY.bomTitle}
          </h3>
          <div className="border border-[var(--line)] rounded-[var(--r-panel)] bg-[var(--panel)] overflow-hidden font-mono text-xs">
            <table className="w-full text-left">
              <thead>
                <tr
                  style={{ fontSize: 10 }}
                  className="border-b border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-3)] uppercase"
                >
                  <th className="p-3">{LANDING_COPY.thModel}</th>
                  <th className="p-3">{LANDING_COPY.thLicense}</th>
                  <th className="p-3">{LANDING_COPY.thPurpose}</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 11 }} className="divide-y divide-[var(--line)]">
                {MODEL_BOM.map((m) => (
                  <tr key={m.model}>
                    <td className="p-3 text-[var(--ink)] font-semibold">{m.model}</td>
                    <td className="p-3 text-[var(--signal)]">{m.license}</td>
                    <td className="p-3 text-[var(--ink-3)]">{m.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* W2.8 · Team & Footer */}
      <footer className="w-full bg-[var(--panel)] px-6 py-12 text-xs font-mono text-[var(--ink-3)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 border-b border-[var(--line)] pb-8">
          <div>
            <span className="text-sm font-bold text-[var(--ink)]">{LANDING_COPY.teamName}</span>
            <p style={{ fontSize: 11 }} className="text-[var(--ink-3)] mt-1">
              {LANDING_COPY.teamSub}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => navigate('/privacy')}
              className="text-[var(--ink-2)] hover:text-[var(--signal)] transition-colors cursor-pointer"
            >
              {'PRIVACY POLICY'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="text-[var(--ink-2)] hover:text-[var(--signal)] transition-colors cursor-pointer"
            >
              {'ADMIN'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/console')}
              className="text-[var(--signal)] font-bold cursor-pointer"
            >
              {'LAUNCH CONSOLE →'}
            </button>
          </div>
        </div>
        <div style={{ fontSize: 11 }} className="max-w-7xl mx-auto pt-6 text-center">
          {LANDING_COPY.copyright}
        </div>
      </footer>
    </div>
  );
};
