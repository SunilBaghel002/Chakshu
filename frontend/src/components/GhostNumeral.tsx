import React from 'react';
import { Slot } from './layout/Slot';

interface GhostNumeralProps {
  sector?: string;
}

/**
 * SLOT-17 — Ghost sector numeral (PRD 10 §4 / L4, PRD 9 §6 M10)
 * Giant 96px numeral rendered at ink-ghost opacity over the map.
 * Scales 0.96→1 on mount via animate-ghost-in.
 */
export const GhostNumeral: React.FC<GhostNumeralProps> = React.memo(({ sector = '03' }) => {
  return (
    <Slot
      id="SLOT-17"
      className="absolute bottom-6 right-6 pointer-events-none select-none animate-ghost-in"
      style={{ zIndex: 'var(--z-map-overlay)' }}
    >
      <span
        className="t-ghost"
        style={{ color: 'var(--ink-ghost)' }}
      >
        {sector}
      </span>
    </Slot>
  );
});

