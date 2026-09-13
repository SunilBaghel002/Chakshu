import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import type { Evidence, DetectionSet } from '../lib/types';
import { PALETTE, getClassColor } from '../lib/palette';
import { SwipeCompare } from './SwipeCompare';
import { MapCursorInspector } from './MapCursorInspector';
import { MapZoomControls } from './MapZoomControls';

interface MapPaneProps {
  selectedAoiId?: string;
  aoiCoords: [number, number]; // [lat, lng]
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
}

export const MapPane: React.FC<MapPaneProps> = ({
  selectedAoiId,
  aoiCoords,
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const detectionsLayerRef = useRef<L.LayerGroup | null>(null);
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

    // Pane 1 (Custom 'beforePane'): ESRI World Imagery — older baseline (farmland era)
    const beforePane = map.createPane('beforePane');
    beforePane.style.zIndex = '200';
    beforePane.style.filter = 'saturate(1.1) contrast(1.0) sepia(0.12) brightness(0.97)';

    const esriSatellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, pane: 'beforePane', opacity: 1 }
    );
    esriSatellite.addTo(map);

    // Pane 2 (Custom 'afterPane'): Google Satellite — newer imagery (construction era)
    const afterPane = map.createPane('afterPane');
    afterPane.style.zIndex = '450';
    afterPane.style.filter = 'contrast(1.15) brightness(1.03) saturate(1.1)';

    const googleSatellite = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      { maxZoom: 20, pane: 'afterPane', opacity: 1 }
    );
    googleSatellite.addTo(map);

    // Pane 3 (Custom 'polygonsPane'): Dedicated vector overlay pane for change polygons
    // Clipped dynamically in sync with the swipe slider
    const polygonsPane = map.createPane('polygonsPane');
    polygonsPane.style.zIndex = '500';
    polygonsPane.style.pointerEvents = 'auto';

    // Labels overlay on top of polygons
    const cartoLabels = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 18, opacity: 0.6 }
    );
    cartoLabels.addTo(map);

    // Track cursor for coordinate badge & inspector positioning via direct DOM (zero React re-renders)
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
  // Clip afterPane and polygonsPane based on slider position
  const updateClip = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const afterPane = map.getPane('afterPane');
    const polyPane = map.getPane('polygonsPane');

    if (!isSwipeActive) {
      if (afterPane) afterPane.style.display = 'none';
      if (polyPane) {
        polyPane.style.display = 'block';
        polyPane.style.clipPath = 'none';
      }
      return;
    }

    if (afterPane) afterPane.style.display = 'block';
    if (polyPane) polyPane.style.display = 'block';

    const size = map.getSize();
    const nw = map.containerPointToLayerPoint([0, 0]);
    const se = map.containerPointToLayerPoint(size);
    const sliderX = (sliderPos / 100) * size.x;
    // Offset by 1px to eliminate the visible gap at the divider hairline
    const clipX = map.containerPointToLayerPoint([sliderX - 1, 0]).x;

    const isNormalOrder = beforeDate <= afterDate;
    const top = nw.y - 5000;
    const bottom = se.y + 5000;
    const left = nw.x - 5000;
    const right = se.x + 5000;

    const clip = isNormalOrder
      ? `polygon(${clipX}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${clipX}px ${bottom}px)`
      : `polygon(${left}px ${top}px, ${clipX}px ${top}px, ${clipX}px ${bottom}px, ${left}px ${bottom}px)`;

    if (afterPane) afterPane.style.clipPath = clip;
    if (polyPane) polyPane.style.clipPath = clip;
  }, [sliderPos, isSwipeActive, beforeDate, afterDate]);

  useEffect(() => {
    updateClip();
    const map = mapInstanceRef.current;
    if (!map) return;
    map.on('move', updateClip);
    map.on('zoom', updateClip);
    map.on('resize', updateClip);
    return () => {
      map.off('move', updateClip);
      map.off('zoom', updateClip);
      map.off('resize', updateClip);
    };
  }, [updateClip]);

  // Recenter map ONLY when AOI genuinely changes (prevents snapping on slider/pan)
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedAoiId) return;
    if (prevAoiIdRef.current && prevAoiIdRef.current !== selectedAoiId) {
      prevAoiIdRef.current = selectedAoiId;
      mapInstanceRef.current.flyTo(aoiCoords, 14, { duration: 1.2 });
    } else if (!prevAoiIdRef.current) {
      prevAoiIdRef.current = selectedAoiId;
    }
  }, [selectedAoiId, aoiCoords]);

  // Track polygon layers for instant selection highlighting without full GeoJSON layer rebuilds
  const polygonLayersRef = useRef<Map<string, { layer: L.Path; changeType: string }>>(new Map());

  const getPolyStyle = (isSelected: boolean, color: string, visible: boolean) => ({
    color: isSelected ? '#A5B4FC' : visible ? color : 'transparent',
    weight: isSelected ? 3 : visible ? 2 : 0,
    opacity: visible ? 0.9 : 0,
    fillColor: color,
    fillOpacity: isSelected ? 0.35 : visible ? 0.16 : 0,
    dashArray: isSelected ? undefined : '4, 4',
  });
  // Render Vector Change Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }
    polygonLayersRef.current.clear();

    const layerGroup = L.geoJSON(undefined, {
      pane: 'polygonsPane', // Dedicated vector pane — clipped in sync with swipe slider
      style: (feature) => {
        const id = feature?.properties?.change_object_id;
        const color = getClassColor(feature?.properties?.change_type || 'construction');
        return getPolyStyle(id === selectedEvidenceId, color, showAllPolygons);
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const matched = evidenceList.find((e) => e.change_object_id === props.change_object_id);
        const changeType = props.change_type || 'construction';
        const color = getClassColor(changeType);

        polygonLayersRef.current.set(props.change_object_id, {
          layer: layer as L.Path,
          changeType,
        });

        layer.on('mouseover', () => {
          if (matched) {
            setHoveredEvidence(matched);
            if (inspectorRef.current) inspectorRef.current.classList.remove('hidden');
          }
          (layer as L.Path).setStyle({ weight: 3, color: '#38BDF8', fillOpacity: 0.38, dashArray: undefined });
        });

        layer.on('mouseout', () => {
          setHoveredEvidence(null);
          if (inspectorRef.current) inspectorRef.current.classList.add('hidden');
          (layer as L.Path).setStyle(
            getPolyStyle(props.change_object_id === selectedEvidenceId, color, showAllPolygons)
          );
        });

        const label = props.area_label || 'Change';
        const typeStr = changeType.replace('_', ' ').toUpperCase();
        layer.bindTooltip(
          `<div style="font-family: monospace; font-size: 11px; padding: 2px 4px;">
            <strong style="color: ${color};">${typeStr}</strong>: <span style="font-weight: 700; color: #fff;">${label}</span>
          </div>`,
          { sticky: false, opacity: 0.95 }
        );

        layer.on('click', () => {
          if (matched) onSelectEvidence(matched);
        });
      },
    });

    // Add polygons to GeoJSON layer
    evidenceList.forEach((ev) => {
      if (ev.measurement.geom_4326) {
        layerGroup.addData({
          type: 'Feature' as const,
          properties: {
            change_object_id: ev.change_object_id,
            change_type: ev.change_type,
            area_label: ev.measurement.area_label,
          },
          geometry: ev.measurement.geom_4326,
        } as any);
      }
    });

    layerGroup.addTo(map);
    geojsonLayerRef.current = layerGroup;
  }, [evidenceList, onSelectEvidence, showAllPolygons]);

  // Fast style updates on selectedEvidenceId change (NO layer rebuilds!)
  useEffect(() => {
    polygonLayersRef.current.forEach(({ layer, changeType }, id) => {
      const isSelected = id === selectedEvidenceId;
      const color = getClassColor(changeType);
      layer.setStyle({
        color: isSelected ? '#A5B4FC' : showAllPolygons ? color : 'transparent',
        weight: isSelected ? 3 : showAllPolygons ? 2 : 0,
        fillOpacity: isSelected ? 0.35 : showAllPolygons ? 0.16 : 0,
        dashArray: isSelected ? undefined : '4, 4',
      });
    });
  }, [selectedEvidenceId, showAllPolygons]);
  // Render Object Detection Bounding Boxes (only when showAllPolygons is active)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (detectionsLayerRef.current) {
      map.removeLayer(detectionsLayerRef.current);
      detectionsLayerRef.current = null;
    }

    if (!showAllPolygons || !detectionSet || !detectionSet.detections.length) return;

    const group = L.layerGroup();

    detectionSet.detections.forEach((det) => {
      if (!det.geom_4326) return;
      const isTrack3 = det.track === 'object_model';
      const color = getClassColor(det.label);

      const boxLayer = L.geoJSON(det.geom_4326 as any, {
        pane: 'polygonsPane',
        style: { color, weight: 1.5, dashArray: isTrack3 ? '6, 4' : '4, 4', fillColor: color, fillOpacity: 0.08 },
      });

      group.addLayer(boxLayer);
    });

    group.addTo(map);
    detectionsLayerRef.current = group;
  }, [detectionSet, showAllPolygons]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#070A10]">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Swipe Controller Handles */}
      <SwipeCompare
        sliderPos={sliderPos}
        onSliderChange={onSliderChange}
        isSwipeActive={isSwipeActive}
        onToggleSwipe={onToggleSwipe}
        beforeDate={beforeDate}
        afterDate={afterDate}
        availableDates={availableDates}
        onSelectBeforeDate={onSelectBeforeDate}
        onSelectAfterDate={onSelectAfterDate}
        onSwapDates={onSwapDates}
      />

      {/* Interactive Cursor Change Inspector */}
      <MapCursorInspector
        hoveredEvidence={hoveredEvidence}
        beforeDate={beforeDate}
        afterDate={afterDate}
        showAllPolygons={showAllPolygons}
        onToggleShowAll={() => setShowAllPolygons(!showAllPolygons)}
        coordRef={coordRef}
        inspectorRef={inspectorRef}
      />

      {/* Floating Bottom Date Watermarks */}
      {isSwipeActive && (
        <>
          <div className="absolute bottom-4 left-4 z-[350] pointer-events-none bg-[#0B0F19]/85 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-mono text-amber-300 font-semibold shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>BEFORE: {beforeDate} (Pre-construction Farmland)</span>
          </div>
          <div className="absolute bottom-4 right-4 z-[350] pointer-events-none bg-[#0B0F19]/85 border border-indigo-500/40 px-3 py-1.5 rounded-lg text-xs font-mono text-indigo-300 font-semibold shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
            <span>AFTER: {afterDate} (Construction Phase)</span>
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          </div>
        </>
      )}

      {/* Floating Tactical Zoom & Control Overlay */}
      <MapZoomControls
        onZoomIn={() => mapInstanceRef.current?.zoomIn()}
        onZoomOut={() => mapInstanceRef.current?.zoomOut()}
        onCenter={() => mapInstanceRef.current?.flyTo(aoiCoords, 14)}
        coords={aoiCoords}
      />
    </div>
  );
};
