import React from 'react';
import { Map, Search, CheckCircle2, ShieldCheck, Settings, MessageSquare, Inbox } from 'lucide-react';

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
  badge?: number;
}

/**
 * SLOT-05 — Vertical Icon Rail (58px wide)
 * Modern aerospace nav rail with cyan active state
 */
export const IconRail: React.FC<IconRailProps> = React.memo(({
  activeView,
  onSelectView,
  onOpenShortcuts: _onOpenShortcuts,
  onOpenSettings,
}) => {
  const topItems: RailItem[] = [
    { view: 'map', icon: <Map className="w-4.5 h-4.5" strokeWidth={1.8} />, label: 'MAP', shortcut: 'G M' },
    { view: 'review', icon: <CheckCircle2 className="w-4.5 h-4.5" strokeWidth={1.8} />, label: 'REVIEW', shortcut: 'G R', badge: 24 },
    { view: 'upload', icon: <Inbox className="w-4.5 h-4.5" strokeWidth={1.8} />, label: 'INSIGHT', shortcut: 'G U' },
    { view: 'search', icon: <Search className="w-4.5 h-4.5" strokeWidth={1.8} />, label: 'SEARCH', shortcut: 'G F' },
    { view: 'ask', icon: <MessageSquare className="w-4.5 h-4.5" strokeWidth={1.8} />, label: 'COPILOT', shortcut: 'G Q' },
    { view: 'audit', icon: <ShieldCheck className="w-4.5 h-4.5" strokeWidth={1.8} />, label: 'AUDIT', shortcut: 'G A' },
  ];

  return (
    <nav
      id="slot-05-rail"
      aria-label="Console navigation rail"
      className="flex flex-col items-center py-2.5 select-none h-full relative"
      style={{
        width: 58,
        background: 'linear-gradient(180deg, var(--panel) 0%, rgba(8, 12, 22, 0.98) 100%)',
        borderRight: '1px solid var(--line)',
        zIndex: 25,
      }}
    >
      {/* Top navigation items */}
      <div className="flex flex-col items-center gap-1 w-full px-1.5">
        {topItems.map(({ view, icon, label, shortcut, badge }) => {
          const isActive = activeView === view;

          return (
            <div key={label} className="relative w-full flex justify-center">
              <button
                type="button"
                onClick={() => view && onSelectView(view)}
                aria-label={`${label} (${shortcut})`}
                className="group relative w-11 h-11 flex flex-col items-center justify-center rounded cursor-pointer transition-all duration-150"
                style={{
                  background: isActive
                    ? 'var(--cyan-wash, rgba(63, 169, 245, 0.12))'
                    : 'transparent',
                  color: isActive ? 'var(--primary-cyan, #3FA9F5)' : 'var(--ink-3)',
                  border: isActive
                    ? '1px solid rgba(63, 169, 245, 0.35)'
                    : '1px solid transparent',
                  boxShadow: isActive ? 'inset 0 0 12px rgba(63, 169, 245, 0.12)' : 'none',
                }}
              >
                {/* Active Left Indicator */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5"
                    style={{
                      width: 3,
                      background: 'var(--primary-cyan, #3FA9F5)',
                      borderRadius: '0 2px 2px 0',
                      boxShadow: '0 0 10px var(--primary-cyan, #3FA9F5)',
                    }}
                  />
                )}

                <div className="relative transition-transform group-hover:scale-105">
                  {icon}
                  {/* Badge */}
                  {badge && badge > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full"
                      style={{
                        width: 14,
                        height: 14,
                        background: '#EF4444',
                        color: '#FFFFFF',
                        fontSize: 7,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </div>

                <span
                  className="t-tag mt-0.5 tracking-wider leading-none"
                  style={{
                    fontSize: 7,
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '0.08em',
                  }}
                >
                  {label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom: Settings + Version */}
      <div className="mt-auto pb-2 flex flex-col items-center gap-2 w-full px-1.5">
        <button
          type="button"
          onClick={onOpenSettings}
          title="Console Settings"
          className="group w-11 h-11 flex flex-col items-center justify-center rounded cursor-pointer transition-all duration-150 hover:bg-[var(--panel-2)]"
          style={{
            background: 'transparent',
            color: 'var(--ink-3)',
            border: '1px solid transparent',
          }}
        >
          <Settings className="w-4.5 h-4.5 transition-transform group-hover:rotate-45" strokeWidth={1.8} />
        </button>
        <span className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 7, letterSpacing: '0.04em' }}>V2.8.4</span>
      </div>
    </nav>
  );
});
