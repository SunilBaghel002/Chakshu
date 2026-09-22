import React from 'react';
import { Map, Search, Upload, CheckCircle2, ShieldCheck, HelpCircle, Settings, MessageSquare } from 'lucide-react';

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
 * SLOT-05 — Vertical Icon Rail (58px wide)
 * Aerospace mission-control capsules with glowing neon active state,
 * refined 1.8px stroke icons, and crisp monospace labels.
 */
export const IconRail: React.FC<IconRailProps> = React.memo(({
  activeView,
  onSelectView,
  onOpenShortcuts,
  onOpenSettings,
}) => {
  const [hoveredLabel, setHoveredLabel] = React.useState<string | null>(null);

  const topItems: RailItem[] = [
    { view: 'map', icon: <Map className="w-4.5 h-4.5" strokeWidth={1.8} />, label: 'MAP', shortcut: 'G M' },
    { view: 'search', icon: <Search className="w-4.5 h-4.5" strokeWidth={1.8} />, label: 'SEARCH', shortcut: 'G F' },
    { view: 'upload', icon: <Upload className="w-4.5 h-4.5" strokeWidth={1.8} />, label: 'UPLOAD', shortcut: 'G U' },
    { view: 'review', icon: <CheckCircle2 className="w-4.5 h-4.5" strokeWidth={1.8} />, label: 'REVIEW', shortcut: 'G R' },
    { view: 'ask', icon: <MessageSquare className="w-4.5 h-4.5" strokeWidth={1.8} />, label: 'ASK', shortcut: 'G Q' },
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
      <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
        {topItems.map(({ view, icon, label, shortcut }) => {
          const isActive = activeView === view;
          const isHovered = hoveredLabel === label;

          return (
            <div key={label} className="relative w-full flex justify-center">
              <button
                type="button"
                onClick={() => view && onSelectView(view)}
                onMouseEnter={() => setHoveredLabel(label)}
                onMouseLeave={() => setHoveredLabel(null)}
                aria-label={`${label} (${shortcut})`}
                className="group relative w-11 h-11 flex flex-col items-center justify-center rounded cursor-pointer transition-all duration-150"
                style={{
                  background: isActive
                    ? 'linear-gradient(90deg, var(--signal-wash) 0%, rgba(255, 148, 38, 0.05) 100%)'
                    : isHovered
                    ? 'var(--panel-2)'
                    : 'transparent',
                  color: isActive ? 'var(--signal)' : isHovered ? 'var(--ink)' : 'var(--ink-3)',
                  border: isActive
                    ? '1px solid rgba(255, 148, 38, 0.35)'
                    : isHovered
                    ? '1px solid var(--line-strong)'
                    : '1px solid transparent',
                  boxShadow: isActive ? 'inset 0 0 12px rgba(255, 148, 38, 0.12)' : 'none',
                }}
              >
                {/* Active Neon Left Indicator */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5"
                    style={{
                      width: 3,
                      background: 'var(--signal)',
                      borderRadius: '0 2px 2px 0',
                      boxShadow: '0 0 10px var(--signal)',
                    }}
                  />
                )}

                <div className="transition-transform group-hover:scale-105">
                  {icon}
                </div>

                <span
                  className="t-tag mt-0.5 tracking-wider leading-none"
                  style={{
                    fontSize: 7.5,
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '0.08em',
                  }}
                >
                  {label}
                </span>
              </button>

              {/* Hover Tooltip */}
              {isHovered && (
                <div
                  className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded pointer-events-none flex items-center gap-1.5 shadow-xl whitespace-nowrap z-50 animate-in fade-in slide-in-from-left-1 duration-150"
                  style={{
                    background: 'var(--panel-3)',
                    border: '1px solid var(--line-strong)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                  }}
                >
                  <span className="t-tag font-bold" style={{ color: 'var(--ink)', fontSize: 9.5 }}>
                    {label}
                  </span>
                  <span
                    className="t-mono px-1 py-0.2 rounded"
                    style={{
                      background: 'var(--well)',
                      color: 'var(--signal)',
                      border: '1px solid var(--line)',
                      fontSize: 8.5,
                    }}
                  >
                    {shortcut}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Center Divider: Tactical Bezel Line */}
      <div className="my-3 flex items-center justify-center w-full px-3">
        <div
          style={{
            width: '100%',
            height: 1,
            background: 'linear-gradient(90deg, transparent 0%, var(--line-strong) 50%, transparent 100%)',
          }}
        />
      </div>

      {/* Help / Keys (?) */}
      <div className="relative w-full flex justify-center px-1.5">
        <button
          type="button"
          onClick={onOpenShortcuts}
          onMouseEnter={() => setHoveredLabel('KEYS')}
          onMouseLeave={() => setHoveredLabel(null)}
          title="Keyboard Shortcuts (?)"
          className="group relative w-11 h-11 flex flex-col items-center justify-center rounded cursor-pointer transition-all duration-150"
          style={{
            background: hoveredLabel === 'KEYS' ? 'var(--panel-2)' : 'transparent',
            color: hoveredLabel === 'KEYS' ? 'var(--signal)' : 'var(--ink-3)',
            border: hoveredLabel === 'KEYS' ? '1px solid var(--line-strong)' : '1px solid transparent',
          }}
        >
          <HelpCircle className="w-4.5 h-4.5 transition-transform group-hover:scale-105" strokeWidth={1.8} />
          <span className="t-tag mt-0.5 tracking-wider leading-none" style={{ fontSize: 7.5, letterSpacing: '0.08em' }}>
            KEYS
          </span>
        </button>

        {hoveredLabel === 'KEYS' && (
          <div
            className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded pointer-events-none flex items-center gap-1.5 shadow-xl whitespace-nowrap z-50"
            style={{
              background: 'var(--panel-3)',
              border: '1px solid var(--line-strong)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            }}
          >
            <span className="t-tag font-bold" style={{ color: 'var(--ink)', fontSize: 9.5 }}>
              SHORTCUTS
            </span>
            <span
              className="t-mono px-1 py-0.2 rounded"
              style={{
                background: 'var(--well)',
                color: 'var(--signal)',
                border: '1px solid var(--line)',
                fontSize: 8.5,
              }}
            >
              ?
            </span>
          </div>
        )}
      </div>

      {/* Settings (CONFIG) - Bottom Anchored */}
      <div className="mt-auto pb-1 relative w-full flex justify-center px-1.5">
        <button
          type="button"
          onClick={onOpenSettings}
          onMouseEnter={() => setHoveredLabel('CONFIG')}
          onMouseLeave={() => setHoveredLabel(null)}
          title="Console Settings"
          className="group relative w-11 h-11 flex flex-col items-center justify-center rounded cursor-pointer transition-all duration-150"
          style={{
            background: hoveredLabel === 'CONFIG' ? 'var(--panel-2)' : 'transparent',
            color: hoveredLabel === 'CONFIG' ? 'var(--ink)' : 'var(--ink-3)',
            border: hoveredLabel === 'CONFIG' ? '1px solid var(--line-strong)' : '1px solid transparent',
          }}
        >
          <Settings className="w-4.5 h-4.5 transition-transform group-hover:rotate-45" strokeWidth={1.8} />
          <span className="t-tag mt-0.5 tracking-wider leading-none" style={{ fontSize: 7.5, letterSpacing: '0.08em' }}>
            CONFIG
          </span>
        </button>

        {hoveredLabel === 'CONFIG' && (
          <div
            className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded pointer-events-none flex items-center gap-1.5 shadow-xl whitespace-nowrap z-50"
            style={{
              background: 'var(--panel-3)',
              border: '1px solid var(--line-strong)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            }}
          >
            <span className="t-tag font-bold" style={{ color: 'var(--ink)', fontSize: 9.5 }}>
              CONFIG
            </span>
          </div>
        )}
      </div>
    </nav>
  );
});

