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
export const AppHeader: React.FC<AppHeaderProps> = React.memo(({
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
        background: 'linear-gradient(180deg, var(--panel) 0%, rgba(14, 22, 38, 0.98) 100%)',
        borderBottom: '1px solid var(--line)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        zIndex: 30,
      }}
    >
      {/* Left: Brand Lockup */}
      <div className="flex items-center gap-3">
        {/* Sovereign Platform Logo with glow */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full blur-sm opacity-40"
            style={{ background: 'var(--signal)' }}
          />
          <ChakshuLogo size={36} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="t-h1 font-bold" style={{ color: 'var(--signal)', fontSize: 17, letterSpacing: '0.05em' }}>
              {COPY.appNameDevanagari}
            </span>
            <span className="t-h2 font-mono font-bold tracking-wider" style={{ color: 'var(--ink)', fontSize: 13.5, letterSpacing: '0.08em' }}>
              {COPY.appName}
            </span>
            <span className="t-tag font-bold" style={{
              background: 'linear-gradient(135deg, rgba(255, 148, 38, 0.18) 0%, rgba(255, 148, 38, 0.08) 100%)',
              color: 'var(--signal)',
              border: '1px solid var(--signal)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 7px',
              fontSize: 8.5,
              letterSpacing: '0.1em',
              boxShadow: '0 0 8px rgba(255, 148, 38, 0.2)',
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
            className="flex items-center gap-2 pl-3 pr-8 py-1.5 cursor-pointer transition-colors hover:border-[var(--signal)]"
            style={{
              background: 'var(--panel-2)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--signal)' }} />
            <select
              value={selectedAoiId}
              onChange={(e) => onSelectAoi(e.target.value)}
              className="appearance-none bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}
            >
              {aois.map((aoi) => (
                <option key={aoi.id} value={aoi.id} style={{ background: 'var(--panel)', color: 'var(--ink)' }}>
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

        {/* Stats Flight Telemetry Bezel */}
        <div
          className="flex items-center gap-3 px-3 py-1.5 t-tag"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <span className="flex items-center gap-1.5 tabular-nums" style={{ color: 'var(--signal)' }}>
            <span style={{ fontSize: 13.5, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{areaLabel}</span>
            <span style={{ color: 'var(--ink-3)', fontSize: 8 }}>AREA</span>
          </span>
          <span style={{ color: 'var(--line-strong)' }}>|</span>
          <span className="flex items-center gap-1.5 tabular-nums" style={{ color: 'var(--ion)' }}>
            <span style={{ fontSize: 13.5, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{usableScenes}</span>
            <span style={{ color: 'var(--ink-3)', fontSize: 8 }}>PASSES</span>
          </span>
        </div>
      </div>

      {/* Right: Nav Tabs + LIVE */}
      <div className="flex items-center gap-2.5">
        {/* Nav tabs segmented deck */}
        <div
          className="flex items-center p-0.5 gap-0.5"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius)',
          }}
        >
          {tabs.map(({ key, label }) => {
            const isActive = activeView === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectView(key)}
                className="t-tag px-3 py-1.5 transition-all duration-150 relative cursor-pointer"
                style={{
                  background: isActive ? 'var(--signal-wash)' : 'transparent',
                  color: isActive ? 'var(--signal)' : 'var(--ink-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: isActive ? '1px solid rgba(255, 148, 38, 0.3)' : '1px solid transparent',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 9.5,
                  letterSpacing: '0.08em',
                }}
              >
                {label}
                {/* Active bottom glow accent */}
                {isActive && (
                  <span
                    className="absolute -bottom-0.5 left-2 right-2"
                    style={{
                      height: 2,
                      background: 'var(--signal)',
                      borderRadius: 1,
                      boxShadow: '0 0 6px var(--signal)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* LIVE / OFFLINE Telemetry Beacon */}
        <button
          type="button"
          onClick={onToggleMock}
          title={isMock ? 'Offline Demo Mode' : 'Live Satellite API'}
          className="flex items-center gap-2 px-3 py-1.5 t-tag cursor-pointer transition-all duration-150 rounded"
          style={{
            background: isMock ? 'var(--signal-wash)' : 'var(--ion-wash)',
            border: `1px solid ${isMock ? 'var(--signal)' : 'var(--ion)'}`,
            color: isMock ? 'var(--signal)' : 'var(--ion)',
            boxShadow: isMock ? '0 0 8px rgba(255, 148, 38, 0.25)' : '0 0 10px rgba(63, 169, 245, 0.3)',
          }}
        >
          <span
            className={isMock ? '' : 'animate-dot-pulse'}
            style={{
              width: 6.5,
              height: 6.5,
              borderRadius: '50%',
              background: isMock ? 'var(--signal)' : 'var(--ion)',
              display: 'inline-block',
              boxShadow: isMock ? '0 0 6px var(--signal)' : '0 0 8px var(--ion)',
            }}
          />
          <span className="hidden lg:inline tracking-wider font-bold text-[9px]">
            {isMock ? COPY.offlineTag : COPY.liveTag}
          </span>
        </button>
      </div>
    </header>
  );
});
