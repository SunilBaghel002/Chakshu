/**
 * Design system color tokens for Chakshu.
 * Source: PRD 9 §2 (UI Context and Design System).
 *
 * Enforces:
 * 1. Warm paper base (#FAF8F4) with cool neutral map well (#EDEFF1).
 * 2. High contrast inks with AAA compliance on primary text.
 * 3. Copper-amber Iris accent (#8A4B12) used with restraint.
 * 4. Fixed categorical palette for detections and land-cover.
 */

export const PALETTE = {
  // Base background layers
  bg: '#FAF8F4',             // App background. Warm paper.
  surface: '#FFFFFF',        // Cards, panels, popovers - raised layer
  surfaceSunken: '#F3F0E9',  // Wells, code blocks, insets
  surfaceHover: '#F6F3ED',   // Interactive hover
  surfaceActive: '#EFEBE2',  // Pressed / selected row
  mapWell: '#EDEFF1',        // Frame around the satellite imagery viewport

  // Typography Ink
  ink: '#1A1712',            // Headings, primary text, numbers (16.1:1 AAA)
  ink2: '#57503F',           // Body text, secondary labels (8.1:1 AAA)
  ink3: '#8A8272',           // Metadata, timestamps, placeholders (non-body only)
  inkInverse: '#FAF8F4',     // Text on dark fills

  // Borders and dividers
  line: '#E4DFD4',           // Default 1px border, dividers
  lineStrong: '#C9C2B2',     // Inputs, active table borders
  lineFocus: '#8A4B12',      // Focus ring inner edge

  // The Iris (Brand Accent)
  iris900: '#5C3009',        // Deepest ring; text on light iris fills
  iris700: '#8A4B12',        // Primary action button, active nav, focus ring
  iris500: '#B86820',        // Mid accent
  iris100: '#FBEFE3',        // Iris tint background

  // Epistemic Chips (PRD 4 §3)
  measuredGreen: '#1E7E34',  // Solid chip for MEASURED facts
  measuredBg: '#E8F5E9',
  inferredAmber: '#D35400',  // Outlined chip for INFERRED claims
  inferredBg: '#FFF3E0',

  // Categorical Class Colors (Fixed map, never generated at runtime)
  classes: {
    // Land Cover (PRD 2 §6 Track 1/2)
    built: '#D35400',
    water: '#2980B9',
    vegetation: '#27AE60',
    bare: '#A08156',
    crop: '#F1C40F',
    snow: '#BDC3C7',
    unclassified: '#7F8C8D',

    // Discrete Objects (PRD 2 §6 Track 3)
    building: '#C0392B',
    building_cluster: '#E67E22',
    vehicle: '#8E44AD',
    aircraft: '#2980B9',
    ship: '#16A085',
    ship_large: '#117A65',
    storage_tank: '#7D6608',
    swimming_pool: '#3498DB',
    tower: '#6C3483',
    container: '#B9770E',
    road: '#34495E',
  } as const,
} as const;

export type ClassLabel = keyof typeof PALETTE.classes;

export function getClassColor(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized in PALETTE.classes) {
    return PALETTE.classes[normalized as ClassLabel];
  }
  return '#7F8C8D';
}
