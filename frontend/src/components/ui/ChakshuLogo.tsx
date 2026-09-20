import React from 'react';
import { COPY } from '../../lib/copy';

interface ChakshuLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

/**
 * Tactical Sovereign Brand Logo Mark
 * Resembles the platform theme: Sovereign orbital satellite telemetry,
 * mechanical optical aperture, and amber signal core reticle.
 */
export const ChakshuLogo: React.FC<ChakshuLogoProps> = ({
  size = 32,
  className = '',
  showText = false,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/logo.svg"
        alt={COPY.appName}
        width={size}
        height={size}
        className="shrink-0 object-contain rounded-[var(--r-ctl)]"
      />
      {showText && (
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-[var(--signal)] font-sans leading-none">
            {COPY.appNameDevanagari}
          </span>
          <span className="text-xs uppercase tracking-widest text-[var(--ink)] font-mono font-semibold leading-none">
            {COPY.appName}
          </span>
        </div>
      )}
    </div>
  );
};
