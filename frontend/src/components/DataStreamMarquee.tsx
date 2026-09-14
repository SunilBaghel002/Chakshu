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
    <div
      id="slot-00-marquee"
      className="w-full overflow-hidden select-none"
      style={{
        height: 18,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div
        className="animate-marquee whitespace-nowrap flex items-center h-full"
        style={{ width: 'max-content' }}
      >
        <span className="t-tag" style={{ color: 'var(--amber)', opacity: 0.7 }}>
          {text}{text}
        </span>
      </div>
    </div>
  );
};
