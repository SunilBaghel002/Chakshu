/**
 * Authoritative user-facing copy for Landing, Privacy, and Admin routes.
 * Specs: PRD 13 (W1–W7), PRD 15 §8 (T8), PRD 16 (D1–D9).
 */

export const PRIVACY_COPY = {
  headerTag: 'CHAKSHU · PRIVACY NOTICE',
  returnBtn: 'RETURN TO CONSOLE',
  title: 'WHAT WE RECORD, AND WHY',
  intro:
    'Chakshu runs its own analytics. There are no third-party trackers, no advertising scripts, and no data leaves the machine this site runs on.',
  storeTitle: 'When you use this site we store:',
  storeItems: [
    'a random session identifier in a cookie (sid), so we can tell one visit from another',
    'the pages you open and the buttons you use, with a timestamp',
    'which operations you run — change detection, object detection, search, questions — how long they took, and whether they succeeded',
    'your browser, operating system, device type and screen size, from the user agent',
    'an approximate city derived from your IP address using an offline database',
    'a one-way hash of your IP address, so we can recognise a returning visitor without storing the address itself',
    'if you create an account: your email address and a hashed password',
  ],
  notRecorded:
    'We do not record: keystrokes, mouse paths, screen recordings, form contents, the text of your questions (only their length and shape), uploaded image content, or filenames.',
  retentionLabel: 'Retention:',
  retentionText: 'events 90 days, sessions and visits 180 days, raw user-agent strings 30 days.',
  sharingLabel: 'Sharing:',
  sharingText: 'none. We do not sell, rent, or transmit this data to anyone.',
  controlLabel: 'Your control:',
  controlText:
    'clearing the cookie starts a fresh anonymous session; asking us deletes everything we hold for that session.',
  attributionText: 'This product includes GeoLite2 data created by MaxMind, available from',
  footerTag: 'NO THIRD-PARTY TRACKERS · FIRST-PARTY SOVEREIGN SYSTEM',
  sihRef: 'SIH26227 · SIH26167',
} as const;

export const ADMIN_COPY = {
  forbiddenTitle: 'ADMIN ONLY · 403 FORBIDDEN',
  forbiddenSub:
    'Access to sovereign analytics and audit verification requires administrative clearance.',
  noAdminPrefix: 'NO ADMIN CONFIGURED? RUN',
  noAdminCommand: 'python scripts/make_admin.py',
  returnBtn: 'RETURN TO CONSOLE',
  adminBadge: 'ADMIN PANEL',
  consoleLink: 'CONSOLE →',
} as const;

export const LANDING_COPY = {
  appNameDevanagari: 'चक्षु',
  appName: 'CHAKSHU',
  orbitToEvidence: 'ORBIT → EVIDENCE',
  navHow: 'HOW IT WORKS',
  navFeatures: 'FEATURES',
  navEvidence: 'EVIDENCE',
  navOffline: 'OFFLINE',
  navPrivacy: 'PRIVACY',
  openConsole: 'OPEN CONSOLE',
  heroEyebrow: 'SIH 2026 · PS SIH26227 (MoD) + SIH26167 (ISRO/SAC)',
  heroH1Line1: 'THE EYE THAT NEVER BLINKS.',
  heroH1Line2: 'FROM ORBIT TO EVIDENCE.',
  heroSub:
    'Chakshu turns multi-year satellite imagery into measured, auditable change evidence — and answers questions about it in plain language. Fully on-prem. Runs with the network disabled.',
  heroCtaConsole: 'OPEN THE CONSOLE →',
  heroCtaHow: 'SEE HOW IT WORKS',
  trustItems: [
    '✓ NO CLOUD',
    '✓ NO THIRD-PARTY TRACKERS',
    '✓ MODEL LICENCES DECLARED',
    '✓ CPU ONLY (NO GPU MANDATE)',
  ],
  previewTitle: 'CHAKSHU CONSOLE · JEWAR AIRPORT (UTM 43N)',
  previewLiveBadge: 'LIVE FIXTURE · NOT A SCREENSHOT',
  previewTarget: 'TARGET: chg_jewar_runway_01',
  previewArea: '120.4 ha (1,204,600 m²)',
  previewMeasured: 'MEASURED · WGS 84 / UTM 43N',
  previewConfidenceLabel: 'CONFIDENCE',
  previewConfidenceValue: '91%',
  previewBeforeLabel: 'BEFORE (2021)',
  previewBeforeClass: 'FARMLAND',
  previewDiffLabel: 'DIFF MASK',
  previewDiffValue: 'ΔNDVI -0.74',
  previewAfterLabel: 'AFTER (2025)',
  previewAfterClass: 'RUNWAY',
  previewOnset: 'ONSET: OCT 2021 – MAR 2022 (±89d)',
  previewStatus: 'STATUS: VERIFIED BY ANALYST',
  tickerItems: [
    '10 m Sentinel-2 archive',
    'change types: appear · disappear · expand · contract',
    'suppression reasons shown, never hidden',
    'vector search in Postgres, no extra database',
    'GeoTIFF + COG ingestion',
    'runs with network disabled',
  ],
  methodologyLabel: 'METHODOLOGY',
  howTitle: 'HOW IT WORKS · 5 STAGES OF VERIFICATION',
  capabilitiesLabel: 'CAPABILITIES',
  capabilitiesTitle: 'ENGINEERED FOR NATIONAL SECURITY',
  seeIt: 'SEE IT',
  rigourLabel: 'RIGOUR',
  evidenceTitle: 'MEASURED BENCHMARKS · ZERO ESTIMATES',
  evidenceSub:
    'Every figure below exists in PROGRESS.md §I and is reproducible via repository scripts.',
  thMetric: 'WHAT WE MEASURED',
  thValue: 'VALUE',
  thSource: 'SOURCE SCRIPT / METHOD',
  gapsTitle: 'WHAT WE DID NOT BUILD (DECLARED GAPS)',
  gapsText:
    'Per PRD 1 §3.2: Chakshu does not perform Synthetic Aperture Radar (SAR) processing, model fine-tuning or training on user devices, or 3D mesh reconstruction. We focus strictly on 2D optical change detection, deterministic measurements, and zero-hallucination VLM verification.',
  securityLabel: 'SECURITY',
  securityTitle: 'RUNS WITH NETWORK PHYSICALLY DISABLED',
  bomTitle: 'MODEL BILL OF MATERIALS (BOM)',
  thModel: 'MODEL',
  thLicense: 'LICENSE',
  thPurpose: 'PURPOSE',
  teamName: 'TEAM BEYOND ORBIT',
  teamSub: 'Developed for Smart India Hackathon 2026 (PS SIH26227 & SIH26167)',
  copyright:
    '© 2026 BEYOND ORBIT · BUILT FOR SMART INDIA HACKATHON 2026 · NO THIRD-PARTY TRACKERS ON THIS SITE',
} as const;
