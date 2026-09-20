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

/**
 * The 8 disabled reason strings mandated by PRD 11 §1.5.
 * Every disabled control carries a title + aria-describedby reason from this fixed list.
 */
export const DISABLED_REASONS = {
  'no-aoi': 'SELECT AN AOI FIRST',
  'no-dates': 'BOTH DATES REQUIRED',
  'same-date': 'DATES MUST DIFFER',
  'job-running': 'ANALYSIS IN PROGRESS',
  'offline': 'UNAVAILABLE OFFLINE',
  'no-selection': 'SELECT A TARGET FIRST',
  'gate-failed': 'RESOLUTION BELOW 2 m — SEE NOTICE',
  'permission': 'ADMIN ONLY',
} as const;

export type DisabledReasonCode = keyof typeof DISABLED_REASONS;

export const BUTTON_COPY = {
  detect: 'Detect changes',
  detecting: 'Detecting',
  confirm: 'Confirm',
  confirming: 'Confirming',
  swap: 'Swap',
  swapping: 'Swapping',
  exportReport: 'Export report',
  exporting: 'Exporting',
  rejectTarget: 'Reject target',
  rejecting: 'Rejecting',
  cancel: 'Cancel',
  skip: 'Skip',
  learnMore: 'Learn more',
  copy: 'Copy',
} as const;

export const CONTACT_SHEET_COPY = {
  title: 'CONTROLS CONTACT SHEET // PRD 11 §1 (K1)',
  subtitle: 'DEV ONLY · SYSTEM INSTRUMENTATION · 7 VARIANTS × 3 SIZES × 7 STATES',
  matrixTitle: '1. ALL 7 VARIANTS × 7 STATES',
  sizesTitle: '2. SIZE SCALING (SM 28px · MD 36px · LG 44px)',
  disabledReasonsTitle: '3. FIXED DISABLED REASON CODES (PRD 11 §1.5)',
  shortcutsTitle: '4. SHORTCUT HINTS (VISIBLE AT ≥ 1440px)',
  primaryOwnerTitle: '5. PRIMARY OWNER ASSERTION & VIEWPORT INVARIANT',
  stateDefault: 'DEFAULT',
  stateHover: 'HOVER',
  stateActive: 'ACTIVE',
  stateFocus: 'FOCUS',
  stateDisabled: 'DISABLED',
  stateLoading: 'LOADING',
  stateSelected: 'SELECTED',
  variantPrimary: 'PRIMARY',
  variantSecondary: 'SECONDARY',
  variantGhost: 'GHOST',
  variantDangerOutline: 'DANGER OUTLINE',
  variantDangerFilled: 'DANGER FILLED',
  variantIconGhost: 'ICON GHOST',
  variantBar: 'DOSSIER BAR',
  sizeSm: 'SM (28px)',
  sizeMd: 'MD (36px)',
  sizeLg: 'LG (44px)',
  returnToConsole: 'RETURN TO CONSOLE',
} as const;

export const CONSOLE_COPY = {
  smallScreenNotice: 'THE CONSOLE NEEDS ≥ 1024 px · OPEN THE LANDING PAGE',
  goToOverview: 'GO TO OVERVIEW',
  shortcutsTitle: 'KEYBOARD SHORTCUTS',
  shortcutsClose: 'CLOSE',
  navigationGroup: 'NAVIGATION',
  consoleGroup: 'CONSOLE',
  reviewGroup: 'REVIEW & TRIAGE',
  viewGroup: 'VIEW & INSPECT',
  globalGroup: 'GLOBAL',
  escHint: 'Esc to dismiss',
} as const;

export const MAP_OVERLAY_COPY = {
  legendTitle: 'LEGEND',
  legendCollapsed: 'LEGEND ▸',
  legendExpanded: 'LEGEND ▾',
  tracksHeader: 'PROVENANCE TRACKS',
  trackSolidLabel: 'Tracks 1/2 solid',
  trackSolidDesc: 'measured from pixels',
  trackDashedLabel: 'Track 3 dashed',
  trackDashedDesc: 'identified by model',
  classesHeader: 'LAND COVER & TARGETS',
  labelsHidden: (count: number): string => `+${count} LABELS HIDDEN`,
  labelsAllVisible: 'ALL LABELS VISIBLE',
  attributionText: '© OpenStreetMap · © CARTO · Sentinel-2 L2A ESA',
  zoomInTitle: 'Zoom in (+)',
  zoomOutTitle: 'Zoom out (-)',
  homeTitle: 'Home AOI (H)',
  fitAoiTitle: 'Fit AOI bounds (F)',
  measureTitle: 'Measure tool (M)',
  targetPrefix: 'TARGET:',
  clickToInspect: 'CLICK TO INSPECT',
  measuredChip: 'MEASURED — UTM 43N',
  inferredChip: 'INFERRED — TRACK 3',
  unverifiedChip: 'UNVERIFIED',
  polygonsVisible: 'POLYGONS VISIBLE',
  hoverToInspect: 'HOVER TO INSPECT',
  latPrefix: 'LAT:',
  lonPrefix: 'LON:',
  prdCollisionRef: 'PRD 9 §5.1',
} as const;

export const REFUSAL_NOTICES = {
  NOTICE_T3:
    "This image is 10 m per pixel — that's Sentinel-2. At this scale one pixel covers 100 m², so I can't identify individual vehicles or aircraft; they're smaller than a pixel. What I can show you: building clusters, large ships, storage tanks, roads, and land cover. Here's what I found.",
  NOTICE_T0:
    "I don't know this image's resolution, so I can't safely identify specific object types or measure sizes — a 10 m satellite pixel and a 30 cm drone pixel look similar when you can't see the scale. Tell me the ground sample distance and I'll do the full analysis. For now, here's a qualitative description.",
} as const;

export const FEEDBACK_COPY = {
  emptyDefault: 'NO CHANGES DETECTED FOR THIS PAIR · TRY A WIDER DATE RANGE',
  widenRange: 'WIDEN RANGE',
  loadingDefault: 'READING SCENE S2B_43RCU_20240609 …',
  errorPrefix: 'ANALYSIS FAILED',
  retry: 'RETRY',
  copyTraceId: 'COPY TRACE_ID',
  traceCopied: 'TRACE ID COPIED',
  staleNotice: 'SHOWING RESULT FROM 09:41 · AOI CHANGED',
  refresh: 'REFRESH',
} as const;

export const DOSSIER_COPY = {
  verified: 'VERIFIED',
  pending: 'PENDING',
  rejected: 'REJECTED',
  tabEvidence: 'EVIDENCE',
  tabAnalysis: 'ANALYSIS',
  tabTrace: 'TRACE',
  tabSuppressed: (n: number): string => `SUPPRESSED (${n})`,
  beforeAfterToggle: 'BEFORE ⇄ AFTER',
  groundArea: 'GROUND AREA',
  perimeter: 'Perimeter:',
  projection: 'Projection:',
  temporalOnset: 'TEMPORAL ONSET',
  firstSupported: 'First Supported:',
  gap: 'GAP:',
  trend: 'Trend:',
  decisionTrace: 'DECISION TRACE',
  decisionDesc: 'Automated decision table — exact spectral and geometric criteria evaluated:',
  alternativesTitle: 'ALTERNATIVES CONSIDERED',
  confirm: 'CONFIRM',
  reject: 'REJECT',
  export: 'EXPORT',
} as const;

export const UPLOAD_COPY = {
  sourceLabel: 'SOURCE',
  sensorLabel: 'SENSOR',
  resolutionLabel: 'RESOLUTION',
  analyse: 'ANALYSE',
  dropTitle: 'DROP A GeoTIFF OR PNG · ≤ 40 MB',
  browseFiles: 'BROWSE FILES',
  manifestTitle: 'UPLOAD MANIFEST',
  filename: 'Filename',
  size: 'Size',
  crs: 'CRS',
  resolution: 'Resolution',
  bands: 'Bands',
  checksum: 'SHA-256',
  gateVerdict: 'RESOLUTION GATE VERDICT',
  stages: ['READING', 'GATE', 'TILES', 'MODEL', 'VERIFY'] as const,
  pngJpeg: 'PNG / JPEG',
  geotiffOption: 'GEOTIFF (.tif)',
  urlOffline: 'URL (OFFLINE)',
  sentinel2Option: 'Sentinel-2 (10 m)',
  planetOption: 'PlanetScope (3 m)',
  droneOption: 'Drone / Aerial (0.2 m)',
} as const;

export const REVIEW_COPY = {
  queueTitle: 'TARGET REVIEW QUEUE',
  sortLabel: 'SORT',
  sortConfidence: 'Confidence',
  sortArea: 'Area (m²)',
  filterLabel: 'FILTER',
  reviewedProgress: (done: number, total: number): string => `${done} of ${total} reviewed`,
  skip: 'SKIP',
  confirm: 'CONFIRM',
  reject: 'REJECT',
  keyboardHints: 'J/K NAV · ⏎ CONFIRM · ⌫ REJECT · SPACE PEEK',
} as const;

export const ASK_COPY = {
  questionPlaceholder: 'Ask a question about this AOI in plain language...',
  examples: 'EXAMPLES',
  ask: 'ASK',
  verdictTitle: 'QUERY VERDICT',
  answerTitle: 'INTELLIGENCE ANSWER',
  sources: 'SOURCES',
  exportReport: 'EXPORT REPORT',
  copyAnswer: 'COPY ANSWER',
  historyTitle: 'QUESTION HISTORY',
} as const;

export const SEARCH_COPY = {
  searchPlaceholder: 'Search satellite catalog by scene, prompt, or semantics...',
  aoiLabel: 'AOI',
  dateRange: 'DATE RANGE',
  sensor: 'SENSOR',
  search: 'SEARCH',
  rankedResults: 'RANKED RESULTS',
  similarity: 'Similarity',
  jewarAirport: 'Jewar Airport',
  koderiPort: 'Koderi Port',
  allSensors: 'ALL SENSORS',
  sentinel2: 'Sentinel-2',
  planetScope: 'PlanetScope',
  retrievalSpread: 'RETRIEVAL SPREAD:',
} as const;

export const EXPORT_COPY = {
  title: 'EXPORT REPORT',
  formatLabel: 'EXPORT FORMAT',
  contentsLabel: 'REPORT CONTENTS',
  provenancePreview: 'PROVENANCE PREVIEW',
  cancel: 'CANCEL',
  export: 'EXPORT',
  includeGeometry: 'Vector geometry (GeoJSON)',
  includeMeasurements: 'Deterministic measurements (UTM)',
  includeProvenance: 'Provenance & verification log',
  includeTrace: 'Decision table rule trace',
  integrityAttested: 'SHA-256 HASH CHAIN INTEGRITY ATTESTED',
  auditorInfo: 'Deterministic Auditor: Chakshu v0.1.0',
} as const;

export const TOAST_COPY = {
  targetConfirmed: 'Target confirmed and logged to audit trail.',
  targetRejected: 'Target rejected and logged to audit trail.',
  undo: 'UNDO',
  undone: 'Action reverted.',
} as const;





