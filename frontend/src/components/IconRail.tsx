import React, { useState } from 'react';

export type NavView = 'map' | 'review' | 'upload' | 'ask' | 'search' | 'audit';

interface IconRailProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  onOpenShortcuts?: () => void;
  onOpenSettings?: () => void;
}

interface NavItem {
  view?: NavView;
  iconName: string;
  label: string;
  badge?: number;
  action?: () => void;
}

/**
 * SLOT-05 — Stitch Deterministic Geo-Intelligence Navigation Rail
 * W-16 (64px) Left Navigation Dock
 */
export const IconRail: React.FC<IconRailProps> = React.memo(({
  activeView,
  onSelectView,
  onOpenShortcuts,
  onOpenSettings,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const navItems: NavItem[] = [
    { view: 'map', iconName: 'map', label: 'Satellite Viewport' },
    { view: 'search', iconName: 'search', label: 'Search Catalog' },
    { view: 'upload', iconName: 'upload_file', label: 'Ingest Imagery' },
    { view: 'review', iconName: 'fact_check', label: 'Pending Reviews (24)', badge: 24 },
    { view: 'ask', iconName: 'smart_toy', label: 'Ask Copilot' },
    { view: 'audit', iconName: 'history', label: 'Audit Log' },
    { iconName: 'settings', label: 'Settings', action: onOpenSettings },
  ];

  return (
    <aside
      id="slot-05-rail"
      aria-label="Console navigation rail"
      className="w-16 h-full bg-surface-container-lowest z-30 flex flex-col justify-between items-center py-space-md border-r border-outline-variant/30 select-none relative"
    >
      {/* Navigation Icons Stack */}
      <nav className="w-full flex flex-col items-center gap-space-xs">
        {navItems.map((item, idx) => {
          const isActive = item.view === activeView;
          const isHovered = hoveredIdx === idx;

          return (
            <div key={item.label} className="relative w-full flex justify-center">
              <button
                type="button"
                onClick={() => {
                  if (item.view) onSelectView(item.view);
                  if (item.action) item.action();
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors relative cursor-pointer ${
                  isActive
                    ? 'bg-surface-container-high text-primary border-l-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.iconName}</span>

                {/* Badge if present (e.g. 24 for Review) */}
                {item.badge !== undefined && (
                  <span className="absolute top-2 right-2 bg-error text-on-error font-code-num text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </button>

              {/* Floating Tooltip */}
              {isHovered && (
                <span className="absolute left-16 top-1/2 -translate-y-1/2 bg-surface-container-highest text-on-surface px-space-sm py-1 rounded text-label-sm font-label-sm whitespace-nowrap z-50 shadow-md border border-outline-variant/30 pointer-events-none">
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Rail Bottom: Keyboard Shortcuts + Version */}
      <div className="w-full flex flex-col items-center gap-space-xs border-t border-outline-variant/30 pt-space-sm">
        <button
          type="button"
          onClick={onOpenShortcuts}
          aria-label="Keyboard Shortcuts"
          title="Keyboard Shortcuts"
          className="w-10 h-10 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="font-label-sm text-[9px] text-outline uppercase font-code-num">
            v2.8.4
          </span>
        </div>
      </div>
    </aside>
  );
});
