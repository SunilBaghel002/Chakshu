/**
 * Fallback SVG data URIs for satellite triptych verification when network or tiles are offline.
 */

export const SATELLITE_FALLBACK = {
  before: `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">' +
      '<rect width="200" height="150" fill="#1e293b"/>' +
      '<path d="M0,75 Q50,60 100,75 T200,70" stroke="#334155" stroke-width="2" fill="none"/>' +
      '<rect x="40" y="30" width="45" height="40" fill="#334155" opacity="0.6"/>' +
      '<text x="10" y="20" fill="#94a3b8" font-family="monospace" font-size="10">SENTINEL-2 T1</text>' +
      '</svg>'
  )}`,
  mask: `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">' +
      '<rect width="200" height="150" fill="#020617"/>' +
      '<polygon points="60,40 140,50 130,110 50,100" fill="#6366f1" fill-opacity="0.75" stroke="#818cf8" stroke-width="2"/>' +
      '<text x="10" y="20" fill="#818cf8" font-family="monospace" font-size="10">DETECTION MASK</text>' +
      '</svg>'
  )}`,
  after: `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">' +
      '<rect width="200" height="150" fill="#1e293b"/>' +
      '<path d="M0,75 Q50,60 100,75 T200,70" stroke="#334155" stroke-width="2" fill="none"/>' +
      '<rect x="40" y="30" width="45" height="40" fill="#ea580c" opacity="0.8"/>' +
      '<text x="10" y="20" fill="#fdba74" font-family="monospace" font-size="10">SENTINEL-2 T2</text>' +
      '</svg>'
  )}`,
};
