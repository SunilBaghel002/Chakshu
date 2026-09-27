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

  const currentAoi = aois.find((a) => a.id === selectedAoiId) ?? aois[0];

  return (
    <header
      id="slot-01-command"
      className="w-full flex items-center justify-between px-space-md select-none bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30"
      style={{
        height: 56,
        zIndex: 30,
      }}
    >
      {/* Left: Brand Lockup */}
      <div className="flex items-center gap-space-md">
        <ChakshuLogo size={32} showText={true} subtext="Satellite Intelligence" />
      </div>

      {/* Center: Location AOI Selector Capsule */}
      <div className="hidden md:flex items-center gap-space-md">
        <div className="relative group">
          <div className="flex items-center gap-space-sm bg-surface-container px-space-md py-1.5 rounded-lg border border-outline-variant/40 hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
            <div className="flex items-baseline gap-space-xs text-left">
              <span className="font-label-lg text-label-lg font-medium text-on-surface uppercase tracking-wide">
                {currentAoi?.name ?? 'NOIDA INTERNATIONAL AIRPORT'}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Jewar, Uttar Pradesh
              </span>
            </div>
            <span className="material-symbols-outlined text-outline text-[16px] ml-space-xs">expand_more</span>
            <select
              value={selectedAoiId}
              onChange={(e) => onSelectAoi(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              {aois.map((aoi) => (
                <option key={aoi.id} value={aoi.id} style={{ background: '#111720', color: '#DEE2ED' }}>
                  {aoi.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Telemetry Stats Pill */}
        <div className="flex items-center gap-space-sm bg-surface-container-low px-space-sm py-1.5 rounded-lg border border-outline-variant/30 font-code-num text-code-num">
          <span className="text-primary font-semibold">{areaLabel}</span>
          <span className="text-outline text-[10px]">AREA</span>
          <span className="text-outline-variant">|</span>
          <span className="text-secondary font-semibold">{usableScenes}</span>
          <span className="text-outline text-[10px]">PASSES</span>
        </div>
      </div>

      {/* Right: Nav Tabs + Offline Pill + Help + Analyst Badge */}
      <div className="flex items-center gap-space-md">
        {/* Nav tabs segmented deck */}
        <div className="hidden lg:flex items-center bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/30">
          {tabs.map(({ key, label }) => {
            const isActive = activeView === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectView(key)}
                className={`font-label-sm text-[11px] px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Offline / Live Status Pill */}
        <button
          type="button"
          onClick={onToggleMock}
          title={isMock ? 'Offline Demo Mode' : 'Live Satellite API'}
          className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-1 rounded-full border border-outline-variant/20 hover:border-outline-variant/40 transition-colors cursor-pointer"
        >
          <div className={`w-2 h-2 rounded-full ${isMock ? 'bg-amber-400' : 'bg-tertiary animate-pulse'}`} />
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {isMock ? COPY.offlineTag : 'Offline Ready'}
          </span>
        </button>

        {/* User Analyst Avatar */}
        <div className="flex items-center gap-space-sm pl-space-xs border-l border-outline-variant/30">
          <div className="w-8 h-8 rounded-full bg-primary-container/20 border border-primary/40 flex items-center justify-center text-primary font-code-num text-xs font-bold">
            AP
          </div>
          <div className="hidden xl:flex flex-col text-left leading-tight">
            <span className="font-label-md text-label-md font-semibold text-on-surface">AP</span>
            <span className="font-label-sm text-[10px] text-outline">Analyst</span>
          </div>
        </div>
      </div>
    </header>
  );
});
