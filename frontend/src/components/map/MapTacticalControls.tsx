import React from 'react';

interface MapTacticalControlsProps {
  showPolygons?: boolean;
  onTogglePolygons?: () => void;
  beforeDate: string;
  showClouds?: boolean;
  onToggleClouds?: () => void;
}

/**
 * Floating Tactical Map Controls: Polygons Shutdown [Key V] & Baseline Cloud Toggle
 */
export const MapTacticalControls: React.FC<MapTacticalControlsProps> = ({
  showPolygons = true,
  onTogglePolygons,
  beforeDate,
  showClouds = false,
  onToggleClouds,
}) => {
  return (
    <div
      className="absolute top-3 flex items-center gap-1.5 select-none pointer-events-auto"
      style={{ left: 285, zIndex: 'var(--z-toolbar, 35)' }}
    >
      {onTogglePolygons && (
        <button
          type="button"
          onClick={onTogglePolygons}
          className="t-tag flex items-center gap-1 px-2.5 py-1 rounded cursor-pointer transition-all duration-150 backdrop-blur-md"
          style={{
            background: showPolygons
              ? 'var(--panel-2)'
              : 'rgba(239, 68, 68, 0.2)',
            color: showPolygons
              ? 'var(--primary-cyan, var(--amber))'
              : 'var(--ink-2)',
            border: `1px solid ${showPolygons ? 'rgba(63, 169, 245, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            fontSize: 9,
            fontWeight: 600,
          }}
          title="Toggle Change Vector Polygons on Map (Key V)"
        >
          <span>{showPolygons ? '⬡ Polygons [V]: ON' : '⬡ Polygons [V]: OFF'}</span>
        </button>
      )}

      {beforeDate.startsWith('2021') && onToggleClouds && (
        <button
          type="button"
          onClick={onToggleClouds}
          className="t-tag flex items-center gap-1 px-2.5 py-1 rounded cursor-pointer transition-all duration-150 backdrop-blur-md"
          style={{
            background: showClouds
              ? 'rgba(245, 158, 11, 0.2)'
              : 'rgba(16, 185, 129, 0.2)',
            color: showClouds
              ? 'var(--warning-orange, var(--signal))'
              : 'var(--verified-green, var(--positive))',
            border: `1px solid ${showClouds ? 'rgba(245, 158, 11, 0.45)' : 'rgba(16, 185, 129, 0.4)'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            fontSize: 9,
            fontWeight: 600,
          }}
          title={showClouds ? 'Turn Off Clouds (Return to Clean Dehazed Baseline)' : 'Turn On Clouds (Inspect Raw Capture with Cloud Artifact)'}
        >
          <span>{showClouds ? '☁️ Baseline Cloud: ON' : '☁️ Cloudless Baseline'}</span>
        </button>
      )}
    </div>
  );
};
