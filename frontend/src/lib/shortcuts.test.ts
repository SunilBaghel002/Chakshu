import { describe, it, expect } from 'vitest';
import {
  SHORTCUTS_MAP,
  checkShortcutConflicts,
  shouldSuppressShortcut,
  type ShortcutItem,
} from './shortcuts';

describe('Keyboard map and shortcuts (PRD 12 §6 / X6)', () => {
  it('passes conflict check cleanly on official shortcuts registry', () => {
    expect(() => checkShortcutConflicts(SHORTCUTS_MAP)).not.toThrow();
  });

  it('throws in development if a single-key shortcut conflict is introduced', () => {
    const conflictingMap: ShortcutItem[] = [
      ...SHORTCUTS_MAP,
      {
        id: 'conflicting-action',
        keys: ['d'], // 'd' already mapped to 'detect-changes'
        displayKey: 'D',
        label: 'Duplicate D',
        group: 'console',
        description: 'Should throw conflict error',
      },
    ];

    expect(() => checkShortcutConflicts(conflictingMap)).toThrow(
      /Key "d" is registered for both "detect-changes" and "conflicting-action"/i
    );
  });

  it('throws in development if a chorded shortcut conflict is introduced', () => {
    const conflictingMap: ShortcutItem[] = [
      ...SHORTCUTS_MAP,
      {
        id: 'conflicting-chord',
        keys: ['g', 'm'], // 'g m' already mapped to 'nav-map'
        displayKey: 'G M',
        label: 'Duplicate GM',
        group: 'navigation',
        description: 'Should throw conflict error',
      },
    ];

    expect(() => checkShortcutConflicts(conflictingMap)).toThrow(
      /Chord "g->m" is registered for both "nav-map" and "conflicting-chord"/i
    );
  });

  it('suppresses shortcuts when a text field has focus, except Esc and Enter', () => {
    const inputEl = document.createElement('input');
    document.body.appendChild(inputEl);
    inputEl.focus();

    // Regular key (e.g. 'd' for detect or 'j' for row-next) must be suppressed
    const dEvent = new KeyboardEvent('keydown', { key: 'd' });
    Object.defineProperty(dEvent, 'target', { value: inputEl });
    expect(shouldSuppressShortcut(dEvent)).toBe(true);

    const aEvent = new KeyboardEvent('keydown', { key: 'a' });
    Object.defineProperty(aEvent, 'target', { value: inputEl });
    expect(shouldSuppressShortcut(aEvent)).toBe(true);

    // Escape and Enter are permitted to fire
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    Object.defineProperty(escEvent, 'target', { value: inputEl });
    expect(shouldSuppressShortcut(escEvent)).toBe(false);

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    Object.defineProperty(enterEvent, 'target', { value: inputEl });
    expect(shouldSuppressShortcut(enterEvent)).toBe(false);

    document.body.removeChild(inputEl);
  });

  it('does not suppress shortcuts when activeElement is a regular container', () => {
    const divEl = document.createElement('div');
    document.body.appendChild(divEl);

    const dEvent = new KeyboardEvent('keydown', { key: 'd' });
    Object.defineProperty(dEvent, 'target', { value: divEl });
    expect(shouldSuppressShortcut(dEvent)).toBe(false);

    document.body.removeChild(divEl);
  });
});
