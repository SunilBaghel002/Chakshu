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

  // §2.5 Land Cover & Semantic Infrastructure Classes
  classes: {
    // Water bodies & reservoirs — vibrant satellite blue
    water: '#258CF4',
    reservoir: '#258CF4',
    retention_pond: '#258CF4',
    water_gain: '#258CF4',
    water_loss: '#7FA8C4',
    drainage: '#258CF4',

    // Vegetation & landscape — rich tactical green
    vegetation: '#2ECC71',
    crop: '#2ECC71',
    green_buffer: '#2ECC71',
    vegetation_gain: '#2ECC71',
    landscape: '#2ECC71',

    // Buildings & architecture — radiant orange
    building: '#FF7A29',
    architecture: '#FF7A29',
    terminal: '#FF7A29',
    atc_tower: '#FF7A29',
    cargo: '#FF7A29',
    built: '#FF7A29',
    building_cluster: '#FF7A29',
    structure: '#FF7A29',
    facility: '#FF7A29',

    // Aviation infrastructure & paved surfaces — aviation gold / amber
    runway: '#F5A623',
    taxiway: '#F5A623',
    apron: '#E5A93C',
    infrastructure: '#F5A623',
    paved: '#F5A623',

    // Earthworks & site clearance — sandy ochre
    construction: '#D4A373',
    clearance: '#D4A373',
    earthworks: '#D4A373',
    bare: '#D4A373',

    // Aux / Object classes
    vehicle: '#9B7BE0',
    aircraft: '#5A9BE0',
    ship: '#258CF4',
    ship_large: '#2E7BB5',
    storage_tank: '#FF7A29',
    swimming_pool: '#258CF4',
    tower: '#FF7A29',
    container: '#FF7A29',
    road: '#A6ADB5',
    snow: '#B9C6D2',
    demolition: '#8A93A0',
    unclassified: '#6B7480',
    other: '#A6ADB5',
  } as const,
} as const;

export type ClassLabel = keyof typeof PALETTE.classes;

export function getClassColor(label: string): string {
  const normalized = label.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (normalized in PALETTE.classes) {
    return PALETTE.classes[normalized as ClassLabel];
  }
  // Keyword fallbacks
  if (normalized.includes('build') || normalized.includes('term') || normalized.includes('atc') || normalized.includes('cargo') || normalized.includes('arch')) {
    return PALETTE.classes.building;
  }
  if (normalized.includes('veg') || normalized.includes('green') || normalized.includes('crop') || normalized.includes('tree')) {
    return PALETTE.classes.vegetation;
  }
  if (normalized.includes('water') || normalized.includes('pond') || normalized.includes('basin') || normalized.includes('lake') || normalized.includes('drain')) {
    return PALETTE.classes.water;
  }
  if (normalized.includes('runway') || normalized.includes('taxi') || normalized.includes('apron') || normalized.includes('pave')) {
    return PALETTE.classes.runway;
  }
  if (normalized.includes('construct') || normalized.includes('clear') || normalized.includes('earth') || normalized.includes('soil')) {
    return PALETTE.classes.construction;
  }
  return PALETTE.neutral;
}

export function getClassBadge(label: string): { name: string; color: string; bg: string } {
  const color = getClassColor(label);
  const normalized = label.toLowerCase();
  let name = 'INFRASTRUCTURE';
  if (normalized.includes('build') || normalized.includes('term') || normalized.includes('atc') || normalized.includes('cargo')) name = 'BUILDING';
  else if (normalized.includes('veg') || normalized.includes('green') || normalized.includes('crop')) name = 'VEGETATION';
  else if (normalized.includes('water') || normalized.includes('pond') || normalized.includes('basin') || normalized.includes('lake')) name = 'WATER';
  else if (normalized.includes('runway')) name = 'RUNWAY';
  else if (normalized.includes('taxi')) name = 'TAXIWAY';
  else if (normalized.includes('apron')) name = 'APRON';
  else if (normalized.includes('clear') || normalized.includes('earth') || normalized.includes('construct')) name = 'EARTHWORKS';
  return { name, color, bg: `${color}20` };
}

export function formatClassLabel(label: string): string {
  const norm = label.toLowerCase();
  if (norm === 'snow') return 'Road';
  return label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getDarkerClassColor(label: string): string {
  return getClassColor(label);
}
