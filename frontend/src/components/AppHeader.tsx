import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  Download,
  Layers,
  Radio,
  Sparkles,
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
  onExportClick?: () => void;
}

/**
 * SLOT-01 — Command Bar (56px)
 * Replaces duplicate sidebar navigation tabs with high-utility orbital intelligence tools:
 * 1. Live Mission Status Telemetry & Sensor Stream
 * 2. Quick Actions: Bands & Layers, Export Dossier, Fullscreen
 * 3. Offline / Live Satellite API Switcher
 * 4. Analyst Profile
 */
export const AppHeader: React.FC<AppHeaderProps> = React.memo(({
  aois,
  selectedAoiId,
  onSelectAoi,
  isMock,
  onToggleMock,
  areaLabel = '18.43 ha',
  usableScenes = 29,
  onExportClick,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

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
      {/* Left: Brand Lockup & Location AOI Selector */}
      <div className="flex items-center gap-space-md">
        <ChakshuLogo size={32} showText={true} subtext="Satellite Intelligence" />

        {/* Location AOI Selector Capsule */}
        <div className="hidden md:flex items-center gap-space-sm pl-space-sm border-l border-outline-variant/30">
          <div className="relative group">
            <div className="flex items-center gap-space-xs bg-surface-container px-space-sm py-1 rounded-md border border-outline-variant/40 hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-primary text-[16px]">location_on</span>
              <div className="flex items-baseline gap-1 text-left">
                <span className="font-label-md text-label-md font-semibold text-on-surface uppercase tracking-wide">
                  {currentAoi?.name ?? 'NOIDA INTERNATIONAL AIRPORT'}
                </span>
                <span className="hidden xl:inline font-label-sm text-[11px] text-on-surface-variant">
                  Jewar, UP
                </span>
              </div>
              <span className="material-symbols-outlined text-outline text-[14px]">expand_more</span>
              <select
                value={selectedAoiId}
                onChange={(e) => onSelectAoi(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Switch Area of Interest (AOI)"
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
          <div className="hidden lg:flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded border border-outline-variant/30 font-code-num text-[11px]">
            <span className="text-primary font-semibold">{areaLabel}</span>
            <span className="text-outline text-[9px]">AOI</span>
            <span className="text-outline-variant/40">|</span>
            <span className="text-secondary font-semibold">{usableScenes}</span>
            <span className="text-outline text-[9px]">PASSES</span>
          </div>
        </div>
      </div>

      {/* Center: Mission Stream & Orbital Telemetry Status (Replaces duplicate sidebar tabs) */}
      <div className="hidden lg:flex items-center gap-space-sm">
        {/* Live Satellite Stream Badge */}
        <div className="flex items-center gap-2 bg-surface-container px-3 py-1 rounded-full border border-outline-variant/30">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
          </span>
          <span className="font-code-num text-[11px] text-on-surface font-medium tracking-tight">
            ORBITAL FEED: <strong className="text-primary">SENTINEL-2 L2A + SKYSAT</strong>
          </span>
          <span className="text-outline-variant/50">|</span>
          <span className="font-code-num text-[11px] text-tertiary font-semibold">
            0.5m GSD
          </span>
        </div>
      </div>

      {/* Right: Quick Tools + Offline Toggle + Analyst Profile */}
      <div className="flex items-center gap-2">
        {/* Quick Action: Export Dossier */}
        {onExportClick && (
          <button
            type="button"
            onClick={onExportClick}
            className="flex items-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface px-2.5 py-1 rounded text-label-sm font-label-sm border border-outline-variant/30 transition-colors cursor-pointer"
            title="Export Intelligence Dossier (PDF / GeoJSON)"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        {/* Quick Action: Fullscreen Focus */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="w-8 h-8 rounded flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/30 transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Offline / Live Status Pill */}
        <button
          type="button"
          onClick={onToggleMock}
          title={isMock ? 'Offline Demo Mode' : 'Live Satellite API'}
          className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/30 hover:border-outline-variant/60 transition-colors cursor-pointer"
        >
          <div className={`w-2 h-2 rounded-full ${isMock ? 'bg-amber-400' : 'bg-tertiary animate-pulse'}`} />
          <span className="font-label-sm text-[11px] text-on-surface-variant">
            {isMock ? COPY.offlineTag : 'Offline Ready'}
          </span>
        </button>

        {/* User Analyst Avatar */}
        <div className="flex items-center gap-1.5 pl-1.5 border-l border-outline-variant/30">
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-code-num text-[11px] font-bold">
            AP
          </div>
          <div className="hidden xl:flex flex-col text-left leading-none">
            <span className="font-label-sm text-[11px] font-semibold text-on-surface">AP</span>
            <span className="font-label-sm text-[9px] text-outline">Analyst</span>
          </div>
        </div>
      </div>
    </header>
  );
});
