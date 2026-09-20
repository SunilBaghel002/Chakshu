import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrimaryOwnerProvider } from './PrimaryOwnerContext';
import { Button } from './Button';

describe('primaryOwner context (PRD 10 §4 / L4, PRD 11 §1 / K1)', () => {
  it('enforces at most one filled amber control per viewport (first claimant wins)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <PrimaryOwnerProvider>
        <Button id="btn-1" variant="primary">
          FIRST ACTION
        </Button>
        <Button id="btn-2" variant="primary">
          SECOND ACTION
        </Button>
      </PrimaryOwnerProvider>
    );

    const btn1 = screen.getByRole('button', { name: /FIRST ACTION/i });
    const btn2 = screen.getByRole('button', { name: /SECOND ACTION/i });

    // btn1 is primary (data-variant="primary", bg-amber)
    expect(btn1.getAttribute('data-variant')).toBe('primary');
    expect(btn1.className).toContain('bg-amber');

    // btn2 must downgrade itself to secondary (data-variant="secondary", bg-transparent)
    expect(btn2.getAttribute('data-variant')).toBe('secondary');
    expect(btn2.className).toContain('bg-transparent');

    // Dev warning logged
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[primaryOwner violation]')
    );

    warnSpy.mockRestore();
  });

  it('governs both variant="primary" and variant="bar" as filled amber controls', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <PrimaryOwnerProvider>
        <Button id="bar-action" variant="bar">
          BAR ACTION
        </Button>
        <Button id="primary-action" variant="primary">
          PRIMARY ACTION
        </Button>
      </PrimaryOwnerProvider>
    );

    const barBtn = screen.getByRole('button', { name: /BAR ACTION/i });
    const primaryBtn = screen.getByRole('button', { name: /PRIMARY ACTION/i });

    // barBtn claimed first
    expect(barBtn.getAttribute('data-variant')).toBe('bar');
    expect(barBtn.className).toContain('bg-amber');

    // primaryBtn must downgrade to secondary
    expect(primaryBtn.getAttribute('data-variant')).toBe('secondary');
    expect(primaryBtn.className).toContain('bg-transparent');

    warnSpy.mockRestore();
  });

  it('when dossier is open, CONFIRM owns primary and DETECT CHANGES downgrades to secondary', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Dossier is open: activeOwnerId is 'dossier-confirm'
    render(
      <PrimaryOwnerProvider activeOwnerId="dossier-confirm">
        {/* SLOT-02 Temporal Bar */}
        <Button id="detect-changes" variant="primary">
          DETECT CHANGES
        </Button>

        {/* SLOT-25 Dossier Footer */}
        <Button id="dossier-confirm" variant="primary">
          CONFIRM
        </Button>
      </PrimaryOwnerProvider>
    );

    const detectBtn = screen.getByRole('button', { name: /DETECT CHANGES/i });
    const confirmBtn = screen.getByRole('button', { name: /CONFIRM/i });

    // CONFIRM is the viewport's only primary
    expect(confirmBtn.getAttribute('data-variant')).toBe('primary');
    expect(confirmBtn.className).toContain('bg-amber');

    // DETECT CHANGES must downgrade to secondary
    expect(detectBtn.getAttribute('data-variant')).toBe('secondary');
    expect(detectBtn.className).toContain('bg-transparent');

    // Exactly one button has the primary amber fill style
    const allButtons = screen.getAllByRole('button');
    const primaryCount = allButtons.filter(
      (btn) => btn.getAttribute('data-variant') === 'primary' || btn.getAttribute('data-variant') === 'bar'
    ).length;
    expect(primaryCount).toBe(1);

    warnSpy.mockRestore();
  });
});
