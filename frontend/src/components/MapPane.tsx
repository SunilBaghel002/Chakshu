import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import type { Evidence, DetectionSet } from '../lib/types';
import { getClassColor, getDarkerClassColor } from '../lib/palette';
import { useMapPolygons } from '../lib/useMapPolygons';
import { SwipeCompare } from './SwipeCompare';
import { MapCursorInspector } from './MapCursorInspector';
import { MapZoomControls } from './MapZoomControls';
import { GhostNumeral } from './GhostNumeral';
import { MapReticleOverlay } from './MapReticleOverlay';
import { getSatelliteTileConfig, type ImageryMode } from '../lib/satelliteProviders';
import { SatelliteIntelModal } from './SatelliteIntelModal';
import { MapImageryToolbar } from './MapImageryToolbar';

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

export const MapPane: React.FC<MapPaneProps> = ({
  selectedAoiId, aoiCoords, aoiBounds, aoiName, evidenceList,
  selectedEvidenceId, onSelectEvidence, detectionSet,
  sliderPos, onSliderChange, isSwipeActive, onToggleSwipe,
  beforeDate, afterDate, availableDates = [],
  onSelectBeforeDate, onSelectAfterDate, onSwapDates,
  presetTarget, onPresetConsumed,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const beforeTileLayerRef = useRef<L.TileLayer | null>(null);
  const afterTileLayerRef = useRef<L.TileLayer | null>(null);
  const detectionsLayerRef = useRef<L.LayerGroup | null>(null);
  const prevAoiIdRef = useRef<string | null>(null);

  const [imageryMode, setImageryMode] = useState<ImageryMode>('hybrid_optimum');
  const [dehazeActive, setDehazeActive] = useState<boolean>(true);
  const [showIntelModal, setShowIntelModal] = useState<boolean>(false);
  const [showAllPolygons, setShowAllPolygons] = useState<boolean>(true);
  const [hoveredEvidence, setHoveredEvidence] = useState<Evidence | null>(null);
  const coordRef = useRef<HTMLDivElement | null>(null);
  const inspectorRef = useRef<HTMLDivElement | null>(null);

  // Initialize Leaflet Map once on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, { center: aoiCoords, zoom: 14, zoomControl: false, attributionControl: false });
    if (aoiBounds) map.fitBounds(aoiBounds, { padding: [36, 36], maxZoom: 15 });

    const beforePane = map.createPane('beforePane');
    beforePane.style.zIndex = '200';
    beforePane.style.filter = 'saturate(1.08) contrast(1.04) brightness(1.02)';

    const beforeCfg = getSatelliteTileConfig(beforeDate, imageryMode, false);
    const beforeSatellite = L.tileLayer(beforeCfg.url, {
      maxZoom: beforeCfg.maxZoom, maxNativeZoom: beforeCfg.maxNativeZoom, pane: 'beforePane', opacity: 1, attribution: beforeCfg.attribution,
    });
    beforeSatellite.addTo(map);
    beforeTileLayerRef.current = beforeSatellite;

    const afterPane = map.createPane('afterPane');
    afterPane.style.zIndex = '450';
    afterPane.style.filter = dehazeActive
      ? 'contrast(1.22) saturate(1.28) brightness(0.96) hue-rotate(-2deg)'
      : 'saturate(1.08) contrast(1.06) brightness(1.02)';

    const afterCfg = getSatelliteTileConfig(afterDate, imageryMode, true);
    const afterSatellite = L.tileLayer(afterCfg.url, {
      maxZoom: afterCfg.maxZoom, maxNativeZoom: afterCfg.maxNativeZoom, pane: 'afterPane', opacity: 1, attribution: afterCfg.attribution,
    });
    afterSatellite.addTo(map);
    afterTileLayerRef.current = afterSatellite;

    const polygonsPane = map.createPane('polygonsPane');
    polygonsPane.style.zIndex = '500';
    polygonsPane.style.pointerEvents = 'auto';

    const cartoLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', { maxZoom: 18, opacity: 0.6 });
    cartoLabels.addTo(map);
    mapInstanceRef.current = map;

    const timer = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
    const handleResize = () => mapInstanceRef.current?.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
      beforeTileLayerRef.current = null;
      afterTileLayerRef.current = null;
      detectionsLayerRef.current = null;
    };
  }, [aoiCoords]);

  // Dynamically update satellite tile layers when beforeDate, afterDate, or imageryMode changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const beforeCfg = getSatelliteTileConfig(beforeDate, imageryMode, false);
    if (beforeTileLayerRef.current) {
      beforeTileLayerRef.current.options.maxNativeZoom = beforeCfg.maxNativeZoom;
      beforeTileLayerRef.current.options.maxZoom = beforeCfg.maxZoom;
      beforeTileLayerRef.current.setUrl(beforeCfg.url);
    }
    const afterCfg = getSatelliteTileConfig(afterDate, imageryMode, true);
    if (afterTileLayerRef.current) {
      afterTileLayerRef.current.options.maxNativeZoom = afterCfg.maxNativeZoom;
      afterTileLayerRef.current.options.maxZoom = afterCfg.maxZoom;
      afterTileLayerRef.current.setUrl(afterCfg.url);
    }
  }, [beforeDate, afterDate, imageryMode]);
 
  // Dynamically update atmospheric de-haze filter on afterPane
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const afterPane = mapInstanceRef.current.getPane('afterPane');
    if (afterPane) {
      afterPane.style.filter = dehazeActive
        ? 'contrast(1.22) saturate(1.28) brightness(0.96) hue-rotate(-2deg)'
        : 'saturate(1.08) contrast(1.06) brightness(1.02)';
    }
  }, [dehazeActive]);

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
      if (aoiBounds) mapInstanceRef.current.fitBounds(aoiBounds, { padding: [36, 36], maxZoom: 15, animate: true });
      else mapInstanceRef.current.flyTo(aoiCoords, 14, { duration: 1.2 });
    } else if (!prevAoiIdRef.current) {
      prevAoiIdRef.current = selectedAoiId;
    }
  }, [selectedAoiId, aoiCoords, aoiBounds]);

  // Handle camera presets from TacticalTelemetryBar
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

  useMapPolygons({
    map: mapInstanceRef.current, evidenceList, selectedEvidenceId, onSelectEvidence,
    showAllPolygons, setHoveredEvidence, inspectorRef, beforeDate, afterDate,
  });

  // Render Object Detection Bounding Boxes (Track 1/2 solid vs Track 3 dashed)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (detectionsLayerRef.current) {
      map.removeLayer(detectionsLayerRef.current);
      detectionsLayerRef.current = null;
    }
    if (!detectionSet || !detectionSet.detections.length) return;

    const group = L.layerGroup();
    detectionSet.detections.forEach((det) => {
      if (!det.geom_4326) return;
      const isTrack3 = det.track === 'object_model';
      const color = getClassColor(det.label);
      const strokeColor = getDarkerClassColor(det.label);

      const boxLayer = L.geoJSON(det.geom_4326 as any, {
        style: {
          color: strokeColor, weight: 2.5, dashArray: isTrack3 ? '6, 4' : undefined,
          fillColor: color, fillOpacity: isTrack3 ? 0.22 : 0.45,
        },
      });

      const coords = (det.geom_4326 as any).coordinates?.[0]?.[0];
      if (coords && coords.length >= 2) {
        const marker = L.marker([coords[1], coords[0]], {
          icon: L.divIcon({
            className: 'custom-det-chip',
            html: `<div style="background: rgba(17, 24, 39, 0.92); border: 1px solid ${color}; color: #F9FAFB; font-size: 10px; font-family: monospace; padding: 2px 4px; border-radius: 3px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">${det.label} · ${det.score.toFixed(2)}</div>`,
            iconSize: [80, 20], iconAnchor: [0, 24],
          }),
        });
        group.addLayer(marker);
      }
      group.addLayer(boxLayer);
    });

    group.addTo(map);
    detectionsLayerRef.current = group;
  }, [detectionSet]);

  return (
    <div className="relative w-full h-full overflow-hidden corner-ticks" style={{ background: 'var(--well)', border: '1px solid var(--line-strong)' }}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />
      <MapReticleOverlay containerRef={mapContainerRef} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 60%, var(--well) 100%)', zIndex: 300 }} />
      <div className="absolute inset-0 pointer-events-none dot-grid" style={{ zIndex: 299, opacity: 0.4 }} />
      <GhostNumeral sector="03" />
      <div className="absolute top-3 left-3 z-[300] pointer-events-none t-tag" style={{ color: 'var(--ink-3)', fontSize: 9 }}>SEC 04·B</div>

      {/* Swipe Controller */}
      <SwipeCompare
        sliderPos={sliderPos} onSliderChange={onSliderChange} onDragMove={applyClip}
        isSwipeActive={isSwipeActive} onToggleSwipe={onToggleSwipe}
        beforeDate={beforeDate} afterDate={afterDate} availableDates={availableDates}
        onSelectBeforeDate={onSelectBeforeDate} onSelectAfterDate={onSelectAfterDate} onSwapDates={onSwapDates}
      />

      {/* Cursor Inspector */}
      <MapCursorInspector
        hoveredEvidence={hoveredEvidence} beforeDate={beforeDate} afterDate={afterDate}
        showAllPolygons={showAllPolygons} onToggleShowAll={() => setShowAllPolygons(!showAllPolygons)}
        coordRef={coordRef} inspectorRef={inspectorRef}
      />

      {/* SLOT-13: Map Imagery Toolbar */}
      <MapImageryToolbar
        imageryMode={imageryMode} setImageryMode={setImageryMode}
        dehazeActive={dehazeActive} setDehazeActive={setDehazeActive}
        onOpenIntel={() => setShowIntelModal(true)} isSwipeActive={isSwipeActive}
        beforeDate={beforeDate} afterDate={afterDate}
      />

      {/* Zoom Controls */}
      <MapZoomControls
        onZoomIn={() => mapInstanceRef.current?.zoomIn()}
        onZoomOut={() => mapInstanceRef.current?.zoomOut()}
        onCenter={() => {
          if (aoiBounds && mapInstanceRef.current) mapInstanceRef.current.fitBounds(aoiBounds, { padding: [36, 36], maxZoom: 15, animate: true });
          else mapInstanceRef.current?.flyTo(aoiCoords, 14);
        }}
        coords={aoiCoords}
      />

      {/* SENSOR & PIPELINE INTELLIGENCE MODAL */}
      <SatelliteIntelModal
        isOpen={showIntelModal} onClose={() => setShowIntelModal(false)}
        beforeDate={beforeDate} afterDate={afterDate} imageryMode={imageryMode}
      />
    </div>
  );
};
