import React from 'react';
import {
  Button,
  type ButtonVariant,
  type ButtonState,
  type ButtonSize,
} from './ui/Button';
import {
  CONTACT_SHEET_COPY,
  BUTTON_COPY,
  DISABLED_REASONS,
  type DisabledReasonCode,
} from '../lib/copy';
import { PrimaryOwnerProvider } from './ui/PrimaryOwnerContext';

const VARIANTS: { key: ButtonVariant; label: string }[] = [
  { key: 'primary', label: CONTACT_SHEET_COPY.variantPrimary },
  { key: 'secondary', label: CONTACT_SHEET_COPY.variantSecondary },
  { key: 'ghost', label: CONTACT_SHEET_COPY.variantGhost },
  { key: 'danger-outline', label: CONTACT_SHEET_COPY.variantDangerOutline },
  { key: 'danger-filled', label: CONTACT_SHEET_COPY.variantDangerFilled },
  { key: 'icon-ghost', label: CONTACT_SHEET_COPY.variantIconGhost },
  { key: 'bar', label: CONTACT_SHEET_COPY.variantBar },
];

const STATES: { key: ButtonState; label: string }[] = [
  { key: 'default', label: CONTACT_SHEET_COPY.stateDefault },
  { key: 'hover', label: CONTACT_SHEET_COPY.stateHover },
  { key: 'active', label: CONTACT_SHEET_COPY.stateActive },
  { key: 'focus-visible', label: CONTACT_SHEET_COPY.stateFocus },
  { key: 'disabled', label: CONTACT_SHEET_COPY.stateDisabled },
  { key: 'loading', label: CONTACT_SHEET_COPY.stateLoading },
  { key: 'selected', label: CONTACT_SHEET_COPY.stateSelected },
];

const SIZES: { key: ButtonSize; label: string }[] = [
  { key: 'sm', label: CONTACT_SHEET_COPY.sizeSm },
  { key: 'md', label: CONTACT_SHEET_COPY.sizeMd },
  { key: 'lg', label: CONTACT_SHEET_COPY.sizeLg },
];

const DISABLED_KEYS = Object.keys(DISABLED_REASONS) as DisabledReasonCode[];

export const ContactSheet: React.FC = () => {
  return (
    <PrimaryOwnerProvider initialOwnerId="contact-sheet-primary">
      <div className="min-h-screen bg-bg text-ink p-6 dot-grid overflow-y-auto font-ui">
        {/* Header */}
        <div className="max-w-7xl mx-auto border-b border-line pb-4 mb-6 flex items-center justify-between">
          <div>
            <div className="dossier-bar inline-flex mb-2">
              <span>{CONTACT_SHEET_COPY.title}</span>
            </div>
            <p className="t-mono text-ink-2">{CONTACT_SHEET_COPY.subtitle}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              window.location.href = '/';
            }}
          >
            {CONTACT_SHEET_COPY.returnToConsole}
          </Button>
        </div>

        <div className="max-w-7xl mx-auto space-y-10">
          {/* Section 1: All 7 Variants x 7 States */}
          <section className="bg-panel border border-line p-5 rounded-panel corner-ticks space-y-4">
            <h2 className="t-h2 text-amber border-b border-line pb-2">
              {CONTACT_SHEET_COPY.matrixTitle}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line-strong text-ink-3 t-tag">
                    <th className="py-2 pr-4">{CONTACT_SHEET_COPY.variantPrimary}</th>
                    {STATES.map((s) => (
                      <th key={s.key} className="py-2 px-2 text-center">
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {VARIANTS.map((v) => (
                    <tr key={v.key} className="hover:bg-panel-2">
                      <td className="py-3 pr-4 t-tag text-ink font-mono font-semibold">
                        {v.label}
                      </td>
                      {STATES.map((s) => (
                        <td key={s.key} className="py-3 px-2 text-center">
                          <Button
                            id={`matrix-${v.key}-${s.key}`}
                            variant={v.key}
                            size="md"
                            state={s.key}
                            reason={s.key === 'disabled' ? 'no-aoi' : undefined}
                          >
                            {v.key === 'icon-ghost' ? '×' : BUTTON_COPY.detect}
                          </Button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2: Size Scaling */}
          <section className="bg-panel border border-line p-5 rounded-panel corner-ticks space-y-4">
            <h2 className="t-h2 text-amber border-b border-line pb-2">
              {CONTACT_SHEET_COPY.sizesTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SIZES.map((sz) => (
                <div key={sz.key} className="bg-panel-2 border border-line p-4 rounded-panel space-y-3">
                  <div className="t-tag text-amber">{sz.label}</div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button variant="primary" size={sz.key}>
                      {BUTTON_COPY.detect}
                    </Button>
                    <Button variant="secondary" size={sz.key}>
                      {BUTTON_COPY.swap}
                    </Button>
                    <Button variant="ghost" size={sz.key}>
                      {BUTTON_COPY.cancel}
                    </Button>
                    <Button variant="danger-outline" size={sz.key}>
                      {BUTTON_COPY.rejectTarget}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: The 8 Disabled Reason Codes */}
          <section className="bg-panel border border-line p-5 rounded-panel corner-ticks space-y-4">
            <h2 className="t-h2 text-amber border-b border-line pb-2">
              {CONTACT_SHEET_COPY.disabledReasonsTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DISABLED_KEYS.map((code) => (
                <div key={code} className="bg-panel-2 border border-line p-3 rounded-panel space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="t-tag text-amber font-mono">{code}</span>
                    <span className="t-tag text-ink-3">{DISABLED_REASONS[code]}</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled
                    reason={code}
                    className="w-full"
                  >
                    {BUTTON_COPY.detect}
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Keyboard Shortcuts at >= 1440px */}
          <section className="bg-panel border border-line p-5 rounded-panel corner-ticks space-y-4">
            <h2 className="t-h2 text-amber border-b border-line pb-2">
              {CONTACT_SHEET_COPY.shortcutsTitle}
            </h2>
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="primary" shortcut="D">
                {BUTTON_COPY.detect}
              </Button>
              <Button variant="secondary" shortcut="S">
                {BUTTON_COPY.swap}
              </Button>
              <Button variant="secondary" shortcut="C">
                {BUTTON_COPY.confirm}
              </Button>
              <Button variant="ghost" shortcut="ESC">
                {BUTTON_COPY.cancel}
              </Button>
            </div>
          </section>

          {/* Section 5: Primary Owner Invariant */}
          <section className="bg-panel border border-line p-5 rounded-panel corner-ticks space-y-4">
            <h2 className="t-h2 text-amber border-b border-line pb-2">
              {CONTACT_SHEET_COPY.primaryOwnerTitle}
            </h2>
            <div className="bg-panel-2 border border-line p-4 rounded-panel flex items-center justify-between">
              <div>
                <p className="t-body text-ink font-semibold">{BUTTON_COPY.detect}</p>
                <p className="t-mono text-ink-3">{CONTACT_SHEET_COPY.subtitle}</p>
              </div>
              <Button id="contact-sheet-primary" variant="primary">
                {BUTTON_COPY.detect}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </PrimaryOwnerProvider>
  );
};
