import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import type { Evidence, DetectionSet } from '../lib/types';
import { useMapPolygons } from '../lib/useMapPolygons';
import { SwipeCompare } from './SwipeCompare';
import { MapCursorInspector } from './MapCursorInspector';
import { MapZoomControls } from './MapZoomControls';
import { GhostNumeral } from './GhostNumeral';
import { MapReticleOverlay } from './MapReticleOverlay';

interface MapPaneProps {
  selectedAoiId?: string;
  aoiCoords: [number, number]; // [lat, lng]
  aoiBounds?: [[number, number], [number, number]]; // [[swLat, swLng], [neLat, neLng]]
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
  presetTarget?: { center: [number, number]; zoom: number } | null;
  onPresetConsumed?: () => void;
}

/**
 * SLOT-10 — Map Stage (the well)
 * Cool-neutral --well background, 1px --line-strong frame, corner ticks.
 * Integrates ghost numeral, vignette, and dot grid.
 */
export const MapPane: React.FC<MapPaneProps> = ({
  selectedAoiId,
  aoiCoords,
  aoiBounds,
  aoiName,
  evidenceList,
  selectedEvidenceId,
  onSelectEvidence,
  detectionSet,
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
  const prevAoiIdRef = useRef<string | null>(null);

  const [showAllPolygons, setShowAllPolygons] = useState<boolean>(true);
  const [hoveredEvidence, setHoveredEvidence] = useState<Evidence | null>(null);
  const coordRef = useRef<HTMLDivElement | null>(null);
  const inspectorRef = useRef<HTMLDivElement | null>(null);

  // Initialize Leaflet Map once on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: aoiCoords,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Fit to rectangular AOI bounds if available
    if (aoiBounds) {
      map.fitBounds(aoiBounds, { padding: [36, 36], maxZoom: 15 });
    }

    const beforePane = map.createPane('beforePane');
    beforePane.style.zIndex = '200';
    beforePane.style.filter = 'saturate(1.1) contrast(1.0) sepia(0.12) brightness(0.97)';

    const esriSatellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, pane: 'beforePane', opacity: 1 }
    );
    esriSatellite.addTo(map);

    const afterPane = map.createPane('afterPane');
    afterPane.style.zIndex = '450';
    afterPane.style.filter = 'contrast(1.15) brightness(1.03) saturate(1.1)';

    const googleSatellite = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      { maxZoom: 20, pane: 'afterPane', opacity: 1 }
    );
    googleSatellite.addTo(map);

    const polygonsPane = map.createPane('polygonsPane');
    polygonsPane.style.zIndex = '500';
    polygonsPane.style.pointerEvents = 'auto';

    // Dark-matter labels at --ink-3 70%
    const cartoLabels = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 18, opacity: 0.5 }
    );
    cartoLabels.addTo(map);

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      const cEl = coordRef.current;
      if (cEl) {
        cEl.classList.remove('hidden');
        const latSpan = cEl.querySelector('[data-lat]');
        const lngSpan = cEl.querySelector('[data-lng]');
        if (latSpan) latSpan.textContent = `${e.latlng.lat.toFixed(4)}° N`;
        if (lngSpan) lngSpan.textContent = `${e.latlng.lng.toFixed(4)}° E`;
      }
      const iEl = inspectorRef.current;
      if (iEl && !iEl.classList.contains('hidden')) {
        const cx = Math.min(e.containerPoint.x + 16, window.innerWidth - 260);
        const cy = Math.min(e.containerPoint.y + 16, window.innerHeight - 180);
        iEl.style.left = `${cx}px`;
        iEl.style.top = `${cy}px`;
      }
    };

    map.on('mousemove', handleMouseMove);

    map.on('mouseout', () => {
      if (coordRef.current) coordRef.current.classList.add('hidden');
      if (inspectorRef.current) inspectorRef.current.classList.add('hidden');
      setHoveredEvidence(null);
    });
    mapInstanceRef.current = map;
    prevAoiIdRef.current = selectedAoiId ?? null;
    setTimeout(() => map.invalidateSize(), 150);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

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
    const container = mapContainerRef.current;
    if (!map) return;
    const onSync = () => applyClip(sliderPos);
    map.on('move zoom resize', onSync);
    const ro = container ? new ResizeObserver(() => { map.invalidateSize(); onSync(); }) : null;
    if (container && ro) ro.observe(container);
    return () => {
      map.off('move zoom resize', onSync);
      ro?.disconnect();
    };
  }, [applyClip, sliderPos]);

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedAoiId) return;
    if (prevAoiIdRef.current && prevAoiIdRef.current !== selectedAoiId) {
      prevAoiIdRef.current = selectedAoiId;
      if (aoiBounds) {
        mapInstanceRef.current.fitBounds(aoiBounds, { padding: [36, 36], maxZoom: 15, animate: true });
      } else {
        mapInstanceRef.current.flyTo(aoiCoords, 14, { duration: 1.2 });
      }
    } else if (!prevAoiIdRef.current) {
      prevAoiIdRef.current = selectedAoiId;
    }
  }, [selectedAoiId, aoiCoords, aoiBounds]);

  // Handle camera presets from TacticalTelemetryBar
  useEffect(() => {
    if (!mapInstanceRef.current || !presetTarget) return;
    mapInstanceRef.current.flyTo(presetTarget.center, presetTarget.zoom, { duration: 1.0 });
    onPresetConsumed?.();
  }, [presetTarget, onPresetConsumed]);

  useMapPolygons({
    map: mapInstanceRef.current,
    evidenceList,
    selectedEvidenceId,
    onSelectEvidence,
    detectionSet,
    showAllPolygons,
    setHoveredEvidence,
    inspectorRef,
  });

  return (
    <div
      className="relative w-full h-full overflow-hidden corner-ticks"
      style={{
        background: 'var(--well)',
        border: '1px solid var(--line-strong)',
      }}
    >
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* M1/M2: HUD Reticle Overlay */}
      <MapReticleOverlay containerRef={mapContainerRef} />

      {/* Inner vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, var(--well) 100%)',
          zIndex: 300,
        }}
      />

      {/* Dot grid overlay */}
      <div className="absolute inset-0 pointer-events-none dot-grid" style={{ zIndex: 299, opacity: 0.4 }} />

      {/* SLOT-17: Ghost numeral */}
      <GhostNumeral sector="03" />

      {/* SLOT-11: Sector tag */}
      <div
        className="absolute top-3 left-3 z-[300] pointer-events-none t-tag"
        style={{ color: 'var(--ink-3)', fontSize: 9 }}
      >
        SEC 04·B
      </div>

      {/* Swipe Controller */}
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

      {/* Cursor Inspector */}
      <MapCursorInspector
        hoveredEvidence={hoveredEvidence}
        beforeDate={beforeDate}
        afterDate={afterDate}
        showAllPolygons={showAllPolygons}
        onToggleShowAll={() => setShowAllPolygons(!showAllPolygons)}
        coordRef={coordRef}
        inspectorRef={inspectorRef}
      />

      {/* Floating Date Watermarks */}
      {isSwipeActive && (
        <>
          <div className="absolute bottom-3 left-3 z-[350] pointer-events-none t-tag flex items-center gap-1.5 px-2.5 py-1"
            style={{ background: 'var(--panel)', border: '1px solid var(--amber)', color: 'var(--amber)', borderRadius: 'var(--radius)', fontSize: 9 }}>
            <span className="animate-dot-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} />
            <span>DATE A: {beforeDate}</span>
          </div>
          <div className="absolute bottom-3 right-3 z-[350] pointer-events-none t-tag flex items-center gap-1.5 px-2.5 py-1"
            style={{ background: 'var(--panel)', border: '1px solid var(--teal)', color: 'var(--teal)', borderRadius: 'var(--radius)', fontSize: 9 }}>
            <span>DATE B: {afterDate}</span>
            <span className="animate-dot-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} />
          </div>
        </>
      )}

      {/* Zoom Controls */}
      <MapZoomControls
        onZoomIn={() => mapInstanceRef.current?.zoomIn()}
        onZoomOut={() => mapInstanceRef.current?.zoomOut()}
        onCenter={() => {
          if (aoiBounds && mapInstanceRef.current) {
            mapInstanceRef.current.fitBounds(aoiBounds, { padding: [36, 36], maxZoom: 15, animate: true });
          } else {
            mapInstanceRef.current?.flyTo(aoiCoords, 14);
          }
        }}
        coords={aoiCoords}
      />
    </div>
  );
};
