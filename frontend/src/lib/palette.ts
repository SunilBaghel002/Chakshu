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

  // Categorical Class Colors (Fixed map, never generated at runtime)
  classes: {
    // Land Cover (PRD 2 §6 Track 1/2)
    built: '#EF4444',        // Red (switched from orange per user instruction)
    water: '#0284C7',        // Sky-600
    vegetation: '#10B981',   // Emerald-500
    bare: '#D97706',         // Amber-600
    crop: '#84CC16',         // Lime-500
    snow: '#64748B',         // Mapped to Road per user instruction
    unclassified: '#64748B', // Slate-500

    // Discrete Objects (PRD 2 §6 Track 3)
    building: '#EF4444',     // Red
    building_cluster: '#EF4444', // Red
    vehicle: '#A855F7',
    aircraft: '#38BDF8',
    ship: '#14B8A6',
    ship_large: '#0D9488',
    storage_tank: '#EAB308',
    swimming_pool: '#06B6D4',
    tower: '#C084FC',
    container: '#F59E0B',
    road: '#64748B',
    construction: '#EF4444', // Red
    clearance: '#D97706',
    water_loss: '#38BDF8',
  } as const,

  // Darker outline colors for crisp polygon and geometry strokes
  darkOutlines: {
    built: '#991B1B',        // Dark Red
    water: '#1E40AF',        // Deep dark blue
    vegetation: '#065F46',   // Deep dark forest green
    bare: '#78350F',         // Dark rich brown
    crop: '#3F6212',         // Dark lime/olive
    snow: '#1E293B',         // Dark slate
    unclassified: '#1E293B',
    building: '#991B1B',     // Dark Red
    building_cluster: '#991B1B', // Dark Red
    vehicle: '#6B21A8',      // Dark purple
    aircraft: '#0369A1',     // Dark sky blue
    ship: '#0F766E',         // Dark teal
    ship_large: '#115E59',
    storage_tank: '#A16207',  // Dark gold
    swimming_pool: '#0E7490', // Dark cyan
    tower: '#7E22CE',
    container: '#B45309',
    road: '#1E293B',         // Dark slate gray
    construction: '#991B1B', // Dark Red
    clearance: '#78350F',
    water_loss: '#0369A1',
  } as const,
} as const;

export type ClassLabel = keyof typeof PALETTE.classes;

export function getClassColor(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized in PALETTE.classes) {
    return PALETTE.classes[normalized as ClassLabel];
  }
  return '#64748B';
}

/** Formats class label for display, mapping 'snow' to 'Road' per user instruction. */
export function formatClassLabel(label: string): string {
  const norm = label.toLowerCase();
  if (norm === 'snow') return 'Road';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Returns a darker, high-contrast outline color for polygon and boundary strokes. */
export function getDarkerClassColor(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized in PALETTE.darkOutlines) {
    return PALETTE.darkOutlines[normalized as keyof typeof PALETTE.darkOutlines];
  }
  return '#1E293B';
}
