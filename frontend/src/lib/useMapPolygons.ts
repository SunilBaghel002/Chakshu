import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { Evidence } from './types';
import { getClassColor } from './palette';
import { checkLabelCollisions, type BBox } from './map-fx';
import {
  getPolyStyle,
  buildPolygonTooltipHtml,
  computeContainerBBoxFromLayer,
} from './mapPolygonHelpers';

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
  const haloLayersMapRef = useRef<Map<string, L.Path>>(new Map());
  const subpixelMarkersRef = useRef<L.LayerGroup | null>(null);
  const subpixelMarkersListRef = useRef<Array<{ marker: L.CircleMarker; onset?: string | null }>>([]);
  const polygonLayersRef = useRef<Map<string, { layer: L.Path; color: string; evId: string; isTrack3: boolean }>>(new Map());
  const beforeDateRef = useRef(beforeDate);
  beforeDateRef.current = beforeDate;
  const afterDateRef = useRef(afterDate);
  afterDateRef.current = afterDate;
  const prevDatesRef = useRef({ beforeDate, afterDate, showAllPolygons });

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
    haloLayersMapRef.current.clear();
    subpixelMarkersListRef.current = [];

    const sorted = [...evidenceList].sort(
      (a, b) => (b.measurement.area_m2 || 0) - (a.measurement.area_m2 || 0)
    );

    // Dark halo underlay layer (1px dark halo extends 1px on each side of 1.5px stroke: weight 3.5)
    const haloGroup = L.geoJSON(undefined, {
      pane: 'polygonsPane',
      interactive: false,
      style: (feature) => {
        const onset = feature?.properties?.first_supported;
        const isEmerged = Boolean(!onset || !afterDate || onset <= afterDate);
        if (!showAllPolygons || !isEmerged) {
          return { color: 'transparent', weight: 0, opacity: 0, fill: false };
        }
        return {
          color: '#0B0D10',
          weight: 3.5,
          opacity: 0.95,
          fill: false,
          className: 'poly-halo-noninteractive',
        };
      },
      onEachFeature: (feature, layer) => {
        const id = feature?.properties?.change_object_id;
        if (id) {
          haloLayersMapRef.current.set(id, layer as L.Path);
        }
      },
    });

    const layerGroup = L.geoJSON(undefined, {
      pane: 'polygonsPane',
      style: (feature) => {
        const id = feature?.properties?.change_object_id;
        const color = feature?.properties?.color || '#F0B45F';
        const isPreExisting = feature?.properties?.is_pre_existing || false;
        const isTrack3 = feature?.properties?.is_track3 || false;
        const onset = feature?.properties?.first_supported;
        const isEmerged = Boolean(!onset || !afterDate || onset <= afterDate);
        return getPolyStyle(id === selectedEvidenceId, color, showAllPolygons, isPreExisting, isTrack3, isEmerged);
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

        const areaLabel = matched?.measurement.area_label || props.area_label || '';
        const confPct = Math.round((matched?.confidence?.overall || 0.85) * 100);

        const tooltipHtml = buildPolygonTooltipHtml({
          facilityLabel: props.facility_label,
          changeType: props.change_type,
          areaLabel,
          confPct,
        });

        (layer as L.Path).bindTooltip(tooltipHtml, {
          sticky: true,
          direction: 'auto',
          className: 'leaflet-tactical-tooltip',
          opacity: 0.98,
          offset: L.point(10, 10),
        });

        const triggerHover = () => {
          if (matched) {
            setHoveredEvidence(matched);
            const bbox = computeContainerBBoxFromLayer(map, layer as L.Path);
            onHoverWithBbox?.(matched, bbox);
          }
          (layer as L.Path).setStyle({
            weight: 2.0,
            color: '#F5C15C',
            fillColor: color,
            fillOpacity: 0.45,
            dashArray: isTrack3 ? '4, 4' : undefined,
          });
        };

        const triggerUnhover = () => {
          setHoveredEvidence(null);
          onHoverWithBbox?.(null, null);
          const onset = props.first_supported;
          const curBefore = beforeDateRef.current;
          const curAfter = afterDateRef.current;
          const isPre = Boolean(curBefore && onset && onset < curBefore);
          const isEmerged = Boolean(!onset || !curAfter || onset <= curAfter);
          (layer as L.Path).setStyle(
            getPolyStyle(props.change_object_id === selectedEvidenceId, color, showAllPolygons, isPre, isTrack3, isEmerged)
          );
        };

        const triggerSelect = (e?: L.LeafletMouseEvent | MouseEvent) => {
          if (e) {
            if ('originalEvent' in e) L.DomEvent.stopPropagation(e);
            else if ('stopPropagation' in e) e.stopPropagation();
          }
          if (matched) onSelectEvidence(matched);
        };

        // Leaflet event hooks
        layer.on('mouseover', triggerHover);
        layer.on('mouseout', triggerUnhover);
        layer.on('click', triggerSelect);

        // Native DOM event hooks for 100% click/hover reliability
        layer.on('add', () => {
          const pathEl = (layer as unknown as { _path?: SVGElement })._path;
          if (pathEl) {
            pathEl.style.cursor = 'pointer';
            pathEl.style.pointerEvents = 'auto';
            pathEl.setAttribute('pointer-events', 'auto');
            pathEl.onclick = (e) => triggerSelect(e);
            pathEl.onmouseenter = triggerHover;
            pathEl.onmouseleave = triggerUnhover;
          }
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
        const isTrack3 = (ev.measurement.kind as string) === 'INFERRED' || ('track' in ev && ev.track === 'object_model');

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

        haloGroup.addData(feature as unknown as GeoJSON.GeoJsonObject);
        layerGroup.addData(feature as unknown as GeoJSON.GeoJsonObject);

        // If area is very small (sub-pixel box when zoomed out), also add crosshair dot
        if (ev.measurement.centroid && ev.measurement.area_m2 && ev.measurement.area_m2 < 120) {
          const latLng: [number, number] = [ev.measurement.centroid[1], ev.measurement.centroid[0]];
          const isEmerged = Boolean(!onset || !afterDate || onset <= afterDate);
          const dot = L.circleMarker(latLng, {
            radius: 2,
            color: '#0B0D10',
            weight: 3,
            fillColor: color,
            fillOpacity: isEmerged && showAllPolygons ? 1 : 0,
            opacity: isEmerged && showAllPolygons ? 1 : 0,
            pane: 'polygonsPane',
            interactive: false,
          });
          subpixelGroup.addLayer(dot);
          subpixelMarkersListRef.current.push({ marker: dot, onset });
        }
      }
    });

    haloGroup.addTo(map);
    layerGroup.addTo(map);
    subpixelGroup.addTo(map);

    // Ensure all rendered SVG paths have pointer-events: auto and cursor: pointer
    layerGroup.eachLayer((l) => {
      const pathEl = (l as unknown as { _path?: SVGElement })._path;
      if (pathEl) {
        pathEl.style.cursor = 'pointer';
        pathEl.style.pointerEvents = 'auto';
        pathEl.setAttribute('pointer-events', 'auto');
      }
    });

    haloLayerRef.current = haloGroup;
    geojsonLayerRef.current = layerGroup;
    subpixelMarkersRef.current = subpixelGroup;

    evaluateLabelCollisions();
    map.on('moveend zoomend', evaluateLabelCollisions);

    return () => {
      map.off('moveend zoomend', evaluateLabelCollisions);
    };
  }, [map, evidenceList, onSelectEvidence, showAllPolygons, setHoveredEvidence, onHoverWithBbox, evaluateLabelCollisions]);

  const prevSelectedIdRef = useRef<string | null>(null);

  // In-place lightweight style update on selection / date changes without layer recreation
  useEffect(() => {
    if (map) {
      const polyPane = map.getPane('polygonsPane');
      if (polyPane) {
        polyPane.style.display = showAllPolygons ? 'block' : 'none';
      }
    }

    if (!evidenceList.length || !polygonLayersRef.current.size) return;

    const prevId = prevSelectedIdRef.current;
    prevSelectedIdRef.current = selectedEvidenceId;

    const datesChanged =
      prevDatesRef.current.beforeDate !== beforeDate ||
      prevDatesRef.current.afterDate !== afterDate ||
      prevDatesRef.current.showAllPolygons !== showAllPolygons;
    prevDatesRef.current = { beforeDate, afterDate, showAllPolygons };

    // Fast-path: if only selection changed and dates/visibility didn't change
    if (!datesChanged && prevId !== selectedEvidenceId) {
      if (prevId && polygonLayersRef.current.has(prevId)) {
        const prevEntry = polygonLayersRef.current.get(prevId)!;
        const ev = evidenceList.find((e) => e.change_object_id === prevId);
        const onset = ev?.temporal?.first_supported;
        const isEmerged = Boolean(!onset || !afterDate || onset <= afterDate);
        const isPre = Boolean(beforeDate && onset && onset < beforeDate);
        prevEntry.layer.setStyle(getPolyStyle(false, prevEntry.color, showAllPolygons, isPre, prevEntry.isTrack3, isEmerged));
      }
      if (selectedEvidenceId && polygonLayersRef.current.has(selectedEvidenceId)) {
        const nextEntry = polygonLayersRef.current.get(selectedEvidenceId)!;
        const ev = evidenceList.find((e) => e.change_object_id === selectedEvidenceId);
        const onset = ev?.temporal?.first_supported;
        const isEmerged = Boolean(!onset || !afterDate || onset <= afterDate);
        const isPre = Boolean(beforeDate && onset && onset < beforeDate);
        nextEntry.layer.setStyle(getPolyStyle(true, nextEntry.color, showAllPolygons, isPre, nextEntry.isTrack3, isEmerged));
      }
      return;
    }

    // Full style refresh if dates or visibility changed
    polygonLayersRef.current.forEach(({ layer, color, evId, isTrack3 }) => {
      const ev = evidenceList.find((e) => e.change_object_id === evId);
      if (!ev) return;
      const onset = ev.temporal?.first_supported;
      const isEmerged = Boolean(!onset || !afterDate || onset <= afterDate);
      const isPreExisting = Boolean(beforeDate && onset && onset < beforeDate);
      const isSelected = evId === selectedEvidenceId;
      layer.setStyle(getPolyStyle(isSelected, color, showAllPolygons, isPreExisting, isTrack3, isEmerged));
      const pathEl = (layer as unknown as { _path?: SVGElement })._path;
      if (pathEl) {
        pathEl.style.pointerEvents = isEmerged && showAllPolygons ? 'auto' : 'none';
      }
    });

    // Synchronize halo layers
    haloLayersMapRef.current.forEach((haloLayer, evId) => {
      const ev = evidenceList.find((e) => e.change_object_id === evId);
      const onset = ev?.temporal?.first_supported;
      const isEmerged = Boolean(!onset || !afterDate || onset <= afterDate);
      if (!showAllPolygons || !isEmerged) {
        haloLayer.setStyle({ color: 'transparent', weight: 0, opacity: 0 });
      } else {
        haloLayer.setStyle({ color: '#0B0D10', weight: 3.5, opacity: 0.95 });
      }
    });

    // Synchronize subpixel dots
    subpixelMarkersListRef.current.forEach(({ marker, onset }) => {
      const isEmerged = Boolean(!onset || !afterDate || onset <= afterDate);
      if (!showAllPolygons || !isEmerged) {
        marker.setStyle({ opacity: 0, fillOpacity: 0 });
      } else {
        marker.setStyle({ opacity: 1, fillOpacity: 1 });
      }
    });
  }, [selectedEvidenceId, showAllPolygons, beforeDate, afterDate, evidenceList]);
}
