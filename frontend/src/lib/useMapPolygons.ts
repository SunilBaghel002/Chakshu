import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Evidence } from './types';
import { getClassColor, getClassBadge } from './palette';

interface UseMapPolygonsProps {
  map: L.Map | null;
  evidenceList: Evidence[];
  selectedEvidenceId: string | null;
  onSelectEvidence: (evidence: Evidence) => void;
  showAllPolygons: boolean;
  setHoveredEvidence: (evidence: Evidence | null) => void;
  inspectorRef: React.RefObject<HTMLDivElement | null>;
  beforeDate?: string;
  afterDate?: string;
}

const getPolyStyle = (
  isSelected: boolean,
  color: string,
  visible: boolean,
  isBaselinePreExisting: boolean
) => {
  if (!visible) {
    return { color: 'transparent', weight: 0, opacity: 0, fillColor: color, fillOpacity: 0 };
  }
  if (isSelected) {
    return {
      color: '#F5C15C',
      weight: 3,
      opacity: 1.0,
      fillColor: color,
      fillOpacity: 0.45,
      dashArray: undefined,
    };
  }
  if (isBaselinePreExisting) {
    return {
      color: color,
      weight: 1.2,
      opacity: 0.4,
      fillColor: color,
      fillOpacity: 0.08,
      dashArray: '4, 6',
    };
  }
  return {
    color: color,
    weight: 2,
    opacity: 0.95,
    fillColor: color,
    fillOpacity: 0.24,
    dashArray: undefined,
  };
};

export function useMapPolygons({
  map,
  evidenceList,
  selectedEvidenceId,
  onSelectEvidence,
  showAllPolygons,
  setHoveredEvidence,
  inspectorRef,
  beforeDate,
  afterDate,
}: UseMapPolygonsProps) {
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const polygonLayersRef = useRef<Map<string, { layer: L.Path; color: string; evId: string }>>(new Map());
  const beforeDateRef = useRef(beforeDate);
  beforeDateRef.current = beforeDate;

  // Render change detection GeoJSON polygons
  // NOTE: beforeDate/afterDate are intentionally NOT in the dependency array.
  // We use a ref so date changes don't destroy/recreate all layers (which was
  // causing the "polygons vanish on date change" bug). A separate lighter
  // effect below handles temporal style updates.
  useEffect(() => {
    if (!map) return;

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }
    polygonLayersRef.current.clear();

    // Sort evidence by area DESCENDING so the largest polygon (concession
    // perimeter) is added first and drawn at the bottom of the stack.
    // Smaller, more specific facilities are added last and sit on top,
    // making them hoverable and clickable without being hidden beneath
    // the giant 1,334 ha perimeter outline.
    const sorted = [...evidenceList].sort(
      (a, b) => (b.measurement.area_m2 || 0) - (a.measurement.area_m2 || 0)
    );

    const layerGroup = L.geoJSON(undefined, {
      pane: 'polygonsPane',
      style: (feature) => {
        const id = feature?.properties?.change_object_id;
        const color = feature?.properties?.color || '#F0B45F';
        const isPreExisting = feature?.properties?.is_pre_existing || false;
        return getPolyStyle(id === selectedEvidenceId, color, showAllPolygons, isPreExisting);
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const matched = evidenceList.find((e) => e.change_object_id === props.change_object_id);
        const color = props.color;

        polygonLayersRef.current.set(props.change_object_id, {
          layer: layer as L.Path,
          color,
          evId: props.change_object_id,
        });

        layer.on('mouseover', () => {
          if (matched) {
            setHoveredEvidence(matched);
            if (inspectorRef.current) inspectorRef.current.classList.remove('hidden');
          }
          (layer as L.Path).setStyle({
            weight: 3,
            color: '#F5C15C',
            fillColor: color,
            fillOpacity: 0.48,
            dashArray: undefined,
          });
        });

        layer.on('mouseout', () => {
          setHoveredEvidence(null);
          if (inspectorRef.current) inspectorRef.current.classList.add('hidden');
          const onset = props.first_supported;
          const curBefore = beforeDateRef.current;
          const isPre = Boolean(curBefore && onset && onset < curBefore);
          (layer as L.Path).setStyle(
            getPolyStyle(props.change_object_id === selectedEvidenceId, color, showAllPolygons, isPre)
          );
        });

        const badge = getClassBadge(props.facility_label || props.change_type);
        const onsetYear = props.first_supported ? props.first_supported.slice(0, 4) : '2024';

        layer.bindTooltip(
          `<div style="font-family: var(--font-mono, monospace); font-size: 11px; padding: 5px 7px; background: rgba(11, 13, 16, 0.94); border: 1px solid ${color}80; border-radius: 4px; box-shadow: 0 4px 14px rgba(0,0,0,0.7); pointer-events: none;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
              <span style="background: ${badge.bg}; color: ${color}; font-weight: 800; font-size: 9px; padding: 1px 5px; border-radius: 2px; border: 1px solid ${color}60; letter-spacing: 0.5px;">${badge.name}</span>
              <span style="color: #A6ADB5; font-size: 9px; font-weight: 600;">ONSET ${onsetYear}</span>
            </div>
            <div style="font-weight: 700; color: #EDEAE3; font-size: 11px; line-height: 1.35; max-width: 240px;">${props.facility_label}</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px; font-size: 10px; color: ${color}; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 3px;">
              <span>SURFACE</span>
              <span style="font-weight: 700;">${props.area_label || ''}</span>
            </div>
          </div>`,
          { sticky: false, opacity: 0.98 }
        );

        layer.on('click', () => {
          if (matched) onSelectEvidence(matched);
        });
      },
    });

    sorted.forEach((ev) => {
      if (ev.measurement.geom_4326) {
        const facilityLabel =
          ev.measurement.measured_by?.replace(/^Semantic vectorisation, UTM 43N:\s*/, '') ||
          ev.measurement.area_label ||
          ev.change_type;
        const color = getClassColor(facilityLabel);
        const onset = ev.temporal?.first_supported;
        const isPreExisting = Boolean(beforeDateRef.current && onset && onset < beforeDateRef.current);

        layerGroup.addData({
          type: 'Feature' as const,
          properties: {
            change_object_id: ev.change_object_id,
            change_type: ev.change_type,
            facility_label: facilityLabel,
            area_label: ev.measurement.area_label,
            first_supported: ev.temporal?.first_supported,
            color,
            is_pre_existing: isPreExisting,
          },
          geometry: ev.measurement.geom_4326,
        } as any);
      }
    });

    layerGroup.addTo(map);
    geojsonLayerRef.current = layerGroup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, evidenceList, onSelectEvidence, showAllPolygons, selectedEvidenceId, setHoveredEvidence, inspectorRef]);

  // Lightweight effect: update temporal pre-existing styles when dates change
  // without destroying/recreating the entire layer tree
  useEffect(() => {
    if (!evidenceList.length) return;
    polygonLayersRef.current.forEach(({ layer, color, evId }) => {
      const ev = evidenceList.find((e) => e.change_object_id === evId);
      if (!ev) return;
      const onset = ev.temporal?.first_supported;
      const isPreExisting = Boolean(beforeDate && onset && onset < beforeDate);
      const isSelected = evId === selectedEvidenceId;
      layer.setStyle(getPolyStyle(isSelected, color, showAllPolygons, isPreExisting));
    });
  }, [beforeDate, afterDate, evidenceList, selectedEvidenceId, showAllPolygons]);

  // Update styles on selection / visibility changes
  useEffect(() => {
    polygonLayersRef.current.forEach(({ layer, color, evId }) => {
      const ev = evidenceList.find((e) => e.change_object_id === evId);
      const onset = ev?.temporal?.first_supported;
      const isPreExisting = Boolean(beforeDate && onset && onset < beforeDate);
      const isSelected = evId === selectedEvidenceId;
      layer.setStyle(getPolyStyle(isSelected, color, showAllPolygons, isPreExisting));
    });
  }, [selectedEvidenceId, showAllPolygons, beforeDate, evidenceList]);
}
