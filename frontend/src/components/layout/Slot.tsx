import React from 'react';
import { SLOTS_REGISTRY, isRegisteredSlotId, type SlotId } from '../../lib/slots';

export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  id: SlotId;
  h?: number | string;
  w?: number | string;
  as?: React.ElementType;
  children?: React.ReactNode;
}

/**
 * Slot — The Authoritative Slot Renderer (PRD 10 §8.1 / L8)
 *
 * The only component permitted to render top-level layout grid regions.
 * Throws in development when passed an unregistered SlotId.
 * Owns default dimensions, z-index layering, and slot identification.
 */
export const Slot: React.FC<SlotProps> = ({
  id,
  h,
  w,
  as: Component = 'div',
  className = '',
  style,
  children,
  ...rest
}) => {
  const isDev =
    (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') ||
    (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV));

  if (!isRegisteredSlotId(id)) {
    const message = `[Slot.tsx] Unregistered slot ID: "${id}". Passing an unregistered slot ID is prohibited by PRD 10 §8.1. Register it in lib/slots.ts first.`;
    if (isDev) {
      throw new Error(message);
    }
  }

  const def = SLOTS_REGISTRY[id];

  // Compute width and height: explicit prop overrides registry default
  let computedWidth: string | number | undefined;
  if (w !== undefined) {
    computedWidth = typeof w === 'number' ? `${w}px` : w;
  } else if (def) {
    if (def.width === 'full') {
      computedWidth = '100%';
    } else if (typeof def.width === 'number') {
      computedWidth = `${def.width}px`;
    }
  }

  let computedHeight: string | number | undefined;
  if (h !== undefined) {
    computedHeight = typeof h === 'number' ? `${h}px` : h;
  } else if (def) {
    if (def.height === 'full') {
      computedHeight = '100%';
    } else if (typeof def.height === 'number') {
      computedHeight = `${def.height}px`;
    }
  }

  // Base slot styles
  const slotStyle: React.CSSProperties = {
    ...style,
  };

  if (computedWidth !== undefined) {
    slotStyle.width = computedWidth;
  }
  if (computedHeight !== undefined) {
    slotStyle.height = computedHeight;
  }
  if (def?.zIndex) {
    slotStyle.zIndex = def.zIndex;
  }

  return (
    <Component
      id={id.toLowerCase()}
      data-slot={id}
      className={`slot-container slot-${id.toLowerCase()} ${className}`.trim()}
      style={slotStyle}
      {...rest}
    >
      {children}
    </Component>
  );
};
