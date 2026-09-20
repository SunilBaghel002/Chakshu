import React, { forwardRef, useId } from 'react';
import { DISABLED_REASONS, type DisabledReasonCode } from '../../lib/copy';
import { usePrimaryOwner } from './PrimaryOwnerContext';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger-outline'
  | 'danger-filled'
  | 'icon-ghost'
  | 'bar';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonState =
  | 'default'
  | 'hover'
  | 'active'
  | 'focus-visible'
  | 'disabled'
  | 'loading'
  | 'selected';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Explicit state override for contact sheet and testing */
  state?: ButtonState;
  /** Fixed disabled reason code (PRD 11 §1.5) */
  reason?: DisabledReasonCode;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  shortcut?: string;
  loading?: boolean;
  loadingText?: string;
  selected?: boolean;
  as?: React.ElementType;
}

/** Converts uppercase/sentence labels to gerund when loading */
function toGerund(text: string): string {
  const upper = text.toUpperCase();
  if (upper.includes('DETECT')) return text.replace(/detect/i, 'Detecting');
  if (upper.includes('CONFIRM')) return text.replace(/confirm/i, 'Confirming');
  if (upper.includes('SWAP')) return text.replace(/swap/i, 'Swapping');
  if (upper.includes('EXPORT')) return text.replace(/export/i, 'Exporting');
  if (upper.includes('REJECT')) return text.replace(/reject/i, 'Rejecting');
  if (upper.includes('UPLOAD')) return text.replace(/upload/i, 'Uploading');
  if (upper.includes('SAVE')) return text.replace(/save/i, 'Saving');
  return `${text}...`;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      state: explicitState,
      reason,
      icon,
      iconRight,
      shortcut,
      loading = false,
      loadingText,
      selected = false,
      disabled = false,
      className = '',
      children,
      onClick,
      id: customId,
      as: Component = 'button',
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const buttonId = customId || generatedId;
    const reasonId = `${buttonId}-reason`;

    // Compute active state
    const isStateLoading = explicitState === 'loading' || loading;
    const isStateDisabled = explicitState === 'disabled' || disabled;
    const isStateSelected = explicitState === 'selected' || selected;

    // Enforce one-primary rule per viewport via primaryOwner context (PRD 10 L4 / PRD 11 K1)
    const isPrimaryAllowed = usePrimaryOwner(buttonId, variant === 'primary');
    const effectiveVariant: ButtonVariant =
      variant === 'primary' && !isPrimaryAllowed ? 'secondary' : variant;

    // Disabled reason tooltip copy
    const disabledTooltip = reason ? DISABLED_REASONS[reason] : undefined;

    // Loading label
    let renderedContent = children;
    if (isStateLoading) {
      if (loadingText) {
        renderedContent = loadingText;
      } else if (typeof children === 'string') {
        renderedContent = toGerund(children);
      }
    }

    // Size base classes
    const sizeClasses = {
      sm: 'h-ctl-sm px-2.5 t-tag gap-1',
      md: 'h-ctl px-3.5 t-h2 gap-1',
      lg: 'h-ctl-lg px-5 t-h2 gap-2',
    }[size];

    // Icon sizing
    const iconSizeClasses = {
      sm: '[&>svg]:w-3.5 [&>svg]:h-3.5',
      md: '[&>svg]:w-4 [&>svg]:h-4',
      lg: '[&>svg]:w-5 [&>svg]:h-5',
    }[size];

    // Variant base classes (idle default)
    let variantClasses = '';
    switch (effectiveVariant) {
      case 'primary':
        variantClasses = 'bg-amber text-amber-deep border-none font-bold';
        break;
      case 'secondary':
        variantClasses = 'bg-transparent text-ink-2 border border-line-strong';
        break;
      case 'ghost':
        variantClasses = 'bg-transparent text-ink-3 border-none';
        break;
      case 'danger-outline':
        variantClasses = 'bg-transparent text-danger border border-danger';
        break;
      case 'danger-filled':
        variantClasses = 'bg-danger text-danger-ink border-none font-bold';
        break;
      case 'icon-ghost':
        variantClasses =
          'bg-transparent text-ink-3 border-none p-0 w-ctl-sm h-ctl-sm flex items-center justify-center hit-area-expand';
        break;
      case 'bar':
        variantClasses = 'bg-amber text-amber-deep border-none font-bold skew-dossier';
        break;
    }

    // Interactive state modifier classes (when not statically forced or disabled)
    let stateModifierClasses = '';
    if (explicitState === 'hover') {
      if (effectiveVariant === 'primary' || effectiveVariant === 'bar') {
        stateModifierClasses = 'bg-amber-hot';
      } else if (effectiveVariant === 'secondary') {
        stateModifierClasses = 'border-amber text-amber bg-amber-wash';
      } else if (effectiveVariant === 'ghost' || effectiveVariant === 'icon-ghost') {
        stateModifierClasses = 'text-ink bg-panel-2';
      } else if (effectiveVariant === 'danger-outline') {
        stateModifierClasses = 'bg-rejected-fill';
      } else if (effectiveVariant === 'danger-filled') {
        stateModifierClasses = 'brightness-110';
      }
    } else if (explicitState === 'active') {
      stateModifierClasses =
        'active-press ' +
        (effectiveVariant === 'primary' || effectiveVariant === 'bar'
          ? 'bg-amber-deep text-amber'
          : effectiveVariant === 'secondary'
          ? 'bg-amber-wash'
          : effectiveVariant === 'danger-filled'
          ? 'brightness-90'
          : 'bg-panel-3');
    } else if (explicitState === 'focus-visible') {
      stateModifierClasses =
        'outline-none ring-2 ring-amber ring-offset-2 ring-offset-bg';
    } else if (isStateSelected) {
      stateModifierClasses = 'bg-amber-wash border border-amber text-amber';
    } else if (isStateDisabled) {
      stateModifierClasses =
        'opacity-40 cursor-not-allowed pointer-events-none filter grayscale';
    } else if (isStateLoading) {
      stateModifierClasses = 'cursor-wait pointer-events-none opacity-90';
    } else {
      // Dynamic pseudo-classes for interactive browser state
      const hoverClasses =
        effectiveVariant === 'primary' || effectiveVariant === 'bar'
          ? 'hover:bg-amber-hot'
          : effectiveVariant === 'secondary'
          ? 'hover:border-amber hover:text-amber hover:bg-amber-wash'
          : effectiveVariant === 'ghost' || effectiveVariant === 'icon-ghost'
          ? 'hover:text-ink hover:bg-panel-2'
          : effectiveVariant === 'danger-outline'
          ? 'hover:bg-rejected-fill'
          : effectiveVariant === 'danger-filled'
          ? 'hover:brightness-110'
          : '';

      const activeClasses =
        'active:active-press ' +
        (effectiveVariant === 'primary' || effectiveVariant === 'bar'
          ? 'active:bg-amber-deep active:text-amber'
          : effectiveVariant === 'secondary'
          ? 'active:bg-amber-wash'
          : effectiveVariant === 'danger-filled'
          ? 'active:brightness-90'
          : 'active:bg-panel-3');

      const focusClasses =
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

      stateModifierClasses = `${hoverClasses} ${activeClasses} ${focusClasses}`;
    }

    return (
      <Component
        ref={ref}
        id={buttonId}
        type={Component === 'button' ? rest.type || 'button' : undefined}
        disabled={isStateDisabled}
        aria-busy={isStateLoading ? 'true' : undefined}
        aria-disabled={isStateDisabled ? 'true' : undefined}
        aria-describedby={disabledTooltip ? reasonId : undefined}
        title={disabledTooltip || rest.title}
        onClick={isStateDisabled || isStateLoading ? undefined : onClick}
        className={`group relative inline-flex items-center justify-center select-none overflow-hidden transition-all duration-fast rounded-ctl ${
          effectiveVariant === 'icon-ghost' ? '' : sizeClasses
        } ${iconSizeClasses} ${variantClasses} ${stateModifierClasses} ${className}`}
        {...rest}
      >
        {/* Primary button diagonal sweep highlight animation (PRD 11 §1.3) */}
        {effectiveVariant === 'primary' && !isStateDisabled && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 w-full h-full btn-sweep-overlay ${
              explicitState === 'hover'
                ? 'animate-scan-sweep'
                : 'opacity-0 group-hover:animate-scan-sweep'
            }`}
          />
        )}

        {/* Bar button un-skew wrapper */}
        <span
          className={`inline-flex items-center justify-center gap-1.5 ${
            effectiveVariant === 'bar' ? 'unskew-dossier' : ''
          }`}
        >
          {icon && <span className="inline-flex shrink-0">{icon}</span>}
          {renderedContent && <span>{renderedContent}</span>}
          {iconRight && <span className="inline-flex shrink-0">{iconRight}</span>}

          {/* Shortcut hint visible at >=1440px viewport width (PRD 11 §1.6) */}
          {shortcut && (
            <kbd className="shortcut-kbd items-center justify-center ml-2 px-1 py-0.5 text-xs font-mono border border-current rounded opacity-60">
              {shortcut}
            </kbd>
          )}
        </span>

        {/* Loading indeterminate progress bar along bottom edge (PRD 11 §1.3) */}
        {isStateLoading && (
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-wash overflow-hidden"
          >
            <span className="absolute top-0 bottom-0 bg-amber animate-dot-pulse w-full" />
          </span>
        )}

        {/* Screen-reader disabled reason announcement */}
        {isStateDisabled && disabledTooltip && (
          <span id={reasonId} className="sr-only">
            {disabledTooltip}
          </span>
        )}
      </Component>
    );
  }
);

Button.displayName = 'Button';
