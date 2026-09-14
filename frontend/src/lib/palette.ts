/**
 * Design system color tokens for Chakshu — Intelligence Console v2.
 * Source: PRD/09_ui-context.md §2
 *
 * Enforces:
 * 1. Near-black base (#0B0D10), never pure black — prevents halation and dot-grid crushing.
 * 2. Amber accent family (#F0B45F) for operator attention and ground truth.
 * 3. Teal (#35B8C0) reserved for satellite/live data path only.
 * 4. Dark-retuned categorical palette for land-cover and object classes.
 */

export const PALETTE = {
  // §2.1 Base — near-black, slightly cool
  bg: '#0B0D10',
  bgGrid: 'rgba(240,180,95,0.055)',
  panel: '#121519',
  panel2: '#171B21',
  panel3: '#1E242B',
  well: '#0E1114',
  line: '#262C34',
  lineStrong: '#39424D',

  // §2.2 Ink
  ink: '#EDEAE3',
  ink2: '#A6ADB5',
  ink3: '#6B7480',
  inkGhost: 'rgba(237,234,227,0.06)',

  // §2.3 Accent — amber dossier family
  amber: '#F0B45F',
  amberHot: '#F5C15C',
  amberDeep: '#8A4B12',
  amberWash: 'rgba(240,180,95,0.12)',
  teal: '#35B8C0',
  tealWash: 'rgba(53,184,192,0.12)',

  // §2.4 Semantic states (restyled for dark)
  measured: '#2FBF71',
  measuredFill: 'rgba(47,191,113,0.12)',
  measuredText: '#5AD79A',
  measuredBg: 'rgba(47,191,113,0.12)',
  measuredGreen: '#5AD79A',
  measuredBorder: 'rgba(47,191,113,0.3)',
  inferred: '#F0B45F',
  inferredFill: 'rgba(240,180,95,0.10)',
  inferredText: '#F0B45F',
  unverified: '#6B7480',
  unverifiedText: '#A6ADB5',
  confirmed: '#2FBF71',
  confirmedText: '#5AD79A',
  rejected: '#E5484D',
  rejectedFill: 'rgba(229,72,77,0.12)',
  rejectedText: '#F2767B',

  // Status
  success: '#2FBF71',
  warning: '#F0B45F',
  danger: '#E5484D',
  info: '#35B8C0',
  neutral: '#6B7480',

  // §2.5 Land Cover — dark-retuned
  classes: {
    water: '#4FA3E0',
    vegetation: '#4FB37A',
    crop: '#A8C256',
    built: '#E08A5A',
    bare: '#C9A227',
    snow: '#B9C6D2',
    unclassified: '#6B7480',
    construction: '#F0B45F',
    clearance: '#D9A441',
    vegetation_gain: '#4FB37A',
    water_gain: '#4FA3E0',
    water_loss: '#7FA8C4',
    demolition: '#8A93A0',
    road: '#A6ADB5',
    other: '#A6ADB5',

    // Object classes
    building: '#E08A5A',
    building_cluster: '#F0B45F',
    vehicle: '#9B7BE0',
    aircraft: '#5A9BE0',
    ship: '#4FA3E0',
    ship_large: '#2E7BB5',
    storage_tank: '#D9A441',
    swimming_pool: '#4FD0E0',
    tower: '#B07BE0',
    container: '#E07B5A',
  } as const,
} as const;

export type ClassLabel = keyof typeof PALETTE.classes;

export function getClassColor(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized in PALETTE.classes) {
    return PALETTE.classes[normalized as ClassLabel];
  }
  return PALETTE.neutral;
}
