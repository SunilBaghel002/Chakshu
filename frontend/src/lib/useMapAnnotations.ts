/**
 * Dynamic Map Notation and Visual Annotation Renderer Hook (SIH26167 §8, §9, §16-§21, §32).
 *
 * Centralizes Leaflet rendering of validated spatial evidence:
 * 1. Executes controlled map action contracts (highlight_evidence, show_labels, clear_annotations).
 * 2. Renders translucent fills (0.20-0.25 opacity) with visible halos over satellite tiles.
 * 3. Renders compact notation badges at polygon centroids (W-01, B-01, etc.).
 * 4. Maintains ASK annotations isolated from baseline analysis layers.
 */

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { Evidence } from './types';
import type { MapActionItem } from './types/ask';

export interface MapAnnotationState {
  evidenceIds: string[];
  mapActions: MapActionItem[];
  annotationLabels: Record<string, string>;
  target?: string;
  color?: string;
  focusBbox?: [number, number, number, number];
}

interface UseMapAnnotationsProps {
  map: L.Map | null;
  evidenceList: Evidence[];
  annotationState: MapAnnotationState | null;
  selectedEvidenceId: string | null;
  onSelectEvidence?: (ev: Evidence) => void;
  onClearAnnotations?: () => void;
}

const SEMANTIC_COLORS: Record<string, string> = {
  water: '#38BDF8',
  water_bodies: '#38BDF8',
  building: '#F97316',
  buildings: '#F97316',
  new_buildings: '#F97316',
  vegetation: '#22C55E',
  vegetation_gain: '#22C55E',
  vegetation_loss: '#EF4444',
  construction: '#F59E0B',
  bare_land: '#D97706',
  roads: '#94A3B8',
  road: '#94A3B8',
  changed_area: '#EC4899',
  selected_object: '#F5C15C',
};

function isValidGeometry(geom: any): boolean {
  if (!geom || typeof geom !== 'object') return false;
  if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') return false;
  const coords = geom.coordinates;
  if (!Array.isArray(coords) || coords.length === 0) return false;
  const ring = geom.type === 'Polygon' ? coords[0] : (coords[0] ? coords[0][0] : null);
  if (!Array.isArray(ring) || ring.length < 4) return false;
  return true;
}

import { findSmallestEvidenceAtLatLng } from './mapPolygonHelpers';

export function useMapAnnotations({
  map,
  evidenceList,
  annotationState,
  selectedEvidenceId,
  onSelectEvidence,
}: UseMapAnnotationsProps) {
  const haloLayerRef = useRef<L.GeoJSON | null>(null);
  const highlightLayerRef = useRef<L.GeoJSON | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelectEvidence);
  onSelectRef.current = onSelectEvidence;
  const selectedIdRef = useRef(selectedEvidenceId);
  selectedIdRef.current = selectedEvidenceId;

  const clearAnnotationLayers = useCallback(() => {
    if (!map) return;
    if (haloLayerRef.current) {
      map.removeLayer(haloLayerRef.current);
      haloLayerRef.current = null;
    }
    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const hasClearAction = annotationState?.mapActions?.some(
      (a) => a.action === 'clear_annotations'
    );
    if (!annotationState || hasClearAction || !annotationState.evidenceIds.length) {
      clearAnnotationLayers();
      return;
    }

    clearAnnotationLayers();

    let pane = map.getPane('askAnnotationsPane');
    if (!pane) {
      pane = map.createPane('askAnnotationsPane');
      pane.style.zIndex = '520';
      pane.style.transform = 'translate3d(0,0,0)';
      pane.style.willChange = 'clip-path';
      pane.style.pointerEvents = 'auto';
    }

    const { evidenceIds, mapActions, annotationLabels, target, color: customColor } = annotationState;
    const targetKey = target || 'changed_area';
    const baseColor = customColor || SEMANTIC_COLORS[targetKey] || '#38BDF8';

    const matchedEvidence: Evidence[] = [];
    evidenceIds.forEach((id) => {
      const found = evidenceList.find((e) => e.change_object_id === id);
      if (found && isValidGeometry(found.measurement?.geom_4326)) {
        matchedEvidence.push(found);
      }
    });

    if (!matchedEvidence.length) return;
    matchedEvidence.sort((a, b) => (b.measurement?.area_m2 || 0) - (a.measurement?.area_m2 || 0));

    const haloGroup = L.geoJSON(undefined, {
      pane: 'askAnnotationsPane',
      style: () => ({
        color: '#060910',
        weight: 4.5,
        opacity: 0.9,
        fill: false,
        interactive: false,
      }),
    });

    const highlightGroup = L.geoJSON(undefined, {
      pane: 'askAnnotationsPane',
      style: (feature) => {
        const id = feature?.properties?.change_object_id || '';
        const cType = feature?.properties?.change_type || '';
        const isSelected = id === selectedIdRef.current;
        const isPerimeter = id.startsWith('e1b10014');
        const polyColor =
          targetKey === 'changed_area'
            ? cType === 'water_gain'
              ? '#38BDF8'
              : cType === 'vegetation_gain'
              ? '#22C55E'
              : isPerimeter
              ? '#00E5FF'
              : '#F97316'
            : baseColor;
        return {
          color: isSelected ? '#FFAA4D' : polyColor,
          weight: isPerimeter ? 2.5 : isSelected ? 2.5 : 2.0,
          opacity: 1.0,
          fillColor: polyColor,
          fillOpacity: isPerimeter ? 0.08 : isSelected ? 0.38 : 0.26,
          dashArray: isPerimeter ? '6, 4' : undefined,
          className: 'ask-annotated-polygon',
        };
      },
      onEachFeature: (feature, layer) => {
        const evId = feature?.properties?.change_object_id;
        const ev = matchedEvidence.find((e) => e.change_object_id === evId);

        layer.on('mouseover', () => {
          (layer as L.Path).setStyle({ weight: 2.8, fillOpacity: 0.40 });
        });

        layer.on('mouseout', () => {
          const isSel = evId === selectedIdRef.current;
          (layer as L.Path).setStyle({ weight: isSel ? 2.5 : 2.0, fillOpacity: isSel ? 0.38 : 0.24 });
        });

        layer.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          const smallest = e?.latlng ? findSmallestEvidenceAtLatLng(e.latlng.lat, e.latlng.lng, evidenceList) : null;
          const targetEv = smallest || ev;
          if (targetEv && onSelectRef.current) onSelectRef.current(targetEv);
        });
      },
    });

    matchedEvidence.forEach((ev) => {
      const feat = {
        type: 'Feature' as const,
        properties: { change_object_id: ev.change_object_id, change_type: ev.change_type },
        geometry: ev.measurement.geom_4326,
      };
      haloGroup.addData(feat as any);
      highlightGroup.addData(feat as any);
    });

    haloGroup.addTo(map);
    highlightGroup.addTo(map);
    haloLayerRef.current = haloGroup;
    highlightLayerRef.current = highlightGroup;

    const shouldShowLabels = mapActions.some((a) => a.action === 'show_labels') || Boolean(Object.keys(annotationLabels).length);
    if (shouldShowLabels) {
      const labelsGroup = L.layerGroup([], { pane: 'askAnnotationsPane' });

      matchedEvidence.forEach((ev) => {
        const centroid = ev.measurement?.centroid;
        if (!centroid || centroid.length < 2) return;

        const labelText = annotationLabels[ev.change_object_id] || 'OBJ';
        const latLng: [number, number] = [centroid[1], centroid[0]];

        const badgeHtml = `
          <div class="ask-badge-inner" style="--badge-color: ${baseColor};">
            <span class="badge-dot"></span>
            <span class="badge-text">${labelText}</span>
          </div>
        `;

        const icon = L.divIcon({
          className: 'ask-notation-badge',
          html: badgeHtml,
          iconSize: [0, 0],
          iconAnchor: [24, 12],
        });

        const marker = L.marker(latLng, { icon, pane: 'askAnnotationsPane' });

        const tooltipText = `
          <div style="font-family: 'Inter', sans-serif; font-size: 11px;">
            <div style="font-weight: 700; color: #E9EFF8;">${ev.measurement?.measured_by || ev.change_type}</div>
            <div style="color: #8FA3BC;">Area: ${ev.measurement?.area_label || (ev.measurement.area_m2 / 10000).toFixed(2) + ' ha'}</div>
          </div>
        `;

        marker.bindTooltip(tooltipText, {
          className: 'ask-badge-tooltip',
          direction: 'top',
          offset: [0, -12],
          opacity: 0.96,
        });

        marker.on('click', () => {
          if (onSelectRef.current) onSelectRef.current(ev);
        });

        labelsGroup.addLayer(marker);
      });

      labelsGroup.addTo(map);
      labelsLayerRef.current = labelsGroup;
    }

    const polyBounds = highlightGroup.getBounds();
    const fitOpts = { paddingTopLeft: [110, 48] as [number, number], paddingBottomRight: [48, 48] as [number, number], maxZoom: 16, animate: true };
    if (polyBounds.isValid()) {
      map.fitBounds(polyBounds, fitOpts);
    } else if (annotationState.focusBbox && annotationState.focusBbox.length === 4) {
      const [minX, minY, maxX, maxY] = annotationState.focusBbox;
      map.fitBounds([[minY, minX], [maxY, maxX]], fitOpts);
    }

    return () => {
      clearAnnotationLayers();
    };
  }, [map, evidenceList, annotationState, clearAnnotationLayers]);

  return {
    clearAnnotations: clearAnnotationLayers,
  };
}
