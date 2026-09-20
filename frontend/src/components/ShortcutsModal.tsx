import React, { useEffect } from 'react';
import { SHORTCUTS_MAP, type ShortcutItem } from '../lib/shortcuts';
import { CONSOLE_COPY } from '../lib/copy';
import { Button } from './ui/Button';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GROUP_LABELS: Record<ShortcutItem['group'], string> = {
  navigation: CONSOLE_COPY.navigationGroup,
  console: CONSOLE_COPY.consoleGroup,
  review: CONSOLE_COPY.reviewGroup,
  view: CONSOLE_COPY.viewGroup,
  global: CONSOLE_COPY.globalGroup,
};

const GROUPS: readonly ShortcutItem['group'][] = [
  'navigation',
  'console',
  'review',
  'view',
  'global',
];

/**
 * ShortcutsModal (PRD 12 §6 / X6)
 * Dialog displaying full keyboard map grouped by functional area.
 * Renders shortcut hints in kbd styling matching Button hints.
 */
export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={CONSOLE_COPY.shortcutsTitle}
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 'var(--z-modal)',
        background: 'rgba(6, 8, 10, 0.72)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl flex flex-col corner-ticks p-6"
        style={{
          maxHeight: '85vh',
          background: 'var(--panel)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between pb-3"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div>
            <h2
              className="t-h1"
              style={{ color: 'var(--amber)', margin: 0 }}
            >
              {CONSOLE_COPY.shortcutsTitle}
            </h2>
            <p
              className="t-mono mt-0.5"
              style={{ color: 'var(--ink-3)', fontSize: 11 }}
            >
              {CONSOLE_COPY.escHint}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={CONSOLE_COPY.shortcutsClose}
          >
            {CONSOLE_COPY.shortcutsClose}
          </Button>
        </div>

        {/* Body - Grouped list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {GROUPS.map((group) => {
            const items = SHORTCUTS_MAP.filter((item) => item.group === group);
            if (items.length === 0) return null;

            return (
              <div key={group} className="space-y-2">
                <div
                  className="t-tag font-bold pb-1"
                  style={{
                    color: 'var(--amber)',
                    borderBottom: '1px solid var(--line)',
                    letterSpacing: '0.1em',
                  }}
                >
                  {GROUP_LABELS[group]}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded"
                      style={{
                        background: 'var(--panel-2)',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <div className="min-w-0 pr-2">
                        <div
                          className="t-body font-semibold truncate"
                          style={{ color: 'var(--ink)' }}
                        >
                          {item.label}
                        </div>
                        <div
                          className="t-mono truncate"
                          style={{ color: 'var(--ink-3)', fontSize: 10 }}
                        >
                          {item.description}
                        </div>
                      </div>
                      <kbd
                        className="t-tag shrink-0 px-2 py-0.5"
                        style={{
                          background: 'var(--panel-3)',
                          border: '1px solid var(--line-strong)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--amber)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                        }}
                      >
                        {item.displayKey}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="pt-3 flex justify-end"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <Button variant="secondary" size="md" onClick={onClose}>
            {CONSOLE_COPY.shortcutsClose}
          </Button>
        </div>
      </div>
    </div>
  );
};
