import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import type { Evidence, DetectionSet } from '../lib/types';
import { type BBox, trackMapHover, trackMapViewport } from '../lib/map-fx';
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
  selectedAoiId?: string; aoiCoords: [number, number]; aoiBounds?: [[number, number], [number, number]];
  aoiName: string; evidenceList: Evidence[]; selectedEvidenceId: string | null;
  onSelectEvidence: (evidence: Evidence) => void; detectionSet?: DetectionSet | null;
  sliderPos: number; onSliderChange: (pos: number) => void; isSwipeActive: boolean; onToggleSwipe: () => void;
  beforeDate: string; afterDate: string; availableDates?: string[];
  onSelectBeforeDate?: (date: string) => void; onSelectAfterDate?: (date: string) => void; onSwapDates?: () => void;
  presetTarget?: { center: [number, number]; zoom?: number; bounds?: [[number, number], [number, number]] } | null;
  onPresetConsumed?: () => void;
}

/**
 * SLOT-10 — Map Stage (The Imagery Well)
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
  const mapInstanceRef = useRef<L.Map | null>(null);
  const beforeTileLayerRef = useRef<L.TileLayer | null>(null);
  const afterTileLayerRef = useRef<L.TileLayer | null>(null);
  const prevAoiIdRef = useRef<string | null>(null);

  const [imageryMode] = useState<ImageryMode>('hybrid_optimum');
  const [dehazeActive] = useState<boolean>(true);
  const [showIntelModal, setShowIntelModal] = useState<boolean>(false);

  // M1 / M4 Live Coordinate and Sector State
  const [cursorLat, setCursorLat] = useState<number | null>(null);
  const [cursorLng, setCursorLng] = useState<number | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(14);
  const [currentSector, setCurrentSector] = useState<string>('SEC 04·B');
  const [hiddenLabelCount, setHiddenLabelCount] = useState<number>(0);
  const [isMeasureActive, setIsMeasureActive] = useState<boolean>(false);

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


  // Initialize Leaflet Map once on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: aoiCoords,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });
    if (aoiBounds) map.fitBounds(aoiBounds, { padding: [36, 36], maxZoom: 15 });

    const beforePane = map.createPane('beforePane');
    beforePane.style.zIndex = '200';
    beforePane.style.transform = 'translate3d(0,0,0)';
    beforePane.style.filter = 'saturate(1.08) contrast(1.04) brightness(1.02)';
    const beforeCfg = getSatelliteTileConfig(beforeDate, imageryMode, false);
    const beforeSatellite = L.tileLayer(beforeCfg.url, {
      maxZoom: beforeCfg.maxZoom,
      maxNativeZoom: beforeCfg.maxNativeZoom,
      pane: 'beforePane',
      opacity: 1,
    });
    beforeSatellite.addTo(map);
    beforeTileLayerRef.current = beforeSatellite;

    const afterPane = map.createPane('afterPane');
    afterPane.style.zIndex = '450';
    afterPane.style.transform = 'translate3d(0,0,0)';
    afterPane.style.willChange = 'clip-path';
    afterPane.style.filter = dehazeActive
      ? 'contrast(1.22) saturate(1.28) brightness(0.96)'
      : 'saturate(1.08) contrast(1.06) brightness(1.02)';
    const afterCfg = getSatelliteTileConfig(afterDate, imageryMode, true);
    const afterSatellite = L.tileLayer(afterCfg.url, {
      maxZoom: afterCfg.maxZoom,
      maxNativeZoom: afterCfg.maxNativeZoom,
      pane: 'afterPane',
      opacity: 1,
    });
    afterSatellite.addTo(map);
    afterTileLayerRef.current = afterSatellite;

    const polygonsPane = map.createPane('polygonsPane');
    polygonsPane.style.zIndex = '500';
    polygonsPane.style.pointerEvents = 'auto';

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 18, opacity: 0.5 }
    ).addTo(map);

    let moveRaf: number | null = null;
    let lastLat: number | null = null;
    let lastLng: number | null = null;

    const onLeafletMouseMove = (e: L.LeafletMouseEvent) => {
      lastLat = e.latlng.lat;
      lastLng = e.latlng.lng;
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
    };

    const onLeafletMouseOut = () => {
      if (moveRaf !== null) {
        cancelAnimationFrame(moveRaf);
        moveRaf = null;
      }
      setCursorLat(null);
      setCursorLng(null);
    };

    map.on('mousemove', onLeafletMouseMove);
    map.on('mouseout', onLeafletMouseOut);
    map.on('zoomend', () => setCurrentZoom(map.getZoom()));
    map.on('moveend', () => {
      const c = map.getCenter();
      trackMapViewport(map.getZoom(), [c.lat, c.lng]);
    });

    mapInstanceRef.current = map;
    prevAoiIdRef.current = selectedAoiId ?? null;
    setTimeout(() => map.invalidateSize(), 150);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (moveRaf !== null) cancelAnimationFrame(moveRaf);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update satellite tile layers on date changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const bCfg = getSatelliteTileConfig(beforeDate, imageryMode, false);
    if (beforeTileLayerRef.current) beforeTileLayerRef.current.setUrl(bCfg.url);
    const aCfg = getSatelliteTileConfig(afterDate, imageryMode, true);
    if (afterTileLayerRef.current) afterTileLayerRef.current.setUrl(aCfg.url);
  }, [beforeDate, afterDate, imageryMode]);

  // Swipe clip path application
  const applyClip = useCallback((pct: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const afterPane = map.getPane('afterPane');
    const polyPane = map.getPane('polygonsPane');
    if (!afterPane) return;
    if (!isSwipeActive) {
      afterPane.style.display = 'none';
      if (polyPane) { polyPane.style.display = 'block'; polyPane.style.clipPath = 'none'; }
      return;
    }
    afterPane.style.display = 'block';
    if (polyPane) polyPane.style.display = 'block';
    const w = mapContainerRef.current?.offsetWidth || map.getSize().x;
    const h = mapContainerRef.current?.offsetHeight || map.getSize().y;
    const nw = map.containerPointToLayerPoint([0, 0]);
    const se = map.containerPointToLayerPoint([w, h]);
    const clipX = map.containerPointToLayerPoint([(pct / 100) * w, 0]).x;
    const isNormal = beforeDate <= afterDate;
    const top = nw.y - 3000, bot = se.y + 3000, l = nw.x - 3000, r = se.x + 3000;
    const clip = isNormal
      ? `polygon(${clipX}px ${top}px, ${r}px ${top}px, ${r}px ${bot}px, ${clipX}px ${bot}px)`
      : `polygon(${l}px ${top}px, ${clipX}px ${top}px, ${clipX}px ${bot}px, ${l}px ${bot}px)`;
    afterPane.style.clipPath = clip;
    if (polyPane) polyPane.style.clipPath = clip;
  }, [isSwipeActive, beforeDate, afterDate]);

  useEffect(() => {
    applyClip(sliderPos);
    const map = mapInstanceRef.current;
    if (!map) return;
    const onSync = () => applyClip(sliderPos);
    map.on('move zoom resize', onSync);
    return () => { map.off('move zoom resize', onSync); };
  }, [applyClip, sliderPos]);
  // AOI fly-to & camera presets
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedAoiId) return;
    if (prevAoiIdRef.current && prevAoiIdRef.current !== selectedAoiId) {
      prevAoiIdRef.current = selectedAoiId;
      if (aoiBounds) mapInstanceRef.current.fitBounds(aoiBounds, { padding: [36, 36], maxZoom: 15, animate: true });
      else mapInstanceRef.current.flyTo(aoiCoords, 14, { duration: 1.2 });
    } else if (!prevAoiIdRef.current) prevAoiIdRef.current = selectedAoiId;
  }, [selectedAoiId, aoiCoords, aoiBounds]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !presetTarget) return;
    if (presetTarget.bounds) map.fitBounds(presetTarget.bounds, { padding: [36, 36], maxZoom: presetTarget.zoom || 17, animate: true });
    else if (presetTarget.center && presetTarget.zoom) map.flyTo(presetTarget.center, presetTarget.zoom, { duration: 1.0 });
    onPresetConsumed?.();
  }, [presetTarget, onPresetConsumed]);

  // M3 Hover Lock-On
  const handleHoverWithBbox = useCallback((ev: Evidence | null, bbox: BBox | null) => {
    if (ev && bbox) {
      setLockedEvidence(ev);
      setLockedBBox(bbox);
      trackMapHover(ev.change_object_id);
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

  const handleZoomIn = useCallback(() => mapInstanceRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapInstanceRef.current?.zoomOut(), []);
  const handleHome = useCallback(() => {
    if (aoiBounds && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(aoiBounds, { padding: [36, 36], maxZoom: 15, animate: true });
    } else {
      mapInstanceRef.current?.flyTo(aoiCoords, 14);
    }
  }, [aoiBounds, aoiCoords]);
  const handleFitAoi = useCallback(() => {
    if (aoiBounds && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(aoiBounds, { padding: [36, 36], maxZoom: 15, animate: true });
    } else {
      mapInstanceRef.current?.flyTo(aoiCoords, 14);
    }
  }, [aoiBounds, aoiCoords]);
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
      className="relative w-full h-full overflow-hidden select-none bg-surface-container-lowest"
    >
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Cartographic grid reticle */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid-pattern" width="160" height="160" patternUnits="userSpaceOnUse">
            <path d="M 160 0 L 0 0 0 160" fill="none" stroke="#dee2ed" strokeWidth="0.5" strokeDasharray="2,4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      {/* TOP-LEFT: Stitch Target AOI HUD Card */}
      <div className="absolute top-space-md left-space-md z-20 pointer-events-auto">
        <div className="bg-surface-container-lowest/90 backdrop-blur-md p-space-md rounded-lg shadow-md max-w-xs flex flex-col gap-1 border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[10px] text-primary tracking-widest uppercase font-semibold">
              Target AOI #8419
            </span>
            <span className="font-label-sm text-[10px] text-tertiary flex items-center gap-1 font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              VERIFIED
            </span>
          </div>
          <div className="font-headline-md text-headline-md font-semibold text-on-surface tracking-tight mt-0.5">
            NOIDA INTERNATIONAL AIRPORT
          </div>
          <div className="flex items-center gap-space-sm text-on-surface-variant font-code-num text-[11px] mt-0.5">
            <span>28.130° N, 77.760° E</span>
            <span>•</span>
            <span>1,334 ha Total</span>
          </div>
          <div className="pt-1 mt-1 border-t border-outline-variant/20 flex items-center justify-between text-on-surface-variant font-label-sm text-[10px]">
            <span className="text-outline">Sensor Fusion:</span>
            <span className="font-mono text-on-surface font-medium">Sentinel-2 L2A + SkySat-3</span>
          </div>
        </div>
      </div>

      {/* TOP-RIGHT: Stitch Sensor & Spectral Filter Pills */}
      <div className="absolute top-space-md right-space-md z-20 pointer-events-auto hidden md:flex items-center gap-space-xs">
        <div className="bg-surface-container-lowest/90 backdrop-blur-md px-space-sm py-1 rounded font-label-sm text-[11px] text-on-surface-variant flex items-center gap-1 shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-[13px] text-primary">palette</span>
          <span>Band: <strong className="text-on-surface font-medium">True Color (RGB)</strong></span>
        </div>
        <div className="bg-surface-container-lowest/90 backdrop-blur-md px-space-sm py-1 rounded font-label-sm text-[11px] text-on-surface-variant flex items-center gap-1 shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-[13px] text-secondary">grid_4x4</span>
          <span>Res: <strong className="text-on-surface font-medium">10m / 0.5m Pan</strong></span>
        </div>
        <div className="bg-surface-container-lowest/90 backdrop-blur-md px-space-sm py-1 rounded font-label-sm text-[11px] text-on-surface-variant flex items-center gap-1 shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-[13px] text-tertiary">wb_sunny</span>
          <span>Cloud: <strong className="text-tertiary font-medium">1.2%</strong></span>
        </div>
      </div>

      {/* LEFT-SIDE: Stitch Floating GIS Tools */}
      <div className="absolute left-space-md top-1/2 transform -translate-y-1/2 z-20 flex flex-col gap-1 bg-surface-container-lowest/95 backdrop-blur-md p-1 rounded-lg shadow-md pointer-events-auto border border-outline-variant/20">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">remove</span>
        </button>
        <div className="h-px w-6 mx-auto bg-outline-variant/30 my-0.5" />
        <button
          type="button"
          onClick={handleHome}
          aria-label="Center AOI"
          title="Center AOI"
          className="w-8 h-8 rounded flex items-center justify-center text-primary bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
        </button>
        <button
          type="button"
          onClick={() => setShowIntelModal(true)}
          aria-label="Spectral Bands"
          title="Spectral Bands & Sensor Fusion"
          className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">layers</span>
        </button>
        <button
          type="button"
          onClick={handleToggleMeasure}
          aria-label="Measure Polygon"
          title="Polygon Area Measure"
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
            isMeasureActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">square_foot</span>
        </button>
      </div>

      {/* FLOATING POLYGON MEASURE BADGE CALLOUT */}
      <div className="absolute left-[38%] top-[24%] transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20 hidden md:block">
        <div className="flex items-center gap-space-xs bg-surface-container-lowest/95 backdrop-blur-md px-space-sm py-1 rounded shadow-md border-l-2 border-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
          <span className="font-label-sm text-label-sm text-primary font-semibold tracking-wider">
            CONSTRUCTION
          </span>
          <span className="font-code-num text-code-num text-on-surface">| +475.83 ha</span>
          <span className="font-label-sm text-label-sm bg-tertiary/15 text-tertiary px-1 py-0.2 rounded font-medium">
            96% Conf
          </span>
        </div>
      </div>

      {/* BOTTOM-LEFT: Stitch Geodetic Scale Bar */}
      <div className="absolute bottom-space-md left-space-md z-20 pointer-events-auto hidden sm:block">
        <div className="bg-surface-container-lowest/90 backdrop-blur-md px-space-sm py-1 rounded flex items-center gap-space-sm shadow-sm border border-outline-variant/20">
          <div className="flex flex-col gap-0.5">
            <div className="w-24 h-1 bg-outline-variant/60 flex">
              <div className="w-1/2 h-full bg-on-surface" />
              <div className="w-1/2 h-full bg-outline-variant/80" />
            </div>
            <div className="flex justify-between font-label-sm text-[9px] text-outline font-code-num">
              <span>0</span>
              <span>1 km</span>
              <span>2 km</span>
            </div>
          </div>
          <div className="h-4 w-px bg-outline-variant/30" />
          <span className="font-label-sm text-[10px] text-on-surface-variant font-code-num">
            EPSG:32643 • UTM 43N
          </span>
        </div>
      </div>

      {/* BOTTOM-RIGHT: Live Cursor Coordinates & Elevation */}
      <div className="absolute bottom-space-md right-space-md z-20 pointer-events-auto">
        <div className="bg-surface-container-lowest/90 backdrop-blur-md px-space-sm py-1 rounded font-code-num text-[11px] text-on-surface-variant flex items-center gap-space-sm shadow-sm border border-outline-variant/20">
          <span className="text-outline">CURSOR:</span>
          <span className="text-on-surface font-medium">
            {cursorLat !== null ? `${cursorLat.toFixed(4)}° N, ${cursorLng?.toFixed(4)}° E` : '28.1304° N, 77.7612° E'}
          </span>
          <span className="text-outline">|</span>
          <span className="text-secondary font-medium">Elev 196m</span>
        </div>
      </div>

      {/* M3 Target Lock-On Overlay */}
      <LockonTag
        evidence={lockedEvidence}
        bbox={lockedBBox}
        onTagMouseEnter={handleTagMouseEnter}
        onTagMouseLeave={handleTagMouseLeave}
        onClick={onSelectEvidence}
      />

      {/* Stitch Swipe Controller */}
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
