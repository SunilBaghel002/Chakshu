import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Evidence, DetectionSet } from './types';
import { getClassColor } from './palette';

interface UseMapPolygonsProps {
  map: L.Map | null;
  evidenceList: Evidence[];
  selectedEvidenceId: string | null;
  onSelectEvidence: (evidence: Evidence) => void;
  detectionSet?: DetectionSet | null;
  showAllPolygons: boolean;
  setHoveredEvidence: (evidence: Evidence | null) => void;
  inspectorRef: React.RefObject<HTMLDivElement | null>;
}

const getPolyStyle = (isSelected: boolean, color: string, visible: boolean) => ({
  color: isSelected ? '#F0B45F' : visible ? color : 'transparent',
  weight: isSelected ? 3 : visible ? 1.5 : 0,
  opacity: visible ? 0.9 : 0,
  fillColor: color,
  fillOpacity: isSelected ? 0.35 : visible ? 0.16 : 0,
  dashArray: isSelected ? undefined : '4, 4',
});

export function useMapPolygons({
  map,
  evidenceList,
  selectedEvidenceId,
  onSelectEvidence,
  detectionSet,
  showAllPolygons,
  setHoveredEvidence,
  inspectorRef,
}: UseMapPolygonsProps) {
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const detectionsLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonLayersRef = useRef<Map<string, { layer: L.Path; changeType: string }>>(new Map());

  // Render change detection GeoJSON polygons
  useEffect(() => {
    if (!map) return;

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }
    polygonLayersRef.current.clear();

    const layerGroup = L.geoJSON(undefined, {
      pane: 'polygonsPane',
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
          (layer as L.Path).setStyle({ weight: 2, color: '#F5C15C', fillOpacity: 0.38, dashArray: undefined });
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
          `<div style="font-family: var(--font-mono); font-size: 11px; padding: 2px 4px;">
            <strong style="color: ${color};">${typeStr}</strong>: <span style="font-weight: 700; color: #EDEAE3;">${label}</span>
          </div>`,
          { sticky: false, opacity: 0.95 }
        );

        layer.on('click', () => {
          if (matched) onSelectEvidence(matched);
        });
      },
    });

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
  }, [map, evidenceList, onSelectEvidence, showAllPolygons, selectedEvidenceId, setHoveredEvidence, inspectorRef]);

  // Update styles on selection / visibility changes
  useEffect(() => {
    polygonLayersRef.current.forEach(({ layer, changeType }, id) => {
      const isSelected = id === selectedEvidenceId;
      const color = getClassColor(changeType);
      layer.setStyle({
        color: isSelected ? '#F0B45F' : showAllPolygons ? color : 'transparent',
        weight: isSelected ? 3 : showAllPolygons ? 1.5 : 0,
        fillOpacity: isSelected ? 0.35 : showAllPolygons ? 0.16 : 0,
        dashArray: isSelected ? undefined : '4, 4',
      });
    });
  }, [selectedEvidenceId, showAllPolygons]);

  // Render auxiliary detection bounding boxes
  useEffect(() => {
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
  }, [map, detectionSet, showAllPolygons]);
}
