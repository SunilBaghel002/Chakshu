import React, { useState } from 'react';
import {
  Map,
  CheckSquare,
  Upload,
  Search,
  Bot,
  ShieldCheck,
  HelpCircle,
  Settings,
} from 'lucide-react';

interface IconRailProps {
  activeView: 'map' | 'review' | 'upload' | 'ask' | 'search' | 'audit';
  onSelectView: (view: 'map' | 'review' | 'upload' | 'ask' | 'search' | 'audit') => void;
  onOpenShortcuts: () => void;
  onOpenSettings?: () => void;
  unreviewedCount?: number;
}

interface NavItem {
  view: 'map' | 'review' | 'upload' | 'ask' | 'search' | 'audit';
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  badge?: number;
}

/**
 * SLOT-05 — Tactical Icon Rail (Stitch Geo-Intelligence Design System)
 * Fixed width, neon active glow, floating tooltips, keys & config modals
 */
export const IconRail: React.FC<IconRailProps> = React.memo(({
  activeView,
  onSelectView,
  onOpenShortcuts,
  onOpenSettings,
  unreviewedCount = 24,
}) => {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const topItems: NavItem[] = [
    { view: 'map', icon: <Map className="w-5 h-5" />, label: 'MAP', shortcut: 'M' },
    { view: 'review', icon: <CheckSquare className="w-5 h-5" />, label: 'REVIEW', shortcut: 'R', badge: unreviewedCount },
    { view: 'upload', icon: <Upload className="w-5 h-5" />, label: 'UPLOAD', shortcut: 'U' },
    { view: 'search', icon: <Search className="w-5 h-5" />, label: 'SEARCH', shortcut: 'S' },
    { view: 'ask', icon: <Bot className="w-5 h-5" />, label: 'ASK', shortcut: 'A' },
    { view: 'audit', icon: <ShieldCheck className="w-5 h-5" />, label: 'AUDIT', shortcut: 'D' },
  ];

  return (
    <nav
      id="slot-05-rail"
      aria-label="Console navigation rail"
      className="flex flex-col items-center py-2 select-none h-full relative bg-surface-container-lowest border-r border-outline-variant/30"
      style={{
        zIndex: 25,
      }}
    >
      {/* Top navigation items */}
      <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
        {topItems.map(({ view, icon, label, shortcut, badge }) => {
          const isActive = activeView === view;
          const isHovered = hoveredLabel === label;

          return (
            <div key={label} className="relative w-full flex justify-center">
              <button
                type="button"
                onClick={() => onSelectView(view)}
                onMouseEnter={() => setHoveredLabel(label)}
                onMouseLeave={() => setHoveredLabel(null)}
                aria-label={`${label} (${shortcut})`}
                className={`group relative w-11 h-11 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'bg-surface-container-high text-primary border border-primary/40 shadow-sm'
                    : isHovered
                    ? 'bg-surface-container text-on-surface'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {/* Active Neon Accent Left Bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r shadow-[0_0_8px_rgba(77,163,255,0.8)]" />
                )}

                <div className="transition-transform group-hover:scale-105">
                  {icon}
                </div>

                <span
                  className={`font-label-sm text-[8px] uppercase tracking-wider mt-0.5 leading-none ${
                    isActive ? 'font-bold text-primary' : 'font-medium'
                  }`}
                >
                  {label}
                </span>

                {/* Badge if present (e.g. 24 for Review) */}
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-on-primary font-code-num text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-md">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>

              {/* Hover Tooltip */}
              {isHovered && (
                <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-surface-container-highest border border-outline-variant/40 shadow-xl whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5 animate-in fade-in duration-100">
                  <span className="font-label-sm text-[11px] font-semibold text-on-surface">
                    {label}
                  </span>
                  <span className="font-code-num text-[9px] px-1 py-0.2 rounded bg-surface-container border border-outline-variant/30 text-primary">
                    {shortcut}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Center Divider: Tactical Bezel Line */}
      <div className="my-2 flex items-center justify-center w-full px-3">
        <div className="w-full h-px bg-outline-variant/20" />
      </div>

      {/* Help / Keys (?) */}
      <div className="relative w-full flex justify-center px-1.5">
        <button
          type="button"
          onClick={onOpenShortcuts}
          onMouseEnter={() => setHoveredLabel('KEYS')}
          onMouseLeave={() => setHoveredLabel(null)}
          title="Keyboard Shortcuts (?)"
          className={`group relative w-11 h-11 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all duration-150 ${
            hoveredLabel === 'KEYS'
              ? 'bg-surface-container text-primary'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          <HelpCircle className="w-4.5 h-4.5 transition-transform group-hover:scale-105" strokeWidth={1.8} />
          <span className="font-label-sm text-[8px] uppercase tracking-wider mt-0.5 leading-none">
            KEYS
          </span>
        </button>

        {hoveredLabel === 'KEYS' && (
          <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-surface-container-highest border border-outline-variant/40 shadow-xl whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5">
            <span className="font-label-sm text-[11px] font-semibold text-on-surface">
              SHORTCUTS
            </span>
            <span className="font-code-num text-[9px] px-1 py-0.2 rounded bg-surface-container border border-outline-variant/30 text-primary">
              ?
            </span>
          </div>
        )}
      </div>

      {/* Settings (CONFIG) - Bottom Anchored */}
      <div className="mt-auto pb-2 relative w-full flex flex-col items-center gap-1 px-1.5">
        <button
          type="button"
          onClick={onOpenSettings}
          onMouseEnter={() => setHoveredLabel('CONFIG')}
          onMouseLeave={() => setHoveredLabel(null)}
          title="Console Settings"
          className={`group relative w-11 h-11 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all duration-150 ${
            hoveredLabel === 'CONFIG'
              ? 'bg-surface-container text-primary'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          <Settings className="w-4.5 h-4.5 transition-transform group-hover:rotate-45" strokeWidth={1.8} />
          <span className="font-label-sm text-[8px] uppercase tracking-wider mt-0.5 leading-none">
            CONFIG
          </span>
        </button>

        {hoveredLabel === 'CONFIG' && (
          <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-surface-container-highest border border-outline-variant/40 shadow-xl whitespace-nowrap z-50 pointer-events-none">
            <span className="font-label-sm text-[11px] font-semibold text-on-surface">
              SETTINGS
            </span>
          </div>
        )}

        <span className="font-code-num text-[8px] text-outline/60 mt-1 uppercase">
          v2.8.4
        </span>
      </div>
    </nav>
  );
});
