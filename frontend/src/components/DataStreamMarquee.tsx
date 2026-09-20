import React from 'react';
import { COPY } from '../lib/copy';

/**
 * SLOT-00 — Data Stream Marquee (18px)
 * Slow-scrolling amber text ticker. Pauses on hover.
 * Animation: 60s linear infinite via CSS class animate-marquee.
 */
export const DataStreamMarquee: React.FC = () => {
  const text = COPY.marquee;

  return (
    <div id="slot-00-marquee" className="w-full overflow-hidden select-none flex flex-col">
      {/* 3px Sovereign Tricolour Rule (PRD 9 §5.8) */}
      <div className="tricolour-rule shrink-0" />
      <div
        className="w-full overflow-hidden flex items-center"
        style={{
          height: 18,
          background: 'var(--well)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div
          className="animate-marquee whitespace-nowrap flex items-center h-full"
          style={{ width: 'max-content' }}
        >
          <span className="t-tag font-mono" style={{ color: 'var(--signal)', opacity: 0.85, letterSpacing: '0.12em' }}>
            {text}{text}
          </span>
        </div>
      </div>
    </div>
  );
};
