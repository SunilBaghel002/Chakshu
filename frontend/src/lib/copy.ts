/**
 * User-facing copy for Chakshu with plain-language, easy-to-understand labels.
 */

export const COPY = {
  // Brand & Philosophy
  appName: 'Chakshu',
  appNameDevanagari: 'चक्षु',
  tagline: 'Every satellite change, backed by real proof.',
  heroDescription:
    'Satellite change-detection platform. Every measurement is calculated with direct geometry math — no AI hallucinations, backed by raw pixels.',

  // Exact Invariant Labels (Defense & SIH Requirements)
  verifiedMeasurement: 'Verified Measurement',
  deterministicMetric: 'Deterministic Metric',
  refusalInsufficientResolution: 'Resolution Notice: Cars Too Small to Count',

  // Plain-language friendly badges & headers
  realMathCalculation: '✓ Real Math Calculation (Not an AI guess)',
  realMathTooltip: 'Calculated directly from satellite pixel geometry with 100% precision. The AI never guesses numbers.',
  
  beforeLabel: 'Older Photo (Before)',
  afterLabel: 'Recent Photo (After)',
  swipeToCompare: 'Drag Slider to Compare Before & After',

  // Resolution Gate Refusals (PRD 2 §5, PRD 3 §B3)
  refusal10mVehicles:
    "This satellite image has 10 meters per pixel. At this scale, an individual car is smaller than a single pixel, so cars cannot be counted. However, large buildings, roads, water bodies, and cleared land are clearly visible and tracked:",

  noGeoreferencing:
    "This image does not contain GPS location coordinates. We can describe what is visible, but cannot align it to satellite historical archives.",

  noGsd:
    "Image scale is unknown. Please provide ground resolution in meters to measure exact real-world dimensions.",

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

  // Epistemic Badges (Rule 1: The AI never produces a number)
  measuredBadge: 'MEASURED',
  measuredBadgeTooltip:
    'Directly computed from satellite pixels. Guaranteed accurate geometry, not an AI hallucination.',

  inferredBadge: 'INFERRED',
  inferredBadgeTooltip:
    'Identified by pattern detection; fully inspectable in the decision trace.',

  auditVerified: 'Audit Log Verified. Zero tampering detected.',
} as const;
