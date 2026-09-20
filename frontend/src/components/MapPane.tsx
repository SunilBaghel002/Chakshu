import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Evidence, DetectionSet } from '../lib/types';
import { PALETTE, getClassColor, getDarkerClassColor } from '../lib/palette';
import { SwipeCompare } from './SwipeCompare';
import { Layers, ZoomIn, ZoomOut, Compass } from 'lucide-react';

interface MapPaneProps {
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
  const afterTilePaneRef = useRef<HTMLDivElement | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(aoiCoords, 14);
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: aoiCoords,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark Tactical / Satellite Basemap (Esri World Imagery + CartoDB fallback)
    const esriSatellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, opacity: 0.95 }
    );
    esriSatellite.addTo(map);

    // Labels overlay
    const cartoLabels = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 18, opacity: 0.6 }
    );
    cartoLabels.addTo(map);

    mapInstanceRef.current = map;

    // Ensure map tiles fill the container smoothly
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        map.invalidateSize();
      }
    }, 150);

    const handleResize = () => {
      if (mapInstanceRef.current) {
        map.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [aoiCoords]);

  // Recenter map when AOI changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(aoiCoords, 14, { duration: 1.2 });
    }
  }, [aoiCoords]);

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
        const strokeColor = isSelected ? PALETTE.amber : getDarkerClassColor(changeType);

        return {
          color: strokeColor,
          weight: isSelected ? 3.5 : 2.5,
          opacity: 1,
          fillColor: color,
          fillOpacity: isSelected ? 0.65 : 0.48,
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
      const strokeColor = getDarkerClassColor(det.label);

      const boxLayer = L.geoJSON(det.geom_4326 as any, {
        style: {
          color: strokeColor,
          weight: 2.5,
          // Track 3 vision model boxes dashed [6, 4] per PRD 9 §6.6
          dashArray: isTrack3 ? '6, 4' : undefined,
          fillColor: color,
          fillOpacity: isTrack3 ? 0.22 : 0.45,
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

      {/* Swipe Comparison Layer Overlay (Visual Split Simulation) */}
      {isSwipeActive && (
        <div
          ref={afterTilePaneRef}
          className="absolute inset-0 pointer-events-none z-[300]"
          style={{
            clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)`,
            borderLeft: '2px solid rgba(99, 102, 241, 0.9)',
          }}
        >
          {/* Subtle contrast highlight simulating 2026 expansion date */}
          <div className="w-full h-full bg-indigo-950/10 backdrop-contrast-125 pointer-events-none" />
        </div>
      )}

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


      {/* Top Map Tactical Overlays */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none">
        {/* Left Badges */}
        <div className="flex items-center gap-2 pointer-events-auto font-mono text-[11px]">
          <div className="bg-[#090D13]/90 border border-[#F2B84B]/50 px-2.5 py-1 rounded text-[#F2B84B] font-bold shadow-xl backdrop-blur-md flex items-center gap-1.5">
            <span>DATE A: {beforeDate} ({beforeDate.split('-')[0]})</span>
          </div>

          <div className="bg-[#090D13]/90 border border-[#F2B84B]/40 px-2 py-1 rounded text-[#F2B84B] text-[10px] font-bold shadow-xl backdrop-blur-md flex items-center gap-1">
            <span>⌖</span>
            <span>POLYGONS VISIBLE</span>
          </div>
        </div>

        {/* Center Satellite Pipeline & Sensor Toolbar */}
        <div className="hidden lg:flex items-center gap-1 bg-[#090D13]/95 border border-[#1C2333] p-1 rounded-md shadow-2xl backdrop-blur-md pointer-events-auto font-mono text-[10px]">
          <span className="px-2 py-0.5 rounded bg-[#111622] text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            HYBRID: TEMPORAL + GOOGLE HD REC
          </span>
          <span className="px-1.5 py-0.5 text-slate-400 hover:text-white cursor-pointer">
            HIGH-RES TEMPORAL (0.5M)
          </span>
          <span className="px-1.5 py-0.5 text-slate-400 hover:text-white cursor-pointer">
            SENTINEL-2 (10M)
          </span>
          <span className="px-1.5 py-0.5 text-slate-400 hover:text-white cursor-pointer">
            GOOGLE HD
          </span>
          <button className="px-1.5 py-0.5 rounded bg-[#111622] text-[#24C6C8] font-bold border border-[#24C6C8]/40 ml-1">
            DE-HAZE: ON
          </button>
          <button className="px-2 py-0.5 rounded bg-[#111622] hover:bg-[#F2B84B] text-slate-300 hover:text-black font-bold border border-[#1C2333] transition-colors ml-1">
            INTEL
          </button>
        </div>

        {/* Right Empty Spacer */}
        <div className="w-20" />
      </div>

      {/* Floating Tactical Zoom & Control Overlay */}
      <div className="absolute right-3 top-14 z-[400] flex flex-col gap-2">
        <div className="bg-[#090D13]/95 rounded border border-[#1C2333] p-0.5 shadow-2xl flex flex-col gap-0.5 backdrop-blur-md">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-[#F2B84B] transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-[#F2B84B] transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.flyTo(aoiCoords, 14)}
            className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-[#F2B84B] transition-colors border-t border-slate-800"
            title="Center on AOI"
          >
            <Compass className="w-4 h-4 text-[#F2B84B]" />
          </button>
        </div>

        {/* Tactical Coordinates Overlay */}
        <div className="bg-[#090D13]/95 border border-[#1C2333] px-2 py-1 rounded text-[9px] font-mono text-slate-300 shadow-xl backdrop-blur-md text-right">
          <div>LAT: {aoiCoords[0].toFixed(4)}° N</div>
          <div>LON: {aoiCoords[1].toFixed(4)}° E</div>
        </div>
      </div>
    </div>
  );
};
