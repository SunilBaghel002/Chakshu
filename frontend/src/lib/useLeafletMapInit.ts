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
    beforePane.style.transform = 'translate3d(0,0,0)';
    const isCloudFiltered = extractYear(beforeDate) === 2021 && !showClouds;
    beforePane.style.filter = isCloudFiltered
      ? 'contrast(1.18) saturate(1.15) brightness(1.02)'
      : 'saturate(1.08) contrast(1.04) brightness(1.02)';
    const beforeCfg = getSatelliteTileConfig(beforeDate, imageryMode, false, showClouds);
    const beforeSatellite = L.tileLayer(beforeCfg.url, {
      maxZoom: beforeCfg.maxZoom,
      maxNativeZoom: beforeCfg.maxNativeZoom,
      pane: 'beforePane',
      opacity: 1,
    });
    beforeSatellite.addTo(map);
    beforeTileLayerRef.current = beforeSatellite;

    const afterPane = map.createPane('afterPane');
    afterPane.style.zIndex = '450';
    afterPane.style.transform = 'translate3d(0,0,0)';
    afterPane.style.willChange = 'clip-path';
    afterPane.style.filter = dehazeActive
      ? 'contrast(1.22) saturate(1.28) brightness(0.96)'
      : 'saturate(1.08) contrast(1.06) brightness(1.02)';
    const afterCfg = getSatelliteTileConfig(afterDate, imageryMode, true);
    const afterSatellite = L.tileLayer(afterCfg.url, {
      maxZoom: afterCfg.maxZoom,
      maxNativeZoom: afterCfg.maxNativeZoom,
      pane: 'afterPane',
      opacity: 1,
    });
    afterSatellite.addTo(map);
    afterTileLayerRef.current = afterSatellite;

    const polygonsPane = map.createPane('polygonsPane');
    polygonsPane.style.zIndex = '500';
    polygonsPane.style.transform = 'translate3d(0,0,0)';
    polygonsPane.style.willChange = 'clip-path';
    polygonsPane.style.pointerEvents = 'none';

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 18, opacity: 0.5 }
    ).addTo(map);

    let moveRaf: number | null = null;
    let lastLat: number | null = null;
    let lastLng: number | null = null;

    const onLeafletMouseMove = (e: L.LeafletMouseEvent) => {
      lastLat = e.latlng.lat;
      lastLng = e.latlng.lng;
      if (moveRaf === null) {
        moveRaf = requestAnimationFrame(() => {
          moveRaf = null;
          if (lastLat !== null && lastLng !== null) {
            const rLat = Number(lastLat.toFixed(4));
            const rLng = Number(lastLng.toFixed(4));
            setCursorLat((prev) => (prev === rLat ? prev : rLat));
            setCursorLng((prev) => (prev === rLng ? prev : rLng));
          }
        });
      }
    };

    const onLeafletMouseOut = () => {
      if (moveRaf !== null) {
        cancelAnimationFrame(moveRaf);
        moveRaf = null;
      }
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
      if (moveRaf !== null) cancelAnimationFrame(moveRaf);
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
    const beforePane = mapInstanceRef.current.getPane('beforePane');
    if (beforePane) {
      const isCloudFiltered = extractYear(beforeDate) === 2021 && !showClouds;
      beforePane.style.filter = isCloudFiltered
        ? 'contrast(1.18) saturate(1.15) brightness(1.02)'
        : 'saturate(1.08) contrast(1.04) brightness(1.02)';
    }
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
