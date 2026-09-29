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
import { getSatelliteTileConfig, extractYear, type ImageryMode } from '../lib/satelliteProviders';
import { useLeafletMapInit } from '../lib/useLeafletMapInit';
import { computeSwipeClipPolygon, adjustBBoxForSwipe } from '../lib/mapClipHelpers';
import { MapTacticalControls } from './map/MapTacticalControls';
import { SatelliteIntelModal } from './SatelliteIntelModal';
import { useMapAnnotations, type MapAnnotationState } from '../lib/useMapAnnotations';
import evidenceListFixture from '../fixtures/evidence_list.json';

interface MapPaneProps {
  selectedAoiId?: string; aoiCoords: [number, number]; aoiBounds?: [[number, number], [number, number]];
  aoiName: string; evidenceList: Evidence[]; selectedEvidenceId: string | null;
  onSelectEvidence: (evidence: Evidence) => void; detectionSet?: DetectionSet | null;
  sliderPos: number; onSliderChange: (pos: number) => void; isSwipeActive: boolean; onToggleSwipe: () => void;
  beforeDate: string; afterDate: string; availableDates?: string[];
  showClouds?: boolean; onToggleClouds?: () => void;
  showPolygons?: boolean; onTogglePolygons?: () => void;
  onSelectBeforeDate?: (date: string) => void; onSelectAfterDate?: (date: string) => void; onSwapDates?: () => void;
  presetTarget?: { center: [number, number]; zoom?: number; bounds?: [[number, number], [number, number]] } | null;
  onPresetConsumed?: () => void;
  askAnnotationState?: MapAnnotationState | null;
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
  showClouds = false,
  onToggleClouds,
  showPolygons = true,
  onTogglePolygons,
  onSelectBeforeDate,
  onSelectAfterDate,
  onSwapDates,
  presetTarget,
  onPresetConsumed,
  askAnnotationState,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
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
  const hoverDismissTimerRef = useRef<number | null>(null);

  const { mapInstance, mapInstanceRef, prevAoiIdRef } = useLeafletMapInit({
    containerRef: mapContainerRef,
    aoiCoords,
    aoiBounds,
    selectedAoiId,
    beforeDate,
    afterDate,
    imageryMode,
    showClouds,
    dehazeActive,
    setCursorLat,
    setCursorLng,
    setCurrentZoom,
  });

  // Dev visual verification support (?mockHover=1, ?greyscale=1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('greyscale') === '1') document.documentElement.style.filter = 'grayscale(1)';
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
    const isPolyVisible = showPolygons ?? true;
    if (!isSwipeActive) {
      afterPane.style.display = 'none';
      if (polyPane) {
        polyPane.style.display = isPolyVisible ? 'block' : 'none';
        polyPane.style.clipPath = 'none';
      }
      return;
    }
    afterPane.style.display = 'block';
    if (polyPane) {
      polyPane.style.display = isPolyVisible ? 'block' : 'none';
      polyPane.style.clipPath = 'none';
    }
    const w = mapContainerRef.current?.offsetWidth || map.getSize().x;
    const h = mapContainerRef.current?.offsetHeight || map.getSize().y;
    const isNormal = beforeDate <= afterDate;
    const clip = computeSwipeClipPolygon(pct, w, h, map, isNormal);
    afterPane.style.clipPath = clip;
    if (polyPane) {
      polyPane.style.display = isPolyVisible ? 'block' : 'none';
      polyPane.style.clipPath = clip;
    }
  }, [isSwipeActive, beforeDate, afterDate, showPolygons]);

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

  // M3 Hover Lock-On with grace timer to prevent flicker
  const handleHoverWithBbox = useCallback((ev: Evidence | null, bbox: BBox | null) => {
    if (hoverDismissTimerRef.current !== null) {
      window.clearTimeout(hoverDismissTimerRef.current);
      hoverDismissTimerRef.current = null;
    }

    if (ev && bbox) {
      let adjustedBBox = bbox;
      if (isSwipeActive && mapContainerRef.current) {
        const containerW = mapContainerRef.current.offsetWidth || 1200;
        const isNormal = beforeDate <= afterDate;
        const adjusted = adjustBBoxForSwipe(bbox, containerW, sliderPos, isNormal);
        if (!adjusted) return;
        adjustedBBox = adjusted;
      }
      setLockedEvidence(ev);
      setLockedBBox(adjustedBBox);
      trackMapHover(ev.change_object_id);
    } else if (!isTagHoveredRef.current) {
      hoverDismissTimerRef.current = window.setTimeout(() => {
        if (!isTagHoveredRef.current) {
          setLockedEvidence(null);
          setLockedBBox(null);
        }
      }, 180);
    }
  }, [isSwipeActive, sliderPos, beforeDate, afterDate]);

  useMapPolygons({
    map: mapInstance,
    evidenceList,
    selectedEvidenceId,
    onSelectEvidence,
    showAllPolygons: showPolygons ?? true,
    setHoveredEvidence: () => {},
    onHoverWithBbox: handleHoverWithBbox,
    onLabelsCollisionChange: setHiddenLabelCount,
    beforeDate,
    afterDate,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'v' || e.key === 'V') {
        onTogglePolygons?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePolygons]);

  useMapAnnotations({
    map: mapInstance,
    evidenceList,
    annotationState: askAnnotationState ?? null,
    selectedEvidenceId,
    onSelectEvidence,
  });

  const handleZoomIn = useCallback(() => mapInstanceRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapInstanceRef.current?.zoomOut(), []);
  const handleHome = useCallback(() => {
    if (aoiBounds && mapInstanceRef.current) mapInstanceRef.current.fitBounds(aoiBounds, { padding: [36, 36], maxZoom: 15, animate: true });
    else mapInstanceRef.current?.flyTo(aoiCoords, 14);
  }, [aoiBounds, aoiCoords]);
  const handleFitAoi = handleHome;
  const handleToggleMeasure = useCallback(() => setIsMeasureActive((prev) => !prev), []);
  const handleSectorChange = useCallback((sec: string) => setCurrentSector(sec), []);
  const handleTagMouseEnter = useCallback(() => {
    isTagHoveredRef.current = true;
    if (hoverDismissTimerRef.current !== null) {
      window.clearTimeout(hoverDismissTimerRef.current);
      hoverDismissTimerRef.current = null;
    }
  }, []);
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
      <div ref={mapContainerRef} className="w-full h-full" />

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

      {/* Floating Tactical Map Controls: Polygons Shutdown & Baseline Cloud Toggle */}
      <MapTacticalControls
        showPolygons={showPolygons}
        onTogglePolygons={onTogglePolygons}
        beforeDate={beforeDate}
        showClouds={showClouds}
        onToggleClouds={onToggleClouds}
      />

      {/* SLOT-12: Zoom Stack (TR) */}
      <ZoomStack
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onHome={handleHome}
        onFitAoi={handleFitAoi}
        onToggleMeasure={handleToggleMeasure}
        isMeasureActive={isMeasureActive}
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
