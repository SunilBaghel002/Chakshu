/**
 * Verbatim user-facing text and capability messages for Chakshu.
 * Source: PRD 3 §B1, §B3, §B5 and PRD 4 §8.
 *
 * Rule (PRD 5 §3.6): All user-facing copy lives here to preserve documentation
 * integrity and enable systematic audit against PRD requirements.
 */

export const COPY = {
  // Brand & Philosophy
  appName: 'Chakshu',
  tagline: 'Every change, with proof.',
  heroDescription:
    'An evidence-first satellite change-detection and image-understanding platform. Every measurement computed deterministically, backed by raw pixels, and audited.',

  // Resolution Gate Refusals (PRD 2 §5, PRD 3 §B3)
  refusal10mVehicles:
    "This image is 10 m resolution (Sentinel-2). At that scale an individual vehicle is smaller than a single pixel, so I can't count vehicles. I can show you building clusters, roads, water, and land cover. Here's what I found:",

  // Georeferencing & GSD Notices (PRD 3 §B1)
  noGeoreferencing:
    "This image has no location information, so I can describe and label what's in it, but I can't place it on a map or compare it against the satellite archive. If you know where it is, add the coordinates and I'll do the full analysis.",

  noGsd:
    "I don't know this image's resolution. I'll describe it qualitatively. Tell me the ground sample distance in metres and I can identify specific objects and measure their sizes.",

  emptyRaster: 'This image contains no pixel data.',

  // Upload Security & Formatting Messages (PRD 3 §B1)
  unsupportedFileType:
    "That file type isn't supported. Chakshu reads GeoTIFF (.tif) and plain images (.png, .jpg, .webp).",

  fileUnreadable:
    "I couldn't read this file — it may be corrupt or use a compression I don't support. Try re-exporting it as an uncompressed GeoTIFF.",

  fileTooLarge: (sizeMB: number, limitMB: number): string =>
    `That file is ${sizeMB} MB. The limit is ${limitMB} MB. Try cropping to your area of interest first.`,

  // Natural Language Intent Fallback (PRD 2 §7)
  unsupportedIntent:
    "I can't answer that from the data I have. I can tell you about changes in this area, counts and sizes of what's detected, when a change started, or show you a class on the map. Try one of those.",

  // Empty & Non-Error States (PRD 5 §3.8)
  emptyChanges:
    'No qualifying changes were detected in this area across the selected observation window.',

  emptyDetections:
    'No objects or land-cover classes meeting the confidence and resolution criteria were detected in this image.',

  emptySearchResults:
    'No satellite tiles matched your query. Try broadening the date filter or relaxing the cloud cover threshold.',

  // Epistemic Badges (PRD 4 §3)
  measuredBadge: 'MEASURED',
  measuredBadgeTooltip:
    'Calculated deterministically from pixels via geometry, arithmetic, or database aggregation.',

  inferredBadge: 'INFERRED',
  inferredBadgeTooltip:
    'Derived from a classification decision table or model proposal; inspectable in rule trace.',

  // Audit & Provenance
  auditVerified: 'Cryptographic hash chain intact. Zero tampering detected.',
} as const;
