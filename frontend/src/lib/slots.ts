/**
 * lib/slots.ts — Authoritative Slot Registry
 * Generated directly from prd/ui-console.md §4, §5, and prd/ui-context.md §4.
 *
 * Every visual area in the Chakshu console belongs to a numbered slot.
 * Unslotted UI elements are prohibited.
 */

export type SlotId =
  | 'SLOT-00'
  | 'SLOT-01'
  | 'SLOT-02'
  | 'SLOT-05'
  | 'SLOT-10'
  | 'SLOT-11'
  | 'SLOT-12'
  | 'SLOT-13'
  | 'SLOT-14'
  | 'SLOT-15'
  | 'SLOT-16'
  | 'SLOT-17'
  | 'SLOT-18'
  | 'SLOT-20'
  | 'SLOT-21'
  | 'SLOT-22'
  | 'SLOT-23'
  | 'SLOT-24'
  | 'SLOT-25'
  | 'SLOT-26'
  | 'SLOT-30'
  | 'SLOT-40';

export interface SlotDefinition {
  id: SlotId;
  name: string;
  width: number | 'full' | 'flex';
  height: number | 'full' | 'flex';
  zIndex?: string;
  permittedChildren: readonly string[];
  collapseBehaviour: string;
  description: string;
}

export const SLOTS_REGISTRY: Record<SlotId, SlotDefinition> = {
  'SLOT-00': {
    id: 'SLOT-00',
    name: 'Data-Stream Marquee',
    width: 'full',
    height: 18,
    zIndex: 'var(--z-sticky)',
    permittedChildren: ['DataStreamMarquee'],
    collapseBehaviour: 'fixed height 18px at all viewports; hover pauses animation',
    description: 'Slow marquee: THEIA DATA STREAM: DRONE // TPOD:02 // AI:ENHANCED',
  },
  'SLOT-01': {
    id: 'SLOT-01',
    name: 'Command Bar',
    width: 'full',
    height: 56,
    zIndex: 'var(--z-sticky)',
    permittedChildren: ['AppHeader'],
    collapseBehaviour: 'fixed height 56px; hides stat:passes <1440px; hides stats <1024px',
    description: 'Iris lockup + Chakshu + MOD/ISRO tag; AOI selector; area stat; passes stat; nav tabs; session chip; LIVE API indicator',
  },
  'SLOT-02': {
    id: 'SLOT-02',
    name: 'Temporal Bar',
    width: 'full',
    height: 44,
    zIndex: 'var(--z-sticky)',
    permittedChildren: ['TemporalBar', 'UploadBar', 'QuestionBar', 'SearchBar'],
    collapseBehaviour: 'fixed height 44px; DETECT pinned right; year chips collapse to select <1280px',
    description: 'Date-A picker + chips; Date-B picker + chips; presets menu; SWAP; DETECT CHANGES (primary)',
  },
  'SLOT-05': {
    id: 'SLOT-05',
    name: 'Icon Rail',
    width: 56,
    height: 'flex',
    zIndex: 'var(--z-base)',
    permittedChildren: ['IconRail'],
    collapseBehaviour: 'fixed width 56px; never scrolls; tooltips open right only',
    description: 'Vertical icon rail: MAP, SEARCH, UPLOAD, REVIEW, AUDIT, divider, HELP/KEYS, SETTINGS',
  },
  'SLOT-10': {
    id: 'SLOT-10',
    name: 'Map Stage / Imagery Well',
    width: 'flex',
    height: 'flex',
    zIndex: 'var(--z-base)',
    permittedChildren: ['MapPane', 'DropZone', 'SearchMapStage'],
    collapseBehaviour: 'flex well absorbs all viewport width and height adjustments',
    description: 'The imagery well. Contains no docked controls. Hosts overlays SLOT-11 through SLOT-18.',
  },
  'SLOT-11': {
    id: 'SLOT-11',
    name: 'Sector Tag',
    width: 220,
    height: 24,
    zIndex: 'var(--z-map-overlay)',
    permittedChildren: ['SectorTag', 'GhostSectorTag'],
    collapseBehaviour: 'top-left inset 12px; max 220x24; no collapse',
    description: 'Top-left sector identifier e.g. SEC 07 · E',
  },
  'SLOT-12': {
    id: 'SLOT-12',
    name: 'Zoom Stack',
    width: 36,
    height: 176,
    zIndex: 'var(--z-map-overlay)',
    permittedChildren: ['MapZoomControls', 'ZoomStack'],
    collapseBehaviour: 'top-right inset 12px; vertical stack; gap --s-1',
    description: 'Zoom controls: +, -, HOME, FIT AOI, MEASURE',
  },
  'SLOT-13': {
    id: 'SLOT-13',
    name: 'Legend',
    width: 220,
    height: 'flex',
    zIndex: 'var(--z-map-overlay)',
    permittedChildren: ['Legend', 'MapLegend'],
    collapseBehaviour: 'bottom-left inset 12px; collapsible to 28px bar (LEGEND ▸)',
    description: 'Classification legend and compact attribution text',
  },
  'SLOT-14': {
    id: 'SLOT-14',
    name: 'Coordinate Readout',
    width: 300,
    height: 24,
    zIndex: 'var(--z-map-overlay)',
    permittedChildren: ['MapCursorInspector', 'CoordReadout'],
    collapseBehaviour: 'bottom-right inset 12px; reserved space (300x40px)',
    description: 'LAT, LON, ZOOM live coordinate readout in --t-mono',
  },
  'SLOT-15': {
    id: 'SLOT-15',
    name: 'Cursor Reticle',
    width: 30,
    height: 30,
    zIndex: 'var(--z-reticle)',
    permittedChildren: ['MapReticleOverlay', 'CursorReticle'],
    collapseBehaviour: 'follows cursor with 60ms lerp lag; fades over 140ms on leave',
    description: 'Crosshair and 28px iris reticle ring',
  },
  'SLOT-16': {
    id: 'SLOT-16',
    name: 'Lock-on Dossier Tag',
    width: 220,
    height: 'flex',
    zIndex: 'var(--z-locktag)',
    permittedChildren: ['LockonTag', 'TargetLockTag'],
    collapseBehaviour: 'anchored to target bbox TL offset -8/-8; slides in/out',
    description: 'Signature interaction: bbox brackets + lock-on tag panel with count-up',
  },
  'SLOT-17': {
    id: 'SLOT-17',
    name: 'Ghost Sector Numeral',
    width: 'flex',
    height: 'flex',
    zIndex: 'var(--z-map-overlay)',
    permittedChildren: ['GhostNumeral'],
    collapseBehaviour: 'centre-right; 96px type; no collapse',
    description: 'Watermark-style sector numeral in --ink-ghost',
  },
  'SLOT-18': {
    id: 'SLOT-18',
    name: 'Swipe Handle',
    width: 24,
    height: 64,
    zIndex: 'var(--z-map-overlay)',
    permittedChildren: ['SwipeCompare', 'SwipeHandle'],
    collapseBehaviour: 'vertical line at --split position with label 2021 ⇄ 2026',
    description: 'Interactive before/after swipe separator',
  },
  'SLOT-20': {
    id: 'SLOT-20',
    name: 'Dossier / Queue Panel',
    width: 380,
    height: 'flex',
    zIndex: 'var(--z-base)',
    permittedChildren: [
      'EvidenceDrawer',
      'DossierPanel',
      'ReviewQueue',
      'UploadManifest',
      'AnswerPanel',
      'SearchResults',
    ],
    collapseBehaviour:
      '380px at >=1440px; 340px at 1280-1439px; collapses to 48px rail at 1024-1279px',
    description: 'The dossier / review queue / upload manifest / ask answer panel',
  },
  'SLOT-21': {
    id: 'SLOT-21',
    name: 'Dossier Tabs',
    width: 380,
    height: 32,
    zIndex: 'var(--z-base)',
    permittedChildren: ['DossierTabs', 'EvidenceTabs'],
    collapseBehaviour: '4-up equal-width tabs: EVIDENCE, ANALYSIS, TRACE, SUPPRESSED',
    description: '32px tall tabs in dossier header bottom zone',
  },
  'SLOT-22': {
    id: 'SLOT-22',
    name: 'Dossier Measured Block',
    width: 380,
    height: 'flex',
    zIndex: 'var(--z-base)',
    permittedChildren: ['MeasuredBlock'],
    collapseBehaviour: 'fixed within dossier body flow; right-aligned before/after toggle',
    description: 'BEFORE ⇄ AFTER toggle + prominent measured area/figure count-up',
  },
  'SLOT-23': {
    id: 'SLOT-23',
    name: 'Dossier Triptych Thumbs',
    width: 380,
    height: 108,
    zIndex: 'var(--z-base)',
    permittedChildren: ['EvidenceTriptych'],
    collapseBehaviour: '3-up 108x108 1:1 wells with BEFORE / MASK / AFTER labels',
    description: 'Evidence triptych thumbnails with active amber frame and corner ticks',
  },
  'SLOT-24': {
    id: 'SLOT-24',
    name: 'Dossier Confidence Gauge',
    width: 348,
    height: 'flex',
    zIndex: 'var(--z-base)',
    permittedChildren: ['EvidenceConfidenceGauge', 'ConfidenceIris'],
    collapseBehaviour: 'gauge + 5 component monospace rows',
    description: '5-arc amber ramp iris + detector agreement, quality, registration, margin, persistence',
  },
  'SLOT-25': {
    id: 'SLOT-25',
    name: 'Dossier Actions Footer',
    width: 380,
    height: 52,
    zIndex: 'var(--z-base)',
    permittedChildren: ['DossierActionsFooter', 'PanelFooter'],
    collapseBehaviour:
      'sticky bottom 0 in panel; moves to bottom action bar above SLOT-30 below 1280px',
    description: 'Primary action zone: EXPORT (secondary, left), REJECT (danger-outline), CONFIRM (primary, rightmost)',
  },
  'SLOT-26': {
    id: 'SLOT-26',
    name: 'Dossier Trace Rows / Suppressed',
    width: 348,
    height: 'flex',
    zIndex: 'var(--z-base)',
    permittedChildren: ['TraceRows', 'SuppressionPanel'],
    collapseBehaviour: 'scrollable body bottom section',
    description: 'Trace rows + COPY TRACE_ID or suppressed candidates table with counts and reasons',
  },
  'SLOT-30': {
    id: 'SLOT-30',
    name: 'Timeline Strip',
    width: 'flex',
    height: 72,
    zIndex: 'var(--z-base)',
    permittedChildren: ['TimelineSlider', 'ProgressStrip', 'QuestionHistory'],
    collapseBehaviour: 'fixed height 72px at bottom of map stage flex',
    description: 'Timeline: PLAY, continuous date axis, scene dots, onset interval band, RANGE menu',
  },
  'SLOT-40': {
    id: 'SLOT-40',
    name: 'Status Line',
    width: 'full',
    height: 24,
    zIndex: 'var(--z-sticky)',
    permittedChildren: ['StatusLine'],
    collapseBehaviour: 'fixed height 24px full width',
    description: 'Job state · last action + relative time · trace_id (monospace click-to-copy)',
  },
};

/**
 * Type guard to check if an arbitrary string is a valid registered SlotId.
 */
export function isRegisteredSlotId(id: string): id is SlotId {
  return Object.prototype.hasOwnProperty.call(SLOTS_REGISTRY, id);
}

/**
 * Retrieve slot definition from registry. Throws in dev if unregistered.
 */
export function getSlotDefinition(id: SlotId): SlotDefinition {
  const def = SLOTS_REGISTRY[id];
  if (!def) {
    const errorMsg = `[lib/slots.ts] Unregistered slot ID "${id}". Every slot must be specified in prd/ui-console.md §4/§5.`;
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      throw new Error(errorMsg);
    }
    // Fallback for production to prevent total app crashes
    return {
      id,
      name: `Unknown Slot (${id})`,
      width: 'full',
      height: 'flex',
      permittedChildren: [],
      collapseBehaviour: 'unspecified',
      description: 'Unknown unregistered slot',
    };
  }
  return def;
}
