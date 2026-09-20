/**
 * Design system color tokens for Chakshu.
 * Source: Dark slate/indigo defense palette for MoD & ISRO / SIH26227.
 *
 * Enforces:
 * 1. Dark slate base (#0B0F19) with deep elevated surfaces (#111827, #1E293B).
 * 2. High contrast inks with AAA compliance on primary text.
 * 3. Accent Indigo (#6366F1 / #4F46E5 / #818CF8) for focus and tactical highlights.
 * 4. Fixed categorical palette for detections and land-cover.
 */

export const PALETTE = {
  // Base background layers (Dark Slate Defense Palette)
  bg: '#0B0F19',             // App background. Deep dark slate.
  surface: '#111827',        // Cards, panels, popovers - raised layer (slate-900)
  surfaceSunken: '#0F172A',  // Wells, insets, code blocks (slate-950)
  surfaceHover: '#1E293B',   // Interactive hover (slate-800)
  surfaceActive: '#334155',  // Pressed / selected row
  mapWell: '#070A10',        // Frame around the satellite imagery viewport

  // Typography Ink
  ink: '#F9FAFB',            // Headings, primary text, numbers (high contrast AAA)
  ink2: '#CBD5E1',           // Body text, secondary labels
  ink3: '#94A3B8',           // Metadata, timestamps, placeholders (non-body only)
  inkInverse: '#0B0F19',     // Text on bright fills

  // Borders and dividers
  line: '#1F2937',           // Default 1px border, dividers (slate-800)
  lineStrong: '#374151',     // Inputs, active table borders (slate-700)
  lineFocus: '#6366F1',      // Focus ring inner edge (indigo-500)

  // Accent Indigo (Defense Brand Accent)
  indigo900: '#312E81',      // Deep indigo tint
  indigo700: '#4338CA',      // Active indicator
  indigo600: '#4F46E5',      // Primary action button
  indigo500: '#6366F1',      // Core brand accent, focus ring, highlight
  indigo400: '#818CF8',      // Bright indigo hover
  indigo100: '#E0E7FF',      // Light tint on dark

  // Tactical Accent Colors (Matching Reference Screenshot)
  amber: '#F2B84B',
  amberGlow: 'rgba(242, 184, 75, 0.4)',
  cyan: '#24C6C8',
  cyanGlow: 'rgba(36, 198, 200, 0.35)',

  // Epistemic Chips (PRD 4 §3 & Rule 1: The AI never produces a number)
  measured: '#2FBF71',
  measuredGreen: '#35D07F',  // Solid chip for MEASURED / Deterministic facts
  measuredBg: 'rgba(53, 208, 127, 0.15)',
  measuredFill: 'rgba(47, 191, 113, 0.12)',
  measuredText: '#5AD79A',
  measuredBorder: '#059669',
  inferred: '#F0B45F',
  inferredAmber: '#F2B84B',  // Outlined chip for INFERRED claims
  inferredBg: 'rgba(242, 184, 75, 0.15)',
  inferredFill: 'rgba(240, 180, 95, 0.10)',
  inferredText: '#F0B45F',
  inferredBorder: '#D97706',
  unverified: '#6B7480',
  unverifiedText: '#A6ADB5',
  confirmed: '#2FBF71',
  confirmedText: '#5AD79A',
  rejected: '#E5484D',
  rejectedFill: 'rgba(229, 72, 77, 0.12)',
  rejectedText: '#F2767B',
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

  // Darker outline colors for crisp polygon and geometry strokes
  darkOutlines: {
    built: '#991B1B',
    water: '#1E40AF',
    reservoir: '#1E40AF',
    retention_pond: '#1E40AF',
    drainage: '#1E40AF',
    vegetation: '#065F46',
    crop: '#3F6212',
    landscape: '#065F46',
    bare: '#78350F',
    snow: '#1E293B',
    unclassified: '#1E293B',
    building: '#991B1B',
    building_cluster: '#991B1B',
    terminal: '#991B1B',
    atc_tower: '#991B1B',
    cargo: '#991B1B',
    vehicle: '#6B21A8',
    aircraft: '#0369A1',
    ship: '#0F766E',
    ship_large: '#115E59',
    storage_tank: '#A16207',
    swimming_pool: '#0E7490',
    tower: '#7E22CE',
    container: '#B45309',
    road: '#1E293B',
    runway: '#B45309',
    taxiway: '#B45309',
    apron: '#B45309',
    construction: '#991B1B',
    clearance: '#78350F',
    earthworks: '#78350F',
    water_loss: '#0369A1',
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

/** Formats class label for display, mapping 'snow' to 'Road' per user instruction. */
export function formatClassLabel(label: string): string {
  const norm = label.toLowerCase();
  if (norm === 'snow') return 'Road';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Returns a darker, high-contrast outline color for polygon and boundary strokes. */
export function getDarkerClassColor(label: string): string {
  const normalized = label.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (normalized in PALETTE.darkOutlines) {
    return PALETTE.darkOutlines[normalized as keyof typeof PALETTE.darkOutlines];
  }
  return '#1E293B';
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

