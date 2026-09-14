import React from 'react';

interface GhostNumeralProps {
  sector?: string;
}

/**
 * SLOT-17 — Ghost sector numeral
 * Giant 96px numeral rendered at ink-ghost opacity over the map.
 * Scales 0.96→1 on mount via animate-ghost-in.
 */
export const GhostNumeral: React.FC<GhostNumeralProps> = ({ sector = '03' }) => {
  return (
    <div
      id="slot-17-ghost"
      className="absolute bottom-6 right-6 pointer-events-none select-none animate-ghost-in"
      style={{ zIndex: 300 }}
    >
      <span
        className="t-ghost"
        style={{ color: 'var(--ink-ghost)' }}
      >
        {sector}
      </span>
    </div>
  );
};
