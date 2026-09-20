import React from 'react';
import { Slot } from '../layout/Slot';

interface SectorTagProps {
  sector: string;
}

/**
 * SLOT-11 — Sector Tag (PRD 10 §4 / L4, PRD 9 §6 M4)
 * Top-left corner of the map stage, inset 12px.
 * Max size: 220 x 24 px.
 * Displays computed sector grid coordinate (e.g. SEC 04·B).
 */
export const SectorTag: React.FC<SectorTagProps> = ({ sector }) => {
  return (
    <Slot
      id="SLOT-11"
      className="absolute top-3 left-3 pointer-events-none flex items-center"
      style={{
        width: 'auto',
        maxWidth: 220,
        height: 24,
      }}
    >
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 t-tag corner-ticks"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--r-tag)',
          color: 'var(--ink-2)',
          fontSize: 10,
          boxShadow: 'var(--shadow-menu)',
        }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--amber)' }}
        />
        <span className="tracking-wider" style={{ color: 'var(--amber)' }}>
          {sector}
        </span>
      </div>
    </Slot>
  );
};
