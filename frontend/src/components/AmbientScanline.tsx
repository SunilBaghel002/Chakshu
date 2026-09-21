import React from 'react';

/**
 * M9 — Ambient Scanline
 * A 1px amber line that traverses the viewport vertically every 8s.
 * Subtle enough to be felt, not seen.
 * Respects prefers-reduced-motion via CSS (animation: none).
 */
export const AmbientScanline: React.FC = () => {
  return (
    <div
      className="fixed inset-x-0 top-0 pointer-events-none"
      style={{
        zIndex: 9999,
        height: '100vh',
        overflow: 'hidden',
        contain: 'strict',
      }}
    >
      <div
        className="animate-ambient-scan"
        style={{
          width: '100%',
          height: 1,
          background: 'rgba(255, 148, 38, 0.05)',
        }}
      />
    </div>
  );
};
