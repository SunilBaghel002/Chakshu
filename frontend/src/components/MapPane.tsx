import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Evidence, DetectionSet } from '../lib/types';
import type { BBox } from '../lib/map-fx';
import { useMapPolygons } from '../lib/useMapPolygons';
import { SwipeCompare } from './SwipeCompare';
import { GhostNumeral } from './GhostNumeral';
import { MapReticleOverlay } from './MapReticleOverlay';
import { SectorTag } from './map/SectorTag';
import { ZoomStack } from './map/ZoomStack';
import { MapLegend } from './map/MapLegend';
import { CoordReadout } from './map/CoordReadout';
import { LockonTag } from './map/LockonTag';
import { getSatelliteTileConfig, type ImageryMode } from '../lib/satelliteProviders';
import { SatelliteIntelModal } from './SatelliteIntelModal';
import evidenceListFixture from '../fixtures/evidence_list.json';

interface MapPaneProps {
  selectedAoiId?: string;
  aoiCoords: [number, number];
  aoiBounds?: [[number, number], [number, number]];
  aoiName: string;
  evidenceList: Evidence[];
  selectedEvidenceId: string | null;
  onSelectEvidence: (evidence: Evidence) => void;
  detectionSet?: DetectionSet | null;
  sliderPos: number;
  onSliderChange: (pos: number) => void;
  isSwipeActive: boolean;
  onToggleSwipe: () => void;
  beforeDate: string;
  afterDate: string;
  availableDates?: string[];
  onSelectBeforeDate?: (date: string) => void;
  onSelectAfterDate?: (date: string) => void;
  onSwapDates?: () => void;
  presetTarget?: { center: [number, number]; zoom?: number; bounds?: [[number, number], [number, number]] } | null;
  onPresetConsumed?: () => void;
}

const CARTO_LABELS_URL = 'https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png';

/**
 * Convert [lat, lng] bounds to MapLibre [[minLng, minLat], [maxLng, maxLat]]
 */
function toMaplibreBounds(bounds: [[number, number], [number, number]]): [[number, number], [number, number]] {
  const minLng = Math.min(bounds[0][1], bounds[1][1]);
  const maxLng = Math.max(bounds[0][1], bounds[1][1]);
  const minLat = Math.min(bounds[0][0], bounds[1][0]);
  const maxLat = Math.max(bounds[0][0], bounds[1][0]);
  return [[minLng, minLat], [maxLng, maxLat]];
}

/**
 * SLOT-10 — Map Stage (The Imagery Well)
 * Engine: MapLibre GL JS 5 (WebGL GPU Accelerated)
 * Specs: PRD 9 §6 (M1–M4), §5.1; PRD 10 §4 (SLOT-11..18).
 */
export const MapPane: React.FC<MapPaneProps> = ({
  selectedAoiId,
  aoiCoords,
  aoiBounds,
  evidenceList,
  selectedEvidenceId,
  onSelectEvidence,
  sliderPos,
  onSliderChange,
  isSwipeActive,
  onToggleSwipe,
  beforeDate,
  afterDate,
  availableDates = [],
  onSelectBeforeDate,
  onSelectAfterDate,
  onSwapDates,
  presetTarget,
  onPresetConsumed,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  const mapAfterContainerRef = useRef<HTMLDivElement>(null);
  const mapAfterInstanceRef = useRef<maplibregl.Map | null>(null);

  const prevAoiIdRef = useRef<string | null>(null);

  const [imageryMode] = useState<ImageryMode>('hybrid_optimum');
  const [dehazeActive] = useState<boolean>(true);
  const [showIntelModal, setShowIntelModal] = useState<boolean>(false);

  // M1 / M4 Live Coordinate, Zoom, Pitch, and Sector State
  const [cursorLat, setCursorLat] = useState<number | null>(null);
  const [cursorLng, setCursorLng] = useState<number | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(14);
  const [pitch, setPitch] = useState<number>(0);
  const [bearing, setBearing] = useState<number>(0);
  const [currentSector, setCurrentSector] = useState<string>('SEC 04·B');
  const [hiddenLabelCount, setHiddenLabelCount] = useState<number>(0);
  const [isMeasureActive, setIsMeasureActive] = useState<boolean>(false);
  const [isLabelsActive, setIsLabelsActive] = useState<boolean>(true);

  // M3 Target Lock-On State
  const [lockedEvidence, setLockedEvidence] = useState<Evidence | null>(null);
  const [lockedBBox, setLockedBBox] = useState<BBox | null>(null);
  const isTagHoveredRef = useRef<boolean>(false);

  // Dev visual verification support (?mockHover=1, ?greyscale=1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('greyscale') === '1') {
      document.documentElement.style.filter = 'grayscale(1)';
    }
    if (params.get('mockHover') === '1') {
      const target = (evidenceList.length > 0 ? evidenceList[0] : (evidenceListFixture[0] as unknown as Evidence));
      setLockedEvidence(target || null);
      setLockedBBox({ minX: 420, minY: 280, maxX: 720, maxY: 480 });
      setCursorLat(28.1748);
      setCursorLng(77.6075);
    }
  }, [evidenceList]);

  // Primary MapLibre GL initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialTileConfig = isSwipeActive
      ? getSatelliteTileConfig(beforeDate, imageryMode, false)
      : getSatelliteTileConfig(afterDate, imageryMode, true);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: [initialTileConfig.url],
            tileSize: 256,
            maxzoom: initialTileConfig.maxZoom,
          },
          'carto-labels': {
            type: 'raster',
            tiles: [CARTO_LABELS_URL],
            tileSize: 256,
            maxzoom: 18,
          },
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite-tiles',
            paint: {
              'raster-opacity': 1,
              'raster-contrast': dehazeActive ? 0.2 : 0.05,
              'raster-saturation': 0.15,
            },
          },
          {
            id: 'carto-labels-layer',
            type: 'raster',
            source: 'carto-labels',
            paint: {
              'raster-opacity': 0.65,
            },
          },
        ],
      },
      center: [aoiCoords[1], aoiCoords[0]],
      zoom: 14,
      pitch: 0,
      bearing: 0,
      maxPitch: 85,
      attributionControl: false,
    });

    if (aoiBounds) {
      map.fitBounds(toMaplibreBounds(aoiBounds), { padding: 36, maxZoom: 15 });
    }

    let moveRaf: number | null = null;
    let lastLat: number | null = null;
    let lastLng: number | null = null;

    map.on('mousemove', (e: maplibregl.MapLayerMouseEvent) => {
      lastLat = e.lngLat.lat;
      lastLng = e.lngLat.lng;
      if (moveRaf === null) {
        moveRaf = requestAnimationFrame(() => {
          moveRaf = null;
          if (lastLat !== null && lastLng !== null) {
            const rLat = Number(lastLat.toFixed(4));
            const rLng = Number(lastLng.toFixed(4));
            setCursorLat((prev) => (prev === rLat ? prev : rLat));
            setCursorLng((prev) => (prev === rLng ? prev : rLng));
          }
        });
      }
    });

    map.on('mouseout', () => {
      if (moveRaf !== null) {
        cancelAnimationFrame(moveRaf);
        moveRaf = null;
      }
      setCursorLat(null);
      setCursorLng(null);
    });

    map.on('zoom', () => setCurrentZoom(Number(map.getZoom().toFixed(1))));
    map.on('rotate', () => setBearing(Math.round(map.getBearing())));
    map.on('pitch', () => setPitch(Math.round(map.getPitch())));

    mapInstanceRef.current = map;
    prevAoiIdRef.current = selectedAoiId ?? null;

    const handleResize = () => map.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (moveRaf !== null) cancelAnimationFrame(moveRaf);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update satellite tile layers on date / swipe changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const tileCfg = isSwipeActive
      ? getSatelliteTileConfig(beforeDate, imageryMode, false)
      : getSatelliteTileConfig(afterDate, imageryMode, true);

    const src = map.getSource('satellite-tiles') as (maplibregl.RasterTileSource & { setTiles?: (tiles: string[]) => void });
    if (src && typeof src.setTiles === 'function') {
      src.setTiles([tileCfg.url]);
    }
  }, [beforeDate, afterDate, imageryMode, isSwipeActive]);

  // Secondary Map for Swipe Compare
  useEffect(() => {
    if (!isSwipeActive) {
      if (mapAfterInstanceRef.current) {
        mapAfterInstanceRef.current.remove();
        mapAfterInstanceRef.current = null;
      }
      return;
    }

    if (!mapAfterContainerRef.current || mapAfterInstanceRef.current) return;
    const mainMap = mapInstanceRef.current;
    if (!mainMap) return;

    const afterTileConfig = getSatelliteTileConfig(afterDate, imageryMode, true);

    const mapAfter = new maplibregl.Map({
      container: mapAfterContainerRef.current,
      style: {
        version: 8,
        sources: {
          'satellite-tiles-after': {
            type: 'raster',
            tiles: [afterTileConfig.url],
            tileSize: 256,
            maxzoom: afterTileConfig.maxZoom,
          },
          'carto-labels-after': {
            type: 'raster',
            tiles: [CARTO_LABELS_URL],
            tileSize: 256,
            maxzoom: 18,
          },
        },
        layers: [
          {
            id: 'satellite-after-layer',
            type: 'raster',
            source: 'satellite-tiles-after',
            paint: {
              'raster-opacity': 1,
              'raster-contrast': dehazeActive ? 0.22 : 0.06,
              'raster-saturation': 0.18,
            },
          },
          {
            id: 'carto-labels-after-layer',
            type: 'raster',
            source: 'carto-labels-after',
            paint: {
              'raster-opacity': 0.65,
            },
          },
        ],
      },
      center: mainMap.getCenter(),
      zoom: mainMap.getZoom(),
      pitch: mainMap.getPitch(),
      bearing: mainMap.getBearing(),
      maxPitch: 85,
      interactive: false,
      attributionControl: false,
    });

    const syncCamera = () => {
      if (!mainMap || !mapAfterInstanceRef.current) return;
      mapAfter.jumpTo({
        center: mainMap.getCenter(),
        zoom: mainMap.getZoom(),
        bearing: mainMap.getBearing(),
        pitch: mainMap.getPitch(),
      });
    };

    mainMap.on('move', syncCamera);
    mapAfterInstanceRef.current = mapAfter;

    return () => {
      mainMap.off('move', syncCamera);
      mapAfter.remove();
      mapAfterInstanceRef.current = null;
    };
  }, [isSwipeActive, afterDate, imageryMode, dehazeActive]);

  // Apply swipe clip path
  const applyClip = useCallback((pct: number) => {
    if (mapAfterContainerRef.current) {
      mapAfterContainerRef.current.style.clipPath = `polygon(${pct}% 0, 100% 0, 100% 100%, ${pct}% 100%)`;
    }
  }, []);

  useEffect(() => {
    applyClip(sliderPos);
  }, [applyClip, sliderPos]);

  // AOI fly-to & camera presets
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedAoiId) return;

    if (prevAoiIdRef.current && prevAoiIdRef.current !== selectedAoiId) {
      prevAoiIdRef.current = selectedAoiId;
      if (aoiBounds) {
        map.fitBounds(toMaplibreBounds(aoiBounds), { padding: 36, maxZoom: 15, duration: 1200 });
      } else {
        map.flyTo({ center: [aoiCoords[1], aoiCoords[0]], zoom: 14, pitch: 0, bearing: 0, duration: 1200 });
      }
    } else if (!prevAoiIdRef.current) {
      prevAoiIdRef.current = selectedAoiId;
    }
  }, [selectedAoiId, aoiCoords, aoiBounds]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !presetTarget) return;

    if (presetTarget.bounds) {
      map.fitBounds(toMaplibreBounds(presetTarget.bounds), {
        padding: 36,
        maxZoom: presetTarget.zoom || 17,
        duration: 1000,
      });
    } else if (presetTarget.center && presetTarget.zoom) {
      map.flyTo({
        center: [presetTarget.center[1], presetTarget.center[0]],
        zoom: presetTarget.zoom,
        duration: 1000,
      });
    }
    onPresetConsumed?.();
  }, [presetTarget, onPresetConsumed]);

  // M3 Hover Lock-On
  const handleHoverWithBbox = useCallback((ev: Evidence | null, bbox: BBox | null) => {
    if (ev && bbox) {
      setLockedEvidence(ev);
      setLockedBBox(bbox);
    } else if (!isTagHoveredRef.current) {
      setLockedEvidence(null);
      setLockedBBox(null);
    }
  }, []);

  useMapPolygons({
    map: mapInstanceRef.current,
    evidenceList,
    selectedEvidenceId,
    onSelectEvidence,
    showAllPolygons: true,
    setHoveredEvidence: () => {},
    onHoverWithBbox: handleHoverWithBbox,
    onLabelsCollisionChange: setHiddenLabelCount,
    beforeDate,
    afterDate,
  });

  // Google Earth Tactical Camera HUD Handlers
  const handleZoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn({ duration: 300 });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut({ duration: 300 });
  }, []);

  const handleHome = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (aoiBounds) {
      map.fitBounds(toMaplibreBounds(aoiBounds), { padding: 36, maxZoom: 15, duration: 1200 });
    } else {
      map.flyTo({ center: [aoiCoords[1], aoiCoords[0]], zoom: 14, pitch: 0, bearing: 0, duration: 1200 });
    }
  }, [aoiBounds, aoiCoords]);

  const handleFitAoi = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (aoiBounds) {
      map.fitBounds(toMaplibreBounds(aoiBounds), { padding: 36, maxZoom: 15, duration: 1200 });
    } else {
      map.flyTo({ center: [aoiCoords[1], aoiCoords[0]], zoom: 14, pitch: 0, bearing: 0, duration: 1200 });
    }
  }, [aoiBounds, aoiCoords]);

  const handleResetBearing = useCallback(() => {
    mapInstanceRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 800 });
  }, []);

  const handleTogglePitch = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const targetPitch = map.getPitch() > 10 ? 0 : 55;
    map.easeTo({ pitch: targetPitch, duration: 800 });
  }, []);

  const handleToggleLabels = useCallback(() => {
    setIsLabelsActive((prev) => {
      const next = !prev;
      const map = mapInstanceRef.current;
      if (map && map.getLayer('carto-labels-layer')) {
        map.setLayoutProperty('carto-labels-layer', 'visibility', next ? 'visible' : 'none');
      }
      return next;
    });
  }, []);

  const handleToggleMeasure = useCallback(() => setIsMeasureActive((prev) => !prev), []);
  const handleSectorChange = useCallback((sec: string) => setCurrentSector(sec), []);
  const handleTagMouseEnter = useCallback(() => { isTagHoveredRef.current = true; }, []);
  const handleTagMouseLeave = useCallback(() => {
    isTagHoveredRef.current = false;
    setLockedEvidence(null);
    setLockedBBox(null);
  }, []);
  const handleCloseIntelModal = useCallback(() => setShowIntelModal(false), []);

  return (
    <div
      className="relative w-full h-full overflow-hidden corner-ticks"
      style={{
        background: 'var(--well)',
        border: '1px solid var(--line-strong)',
      }}
    >
      {/* Primary Map Stage */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Secondary Map Stage for Swipe Compare (After Side) */}
      {isSwipeActive && (
        <div
          ref={mapAfterContainerRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)`,
            zIndex: 'var(--z-map-sub)',
          }}
        />
      )}

      {/* Inner vignette & dot grid (PRD 9 §9) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, var(--well) 100%)',
          zIndex: 'var(--z-base)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none dot-grid"
        style={{ zIndex: 'var(--z-base)', opacity: 0.4 }}
      />

      {/* SLOT-15: Reticle, crosshair, enter sweep, and cursor glow */}
      <MapReticleOverlay
        containerRef={mapContainerRef}
        onSectorChange={handleSectorChange}
      />

      {/* SLOT-17: Ghost sector numeral */}
      <GhostNumeral sector={currentSector.slice(4, 6) || '04'} />

      {/* SLOT-11: Sector Tag (TL) */}
      <SectorTag sector={currentSector} />

      {/* SLOT-12: Zoom Stack / Google Earth 3D Tactical HUD (TR) */}
      <ZoomStack
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onHome={handleHome}
        onFitAoi={handleFitAoi}
        onToggleMeasure={handleToggleMeasure}
        isMeasureActive={isMeasureActive}
        bearing={bearing}
        pitch={pitch}
        onResetBearing={handleResetBearing}
        onTogglePitch={handleTogglePitch}
        onToggleLabels={handleToggleLabels}
        isLabelsActive={isLabelsActive}
      />

      {/* SLOT-13: Collapsible Legend (BL) */}
      <MapLegend hiddenLabelCount={hiddenLabelCount} />

      {/* SLOT-14: Live Monospace Coordinate Readout (BR) */}
      <CoordReadout
        lat={cursorLat}
        lng={cursorLng}
        zoom={currentZoom}
        visible={cursorLat !== null}
      />

      {/* SLOT-16: M3 Target Lock-On Overlay */}
      <LockonTag
        evidence={lockedEvidence}
        bbox={lockedBBox}
        onTagMouseEnter={handleTagMouseEnter}
        onTagMouseLeave={handleTagMouseLeave}
        onClick={onSelectEvidence}
      />

      {/* SLOT-18: Swipe Controller */}
      <SwipeCompare
        sliderPos={sliderPos}
        onSliderChange={onSliderChange}
        onDragMove={applyClip}
        isSwipeActive={isSwipeActive}
        onToggleSwipe={onToggleSwipe}
        beforeDate={beforeDate}
        afterDate={afterDate}
        availableDates={availableDates}
        onSelectBeforeDate={onSelectBeforeDate}
        onSelectAfterDate={onSelectAfterDate}
        onSwapDates={onSwapDates}
      />

      <SatelliteIntelModal
        isOpen={showIntelModal}
        onClose={handleCloseIntelModal}
        beforeDate={beforeDate}
        afterDate={afterDate}
        imageryMode={imageryMode}
      />
    </div>
  );
};
