/**
 * lib/shortcuts.ts — Authoritative Keyboard Map
 * Single source of truth per PRD 12 (ux-rules.md) §6 and PRD 10 §8.3.
 *
 * Rules:
 * 1. Shortcuts never fire while a text field has focus, except Esc and Enter.
 * 2. Every shortcut is also reachable by mouse.
 * 3. Conflicts are checked and throw in development.
 */

export interface ShortcutItem {
  id: string;
  keys: string[]; // e.g. ['g', 'm'] for chord, or ['a'] for single key
  displayKey: string; // e.g. 'G M', 'A', '⏎', '?'
  label: string;
  group: 'navigation' | 'console' | 'review' | 'view' | 'global';
  description: string;
}

export const SHORTCUTS_MAP: readonly ShortcutItem[] = [
  // Navigation (G then ...)
  {
    id: 'nav-map',
    keys: ['g', 'm'],
    displayKey: 'G M',
    label: 'Go to Map',
    group: 'navigation',
    description: 'Switch to map view and imagery well',
  },
  {
    id: 'nav-search',
    keys: ['g', 'f'],
    displayKey: 'G F',
    label: 'Go to Search',
    group: 'navigation',
    description: 'Open spatial and semantic search',
  },
  {
    id: 'nav-upload',
    keys: ['g', 'u'],
    displayKey: 'G U',
    label: 'Go to Upload',
    group: 'navigation',
    description: 'Open image upload and resolution gate',
  },
  {
    id: 'nav-review',
    keys: ['g', 'r'],
    displayKey: 'G R',
    label: 'Go to Review',
    group: 'navigation',
    description: 'Open review queue',
  },
  {
    id: 'nav-audit',
    keys: ['g', 'a'],
    displayKey: 'G A',
    label: 'Go to Audit',
    group: 'navigation',
    description: 'Open verifiable audit log',
  },

  // Console actions
  {
    id: 'aoi-focus',
    keys: ['a'],
    displayKey: 'A',
    label: 'Focus AOI Selector',
    group: 'console',
    description: 'Focus and open AOI selection dropdown',
  },
  {
    id: 'presets-open',
    keys: ['p'],
    displayKey: 'P',
    label: 'Presets Menu',
    group: 'console',
    description: 'Open temporal presets menu',
  },
  {
    id: 'dates-swap',
    keys: ['s'],
    displayKey: 'S',
    label: 'Swap Dates',
    group: 'console',
    description: 'Exchange Before and After dates',
  },
  {
    id: 'detect-changes',
    keys: ['d'],
    displayKey: 'D',
    label: 'Detect Changes',
    group: 'console',
    description: 'Run change detection pipeline (primary action)',
  },

  // Review & Triage
  {
    id: 'year-1',
    keys: ['1'],
    displayKey: '1',
    label: 'Year Chip 2021',
    group: 'review',
    description: 'Select baseline year 2021 / Tab 1',
  },
  {
    id: 'year-2',
    keys: ['2'],
    displayKey: '2',
    label: 'Year Chip 2022',
    group: 'review',
    description: 'Select year 2022 / Tab 2',
  },
  {
    id: 'year-3',
    keys: ['3'],
    displayKey: '3',
    label: 'Year Chip 2023',
    group: 'review',
    description: 'Select year 2023 / Tab 3',
  },
  {
    id: 'year-4',
    keys: ['4'],
    displayKey: '4',
    label: 'Year Chip 2024',
    group: 'review',
    description: 'Select year 2024 / Tab 4',
  },
  {
    id: 'year-5',
    keys: ['5'],
    displayKey: '5',
    label: 'Year Chip 2025',
    group: 'review',
    description: 'Select year 2025',
  },
  {
    id: 'year-6',
    keys: ['6'],
    displayKey: '6',
    label: 'Year Chip 2026',
    group: 'review',
    description: 'Select year 2026',
  },
  {
    id: 'row-next',
    keys: ['j'],
    displayKey: 'J',
    label: 'Next Target Row',
    group: 'review',
    description: 'Navigate to next detection row in queue',
  },
  {
    id: 'row-prev',
    keys: ['k'],
    displayKey: 'K',
    label: 'Previous Target Row',
    group: 'review',
    description: 'Navigate to previous detection row in queue',
  },
  {
    id: 'confirm-target',
    keys: ['enter'],
    displayKey: '⏎',
    label: 'Confirm Target',
    group: 'review',
    description: 'Confirm current detection or submit form',
  },
  {
    id: 'reject-target',
    keys: ['backspace'],
    displayKey: '⌫',
    label: 'Reject Target',
    group: 'review',
    description: 'Reject current detection',
  },
  {
    id: 'peek-stage',
    keys: [' '],
    displayKey: 'Space',
    label: 'Peek Comparison',
    group: 'review',
    description: 'Temporarily peek between before and after imagery',
  },

  // View & Inspection
  {
    id: 'toggle-before-after',
    keys: ['b'],
    displayKey: 'B',
    label: 'Toggle Before/After',
    group: 'view',
    description: 'Toggle between before and after view in dossier',
  },
  {
    id: 'copy-id',
    keys: ['c'],
    displayKey: 'C',
    label: 'Copy Target ID',
    group: 'view',
    description: 'Copy active change object ID to clipboard',
  },
  {
    id: 'export-report',
    keys: ['e'],
    displayKey: 'E',
    label: 'Export Report',
    group: 'view',
    description: 'Open export report dialog',
  },
  {
    id: 'toggle-legend',
    keys: ['l'],
    displayKey: 'L',
    label: 'Toggle Legend',
    group: 'view',
    description: 'Expand or collapse classification legend',
  },
  {
    id: 'fit-aoi',
    keys: ['f'],
    displayKey: 'F',
    label: 'Fit AOI',
    group: 'view',
    description: 'Fit camera to current AOI bounding box',
  },

  // Global & Overlays
  {
    id: 'close-overlay',
    keys: ['escape'],
    displayKey: 'Esc',
    label: 'Close Overlay',
    group: 'global',
    description: 'Close open dialogs, drawers, or reset selection',
  },
  {
    id: 'help-shortcuts',
    keys: ['?'],
    displayKey: '?',
    label: 'Keyboard Shortcuts',
    group: 'global',
    description: 'Open keyboard shortcuts dialog',
  },
  {
    id: 'focus-search',
    keys: ['/'],
    displayKey: '/',
    label: 'Search / Question',
    group: 'global',
    description: 'Focus search or question bar',
  },
];

/**
 * Validate that the shortcuts map has no conflicting key bindings.
 * Throws in development if conflicts are found.
 */
export function checkShortcutConflicts(items: readonly ShortcutItem[] = SHORTCUTS_MAP): void {
  const seenChords = new Map<string, string>();
  const seenSingles = new Map<string, string>();

  for (const item of items) {
    if (item.keys.length === 1) {
      const key = item.keys[0]?.toLowerCase() ?? '';
      if (seenSingles.has(key)) {
        throw new Error(
          `[shortcuts conflict] Key "${key}" is registered for both "${seenSingles.get(key)}" and "${item.id}".`
        );
      }
      seenSingles.set(key, item.id);
    } else {
      const chord = item.keys.map((k) => k.toLowerCase()).join('->');
      if (seenChords.has(chord)) {
        throw new Error(
          `[shortcuts conflict] Chord "${chord}" is registered for both "${seenChords.get(chord)}" and "${item.id}".`
        );
      }
      seenChords.set(chord, item.id);
    }
  }
}

// Conflict-check immediately on module load in dev
if (
  (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') ||
  (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV))
) {
  checkShortcutConflicts(SHORTCUTS_MAP);
}

/**
 * Determine if keyboard shortcuts should be suppressed due to focused element.
 * Rule (PRD 12 §6): shortcuts never fire while a text field has focus, except Esc and Enter.
 */
export function shouldSuppressShortcut(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;

  const tagName = target.tagName;
  const isInputOrTextArea =
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable;

  if (isInputOrTextArea) {
    // Only Esc and Enter are permitted to fire from a text field
    const key = event.key.toLowerCase();
    if (key === 'escape' || key === 'enter') {
      return false;
    }
    return true;
  }

  return false;
}
