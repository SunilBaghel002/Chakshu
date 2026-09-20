import React from 'react';
import { Map, Search, Upload, CheckCircle2, MessageSquare } from 'lucide-react';

type NavView = 'map' | 'review' | 'upload' | 'ask' | 'search';

interface IconRailProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
}

const RAIL_ITEMS: { view: NavView; icon: React.ReactNode; label: string }[] = [
  { view: 'map', icon: <Map className="w-5 h-5" />, label: 'MAP' },
  { view: 'search', icon: <Search className="w-5 h-5" />, label: 'SEARCH' },
  { view: 'upload', icon: <Upload className="w-5 h-5" />, label: 'UPLOAD' },
  { view: 'review', icon: <CheckCircle2 className="w-5 h-5" />, label: 'REVIEW' },
  { view: 'ask', icon: <MessageSquare className="w-5 h-5" />, label: 'ASK' },
];

/**
 * SLOT-05 — Vertical Icon Rail (56px wide)
 * Active = amber left bar + amber-wash background.
 */
export const IconRail: React.FC<IconRailProps> = ({ activeView, onSelectView }) => {
  return (
    <nav
      id="slot-05-rail"
      className="flex flex-col items-center py-2 gap-1 select-none"
      style={{
        width: 56,
        background: 'var(--panel)',
        borderRight: '1px solid var(--line)',
      }}
    >
      {RAIL_ITEMS.map(({ view, icon, label }) => {
        const isActive = activeView === view;
        return (
          <button
            key={view}
            onClick={() => onSelectView(view)}
            title={label}
            className="relative w-full flex flex-col items-center justify-center py-2.5 transition-colors"
            style={{
              background: isActive ? 'var(--amber-wash)' : 'transparent',
              color: isActive ? 'var(--amber)' : 'var(--ink-3)',
            }}
          >
            {/* Active left bar */}
            {isActive && (
              <span
                className="absolute left-0 top-1 bottom-1"
                style={{ width: 3, background: 'var(--amber)', borderRadius: '0 2px 2px 0' }}
              />
            )}
            {icon}
            <span
              className="t-tag mt-0.5"
              style={{ fontSize: 8, letterSpacing: '0.12em' }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
