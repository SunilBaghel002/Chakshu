import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Button, type ButtonVariant, type ButtonSize, type ButtonState } from './Button';
import { DISABLED_REASONS, type DisabledReasonCode } from '../../lib/copy';
import { PrimaryOwnerProvider } from './PrimaryOwnerContext';

describe('Button component (PRD 11 §1 / K1)', () => {
  it('renders all 7 variants without error', () => {
    const variants: ButtonVariant[] = [
      'primary',
      'secondary',
      'ghost',
      'danger-outline',
      'danger-filled',
      'icon-ghost',
      'bar',
    ];

    variants.forEach((variant) => {
      const { unmount } = render(<Button variant={variant}>Action</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeTruthy();
      unmount();
    });
  });

  it('renders all 3 sizes', () => {
    const sizes: ButtonSize[] = ['sm', 'md', 'lg'];
    sizes.forEach((size) => {
      const { unmount } = render(<Button size={size}>Action</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeTruthy();
      unmount();
    });
  });

  it('renders all 7 states', () => {
    const states: ButtonState[] = [
      'default',
      'hover',
      'active',
      'focus-visible',
      'disabled',
      'loading',
      'selected',
    ];

    states.forEach((state) => {
      const { unmount } = render(
        <Button state={state} reason={state === 'disabled' ? 'no-aoi' : undefined}>
          Action
        </Button>
      );
      const btn = screen.getByRole('button') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      if (state === 'disabled') {
        expect(btn.disabled).toBe(true);
      }
      if (state === 'loading') {
        expect(btn.getAttribute('aria-busy')).toBe('true');
      }
      unmount();
    });
  });

  it('renders the 8 disabled reason strings and sets aria-describedby', () => {
    const reasons = Object.keys(DISABLED_REASONS) as DisabledReasonCode[];
    expect(reasons.length).toBe(8);

    reasons.forEach((reason) => {
      const expectedCopy = DISABLED_REASONS[reason];
      const { unmount } = render(
        <Button disabled reason={reason}>
          Action
        </Button>
      );
      const btn = screen.getByRole('button') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(btn.getAttribute('title')).toBe(expectedCopy);
      const describedById = btn.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();
      const srDesc = document.getElementById(describedById!);
      expect(srDesc?.textContent).toBe(expectedCopy);
      unmount();
    });
  });

  it('converts verb to gerund when loading and contains no spinner icon', () => {
    render(<Button loading>Detect changes</Button>);
    const btn = screen.getByRole('button');
    expect(btn.textContent).toMatch(/Detecting changes/i);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    // Ensure no svg spinner was inserted
    expect(btn.querySelector('svg')).toBeNull();
  });

  it('renders shortcut hint <kbd>', () => {
    render(<Button shortcut="D">Detect</Button>);
    const kbd = screen.getByText('D');
    expect(kbd.tagName.toLowerCase()).toBe('kbd');
  });

  it('strictly renders semantic <button> element', () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole('button');
    expect(btn.tagName.toLowerCase()).toBe('button');
  });

  it('asserts one-primary rule via PrimaryOwnerContext and warns on violation', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <PrimaryOwnerProvider initialOwnerId="owner-1">
        <Button id="owner-1" variant="primary">
          First Primary
        </Button>
        <Button id="owner-2" variant="primary">
          Second Primary
        </Button>
      </PrimaryOwnerProvider>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[primaryOwner violation]')
    );
    consoleSpy.mockRestore();
  });

  it('ignores clicks when disabled or loading', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button disabled reason="no-dates" onClick={handleClick}>
        Test
      </Button>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();

    rerender(
      <Button loading onClick={handleClick}>
        Test
      </Button>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
