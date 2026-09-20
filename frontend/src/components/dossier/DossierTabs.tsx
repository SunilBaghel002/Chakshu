import React from 'react';
import { DOSSIER_COPY } from '../../lib/copy';

export type DossierTabKey = 'evidence' | 'analysis' | 'trace' | 'suppressed';

interface DossierTabsProps {
  activeTab: DossierTabKey;
  onTabChange: (tab: DossierTabKey) => void;
  suppressedCount?: number;
}

/**
 * DossierTabs — SLOT-21 (PRD 10 §4 / L4 & PRD 11 §4 / K5)
 * 32px height, gap 0, equal 4-up tabs:
 * 1: EVIDENCE · 2: ANALYSIS · 3: TRACE · 4: SUPPRESSED (n)
 */
export const DossierTabs: React.FC<DossierTabsProps> = ({
  activeTab,
  onTabChange,
  suppressedCount = 312,
}) => {
  const tabs: { key: DossierTabKey; label: string; shortcut: string }[] = [
    { key: 'evidence', label: DOSSIER_COPY.tabEvidence, shortcut: '1' },
    { key: 'analysis', label: DOSSIER_COPY.tabAnalysis, shortcut: '2' },
    { key: 'trace', label: DOSSIER_COPY.tabTrace, shortcut: '3' },
    { key: 'suppressed', label: DOSSIER_COPY.tabSuppressed(suppressedCount), shortcut: '4' },
  ];

  return (
    <div
      role="tablist"
      className="flex w-full shrink-0"
      style={{
        height: 32,
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg)',
      }}
    >
      {tabs.map(({ key, label, shortcut }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(key)}
            className="flex-1 h-full flex items-center justify-center relative cursor-pointer select-none transition-colors"
            style={{
              background: isActive ? 'var(--panel)' : 'transparent',
              color: isActive ? 'var(--amber)' : 'var(--ink-3)',
              border: 'none',
              padding: '0 4px',
            }}
            title={`${label} (${shortcut})`}
          >
            <span className="t-tag font-bold truncate" style={{ fontSize: 9 }}>
              {label}
            </span>

            {/* M6 animated underline */}
            {isActive && (
              <span
                className="absolute bottom-0 left-2 right-2 rounded-full"
                style={{
                  height: 2,
                  background: 'var(--amber)',
                  animation: 'tab-underline-grow 140ms ease-out',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
