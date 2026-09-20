import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Slot } from './Slot';
import { SLOTS_REGISTRY, isRegisteredSlotId } from '../../lib/slots';

describe('Slot component (PRD 10 §8.1 / L8)', () => {
  it('renders a registered slot with data-slot attribute and slot dimensions', () => {
    render(
      <Slot id="SLOT-00" h={18}>
        <span>MARQUEE CONTENT</span>
      </Slot>
    );

    const slotEl = screen.getByText('MARQUEE CONTENT').parentElement;
    expect(slotEl).not.toBeNull();
    expect(slotEl?.getAttribute('data-slot')).toBe('SLOT-00');
    expect(slotEl?.style.height).toBe('18px');
    expect(slotEl?.style.zIndex).toBe('var(--z-sticky)');
  });

  it('renders all primary console layout slots defined in registry', () => {
    const mainSlotIds = [
      'SLOT-00',
      'SLOT-01',
      'SLOT-02',
      'SLOT-05',
      'SLOT-10',
      'SLOT-20',
      'SLOT-30',
      'SLOT-40',
    ] as const;

    for (const slotId of mainSlotIds) {
      expect(isRegisteredSlotId(slotId)).toBe(true);
      const def = SLOTS_REGISTRY[slotId];
      expect(def).toBeDefined();
      expect(def.id).toBe(slotId);
      expect(def.permittedChildren.length).toBeGreaterThan(0);
    }
  });

  it('throws an error in development on an unregistered slot id', () => {
    // Suppress console.error in test output for intentional throw
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      // @ts-expect-error - testing runtime rejection of unregistered slot
      render(<Slot id="SLOT-INVALID-99"><span>INVALID</span></Slot>);
    }).toThrow(/Unregistered slot ID/i);

    consoleError.mockRestore();
  });
});
