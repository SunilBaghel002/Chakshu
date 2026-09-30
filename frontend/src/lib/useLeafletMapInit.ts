/**
 * lib/useLeafletMapInit.ts
 * Leaflet map instance initialization, panes setup, satellite tile layers, and viewport listeners
 */

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { trackMapViewport } from './map-fx';
import { getSatelliteTileConfig, extractYear, type ImageryMode } from './satelliteProviders';

export interface UseLeafletMapInitProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  aoiCoords: [number, number];
  aoiBounds?: [[number, number], [number, number]];
  selectedAoiId?: string;
  beforeDate: string;
  afterDate: string;
  imageryMode: ImageryMode;
  showClouds: boolean;
  dehazeActive: boolean;
  setCursorLat: React.Dispatch<React.SetStateAction<number | null>>;
  setCursorLng: React.Dispatch<React.SetStateAction<number | null>>;
  setCurrentZoom: React.Dispatch<React.SetStateAction<number>>;
}

export function useLeafletMapInit({
  containerRef,
  aoiCoords,
  aoiBounds,
  selectedAoiId,
  beforeDate,
  afterDate,
  imageryMode,
  showClouds,
  dehazeActive,
  setCursorLat,
  setCursorLng,
  setCurrentZoom,
}: UseLeafletMapInitProps) {
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const beforeTileLayerRef = useRef<L.TileLayer | null>(null);
  const afterTileLayerRef = useRef<L.TileLayer | null>(null);
  const prevAoiIdRef = useRef<string | null>(null);

  // Initialize Leaflet Map once on mount
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;
    const map = L.map(containerRef.current, {
      center: aoiCoords,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });
    if (aoiBounds) map.fitBounds(aoiBounds, { padding: [36, 36], maxZoom: 15 });

    const beforePane = map.createPane('beforePane');
    beforePane.style.zIndex = '200';
    const beforeCfg = getSatelliteTileConfig(beforeDate, imageryMode, false, showClouds);
    const beforeSatellite = L.tileLayer(beforeCfg.url, {
      maxZoom: beforeCfg.maxZoom,
      maxNativeZoom: beforeCfg.maxNativeZoom,
      pane: 'beforePane',
      opacity: 1,
      updateWhenIdle: true,
      keepBuffer: 2,
    });
    beforeSatellite.addTo(map);
    beforeTileLayerRef.current = beforeSatellite;

    const afterPane = map.createPane('afterPane');
    afterPane.style.zIndex = '450';
    afterPane.style.willChange = 'clip-path';
    const afterCfg = getSatelliteTileConfig(afterDate, imageryMode, true);
    const afterSatellite = L.tileLayer(afterCfg.url, {
      maxZoom: afterCfg.maxZoom,
      maxNativeZoom: afterCfg.maxNativeZoom,
      pane: 'afterPane',
      opacity: 1,
      updateWhenIdle: true,
      keepBuffer: 2,
    });
    afterSatellite.addTo(map);
    afterTileLayerRef.current = afterSatellite;

    const polygonsPane = map.createPane('polygonsPane');
    polygonsPane.style.zIndex = '500';
    polygonsPane.style.willChange = 'clip-path';
    polygonsPane.style.pointerEvents = 'none';

    const askAnnotationsPane = map.createPane('askAnnotationsPane');
    askAnnotationsPane.style.zIndex = '520';
    askAnnotationsPane.style.willChange = 'clip-path';
    askAnnotationsPane.style.pointerEvents = 'auto';

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 18, opacity: 0.5, updateWhenIdle: true }
    ).addTo(map);

    let lastMoveTs = 0;
    const onLeafletMouseMove = (e: L.LeafletMouseEvent) => {
      const now = performance.now();
      if (now - lastMoveTs < 120) return;
      lastMoveTs = now;
      const rLat = Number(e.latlng.lat.toFixed(4));
      const rLng = Number(e.latlng.lng.toFixed(4));
      setCursorLat((prev) => (prev === rLat ? prev : rLat));
      setCursorLng((prev) => (prev === rLng ? prev : rLng));
    };

    const onLeafletMouseOut = () => {
      setCursorLat(null);
      setCursorLng(null);
    };

    map.on('mousemove', onLeafletMouseMove);
    map.on('mouseout', onLeafletMouseOut);
    map.on('zoomend', () => setCurrentZoom(map.getZoom()));
    map.on('moveend', () => {
      const c = map.getCenter();
      trackMapViewport(map.getZoom(), [c.lat, c.lng]);
    });

    mapInstanceRef.current = map;
    setMapInstance(map);
    prevAoiIdRef.current = selectedAoiId ?? null;
    setTimeout(() => map.invalidateSize(), 150);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
      setMapInstance(null);
    };
  }, []);

  // Update satellite tile layers on date or cloud filter changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const bCfg = getSatelliteTileConfig(beforeDate, imageryMode, false, showClouds);
    if (beforeTileLayerRef.current) beforeTileLayerRef.current.setUrl(bCfg.url);
    const aCfg = getSatelliteTileConfig(afterDate, imageryMode, true);
    if (afterTileLayerRef.current) afterTileLayerRef.current.setUrl(aCfg.url);
  }, [beforeDate, afterDate, imageryMode, showClouds]);

  return {
    mapInstance,
    mapInstanceRef,
    beforeTileLayerRef,
    afterTileLayerRef,
    prevAoiIdRef,
  };
}
