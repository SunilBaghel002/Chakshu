import React from 'react';
import { LANDING_COPY } from '../../lib/landingCopy';

const MODEL_BOM = [
  { model: 'OpenCLIP ViT-B-32', version: 'laion2b_s34b', licence: 'MIT', source: 'OpenAI / LAION-2B', size: '338 MB', purpose: 'Vector embeddings' },
  { model: 'ESA WorldCover 2021', version: 'v200', licence: 'CC-BY 4.0', source: 'ESA / VITO', size: '—', purpose: '10 m reference map' },
  { model: 'Copernicus Sentinel-2', version: 'L2A', licence: 'Open Access', source: 'ESA / EC', size: '—', purpose: 'Multispectral imagery' },
];

/**
 * W2.7 · OFFLINE / SOVEREIGNTY — two columns
 * Specs: PRD 13 §2 W2.7
 *
 * Left: checklist with green ticks
 * Right: MODEL BILL OF MATERIALS table
 */
export const LandingOffline: React.FC = () => {
  return (
    <section
      id="offline"
      className="px-6 py-16 md:py-24 border-b border-[var(--line)] grid grid-cols-1 md:grid-cols-2 gap-12 landing-container"
    >
      {/* Left: Offline Checklist */}
      <div className="flex flex-col gap-6">
        <div>
          <span
            className="font-mono text-[var(--signal)] block mb-2"
            style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
          >
            {LANDING_COPY.securityLabel}
          </span>
          <h3 className="text-2xl font-bold font-cond tracking-tight text-[var(--ink)]">
            {LANDING_COPY.securityTitle}
          </h3>
        </div>
        <ul className="space-y-3 font-mono text-xs text-[var(--ink-2)]">
          {LANDING_COPY.offlineChecklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="text-[var(--measured-text)] font-bold mt-0.5 flex-shrink-0">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2">
          <a
            href="#"
            className="font-mono text-[var(--ion)] hover:text-[var(--ion-hot)] transition-colors"
            style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
          >
            {LANDING_COPY.depsLink} →
          </a>
        </div>
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
                <th className="p-3" style={{ letterSpacing: '0.1em' }}>{LANDING_COPY.thModel}</th>
                <th className="p-3" style={{ letterSpacing: '0.1em' }}>{LANDING_COPY.thLicense}</th>
                <th className="p-3" style={{ letterSpacing: '0.1em' }}>{LANDING_COPY.thSource}</th>
                <th className="p-3" style={{ letterSpacing: '0.1em' }}>{LANDING_COPY.thPurpose}</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 11 }} className="divide-y divide-[var(--line)]">
              {MODEL_BOM.map((m) => (
                <tr key={m.model}>
                  <td className="p-3 text-[var(--ink)] font-semibold">{m.model}</td>
                  <td className="p-3 text-[var(--signal)]">{m.licence}</td>
                  <td className="p-3 text-[var(--ink-3)]">{m.source}</td>
                  <td className="p-3 text-[var(--ink-3)]">{m.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
