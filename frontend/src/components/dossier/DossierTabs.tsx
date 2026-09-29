import React from 'react';
import { DOSSIER_COPY } from '../../lib/copy';

export type DossierTabKey = 'evidence' | 'analysis' | 'trace' | 'suppressed';

interface DossierTabsProps {
  activeTab: DossierTabKey;
  onTabChange: (tab: DossierTabKey) => void;
  suppressedCount?: number;
}

/**
 * DossierTabs — SLOT-21
 * Segmented Tabs: [EVIDENCE], [ANALYSIS], [TRACE], [SUPPRESSED (n)]
 */
export const DossierTabs: React.FC<DossierTabsProps> = ({
  activeTab,
  onTabChange,
  suppressedCount,
}) => {
  const tabs: { key: DossierTabKey; label: string; shortcut: string }[] = [
    { key: 'evidence', label: DOSSIER_COPY.tabEvidence, shortcut: '1' },
    { key: 'analysis', label: DOSSIER_COPY.tabAnalysis, shortcut: '2' },
    { key: 'trace', label: DOSSIER_COPY.tabTrace, shortcut: '3' },
    {
      key: 'suppressed',
      label: suppressedCount !== undefined ? DOSSIER_COPY.tabSuppressed(suppressedCount) : 'SUPPRESSION',
      shortcut: '4',
    },
  ];

  return (
    <div
      role="tablist"
      className="flex w-full shrink-0 p-1 gap-1"
      style={{
        height: 36,
        borderBottom: '1px solid var(--line)',
        background: 'var(--panel)',
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
            className="flex-1 h-full flex items-center justify-center rounded cursor-pointer select-none transition-all duration-150"
            style={{
              background: isActive ? 'var(--panel-2)' : 'transparent',
              color: isActive ? 'var(--primary-cyan)' : 'var(--ink-3)',
              border: isActive ? '1px solid var(--line-strong)' : '1px solid transparent',
              fontWeight: isActive ? 700 : 500,
            }}
            title={`${label} (${shortcut})`}
          >
            <span className="t-tag font-bold truncate" style={{ fontSize: 9 }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
