import React from 'react';
import { Map, Search, Upload, CheckCircle2, ShieldCheck, HelpCircle, Settings } from 'lucide-react';

export type NavView = 'map' | 'review' | 'upload' | 'ask' | 'search' | 'audit';

interface IconRailProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  onOpenShortcuts?: () => void;
  onOpenSettings?: () => void;
}

interface RailItem {
  view?: NavView;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  action?: () => void;
}

/**
 * SLOT-05 — Vertical Icon Rail (56px wide x main)
 * Per PRD 10 §4 / L4:
 * 05.1 MAP (G M)
 * 05.2 SEARCH (G F)
 * 05.3 UPLOAD (G U)
 * 05.4 REVIEW (G R)
 * 05.5 AUDIT (G A)
 * 05.6 divider (24x1, --line)
 * 05.7 HELP / KEYS (?)
 * 05.8 SETTINGS (bottom-anchored)
 */
export const IconRail: React.FC<IconRailProps> = ({
  activeView,
  onSelectView,
  onOpenShortcuts,
  onOpenSettings,
}) => {
  const topItems: RailItem[] = [
    { view: 'map', icon: <Map className="w-5 h-5" />, label: 'MAP', shortcut: 'G M' },
    { view: 'search', icon: <Search className="w-5 h-5" />, label: 'SEARCH', shortcut: 'G F' },
    { view: 'upload', icon: <Upload className="w-5 h-5" />, label: 'UPLOAD', shortcut: 'G U' },
    { view: 'review', icon: <CheckCircle2 className="w-5 h-5" />, label: 'REVIEW', shortcut: 'G R' },
    { view: 'audit', icon: <ShieldCheck className="w-5 h-5" />, label: 'AUDIT', shortcut: 'G A' },
  ];

  return (
    <nav
      id="slot-05-rail"
      aria-label="Console navigation rail"
      className="flex flex-col items-center py-2 select-none h-full"
      style={{
        width: 56,
        background: 'var(--panel)',
        borderRight: '1px solid var(--line)',
      }}
    >
      {/* Top 5 navigation items */}
      <div className="flex flex-col items-center gap-1 w-full">
        {topItems.map(({ view, icon, label, shortcut }) => {
          const isActive = activeView === view;
          return (
            <button
              key={label}
              onClick={() => view && onSelectView(view)}
              title={`${label} (${shortcut})`}
              className="relative w-10 h-10 flex flex-col items-center justify-center rounded cursor-pointer transition-colors"
              style={{
                background: isActive ? 'var(--amber-wash)' : 'transparent',
                color: isActive ? 'var(--amber)' : 'var(--ink-3)',
              }}
            >
              {/* Active 3px left bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1 bottom-1"
                  style={{ width: 3, background: 'var(--amber)', borderRadius: '0 2px 2px 0' }}
                />
              )}
              {icon}
              <span
                className="t-tag mt-0.5"
                style={{ fontSize: 7, letterSpacing: '0.08em' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 05.6 Divider: 24 x 1, --line */}
      <div
        className="my-3"
        style={{
          width: 24,
          height: 1,
          background: 'var(--line)',
        }}
      />

      {/* 05.7 Help / Keys */}
      <button
        onClick={onOpenShortcuts}
        title="Help / Keyboard Shortcuts (?)"
        className="w-10 h-10 flex flex-col items-center justify-center rounded cursor-pointer transition-colors"
        style={{
          background: 'transparent',
          color: 'var(--ink-3)',
        }}
      >
        <HelpCircle className="w-5 h-5" />
        <span
          className="t-tag mt-0.5"
          style={{ fontSize: 7, letterSpacing: '0.08em' }}
        >
          KEYS
        </span>
      </button>

      {/* 05.8 Settings - bottom-anchored */}
      <div className="mt-auto pt-2">
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="w-10 h-10 flex flex-col items-center justify-center rounded cursor-pointer transition-colors"
          style={{
            background: 'transparent',
            color: 'var(--ink-3)',
          }}
        >
          <Settings className="w-5 h-5" />
          <span
            className="t-tag mt-0.5"
            style={{ fontSize: 7, letterSpacing: '0.08em' }}
          >
            CONFIG
          </span>
        </button>
      </div>
    </nav>
  );
};
