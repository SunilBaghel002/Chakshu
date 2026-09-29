/**
 * lib/satelliteIntelligence.ts
 * Satellite metadata, historical Wayback catalog releases, and sensor intelligence
 */

import type { ImageryMode } from './satelliteProviders';

export interface SatelliteSourceIntelligence {
  sensor: string;
  provider: string;
  resolution: string;
  acquisitionDate: string;
  catalogRelease: string;
  opticalBands: string;
  pipelineStatus: string;
  latencyExplanation: string;
}

export const WAYBACK_RELEASES: Record<number, { m: number; note: string; date: string }> = {
  2018: { m: 23448, note: 'Pre-construction agricultural land', date: '2018-12-14' },
  2019: { m: 4756, note: 'Pre-construction agricultural land', date: '2019-12-12' },
  2020: { m: 9181, note: 'Pre-construction agricultural land', date: '2020-12-16' },
  2021: { m: 9181, note: 'Pre-construction farmland (No airport)', date: '2021-01-13' },
  2022: { m: 45134, note: 'Site survey & perimeter clearing', date: '2022-12-14' },
  2023: { m: 56102, note: 'Runway grading & earthworks', date: '2023-12-07' },
  2024: { m: 49849, note: 'Active runway & terminal construction', date: '2024-12-12' },
  2025: { m: 13192, note: 'Runway tarmac & terminal superstructure', date: '2025-01-19' },
  2026: { m: 26334, note: 'Maxar WV-3 Capture (Jan 2025 basemap)', date: '2025-01-19' },
};

function parseYear(dateStr: string): number {
  const match = dateStr.match(/^(\d{4})/);
  if (match && match[1]) {
    const y = parseInt(match[1], 10);
    if (!isNaN(y)) return y;
  }
  return 2024;
}

/**
 * Return in-depth telemetry intelligence about the active satellite capture.
 */
export function getImageryIntelligence(
  dateStr: string,
  mode: ImageryMode,
  isAfterSide: boolean
): SatelliteSourceIntelligence {
  const year = parseYear(dateStr);

  if (mode === 'hybrid_optimum') {
    if (!isAfterSide) {
      const rel = WAYBACK_RELEASES[year] || WAYBACK_RELEASES[2021]!;
      return {
        sensor: 'Maxar WorldView-2 / GeoEye-1 Optical (0.5m GSD)',
        provider: 'Maxar Technologies via Esri Wayback Historical Archive',
        resolution: '0.5m (50 cm ground resolution)',
        acquisitionDate: rel.date,
        catalogRelease: `Wayback Release M=${rel.m} (${year})`,
        opticalBands: 'Panchromatic-sharpened True Color RGB',
        pipelineStatus: `Historical Baseline: ${rel.note}`,
        latencyExplanation:
          'Authentic pre-construction satellite baseline preserved in high-resolution archives before airport development began.',
      };
    } else {
      return {
        sensor: 'Commercial Satellite Constellation (WorldView-3 / GeoEye-1)',
        provider: 'Google Satellite & Maxar Technologies',
        resolution: '0.3m (30 cm ground resolution · Ultra HD)',
        acquisitionDate: 'Current Operational Epoch (c. 2025–2026)',
        catalogRelease: 'Google High-Resolution Optical Basemap',
        opticalBands: 'True Color RGB with Atmospheric De-Haze & Cloud Filtering',
        pipelineStatus: 'Operational Jewar Airport (Runway 10/28, taxiways, ATC tower, and terminal complete)',
        latencyExplanation:
          'Matches current Google Maps imagery on mobile devices. Dynamic atmospheric contrast filter removes thin cloud scatter and smog haze.',
      };
    }
  }

  if (mode === 'google') {
    return {
      sensor: 'Commercial Optical Satellite (WV-2/WV-3/GeoEye)',
      provider: 'Google Satellite & Maxar Technologies',
      resolution: '0.3m (30 cm/pixel)',
      acquisitionDate: 'Circa 2024–2025 (Global mosaic)',
      catalogRelease: 'Google Basemap Cache',
      opticalBands: 'Panchromatic-sharpened True Color RGB',
      pipelineStatus: 'Public Global Commercial Basemap',
      latencyExplanation:
        'Commercial global mosaics lag by 6–18 months due to proprietary commercial embargoes, orthorectification, and cloud-masking cycles.',
    };
  }

  if (mode === 'sentinel2') {
    return {
      sensor: 'Copernicus Sentinel-2A/2B/2C (MSI)',
      provider: 'European Space Agency (ESA) & EOX IT Services',
      resolution: '10m GSD',
      acquisitionDate: `${year} Annual Cloudless Composite (Live STAC available to Sep 2026)`,
      catalogRelease: `Copernicus Open Access / EOX ${year}`,
      opticalBands: 'B02 (Blue), B03 (Green), B04 (Red), B08 (NIR), B11 (SWIR-1), SCL',
      pipelineStatus: 'Operational Multi-spectral Constellation (Revisit: 5 days)',
      latencyExplanation:
        'Near real-time (2–4 hours from satellite pass to AWS Earth Search STAC catalog).',
    };
  }

  // highres_temporal
  if (isAfterSide && year >= 2025) {
    return {
      sensor: 'Maxar WorldView-3 (WV03)',
      provider: 'Vantor / Maxar Technologies via Esri World Imagery',
      resolution: '0.31m (31 cm ground resolution)',
      acquisitionDate: '2025-01-19 (19 January 2025)',
      catalogRelease: 'Esri Raster Basemaps 2026.R05',
      opticalBands: 'True Color RGB (31cm Pan-sharpened)',
      pipelineStatus: 'Mid-construction Snapshot (Runway 10/28 paved; ongoing terminal apron grading)',
      latencyExplanation:
        'The satellite image was physically captured on 19 January 2025. Commercial passes beyond 2025 require enterprise licensing.',
    };
  }

  if (year <= 2021) {
    return {
      sensor: 'Maxar WorldView-2 / GeoEye-1',
      provider: 'DigitalGlobe / Maxar via Esri Wayback',
      resolution: '0.5m (50 cm ground resolution)',
      acquisitionDate: '2021-01-13 (13 January 2021)',
      catalogRelease: 'Wayback Archive M=1049 (WB_2021_R01)',
      opticalBands: 'True Color RGB',
      pipelineStatus: 'Pre-construction Baseline (Pristine agricultural farmland, zero runway/terminal)',
      latencyExplanation:
        'Preserved digital archive of historical Earth basemap snapshots dating from 2014 to present.',
    };
  }

  const rel = WAYBACK_RELEASES[year] || WAYBACK_RELEASES[2024]!;
  return {
    sensor: 'Maxar High-Resolution Optical',
    provider: 'Maxar via Esri World Imagery Wayback',
    resolution: '0.5m GSD',
    acquisitionDate: rel.date,
    catalogRelease: `Wayback Release M=${rel.m}`,
    opticalBands: 'True Color RGB',
    pipelineStatus: rel.note,
    latencyExplanation:
      'Archived snapshot from the specific construction phase year.',
  };
}
