import React from 'react';
import {
  ChevronDown,
  MapPin,
} from 'lucide-react';
import { COPY } from '../lib/copy';
import type { AoiItem } from '../lib/api';
import { ChakshuLogo } from './ui/ChakshuLogo';

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
    { key: 'audit', label: 'AUDIT' },
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
        {/* Sovereign Platform Logo */}
        <ChakshuLogo size={36} />

        <div>
          <div className="flex items-center gap-2">
            <span className="t-h1" style={{ color: 'var(--signal)', fontSize: 16, letterSpacing: '0.04em' }}>
              {COPY.appNameDevanagari}
            </span>
            <span className="t-h2 font-mono" style={{ color: 'var(--ink)', fontSize: 13, letterSpacing: '0.06em' }}>
              {COPY.appName}
            </span>
            <span className="t-tag" style={{
              background: 'var(--signal-wash)',
              color: 'var(--signal)',
              border: '1px solid var(--signal)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 6px',
              fontSize: 9,
              letterSpacing: '0.08em',
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
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--signal)' }} />
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
          <span className="flex items-center gap-1 tabular-nums" style={{ color: 'var(--signal)' }}>
            <span style={{ fontSize: 14, fontFamily: 'var(--font-cond)', fontWeight: 700 }}>{areaLabel}</span>
            <span style={{ color: 'var(--ink-3)' }}>AREA</span>
          </span>
          <span style={{ color: 'var(--line-strong)' }}>·</span>
          <span className="flex items-center gap-1 tabular-nums" style={{ color: 'var(--ion)' }}>
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
                background: activeView === key ? 'var(--signal-wash)' : 'transparent',
                color: activeView === key ? 'var(--signal)' : 'var(--ink-2)',
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
                  style={{ height: 2, background: 'var(--signal)', borderRadius: 1 }}
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
            background: isMock ? 'var(--signal-wash)' : 'var(--ion-wash)',
            border: `1px solid ${isMock ? 'var(--signal)' : 'var(--ion)'}`,
            color: isMock ? 'var(--signal)' : 'var(--ion)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <span
            className={isMock ? '' : 'animate-dot-pulse'}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isMock ? 'var(--signal)' : 'var(--ion)',
              display: 'inline-block',
            }}
          />
          <span className="hidden lg:inline">{isMock ? COPY.offlineTag : COPY.liveTag}</span>
        </button>
      </div>
    </header>
  );
};
