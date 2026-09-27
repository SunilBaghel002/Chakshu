import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import type { Evidence, DetectionSet } from '../lib/types';
import { type BBox, trackMapHover, trackMapViewport } from '../lib/map-fx';
import { useMapPolygons } from '../lib/useMapPolygons';
import { SwipeCompare } from './SwipeCompare';
import { GhostNumeral } from './GhostNumeral';
import { MapReticleOverlay } from './MapReticleOverlay';
import { SectorTag } from './map/SectorTag';
import { MapLegend } from './map/MapLegend';
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

/**
 * SLOT-10 — Stitch Geospatial Imagery Well
 * Features:
 * - Continuous dual-epoch satellite imagery with 100% tile coverage (no black void)
 * - Automatic ResizeObserver so layout shifts and drawer toggles re-render tiles instantly
 * - Fluid pointer swipe comparison
 * - Interactive polygon selection and lock-on HUD
 */
export const MapPane: React.FC<MapPaneProps> = ({
  selectedAoiId,
  aoiCoords,
  aoiBounds,
  aoiName: _aoiName,
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

  // Live Coordinates, Sector and Measure State
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
      const target = evidenceList.length > 0 ? evidenceList[0] : (evidenceListFixture[0] as unknown as Evidence);
      setLockedEvidence(target || null);
      setLockedBBox({ minX: 420, minY: 280, maxX: 720, maxY: 480 });
      setCursorLat(28.1748);
      setCursorLng(77.6075);
    }
  }, [evidenceList]);

  // Swipe clip path application
  const applyClip = useCallback((pct: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const afterPane = map.getPane('afterPane');
    const polyPane = map.getPane('polygonsPane');
    if (!afterPane) return;
    if (!isSwipeActive) {
      afterPane.style.display = 'none';
      if (polyPane) {
        polyPane.style.display = 'block';
        polyPane.style.clipPath = 'none';
      }
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
    const top = nw.y - 3000;
    const bot = se.y + 3000;
    const l = nw.x - 3000;
    const r = se.x + 3000;
    const clip = isNormal
      ? `polygon(${clipX}px ${top}px, ${r}px ${top}px, ${r}px ${bot}px, ${clipX}px ${bot}px)`
      : `polygon(${l}px ${top}px, ${clipX}px ${top}px, ${clipX}px ${bot}px, ${l}px ${bot}px)`;
    afterPane.style.clipPath = clip;
    if (polyPane) polyPane.style.clipPath = clip;
  }, [isSwipeActive, beforeDate, afterDate]);

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

    // 1. SOLID BASE SATELLITE LAYER (Guarantees zero black voids anywhere)
    L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      opacity: 1,
    }).addTo(map);

    // 2. BEFORE PANE (Baseline Date A)
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

    // 3. AFTER PANE (Observation Date B — Clipped by Swipe)
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

    // 4. POLYGONS & LABELS PANES
    const polygonsPane = map.createPane('polygonsPane');
    polygonsPane.style.zIndex = '500';
    polygonsPane.style.pointerEvents = 'auto';

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 18, opacity: 0.6 }
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

    // Auto-invalidate size on mount and container dimensions change
    setTimeout(() => map.invalidateSize(), 50);
    setTimeout(() => {
      map.invalidateSize();
      applyClip(sliderPos);
    }, 200);

    // CRITICAL: ResizeObserver prevents unrendered black tiles on drawer toggle or window resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
      applyClip(sliderPos);
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
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

  // Synchronize clip on slider position or map pan/zoom
  useEffect(() => {
    applyClip(sliderPos);
    const map = mapInstanceRef.current;
    if (!map) return;
    const onSync = () => applyClip(sliderPos);
    map.on('move zoom resize', onSync);
    return () => {
      map.off('move zoom resize', onSync);
    };
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
    if (presetTarget.bounds) {
      map.fitBounds(presetTarget.bounds, { padding: [36, 36], maxZoom: presetTarget.zoom || 17, animate: true });
    } else if (presetTarget.center && presetTarget.zoom) {
      map.flyTo(presetTarget.center, presetTarget.zoom, { duration: 1.0 });
    }
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
  const handleToggleMeasure = useCallback(() => setIsMeasureActive((prev) => !prev), []);
  const handleSectorChange = useCallback((sec: string) => setCurrentSector(sec), []);
  const handleTagMouseEnter = useCallback(() => {
    isTagHoveredRef.current = true;
  }, []);
  const handleTagMouseLeave = useCallback(() => {
    isTagHoveredRef.current = false;
    setLockedEvidence(null);
    setLockedBBox(null);
  }, []);
  const handleCloseIntelModal = useCallback(() => setShowIntelModal(false), []);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#0B0F14]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Reticle, crosshair, enter sweep, and cursor glow */}
      <MapReticleOverlay
        containerRef={mapContainerRef}
        onSectorChange={handleSectorChange}
      />

      {/* Ghost sector numeral */}
      <GhostNumeral sector={currentSector.slice(4, 6) || '04'} />

      {/* TOP-LEFT: Stitch Target AOI Badge (Compact, non-overlapping) */}
      <div className="absolute top-2 left-2 z-20 pointer-events-auto flex items-center gap-1.5">
        <SectorTag sector={currentSector} />
        <button
          type="button"
          onClick={() => {
            const first = evidenceList[0];
            if (first) onSelectEvidence(first);
          }}
          className="bg-surface-container-lowest/90 hover:bg-surface-container backdrop-blur-md px-2.5 py-1 rounded-md shadow-sm border border-outline-variant/30 flex items-center gap-2 transition-colors cursor-pointer"
          title="Click to inspect primary AOI intelligence dossier"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
          <span className="font-label-sm text-[10px] text-on-surface font-semibold uppercase tracking-wider">
            JEWAR AOI
          </span>
          <span className="text-outline text-[9px] font-code-num">1,334 ha</span>
        </button>
      </div>

      {/* TOP-RIGHT: Stitch Spectral Filter Chips */}
      <div className="absolute top-2 right-2 z-20 pointer-events-auto hidden md:flex items-center gap-1.5">
        <div className="bg-surface-container-lowest/90 backdrop-blur-md px-2 py-0.5 rounded font-label-sm text-[10px] text-on-surface-variant flex items-center gap-1 shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-[12px] text-primary">palette</span>
          <span>True Color</span>
        </div>
        <div className="bg-surface-container-lowest/90 backdrop-blur-md px-2 py-0.5 rounded font-label-sm text-[10px] text-on-surface-variant flex items-center gap-1 shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-[12px] text-secondary">grid_4x4</span>
          <span>0.5m Pan</span>
        </div>
      </div>

      {/* LEFT-SIDE: Floating GIS Tool Stack (Zoom, Center, Bands, Measure) */}
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 flex flex-col gap-1 bg-surface-container-lowest/95 backdrop-blur-md p-1 rounded-lg shadow-md pointer-events-auto border border-outline-variant/20">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          title="Zoom In (+)"
          className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          title="Zoom Out (-)"
          className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">remove</span>
        </button>
        <div className="h-px w-5 mx-auto bg-outline-variant/30 my-0.5" />
        <button
          type="button"
          onClick={handleHome}
          aria-label="Center AOI"
          title="Center Target AOI"
          className="w-7 h-7 rounded flex items-center justify-center text-primary bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">center_focus_strong</span>
        </button>
        <button
          type="button"
          onClick={() => setShowIntelModal(true)}
          aria-label="Spectral Bands"
          title="Spectral Bands & Sensor Fusion"
          className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">layers</span>
        </button>
        <button
          type="button"
          onClick={handleToggleMeasure}
          aria-label="Measure Polygon"
          title="Polygon Area Measure"
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
            isMeasureActive
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">square_foot</span>
        </button>
      </div>

      {/* BOTTOM-LEFT: Collapsible Legend (SLOT-13) */}
      <MapLegend hiddenLabelCount={hiddenLabelCount} />

      {/* BOTTOM-RIGHT: Live Cursor Coordinates & Zoom */}
      <div className="absolute bottom-2 right-2 z-20 pointer-events-auto">
        <div className="bg-surface-container-lowest/90 backdrop-blur-md px-2 py-0.5 rounded font-code-num text-[10px] text-on-surface-variant flex items-center gap-1.5 shadow-sm border border-outline-variant/20">
          <span className="text-outline">POS:</span>
          <span className="text-on-surface font-medium">
            {cursorLat !== null ? `${cursorLat.toFixed(4)}° N, ${cursorLng?.toFixed(4)}° E` : '28.1304° N, 77.7612° E'}
          </span>
          <span className="text-outline">·</span>
          <span className="text-secondary font-medium">Z{currentZoom}</span>
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
