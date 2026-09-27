import React from 'react';
import { COPY } from '../../lib/copy';

interface ChakshuLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  subtext?: string;
}

/**
 * Tactical Sovereign Brand Logo Mark
 * Stitch Deterministic Geo-Intelligence lockup:
 * Aperture Geometry, Concentric Radar Ring, Iris Core, and Satellite Node.
 */
export const ChakshuLogo: React.FC<ChakshuLogoProps> = ({
  size = 32,
  className = '',
  showText = false,
  subtext = 'Satellite Intelligence',
}) => {
  return (
    <div className={`flex items-center gap-space-md select-none ${className}`}>
      <img
        src="/logo.svg"
        alt={COPY.appName}
        width={size}
        height={size}
        className="shrink-0 object-contain"
      />
      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-headline-md text-headline-md tracking-tight text-on-surface font-semibold">
              CHAKSHU
            </span>
            <span className="font-headline-md text-headline-md text-on-surface-variant font-normal">
              ({COPY.appNameDevanagari})
            </span>
          </div>
          {subtext && (
            <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline mt-0.5">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
