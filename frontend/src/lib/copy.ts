/**
 * User-facing copy for Chakshu — Intelligence Console v2.
 * All strings live here; nothing hardcoded in JSX.
 * Console shorthand is for LABELS AND TAGS only — body prose stays sentence case.
 */

export const COPY = {
  // Brand & Philosophy
  appName: 'Chakshu',
  appNameDevanagari: 'चक्षु',
  tagline: 'Satellite Change-Detection & Evidence Platform',
  heroDescription:
    'Every measurement is calculated with direct geometry math — no AI hallucinations, backed by raw pixels.',

  // SLOT-00 Data stream marquee
  marquee:
    'THEIA DATA STREAM: DRONE // TPOD:02 // AI:ENHANCED · RECON//02 :: //GMT · SENTINEL-2 L2A · 10M GSD · CONTINUOUS MONITORING ACTIVE · ',

  // Console shorthand for tags
  orgTag: 'MOD · ISRO',
  liveTag: 'LIVE API',
  offlineTag: 'OFFLINE DEMO',

  // Exact Invariant Labels (Defense & SIH Requirements)
  verifiedMeasurement: 'VERIFIED MEASUREMENT',
  deterministicMetric: 'DETERMINISTIC METRIC',
  refusalInsufficientResolution: 'RESOLUTION GATE: INSUFFICIENT GSD',

  // Epistemic badges
  measuredBadge: 'MEASURED',
  measuredBadgeTooltip:
    'Directly computed from satellite pixels. Guaranteed accurate geometry — the AI never produces a number.',
  inferredBadge: 'INFERRED',
  inferredBadgeTooltip:
    'Identified by pattern detection; fully inspectable in the decision trace.',
  unverifiedBadge: 'UNVERIFIED',

  // Date labels
  beforeLabel: 'DATE A',
  afterLabel: 'DATE B',
  swipeToCompare: 'Drag to compare Before & After',

  // Resolution Gate Refusals (PRD 2 §5, PRD 3 §B3)
  refusal10mVehicles:
    "This satellite image has 10 metres per pixel. At this scale, an individual car is smaller than a single pixel, so cars cannot be counted. However, large buildings, roads, water bodies, and cleared land are clearly visible and tracked:",

  noGeoreferencing:
    "This image does not contain GPS location coordinates. We can describe what is visible, but cannot align it to satellite historical archives.",

  noGsd:
    "Image scale is unknown. Please provide ground resolution in metres to measure exact real-world dimensions.",

  emptyRaster: 'This image contains no pixel data.',

  unsupportedFileType:
    "File format not supported. Please use satellite GeoTIFF (.tif) or common image files (.png, .jpg).",

  fileUnreadable:
    "Unable to read this file. It may be compressed or corrupted. Try re-saving as standard GeoTIFF.",

  fileTooLarge: (sizeMB: number, limitMB: number): string =>
    `File is ${sizeMB} MB. Maximum allowed is ${limitMB} MB. Please crop to your area of interest.`,

  unsupportedIntent:
    "I cannot answer that question from available satellite data. You can ask about new construction, land cleared, water changes, or how many buildings exist.",

  emptyChanges:
    'No significant construction or land changes were detected in this timeframe.',

  emptyDetections:
    'No objects or buildings meeting high confidence criteria were found in this image.',

  emptySearchResults:
    'No satellite passes matched your query. Try choosing a different year or clearer weather month.',

  // Status line
  statusIdle: 'READY',
  statusAnalysing: 'ANALYSING',
  statusComplete: 'COMPLETE',

  auditVerified: 'Audit log verified. Zero tampering detected.',
} as const;
