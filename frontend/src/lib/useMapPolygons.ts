import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { Evidence } from './types';
import { getClassColor } from './palette';
import { checkLabelCollisions, type BBox } from './map-fx';

interface UseMapPolygonsProps {
  map: L.Map | null;
  evidenceList: Evidence[];
  selectedEvidenceId: string | null;
  onSelectEvidence: (evidence: Evidence) => void;
  showAllPolygons: boolean;
  setHoveredEvidence: (evidence: Evidence | null) => void;
  onHoverWithBbox?: (evidence: Evidence | null, bbox: BBox | null) => void;
  onLabelsCollisionChange?: (hiddenCount: number) => void;
  beforeDate?: string;
  afterDate?: string;
}

/**
 * Styling per PRD 9 §5.1 & §2.5:
 * - Stroke at 100% 1.5 px + 1 px dark inner halo
 * - Fill 30%
 * - Track 3 dashed ('4, 4'), Tracks 1/2 solid
 * - Hover: stroke goes --amber-hot (#F5C15C) 2 px, fill 30% -> 45% (M3)
 */
const getPolyStyle = (
  isSelected: boolean,
  color: string,
  visible: boolean,
  isBaselinePreExisting: boolean,
  isTrack3: boolean = false
): L.PathOptions => {
  if (!visible) {
    return { color: 'transparent', weight: 0, opacity: 0, fillColor: color, fillOpacity: 0 };
  }
  if (isSelected) {
    return {
      color: '#F5C15C', // --amber-hot
      weight: 2.0,
      opacity: 1.0,
      fillColor: color,
      fillOpacity: 0.45,
      dashArray: isTrack3 ? '4, 4' : undefined,
      className: 'poly-halo-dark',
    };
  }
  if (isBaselinePreExisting) {
    return {
      color,
      weight: 1.2,
      opacity: 0.4,
      fillColor: color,
      fillOpacity: 0.08,
      dashArray: '4, 6',
      className: 'poly-halo-dark',
    };
  }
  return {
    color,
    weight: 1.5,
    opacity: 1.0,
    fillColor: color,
    fillOpacity: 0.30,
    dashArray: isTrack3 ? '4, 4' : undefined,
    className: 'poly-halo-dark',
  };
};

export function useMapPolygons({
  map,
  evidenceList,
  selectedEvidenceId,
  onSelectEvidence,
  showAllPolygons,
  setHoveredEvidence,
  onHoverWithBbox,
  onLabelsCollisionChange,
  beforeDate,
  afterDate,
}: UseMapPolygonsProps) {
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const haloLayerRef = useRef<L.GeoJSON | null>(null);
  const subpixelMarkersRef = useRef<L.LayerGroup | null>(null);
  const polygonLayersRef = useRef<Map<string, { layer: L.Path; color: string; evId: string; isTrack3: boolean }>>(new Map());
  const beforeDateRef = useRef(beforeDate);
  beforeDateRef.current = beforeDate;

  // Re-calculate screen-space label collision suppression (PRD 9 §5.1)
  const evaluateLabelCollisions = useCallback(() => {
    if (!map || !evidenceList.length) {
      onLabelsCollisionChange?.(0);
      return;
    }

    const labelItems: Array<{ id: string; x: number; y: number; width: number; height: number; priority?: number }> = [];

    evidenceList.forEach((ev) => {
      const centroid = ev.measurement.centroid;
      if (!centroid) return;
      // centroid is [lng, lat]
      const pt = map.latLngToContainerPoint([centroid[1], centroid[0]]);
      labelItems.push({
        id: ev.change_object_id,
        x: pt.x,
        y: pt.y,
        width: 140, // standard label footprint
        height: 36,
        priority: ev.measurement.area_m2 || 0,
      });
    });

    const { hiddenCount } = checkLabelCollisions(labelItems);
    onLabelsCollisionChange?.(hiddenCount);
  }, [map, evidenceList, onLabelsCollisionChange]);

  // Compute container BBox from a Leaflet layer for M3 lock-on brackets
  const computeContainerBBox = useCallback((layer: L.Path): BBox | null => {
    if (!map) return null;
    const bounds = (layer as any).getBounds?.();
    if (!bounds) return null;

    const nw = map.latLngToContainerPoint(bounds.getNorthWest());
    const se = map.latLngToContainerPoint(bounds.getSouthEast());

    return {
      minX: Math.min(nw.x, se.x),
      minY: Math.min(nw.y, se.y),
      maxX: Math.max(nw.x, se.x),
      maxY: Math.max(nw.y, se.y),
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }
    if (haloLayerRef.current) {
      map.removeLayer(haloLayerRef.current);
      haloLayerRef.current = null;
    }
    if (subpixelMarkersRef.current) {
      map.removeLayer(subpixelMarkersRef.current);
      subpixelMarkersRef.current = null;
    }
    polygonLayersRef.current.clear();

    const sorted = [...evidenceList].sort(
      (a, b) => (b.measurement.area_m2 || 0) - (a.measurement.area_m2 || 0)
    );

    // Dark halo underlay layer (1px dark halo extends 1px on each side of 1.5px stroke: weight 3.5)
    const haloGroup = L.geoJSON(undefined, {
      pane: 'polygonsPane',
      style: () => ({
        color: '#0B0D10',
        weight: 3.5,
        opacity: 0.95,
        fill: false,
        interactive: false,
      }),
    });

    const layerGroup = L.geoJSON(undefined, {
      pane: 'polygonsPane',
      style: (feature) => {
        const id = feature?.properties?.change_object_id;
        const color = feature?.properties?.color || '#F0B45F';
        const isPreExisting = feature?.properties?.is_pre_existing || false;
        const isTrack3 = feature?.properties?.is_track3 || false;
        return getPolyStyle(id === selectedEvidenceId, color, showAllPolygons, isPreExisting, isTrack3);
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const matched = evidenceList.find((e) => e.change_object_id === props.change_object_id);
        const color = props.color;
        const isTrack3 = Boolean(props.is_track3);

        polygonLayersRef.current.set(props.change_object_id, {
          layer: layer as L.Path,
          color,
          evId: props.change_object_id,
          isTrack3,
        });

        // M3 Target Lock-on on Hover
        layer.on('mouseover', () => {
          if (matched) {
            setHoveredEvidence(matched);
            const bbox = computeContainerBBox(layer as L.Path);
            onHoverWithBbox?.(matched, bbox);
          }
          // (a) stroke goes --amber-hot 2 px, fill 30% -> 45%
          (layer as L.Path).setStyle({
            weight: 2.0,
            color: '#F5C15C',
            fillColor: color,
            fillOpacity: 0.45,
            dashArray: isTrack3 ? '4, 4' : undefined,
          });
        });

        layer.on('mouseout', () => {
          setHoveredEvidence(null);
          onHoverWithBbox?.(null, null);
          const onset = props.first_supported;
          const curBefore = beforeDateRef.current;
          const isPre = Boolean(curBefore && onset && onset < curBefore);
          (layer as L.Path).setStyle(
            getPolyStyle(props.change_object_id === selectedEvidenceId, color, showAllPolygons, isPre, isTrack3)
          );
        });

        layer.on('click', () => {
          if (matched) onSelectEvidence(matched);
        });
      },
    });

    // Sub-pixel crosshair dots marker group (PRD 9 §5.1)
    const subpixelGroup = L.layerGroup([], { pane: 'polygonsPane' });

    sorted.forEach((ev) => {
      if (ev.measurement.geom_4326) {
        const facilityLabel =
          ev.measurement.measured_by?.replace(/^Semantic vectorisation, UTM 43N:\s*/, '') ||
          ev.measurement.area_label ||
          ev.change_type;
        const color = getClassColor(facilityLabel);
        const onset = ev.temporal?.first_supported;
        const isPreExisting = Boolean(beforeDateRef.current && onset && onset < beforeDateRef.current);
        const isTrack3 = (ev.measurement.kind as string) === 'INFERRED' || (ev as any).track === 'object_model';

        const feature = {
          type: 'Feature' as const,
          properties: {
            change_object_id: ev.change_object_id,
            change_type: ev.change_type,
            facility_label: facilityLabel,
            area_label: ev.measurement.area_label,
            first_supported: ev.temporal?.first_supported,
            color,
            is_pre_existing: isPreExisting,
            is_track3: isTrack3,
          },
          geometry: ev.measurement.geom_4326,
        };

        haloGroup.addData(feature as any);
        layerGroup.addData(feature as any);

        // If area is very small (sub-pixel box when zoomed out), also add crosshair dot
        if (ev.measurement.centroid && ev.measurement.area_m2 && ev.measurement.area_m2 < 120) {
          const latLng: [number, number] = [ev.measurement.centroid[1], ev.measurement.centroid[0]];
          const dot = L.circleMarker(latLng, {
            radius: 2,
            color: '#0B0D10',
            weight: 3,
            fillColor: color,
            fillOpacity: 1,
            pane: 'polygonsPane',
          });
          subpixelGroup.addLayer(dot);
        }
      }
    });

    haloGroup.addTo(map);
    layerGroup.addTo(map);
    subpixelGroup.addTo(map);

    haloLayerRef.current = haloGroup;
    geojsonLayerRef.current = layerGroup;
    subpixelMarkersRef.current = subpixelGroup;

    evaluateLabelCollisions();
    map.on('moveend zoomend', evaluateLabelCollisions);

    return () => {
      map.off('moveend zoomend', evaluateLabelCollisions);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, evidenceList, onSelectEvidence, showAllPolygons, selectedEvidenceId, setHoveredEvidence, onHoverWithBbox, evaluateLabelCollisions, computeContainerBBox]);

  // Lightweight style update on date change
  useEffect(() => {
    if (!evidenceList.length) return;
    polygonLayersRef.current.forEach(({ layer, color, evId, isTrack3 }) => {
      const ev = evidenceList.find((e) => e.change_object_id === evId);
      if (!ev) return;
      const onset = ev.temporal?.first_supported;
      const isPreExisting = Boolean(beforeDate && onset && onset < beforeDate);
      const isSelected = evId === selectedEvidenceId;
      layer.setStyle(getPolyStyle(isSelected, color, showAllPolygons, isPreExisting, isTrack3));
    });
  }, [beforeDate, afterDate, evidenceList, selectedEvidenceId, showAllPolygons]);

  // Lightweight style update on selection / visibility change
  useEffect(() => {
    polygonLayersRef.current.forEach(({ layer, color, evId, isTrack3 }) => {
      const ev = evidenceList.find((e) => e.change_object_id === evId);
      const onset = ev?.temporal?.first_supported;
      const isPreExisting = Boolean(beforeDate && onset && onset < beforeDate);
      const isSelected = evId === selectedEvidenceId;
      layer.setStyle(getPolyStyle(isSelected, color, showAllPolygons, isPreExisting, isTrack3));
    });
  }, [selectedEvidenceId, showAllPolygons, beforeDate, evidenceList]);
}
