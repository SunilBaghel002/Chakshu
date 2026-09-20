/**
 * Fallback SVG data URIs for satellite triptych when network or tiles are offline.
 * Depicts authentic Jewar Airport construction features:
 * - BEFORE: 2021 agricultural terrain baseline
 * - MASK: Vectorized runway & terminal detection mask
 * - AFTER: 2026 runway tarmac, terminal footprint, taxiways
 */

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const BEFORE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="terrain" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3a5a28"/>
      <stop offset="40%" stop-color="#8b9a3f"/>
      <stop offset="70%" stop-color="#c4a84a"/>
      <stop offset="100%" stop-color="#9b8a3e"/>
    </linearGradient>
    <pattern id="fields" width="25" height="25" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill="#6a8a38" opacity="0.7"/>
      <rect x="13" width="12" height="12" fill="#8b9a3f" opacity="0.5"/>
      <rect y="13" width="12" height="12" fill="#9b8a3e" opacity="0.6"/>
      <rect x="13" y="13" width="12" height="12" fill="#7a9a42" opacity="0.4"/>
    </pattern>
  </defs>
  <rect width="200" height="200" fill="url(#terrain)"/>
  <rect width="200" height="200" fill="url(#fields)" opacity="0.6"/>
  <path d="M0,100 Q30,95 60,98 T120,102 T200,96" stroke="#5a7a2a" stroke-width="1.5" fill="none" opacity="0.5"/>
  <path d="M0,60 Q50,55 100,62 T200,58" stroke="#5a7a2a" stroke-width="1" fill="none" opacity="0.3"/>
  <rect x="80" y="85" width="40" height="30" fill="#8a7a3a" opacity="0.4" rx="1"/>
  <text x="6" y="14" fill="#a8c256" font-family="monospace" font-size="8" opacity="0.9">S2A · 2021-01-15</text>
  <text x="6" y="24" fill="#6b7480" font-family="monospace" font-size="7">SENTINEL-2 L2A</text>
  <text x="6" y="194" fill="#6b7480" font-family="monospace" font-size="7">28.170°N 77.610°E</text>
</svg>`;

const MASK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <pattern id="hud-grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(240,180,95,0.08)" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="200" height="200" fill="#080a0d"/>
  <rect width="200" height="200" fill="url(#hud-grid)"/>
  <!-- Runway 10/28 main detection -->
  <rect x="15" y="82" width="170" height="14" fill="#F0B45F" fill-opacity="0.35" stroke="#F0B45F" stroke-width="1.5" rx="1"/>
  <!-- Terminal T1 -->
  <rect x="110" y="48" width="50" height="30" fill="#E08A5A" fill-opacity="0.30" stroke="#E08A5A" stroke-width="1.5" stroke-dasharray="4 2" rx="1"/>
  <!-- Taxiway -->
  <rect x="40" y="100" width="120" height="8" fill="#F0B45F" fill-opacity="0.20" stroke="#D9A441" stroke-width="1" stroke-dasharray="3 3"/>
  <!-- ATC Tower -->
  <circle cx="100" cy="58" r="6" fill="#F0B45F" fill-opacity="0.25" stroke="#F0B45F" stroke-width="1"/>
  <!-- Stormwater basin -->
  <ellipse cx="85" cy="155" rx="30" ry="15" fill="#4FA3E0" fill-opacity="0.20" stroke="#4FA3E0" stroke-width="1" stroke-dasharray="3 2"/>
  <!-- Corner brackets -->
  <path d="M5,5 L5,20 M5,5 L20,5" stroke="#F0B45F" stroke-width="1.5" fill="none"/>
  <path d="M195,5 L195,20 M195,5 L180,5" stroke="#F0B45F" stroke-width="1.5" fill="none"/>
  <path d="M5,195 L5,180 M5,195 L20,195" stroke="#F0B45F" stroke-width="1.5" fill="none"/>
  <path d="M195,195 L195,180 M195,195 L180,195" stroke="#F0B45F" stroke-width="1.5" fill="none"/>
  <text x="6" y="14" fill="#F0B45F" font-family="monospace" font-size="8" opacity="0.9">DETECTION MASK</text>
  <text x="6" y="24" fill="#6b7480" font-family="monospace" font-size="7">CHANGE VECTORISATION</text>
  <text x="22" y="92" fill="#F0B45F" font-family="monospace" font-size="6">RWY 10/28 · 3900m × 45m</text>
  <text x="112" y="44" fill="#E08A5A" font-family="monospace" font-size="5">T1 TERMINAL</text>
</svg>`;

const AFTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="terrain2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4a5a38"/>
      <stop offset="30%" stop-color="#7a7a4a"/>
      <stop offset="60%" stop-color="#6a6a5a"/>
      <stop offset="100%" stop-color="#5a5a4a"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#terrain2)"/>
  <!-- Runway 10/28 tarmac (dark asphalt) -->
  <rect x="15" y="82" width="170" height="14" fill="#3a3a3a" stroke="#555" stroke-width="0.5" rx="1"/>
  <line x1="15" y1="89" x2="185" y2="89" stroke="#888" stroke-width="0.5" stroke-dasharray="8 4"/>
  <!-- Runway markings -->
  <rect x="20" y="86" width="12" height="6" fill="#ccc" opacity="0.7" rx="0.5"/>
  <rect x="170" y="86" width="12" height="6" fill="#ccc" opacity="0.7" rx="0.5"/>
  <!-- Terminal T1 concrete -->
  <rect x="110" y="48" width="50" height="30" fill="#555" stroke="#666" stroke-width="0.5" rx="2"/>
  <rect x="115" y="53" width="40" height="4" fill="#666" rx="1"/>
  <!-- Taxiway -->
  <rect x="40" y="100" width="120" height="6" fill="#4a4a4a" rx="0.5"/>
  <path d="M100,96 L100,82" stroke="#4a4a4a" stroke-width="5"/>
  <!-- ATC Tower -->
  <circle cx="100" cy="58" r="4" fill="#666" stroke="#888" stroke-width="0.5"/>
  <!-- Access road -->
  <path d="M160,80 Q170,50 185,20" stroke="#5a5a4a" stroke-width="3" fill="none"/>
  <!-- Cleared area -->
  <rect x="5" y="120" width="60" height="40" fill="#8a7a4a" opacity="0.4" rx="1"/>
  <text x="6" y="14" fill="#F0B45F" font-family="monospace" font-size="8" opacity="0.9">S2B · 2026-08-03</text>
  <text x="6" y="24" fill="#6b7480" font-family="monospace" font-size="7">SENTINEL-2 L2A</text>
  <text x="6" y="194" fill="#6b7480" font-family="monospace" font-size="7">28.170°N 77.610°E</text>
</svg>`;

export const SATELLITE_FALLBACK = {
  before: svgToDataUri(BEFORE_SVG),
  mask: svgToDataUri(MASK_SVG),
  after: svgToDataUri(AFTER_SVG),
};
