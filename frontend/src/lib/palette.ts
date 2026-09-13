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

  // Epistemic Chips (PRD 4 §3 & Rule 1: The AI never produces a number)
  measuredGreen: '#10B981',  // Solid chip for MEASURED / Deterministic facts
  measuredBg: 'rgba(16, 185, 129, 0.15)',
  measuredBorder: '#059669',
  inferredAmber: '#F59E0B',  // Outlined chip for INFERRED claims
  inferredBg: 'rgba(245, 158, 11, 0.15)',
  inferredBorder: '#D97706',

  // Categorical Class Colors (Fixed map, never generated at runtime)
  classes: {
    // Land Cover (PRD 2 §6 Track 1/2)
    built: '#F97316',        // Orange-500
    water: '#0284C7',        // Sky-600
    vegetation: '#10B981',   // Emerald-500
    bare: '#D97706',         // Amber-600
    crop: '#84CC16',         // Lime-500
    snow: '#E2E8F0',         // Slate-200
    unclassified: '#64748B', // Slate-500

    // Discrete Objects (PRD 2 §6 Track 3)
    building: '#EF4444',
    building_cluster: '#F97316',
    vehicle: '#A855F7',
    aircraft: '#38BDF8',
    ship: '#14B8A6',
    ship_large: '#0D9488',
    storage_tank: '#EAB308',
    swimming_pool: '#06B6D4',
    tower: '#C084FC',
    container: '#F59E0B',
    road: '#64748B',
    construction: '#F97316',
    clearance: '#D97706',
    water_loss: '#38BDF8',
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
