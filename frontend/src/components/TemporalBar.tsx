import React, { useState } from 'react';
import { Download, CheckSquare, Square, Hexagon, Cloud, Eye, EyeOff } from 'lucide-react';

interface TemporalBarProps {
  isSwipeActive?: boolean;
  onToggleSwipe?: () => void;
  sliderPos?: number;
  onExportGeoTiff?: () => void;
  showChangeVector?: boolean;
  onToggleChangeVector?: () => void;
  showPolygons?: boolean;
  onTogglePolygons?: () => void;
  showClouds?: boolean;
  onToggleClouds?: () => void;
  showUtmGrid?: boolean;
  onToggleUtmGrid?: () => void;
  // Legacy props preserved for backwards compatibility
  beforeDate?: string;
  afterDate?: string;
  onBeforeDateChange?: (d: string) => void;
  onAfterDateChange?: (d: string) => void;
  onSwapDates?: () => void;
  onRunAnalysis?: () => void;
  isAnalyzing?: boolean;
}

type DisplayMode = 'swipe' | 'split' | 'blend' | 'single';

/**
 * SLOT-02 — Viewport Controls (Subheader Map Controls)
 * Segmented display modes [SWIPE, SPLIT, BLEND, SINGLE], split ratio,
 * Layer toggles (Polygons / Cloud False-Alarm filter / UTM Grid), and Export GeoTIFF
 */
export const TemporalBar: React.FC<TemporalBarProps> = React.memo(({
  isSwipeActive = true,
  onToggleSwipe,
  sliderPos = 50,
  onExportGeoTiff,
  showPolygons = true,
  onTogglePolygons,
  showClouds = false,
  onToggleClouds,
  beforeDate = '2021-01-15',
}) => {
  const [activeMode, setActiveMode] = useState<DisplayMode>(isSwipeActive ? 'swipe' : 'single');
  const [utmGridChecked, setUtmGridChecked] = useState(true);

  const handleModeSelect = (mode: DisplayMode) => {
    setActiveMode(mode);
    if (mode === 'swipe' && !isSwipeActive) {
      onToggleSwipe?.();
    } else if (mode === 'single' && isSwipeActive) {
      onToggleSwipe?.();
    }
  };

  const modes: { key: DisplayMode; label: string; icon: string }[] = [
    { key: 'swipe', label: 'SWIPE', icon: '🔲' },
    { key: 'split', label: 'SPLIT', icon: '◫' },
    { key: 'blend', label: 'BLEND', icon: '◐' },
    { key: 'single', label: 'SINGLE', icon: '◻' },
  ];

  const splitL = Math.round(sliderPos);
  const splitR = Math.round(100 - sliderPos);

  const is2021Baseline = beforeDate.startsWith('2021');

  return (
    <div
      id="slot-02-temporal"
      className="w-full flex items-center justify-between px-3 select-none"
      style={{
        height: 44,
        background: 'var(--panel)',
        borderBottom: '1px solid var(--line)',
        zIndex: 20,
      }}
    >
      {/* Left: Segmented Display Mode Pills + Split Indicator */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center p-0.5 rounded gap-0.5"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--line-strong)',
            borderRadius: 6,
          }}
        >
          {modes.map(({ key, label, icon }) => {
            const isActive = activeMode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleModeSelect(key)}
                className="t-tag px-3 py-1 cursor-pointer transition-all duration-150 flex items-center gap-1.5 rounded"
                style={{
                  background: isActive ? 'var(--primary-cyan, #3FA9F5)' : 'transparent',
                  color: isActive ? 'var(--tricolour-white, #FFFFFF)' : 'var(--ink-3)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 9.5,
                  letterSpacing: '0.06em',
                  border: 'none',
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Monospace Split Ratio */}
        <span
          className="t-mono font-bold"
          style={{
            color: 'var(--primary-cyan, #3FA9F5)',
            fontSize: 10,
            letterSpacing: '0.04em',
          }}
        >
          {`Split: ${splitL}:${splitR}`}
        </span>
      </div>

      {/* Right: Cloud Toggle + Polygon Shutdown Toggle + Checkboxes + Export GeoTIFF Action */}
      <div className="flex items-center gap-3">
        {/* Cloud Filter Toggle Button (For 2021 Baseline or on demand) */}
        {is2021Baseline && onToggleClouds && (
          <button
            type="button"
            onClick={onToggleClouds}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer transition-all duration-150 t-tag"
            style={{
              background: showClouds ? 'var(--warning-wash, rgba(245, 158, 11, 0.12))' : 'var(--cyan-wash, rgba(63, 169, 245, 0.12))',
              color: showClouds ? 'var(--warning-orange, #F59E0B)' : 'var(--verified-green, #10B981)',
              border: `1px solid ${showClouds ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
              fontSize: 9.5,
              fontWeight: 600,
              borderRadius: 6,
            }}
            title={showClouds ? 'Turn Off Clouds (Show Real Dehazed Baseline)' : 'Turn On Clouds (Show Raw Capture Artifact)'}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{showClouds ? '☁️ Clouds: ON (Raw)' : '☁️ Clouds: OFF (Clean)'}</span>
          </button>
        )}

        {/* Shut Down / Remove Polygons Toggle Button */}
        {onTogglePolygons && (
          <button
            type="button"
            onClick={onTogglePolygons}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer transition-all duration-150 t-tag"
            style={{
              background: showPolygons ? 'var(--cyan-wash, rgba(63, 169, 245, 0.12))' : 'var(--panel-2)',
              color: showPolygons ? 'var(--primary-cyan, #3FA9F5)' : 'var(--ink-3)',
              border: `1px solid ${showPolygons ? 'rgba(63, 169, 245, 0.35)' : 'var(--line-strong)'}`,
              fontSize: 9.5,
              fontWeight: 600,
              borderRadius: 6,
            }}
            title={showPolygons ? 'Shut down change vector polygons to inspect pristine imagery (Key V)' : 'Display change vector polygons on map (Key V)'}
          >
            {showPolygons ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <Hexagon className="w-3.5 h-3.5" />
            <span>{showPolygons ? '⬡ Polygons: ON' : '⬡ Polygons: OFF'}</span>
          </button>
        )}

        {/* Change Vector Checkbox */}
        <button
          type="button"
          onClick={onTogglePolygons}
          className="flex items-center gap-1.5 cursor-pointer t-mono"
          style={{
            color: showPolygons ? 'var(--ink)' : 'var(--ink-3)',
            fontSize: 10.5,
            background: 'none',
            border: 'none',
          }}
          title="Toggle vector polygons on map"
        >
          {showPolygons ? (
            <CheckSquare className="w-3.5 h-3.5" style={{ color: 'var(--primary-cyan, #3FA9F5)' }} />
          ) : (
            <Square className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
          )}
          <span>{'Change Vector'}</span>
        </button>

        {/* UTM Grid Checkbox */}
        <button
          type="button"
          onClick={() => setUtmGridChecked(!utmGridChecked)}
          className="flex items-center gap-1.5 cursor-pointer t-mono"
          style={{
            color: utmGridChecked ? 'var(--ink)' : 'var(--ink-3)',
            fontSize: 10.5,
            background: 'none',
            border: 'none',
          }}
        >
          {utmGridChecked ? (
            <CheckSquare className="w-3.5 h-3.5" style={{ color: 'var(--primary-cyan, #3FA9F5)' }} />
          ) : (
            <Square className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
          )}
          <span>{'UTM Grid'}</span>
        </button>

        {/* Export GeoTIFF Button */}
        <button
          type="button"
          onClick={onExportGeoTiff}
          className="flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer transition-all duration-150 t-tag"
          style={{
            background: 'var(--panel-2)',
            color: 'var(--ink)',
            border: '1px solid var(--line-strong)',
            fontSize: 9.5,
            fontWeight: 600,
            borderRadius: 6,
          }}
          title="Export GeoTIFF Raster"
        >
          <Download className="w-3.5 h-3.5" style={{ color: 'var(--primary-cyan, #3FA9F5)' }} />
          <span>{'Export GeoTIFF'}</span>
        </button>
      </div>
    </div>
  );
});
