import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Evidence, DetectionSet } from '../lib/types';
import { PALETTE, getClassColor } from '../lib/palette';
import { SwipeCompare } from './SwipeCompare';
import { Layers, ZoomIn, ZoomOut, Compass } from 'lucide-react';

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

  // Initialize Leaflet Map once on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: aoiCoords,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Pane 1 (Default): Before Satellite Layer
    const esriSatellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, opacity: 0.95 }
    );
    esriSatellite.addTo(map);

    // Pane 2 (Custom 'afterPane'): After Satellite Layer clipped by slider
    const afterPane = map.createPane('afterPane');
    afterPane.style.zIndex = '450';

    const afterTileLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, pane: 'afterPane', opacity: 1 }
    );
    afterTileLayer.addTo(map);

    // Labels overlay on top
    const cartoLabels = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 18, opacity: 0.6 }
    );
    cartoLabels.addTo(map);

    mapInstanceRef.current = map;
    prevAoiIdRef.current = selectedAoiId ?? null;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update afterPane clipPath dynamically based on sliderPos and isSwipeActive
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const pane = map.getPane('afterPane');
    if (pane) {
      if (isSwipeActive) {
        pane.style.display = 'block';
        pane.style.clipPath = `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)`;
      } else {
        pane.style.display = 'none';
      }
    }
  }, [sliderPos, isSwipeActive]);

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

  // Render Vector Change Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }

    const layerGroup = L.geoJSON(undefined, {
      style: (feature) => {
        const id = feature?.properties?.change_object_id;
        const isSelected = id === selectedEvidenceId;
        const changeType = feature?.properties?.change_type || 'construction';
        const color = getClassColor(changeType);

        return {
          color: isSelected ? '#818CF8' : color,
          weight: isSelected ? 3.5 : 2,
          opacity: 1,
          fillColor: color,
          fillOpacity: isSelected ? 0.55 : 0.35,
          dashArray: undefined,
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const areaLabel = props.area_label || '1.84 ha';
        const changeType = props.change_type || 'construction';

        // Hover tooltip
        layer.bindTooltip(
          `<div class="font-mono text-xs p-1">
            <span class="font-bold uppercase text-amber-300">${changeType}</span><br/>
            <span class="text-white font-semibold">${areaLabel}</span> (ST_Area)
          </div>`,
          { sticky: true, className: 'leaflet-tactical-tooltip' }
        );

        // Click to select & open drawer
        layer.on('click', () => {
          const matched = evidenceList.find((e) => e.change_object_id === props.change_object_id);
          if (matched) {
            onSelectEvidence(matched);
          }
        });
      },
    });

    // Add polygons to GeoJSON layer
    evidenceList.forEach((ev) => {
      if (ev.measurement.geom_4326) {
        const feature = {
          type: 'Feature' as const,
          properties: {
            change_object_id: ev.change_object_id,
            change_type: ev.change_type,
            area_label: ev.measurement.area_label,
          },
          geometry: ev.measurement.geom_4326,
        };
        layerGroup.addData(feature);
      }
    });

    layerGroup.addTo(map);
    geojsonLayerRef.current = layerGroup;
  }, [evidenceList, selectedEvidenceId, onSelectEvidence]);

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

      const boxLayer = L.geoJSON(det.geom_4326 as any, {
        style: {
          color,
          weight: 2,
          // Track 3 vision model boxes dashed [6, 4] per PRD 9 §6.6
          dashArray: isTrack3 ? '6, 4' : undefined,
          fillColor: color,
          fillOpacity: isTrack3 ? 0.12 : 0.3,
        },
      });

      // Label Chip Marker at top-left of box
      const coords = (det.geom_4326 as any).coordinates?.[0]?.[0];
      if (coords && coords.length >= 2) {
        const marker = L.marker([coords[1], coords[0]], {
          icon: L.divIcon({
            className: 'custom-det-chip',
            html: `<div style="background: rgba(17, 24, 39, 0.92); border: 1px solid ${color}; color: #F9FAFB; font-size: 10px; font-family: monospace; padding: 2px 4px; border-radius: 3px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
              ${det.label} · ${det.score.toFixed(2)}
            </div>`,
            iconSize: [80, 20],
            iconAnchor: [0, 24],
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

      {/* Floating Bottom Date Watermarks */}
      {isSwipeActive && (
        <>
          <div className="absolute bottom-4 left-4 z-[350] pointer-events-none bg-[#0B0F19]/85 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-md text-amber-300 font-semibold shadow-2xl flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>BEFORE: {beforeDate} (Old Baseline)</span>
          </div>

          <div className="absolute bottom-4 right-4 z-[350] pointer-events-none bg-[#0B0F19]/85 border border-indigo-500/40 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-md text-indigo-300 font-semibold shadow-2xl flex items-center gap-1.5">
            <span>AFTER: {afterDate} (Newest Photo)</span>
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          </div>
        </>
      )}

      {/* Floating Tactical Zoom & Control Overlay */}
      <div className="absolute right-4 top-16 z-[400] flex flex-col gap-2">
        <div className="bg-[#111827]/90 rounded-md border border-[#374151] p-1 shadow-2xl flex flex-col gap-1 backdrop-blur-md">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.flyTo(aoiCoords, 14)}
            className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-t border-slate-800"
            title="Center on AOI"
          >
            <Compass className="w-4 h-4 text-indigo-400" />
          </button>
        </div>

        {/* Tactical Coordinates Overlay */}
        <div className="bg-[#0F172A]/90 border border-slate-700/80 px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 shadow-xl backdrop-blur-md text-right">
          <div>LAT: {aoiCoords[0].toFixed(4)}° N</div>
          <div>LON: {aoiCoords[1].toFixed(4)}° E</div>
        </div>
      </div>
    </div>
  );
};
