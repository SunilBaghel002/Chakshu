import React from 'react';
import {
  MapPin,
  Sparkles,
  ArrowLeftRight,
} from 'lucide-react';
import { COPY, BUTTON_COPY } from '../lib/copy';
import type { AoiItem } from '../lib/api';
import { ChakshuLogo } from './ui/ChakshuLogo';
import { getYearDifference } from '../lib/satelliteProviders';

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
  beforeDate?: string;
  afterDate?: string;
  onSelectBeforeDate?: (date: string) => void;
  onSelectAfterDate?: (date: string) => void;
  onSwapDates?: () => void;
  onRunAnalysis?: () => void;
  isAnalyzing?: boolean;
}

const formatDateDisplay = (dateStr?: string) => { if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthIdx = parseInt(parts[1] || '1', 10) - 1;
      return `${parts[2]} ${months[monthIdx] || parts[1]} ${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

/**
 * SLOT-01 — Command Bar (56px)
 * Modern aerospace header matching Target Design
 */
export const AppHeader: React.FC<AppHeaderProps> = React.memo(({
  aois,
  selectedAoiId,
  onSelectAoi,
  isMock,
  onToggleMock,
  beforeDate = '2021-01-15',
  afterDate = '2026-08-03',
  onSelectBeforeDate,
  onSelectAfterDate,
  onSwapDates,
  onRunAnalysis,
  isAnalyzing = false,
}) => {
  const gapYears = getYearDifference(beforeDate, afterDate);
  const formattedBefore = formatDateDisplay(beforeDate);
  const formattedAfter = formatDateDisplay(afterDate);

  return (
    <header
      id="slot-01-command"
      className="w-full flex items-center justify-between px-3 select-none gap-2"
      style={{
        height: 56,
        background: 'linear-gradient(180deg, var(--panel) 0%, rgba(14, 22, 38, 0.98) 100%)',
        borderBottom: '1px solid var(--line)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        zIndex: 30,
      }}
    >
      {/* 1. Left: Brand Lockup */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="relative flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full blur-sm opacity-30"
            style={{ background: 'var(--primary-cyan, #3FA9F5)' }}
          />
          <ChakshuLogo size={32} />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className="font-bold tracking-wider"
              style={{
                color: 'var(--ink)',
                fontSize: 15,
                fontFamily: 'var(--font-cond)',
                letterSpacing: '0.06em',
              }}
            >
              {'CHAKSHU'}
            </span>
            <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{`(${COPY.appNameDevanagari})`}</span>
          </div>
          <span
            className="t-tag font-bold"
            style={{
              color: 'var(--primary-cyan, #3FA9F5)',
              fontSize: 8,
              letterSpacing: '0.12em',
            }}
          >
            {'SATELLITE INTELLIGENCE'}
          </span>
        </div>
      </div>

      {/* 2. Location Chip */}
      <div className="hidden md:flex items-center shrink-0">
        <div
          className="flex items-center gap-2 px-3 py-1.5"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--line)',
            borderRadius: 6,
          }}
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary-cyan, #3FA9F5)' }} />
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <select
                value={selectedAoiId}
                onChange={(e) => onSelectAoi(e.target.value)}
                className="appearance-none bg-transparent font-bold focus:outline-none cursor-pointer pr-4"
                style={{
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.02em',
                }}
              >
                {aois.map((aoi) => (
                  <option
                    key={aoi.id}
                    value={aoi.id}
                    style={{ background: 'var(--panel)', color: 'var(--ink)' }}
                  >
                    {aoi.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <span className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 8.5 }}>
              {'Jewar, UP · 28.1309° N, 77.768° E'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Center: Date Range Selector Pill */}
      <div className="hidden lg:flex items-center shrink-0">
        <div
          className="flex items-center gap-2.5 px-3 py-1.5"
          style={{
            background: 'var(--well)',
            border: '1px solid var(--line)',
            borderRadius: 8,
          }}
        >
          {/* T0 Baseline */}
          <div className="relative flex items-center gap-1.5 cursor-pointer">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--warning-orange, #F59E0B)',
                display: 'inline-block',
                boxShadow: '0 0 6px rgba(245, 158, 11, 0.6)',
              }}
            />
            <span className="t-tag font-bold" style={{ color: 'var(--warning-orange, #F59E0B)', fontSize: 9 }}>
              {'T0'}
            </span>
            <span
              className="t-mono tabular-nums font-bold"
              style={{ color: 'var(--ink)', fontSize: 11 }}
            >
              {formattedBefore}
            </span>
            <input
              type="date"
              value={beforeDate}
              onChange={(e) => onSelectBeforeDate?.(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              title="Change T0 Baseline Date"
            />
          </div>

          {/* Swap Button */}
          <button
            type="button"
            onClick={onSwapDates}
            className="p-1 rounded cursor-pointer transition-colors hover:bg-[var(--panel-2)]"
            style={{ color: 'var(--ink-3)', border: 'none', background: 'transparent' }}
            title="Swap Before and After dates (Shortcut: S)"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          {/* T1 Observation */}
          <div className="relative flex items-center gap-1.5 cursor-pointer">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--primary-cyan, #3FA9F5)',
                display: 'inline-block',
                boxShadow: '0 0 6px rgba(63, 169, 245, 0.6)',
              }}
            />
            <span className="t-tag font-bold" style={{ color: 'var(--primary-cyan, #3FA9F5)', fontSize: 9 }}>
              {'T1'}
            </span>
            <span
              className="t-mono tabular-nums font-bold"
              style={{ color: 'var(--ink)', fontSize: 11 }}
            >
              {formattedAfter}
            </span>
            <input
              type="date"
              value={afterDate}
              onChange={(e) => onSelectAfterDate?.(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              title="Change T1 Observation Date"
            />
          </div>

          {/* Delta Pill */}
          <span
            className="t-mono font-bold px-2 py-0.5 rounded text-[9.5px]"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--verified-green, #10B981)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            {`Δ ${gapYears.toFixed(1)} YRS`}
          </span>
        </div>
      </div>

      {/* 4. Action Button: Detect Changes + Mode Label */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          id="detect-changes"
          type="button"
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-3.5 py-1.5 cursor-pointer transition-all duration-150 rounded"
          style={{
            background: 'var(--primary-cyan, #3FA9F5)',
            color: 'var(--tricolour-white, #FFFFFF)',
            border: 'none',
            borderRadius: 6,
            height: 36,
            fontWeight: 700,
            fontSize: 12,
            fontFamily: 'var(--font-cond)',
            letterSpacing: '0.04em',
            boxShadow: '0 0 12px rgba(63, 169, 245, 0.4)',
          }}
          title="Run Bi-temporal Change Detection (Shortcut: D)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAnalyzing ? BUTTON_COPY.detecting : BUTTON_COPY.detect}</span>
        </button>

        {/* Mode Label */}
        <div className="hidden xl:flex flex-col leading-tight t-mono" style={{ fontSize: 8, color: 'var(--ink-3)' }}>
          <span>{'Bi-temporal'}</span>
          <span style={{ color: 'var(--primary-cyan, #3FA9F5)', fontWeight: 700 }}>{'CVA Mode'}</span>
        </div>
      </div>

      {/* 5. Right: Telemetry Chips + User Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Usable Telemetry */}
        <span
          className="hidden sm:inline-flex t-tag px-2 py-1 rounded items-center gap-1"
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            color: 'var(--verified-green, #10B981)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: 8.5,
            fontWeight: 600,
          }}
        >
          {'✓ 96% Usable'}
        </span>

        {/* Cloud Cover */}
        <span
          className="hidden sm:inline-flex t-tag px-2 py-1 rounded items-center gap-1"
          style={{
            background: 'var(--panel-2)',
            color: 'var(--ink-2)',
            border: '1px solid var(--line)',
            fontSize: 8.5,
            fontWeight: 600,
          }}
        >
          {'1.2% Cloud'}
        </span>

        {/* Offline Ready Toggle */}
        <button
          type="button"
          onClick={onToggleMock}
          className="t-tag px-2 py-1 rounded flex items-center gap-1.5 cursor-pointer transition-all"
          style={{
            background: isMock ? 'rgba(16, 185, 129, 0.12)' : 'var(--cyan-wash, rgba(63, 169, 245, 0.12))',
            color: isMock ? 'var(--verified-green, #10B981)' : 'var(--primary-cyan, #3FA9F5)',
            border: `1px solid ${isMock ? 'rgba(16, 185, 129, 0.3)' : 'rgba(63, 169, 245, 0.3)'}`,
            fontSize: 8.5,
            fontWeight: 600,
          }}
          title={isMock ? 'Offline Demo Mode' : 'Live Satellite API'}
        >
          <span
            className={isMock ? '' : 'animate-dot-pulse'}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: isMock ? 'var(--verified-green, #10B981)' : 'var(--primary-cyan, #3FA9F5)',
              display: 'inline-block',
            }}
          />
          {isMock ? 'Offline Ready' : COPY.liveTag}
        </button>

        {/* User Profile Avatar */}
        <div
          className="flex items-center gap-2 px-2 py-1"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--line)',
            borderRadius: 6,
          }}
        >
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 26,
              height: 26,
              background: 'var(--primary-cyan, #3FA9F5)',
              color: 'var(--tricolour-white, #FFFFFF)',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {'AP'}
          </div>
          <div className="hidden xl:flex flex-col">
            <span className="t-mono font-bold" style={{ color: 'var(--ink)', fontSize: 9.5 }}>
              {'A. Patel'}
            </span>
            <span className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 7.5 }}>
              {'Sr. Geospatial Analyst'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
});
