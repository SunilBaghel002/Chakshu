import React from 'react';
import {
  ChevronDown,
  MapPin,
} from 'lucide-react';
import { COPY } from '../lib/copy';
import type { AoiItem } from '../lib/api';

interface AppHeaderProps {
  aois: AoiItem[];
  selectedAoiId: string;
  onSelectAoi: (aoiId: string) => void;
  activeView: 'map' | 'review' | 'upload' | 'ask' | 'search' | 'audit';
  onSelectView: (view: 'map' | 'review' | 'upload' | 'ask' | 'search' | 'audit') => void;
  isMock: boolean;
  onToggleMock: () => void;
  areaLabel?: string;
  sceneCount?: number;
  usableScenes?: number;
}

/**
 * SLOT-01 — Command Bar (56px)
 * Iris lockup + brand + AOI selector + stats + nav tabs + LIVE indicator
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  aois,
  selectedAoiId,
  onSelectAoi,
  activeView,
  onSelectView,
  isMock,
  onToggleMock,
  areaLabel = '18.43 ha',
  usableScenes = 29,
}) => {
  const tabs: { key: typeof activeView; label: string }[] = [
    { key: 'map', label: 'MAP' },
    { key: 'review', label: 'REVIEW' },
    { key: 'upload', label: 'UPLOAD' },
    { key: 'search', label: 'SEARCH' },
    { key: 'ask', label: 'ASK' },
  ];

  return (
    <header
      id="slot-01-command"
      className="w-full flex items-center justify-between px-4 select-none"
      style={{
        height: 56,
        background: 'var(--panel)',
        borderBottom: '1px solid var(--line)',
        zIndex: 30,
      }}
    >
      {/* Left: Brand Lockup */}
      <div className="flex items-center gap-3">
        {/* Amber Iris SVG */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            background: 'var(--bg)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius)',
          }}
        >
          <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="21" stroke="var(--amber)" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="3 3" />
            <circle cx="24" cy="24" r="16" stroke="var(--amber)" strokeWidth="2" strokeOpacity="0.6" />
            <circle cx="24" cy="24" r="11" stroke="var(--amber)" strokeWidth="2.5" strokeOpacity="0.9" />
            <circle cx="24" cy="24" r="5" fill="var(--amber)" className="animate-iris-pulse" />
          </svg>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="t-h1" style={{ color: 'var(--amber)', fontSize: 16, letterSpacing: '0.04em' }}>
              {COPY.appNameDevanagari}
            </span>
            <span className="t-h2" style={{ color: 'var(--ink)', fontSize: 14, letterSpacing: '0.04em' }}>
              ({COPY.appName})
            </span>
            <span className="t-tag" style={{
              background: 'var(--amber-wash)',
              color: 'var(--amber)',
              border: '1px solid var(--amber)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 6px',
              fontSize: 9,
            }}>
              {COPY.orgTag}
            </span>
          </div>
        </div>
      </div>

      {/* Center: AOI Selector + Stats */}
      <div className="hidden md:flex items-center gap-3">
        {/* AOI Selector */}
        <div className="relative">
          <div
            className="flex items-center gap-1.5 pl-2.5 pr-8 py-1.5 cursor-pointer"
            style={{
              background: 'var(--panel-2)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius)',
            }}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--amber)' }} />
            <select
              value={selectedAoiId}
              onChange={(e) => onSelectAoi(e.target.value)}
              className="appearance-none bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}
            >
              {aois.map((aoi) => (
                <option key={aoi.id} value={aoi.id} style={{ background: 'var(--panel)' }}>
                  {aoi.name}
                </option>
              ))}
            </select>
          </div>
          <ChevronDown
            className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--ink-3)' }}
          />
        </div>

        {/* Stats pills */}
        <div
          className="flex items-center gap-3 px-3 py-1.5 t-tag"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
          }}
        >
          <span className="flex items-center gap-1 tabular-nums" style={{ color: 'var(--amber)' }}>
            <span style={{ fontSize: 14, fontFamily: 'var(--font-cond)', fontWeight: 700 }}>{areaLabel}</span>
            <span style={{ color: 'var(--ink-3)' }}>AREA</span>
          </span>
          <span style={{ color: 'var(--line-strong)' }}>·</span>
          <span className="flex items-center gap-1 tabular-nums" style={{ color: 'var(--teal)' }}>
            <span style={{ fontSize: 14, fontFamily: 'var(--font-cond)', fontWeight: 700 }}>{usableScenes}</span>
            <span style={{ color: 'var(--ink-3)' }}>PASSES</span>
          </span>
        </div>
      </div>

      {/* Right: Nav Tabs + LIVE */}
      <div className="flex items-center gap-2">
        {/* Nav tabs */}
        <div
          className="flex items-center p-0.5 gap-0.5"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
          }}
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSelectView(key)}
              className="t-tag px-3 py-1.5 transition-colors relative"
              style={{
                background: activeView === key ? 'var(--amber-wash)' : 'transparent',
                color: activeView === key ? 'var(--amber)' : 'var(--ink-3)',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeView === key ? 700 : 600,
              }}
            >
              {label}
              {/* Active underline */}
              {activeView === key && (
                <span
                  className="absolute bottom-0 left-1/4 right-1/4"
                  style={{ height: 2, background: 'var(--amber)', borderRadius: 1 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* LIVE / OFFLINE indicator */}
        <button
          onClick={onToggleMock}
          title={isMock ? 'Offline Demo Mode' : 'Live Satellite API'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 t-tag cursor-pointer transition-colors"
          style={{
            background: isMock ? 'var(--amber-wash)' : 'var(--teal-wash)',
            border: `1px solid ${isMock ? 'var(--amber)' : 'var(--teal)'}`,
            color: isMock ? 'var(--amber)' : 'var(--teal)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <span
            className={isMock ? '' : 'animate-dot-pulse'}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isMock ? 'var(--amber)' : 'var(--teal)',
              display: 'inline-block',
            }}
          />
          <span className="hidden lg:inline">{isMock ? COPY.offlineTag : COPY.liveTag}</span>
        </button>
      </div>
    </header>
  );
};
