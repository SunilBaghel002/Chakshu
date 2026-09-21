import { useEffect, useRef, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Evidence } from './types';
import { getClassColor } from './palette';
import { checkLabelCollisions, type BBox } from './map-fx';

interface UseMapPolygonsProps {
  map: maplibregl.Map | null;
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

const SOURCE_ID = 'evidence-source';
const LAYER_HALO = 'evidence-halo';
const LAYER_FILLS = 'evidence-fills';
const LAYER_LINES_SOLID = 'evidence-lines-solid';
const LAYER_LINES_DASHED = 'evidence-lines-dashed';
const LAYER_DOTS = 'evidence-subpixel-dots';

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
  afterDate: _afterDate,
}: UseMapPolygonsProps) {
  const hoveredIdRef = useRef<string | null>(null);
  const beforeDateRef = useRef(beforeDate);
  beforeDateRef.current = beforeDate;

  // Build GeoJSON FeatureCollection from evidence list
  const buildGeoJson = useCallback(() => {
    const features: GeoJSON.Feature[] = [];

    const sorted = [...evidenceList].sort(
      (a, b) => (b.measurement.area_m2 || 0) - (a.measurement.area_m2 || 0)
    );

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
        const isSelected = ev.change_object_id === selectedEvidenceId;
        const isHovered = ev.change_object_id === hoveredIdRef.current;

        features.push({
          type: 'Feature',
          id: ev.change_object_id,
          properties: {
            change_object_id: ev.change_object_id,
            change_type: ev.change_type,
            facility_label: facilityLabel,
            area_label: ev.measurement.area_label,
            first_supported: ev.temporal?.first_supported,
            color,
            is_pre_existing: isPreExisting,
            is_track3: isTrack3,
            is_selected: isSelected,
            is_hovered: isHovered,
            area_m2: ev.measurement.area_m2 || 0,
          },
          geometry: ev.measurement.geom_4326 as GeoJSON.Geometry,
        });
      }
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [evidenceList, selectedEvidenceId]);

  // Compute container BBox from coordinates for M3 lock-on brackets
  const computeContainerBBox = useCallback((ev: Evidence): BBox | null => {
    if (!map) return null;
    const geom = ev.measurement.geom_4326;
    if (!geom) {
      if (!ev.measurement.centroid) return null;
      const pt = map.project([ev.measurement.centroid[0], ev.measurement.centroid[1]]);
      return { minX: pt.x - 20, minY: pt.y - 20, maxX: pt.x + 20, maxY: pt.y + 20 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const processCoord = (coord: number[]) => {
      const c0 = coord[0];
      const c1 = coord[1];
      if (c0 !== undefined && c1 !== undefined) {
        const pt = map.project([c0, c1]);
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    };

    type NestedCoords = number[] | NestedCoords[];
    const traverseCoords = (coords: NestedCoords) => {
      if (typeof coords[0] === 'number') {
        processCoord(coords as number[]);
      } else {
        (coords as NestedCoords[]).forEach((c) => traverseCoords(c));
      }
    };

    traverseCoords(geom.coordinates);

    if (!isFinite(minX)) return null;
    return { minX, minY, maxX, maxY };
  }, [map]);

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
      const pt = map.project([centroid[0], centroid[1]]);
      labelItems.push({
        id: ev.change_object_id,
        x: pt.x,
        y: pt.y,
        width: 140,
        height: 36,
        priority: ev.measurement.area_m2 || 0,
      });
    });

    const { hiddenCount } = checkLabelCollisions(labelItems);
    onLabelsCollisionChange?.(hiddenCount);
  }, [map, evidenceList, onLabelsCollisionChange]);

  // Sync layers & data into MapLibre GL
  useEffect(() => {
    if (!map) return;

    const setupLayers = () => {
      const geojson = buildGeoJson();

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojson,
        });

        // 1. Dark halo underlay (1px dark halo around polygons)
        map.addLayer({
          id: LAYER_HALO,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': '#0B0D10',
            'line-width': 3.5,
            'line-opacity': 0.95,
          },
        });

        // 2. Translucent Polygon fills (30% default, 45% on hover/selected, 8% baseline pre-existing)
        map.addLayer({
          id: LAYER_FILLS,
          type: 'fill',
          source: SOURCE_ID,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': [
              'case',
              ['boolean', ['get', 'is_selected'], false],
              0.45,
              ['boolean', ['get', 'is_hovered'], false],
              0.45,
              ['boolean', ['get', 'is_pre_existing'], false],
              0.08,
              0.30,
            ],
          },
        });

        // 3. Solid lines (Tracks 1 & 2)
        map.addLayer({
          id: LAYER_LINES_SOLID,
          type: 'line',
          source: SOURCE_ID,
          filter: ['!=', ['get', 'is_track3'], true],
          paint: {
            'line-color': [
              'case',
              ['boolean', ['get', 'is_selected'], false],
              '#F5C15C',
              ['boolean', ['get', 'is_hovered'], false],
              '#F5C15C',
              ['get', 'color'],
            ],
            'line-width': [
              'case',
              ['boolean', ['get', 'is_selected'], false],
              2.5,
              ['boolean', ['get', 'is_hovered'], false],
              2.0,
              ['boolean', ['get', 'is_pre_existing'], false],
              1.2,
              1.5,
            ],
          },
        });

        // 4. Dashed lines (Track 3 Inferred)
        map.addLayer({
          id: LAYER_LINES_DASHED,
          type: 'line',
          source: SOURCE_ID,
          filter: ['==', ['get', 'is_track3'], true],
          paint: {
            'line-color': [
              'case',
              ['boolean', ['get', 'is_selected'], false],
              '#F5C15C',
              ['boolean', ['get', 'is_hovered'], false],
              '#F5C15C',
              ['get', 'color'],
            ],
            'line-width': [
              'case',
              ['boolean', ['get', 'is_selected'], false],
              2.5,
              ['boolean', ['get', 'is_hovered'], false],
              2.0,
              ['boolean', ['get', 'is_pre_existing'], false],
              1.2,
              1.5,
            ],
            'line-dasharray': [4, 4],
          },
        });

        // 5. Sub-pixel crosshair marker dots for micro areas (< 120 m²)
        map.addLayer({
          id: LAYER_DOTS,
          type: 'circle',
          source: SOURCE_ID,
          filter: ['<', ['coalesce', ['get', 'area_m2'], 9999], 120],
          paint: {
            'circle-radius': 3,
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#0B0D10',
            'circle-stroke-width': 2,
          },
        });
      } else {
        const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
        src.setData(geojson);
      }

      // Update visibility according to showAllPolygons
      const vis = showAllPolygons ? 'visible' : 'none';
      [LAYER_HALO, LAYER_FILLS, LAYER_LINES_SOLID, LAYER_LINES_DASHED, LAYER_DOTS].forEach((lid) => {
        if (map.getLayer(lid)) {
          map.setLayoutProperty(lid, 'visibility', vis);
        }
      });

      evaluateLabelCollisions();
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once('load', setupLayers);
    }
  }, [map, buildGeoJson, showAllPolygons, evaluateLabelCollisions]);

  // Wire up event listeners for hover, click, and camera movement
  useEffect(() => {
    if (!map) return;

    const onMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      const feat = e.features?.[0];
      if (!feat) return;
      map.getCanvas().style.cursor = 'pointer';
      const evId = feat.properties?.change_object_id;
      if (evId && evId !== hoveredIdRef.current) {
        hoveredIdRef.current = evId;
        const matched = evidenceList.find((item) => item.change_object_id === evId);
        if (matched) {
          setHoveredEvidence(matched);
          const bbox = computeContainerBBox(matched);
          onHoverWithBbox?.(matched, bbox);
        }
      }
    };

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      if (hoveredIdRef.current) {
        hoveredIdRef.current = null;
        setHoveredEvidence(null);
        onHoverWithBbox?.(null, null);
      }
    };

    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const evId = feat.properties?.change_object_id;
      const matched = evidenceList.find((item) => item.change_object_id === evId);
      if (matched) {
        onSelectEvidence(matched);
      }
    };

    const onMove = () => {
      evaluateLabelCollisions();
    };

    const setupEvents = () => {
      if (map.getLayer(LAYER_FILLS)) {
        map.on('mousemove', LAYER_FILLS, onMouseMove);
        map.on('mouseleave', LAYER_FILLS, onMouseLeave);
        map.on('click', LAYER_FILLS, onClick);
      }
      map.on('move', onMove);
    };

    if (map.isStyleLoaded()) {
      setupEvents();
    } else {
      map.once('load', setupEvents);
    }

    return () => {
      map.off('mousemove', LAYER_FILLS, onMouseMove);
      map.off('mouseleave', LAYER_FILLS, onMouseLeave);
      map.off('click', LAYER_FILLS, onClick);
      map.off('move', onMove);
    };
  }, [map, evidenceList, onSelectEvidence, setHoveredEvidence, onHoverWithBbox, computeContainerBBox, evaluateLabelCollisions]);
}
