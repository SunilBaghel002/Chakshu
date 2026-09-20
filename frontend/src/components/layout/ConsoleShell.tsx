import React, { useState, useEffect } from 'react';
import { Slot } from './Slot';
import { PrimaryOwnerProvider } from '../ui/PrimaryOwnerContext';
import { ShortcutsModal } from '../ShortcutsModal';
import { shouldSuppressShortcut } from '../../lib/shortcuts';
import { CONSOLE_COPY } from '../../lib/copy';
import { Button } from '../ui/Button';

export interface ConsoleShellProps {
  marqueeNode: React.ReactNode;
  headerNode: React.ReactNode;
  temporalBarNode: React.ReactNode;
  railNode: React.ReactNode;
  stageNode: React.ReactNode;
  timelineNode: React.ReactNode;
  dossierNode?: React.ReactNode;
  statusLineNode: React.ReactNode;
  hasActiveDossier: boolean;
  onShortcutAction?: (actionId: string) => void;
  overlayNode?: React.ReactNode;
}

/**
 * SmallScreenNotice (PRD 10 §6 / L6)
 * Displayed for viewports < 1024px.
 * The console requires >= 1024px; mobile consoles are explicitly banned.
 */
const SmallScreenNotice: React.FC = () => {
  return (
    <div
      role="alert"
      className="fixed inset-0 flex items-center justify-center p-6 select-none"
      style={{
        background: 'var(--bg)',
        color: 'var(--ink)',
        zIndex: 'var(--z-modal)',
      }}
    >
      <div
        className="w-full max-w-md p-6 text-center flex flex-col items-center gap-4 corner-ticks"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
        }}
      >
        <span
          className="t-tag font-bold"
          style={{ color: 'var(--amber)', letterSpacing: '0.1em' }}
        >
          {CONSOLE_COPY.smallScreenNotice}
        </span>
        <Button
          variant="secondary"
          size="md"
          onClick={() => {
            window.location.href = '/';
          }}
          className="mt-2"
        >
          {CONSOLE_COPY.goToOverview}
        </Button>
      </div>
    </div>
  );
};

/**
 * ConsoleShell (PRD 10 §3 / L3, §4 / L4, §8 / L8)
 *
 * The master viewport shell built strictly on the slot grid:
 * - Row 1: SLOT-00 Marquee (18px fixed)
 * - Row 2: SLOT-01 Command Bar (56px fixed)
 * - Row 3: SLOT-02 Temporal Bar (44px fixed)
 * - Row 4: Main Flex Stage
 *     - Left: SLOT-05 Rail (56px fixed width)
 *     - Center: SLOT-10 Map Well (flex) + SLOT-30 Timeline (72px fixed)
 *     - Right: SLOT-20 Dossier (380px fixed width)
 * - Row 5: SLOT-40 Status Line (24px fixed)
 *
 * Enforces primaryOwner context and registers global keyboard shortcuts.
 */
export const ConsoleShell: React.FC<ConsoleShellProps> = ({
  marqueeNode,
  headerNode,
  temporalBarNode,
  railNode,
  stageNode,
  timelineNode,
  dossierNode,
  statusLineNode,
  hasActiveDossier,
  onShortcutAction,
  overlayNode,
}) => {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [pendingChord, setPendingChord] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Keyboard Map handling per PRD 12 §6
  useEffect(() => {
    let chordTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Rule: shortcuts never fire while a text field has focus, except Esc and Enter
      if (shouldSuppressShortcut(event)) {
        return;
      }

      const key = event.key.toLowerCase();

      // Help shortcuts
      if (event.key === '?') {
        event.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Close overlays on Esc
      if (event.key === 'Escape') {
        if (isShortcutsOpen) {
          event.preventDefault();
          setIsShortcutsOpen(false);
          return;
        }
        onShortcutAction?.('close-overlay');
        return;
      }

      // Chord handling: G then M / F / U / R / A
      if (pendingChord === 'g') {
        if (key === 'm') {
          event.preventDefault();
          onShortcutAction?.('nav-map');
        } else if (key === 'f') {
          event.preventDefault();
          onShortcutAction?.('nav-search');
        } else if (key === 'u') {
          event.preventDefault();
          onShortcutAction?.('nav-upload');
        } else if (key === 'r') {
          event.preventDefault();
          onShortcutAction?.('nav-review');
        } else if (key === 'a') {
          event.preventDefault();
          onShortcutAction?.('nav-audit');
        }
        setPendingChord(null);
        if (chordTimer) clearTimeout(chordTimer);
        return;
      }

      if (key === 'g') {
        setPendingChord('g');
        chordTimer = setTimeout(() => {
          setPendingChord(null);
        }, 1000);
        return;
      }

      // Direct single key shortcuts
      switch (key) {
        case 'a':
          onShortcutAction?.('aoi-focus');
          break;
        case 'p':
          onShortcutAction?.('presets-open');
          break;
        case 's':
          onShortcutAction?.('dates-swap');
          break;
        case 'd':
          onShortcutAction?.('detect-changes');
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          onShortcutAction?.(`year-${key}`);
          break;
        case 'j':
          onShortcutAction?.('row-next');
          break;
        case 'k':
          onShortcutAction?.('row-prev');
          break;
        case 'enter':
          onShortcutAction?.('confirm-target');
          break;
        case 'backspace':
          onShortcutAction?.('reject-target');
          break;
        case ' ':
          onShortcutAction?.('peek-stage');
          break;
        case 'b':
          onShortcutAction?.('toggle-before-after');
          break;
        case 'c':
          onShortcutAction?.('copy-id');
          break;
        case 'e':
          onShortcutAction?.('export-report');
          break;
        case 'l':
          onShortcutAction?.('toggle-legend');
          break;
        case 'f':
          onShortcutAction?.('fit-aoi');
          break;
        case '/':
          onShortcutAction?.('focus-search');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (chordTimer) clearTimeout(chordTimer);
    };
  }, [pendingChord, isShortcutsOpen, onShortcutAction]);

  // Viewport < 1024px: Show Small Screen Notice
  if (windowWidth < 1024) {
    return <SmallScreenNotice />;
  }

  // The one-primary rule: when dossier is active, dossier-confirm owns primary; otherwise detect-changes owns primary
  const activePrimaryOwner = hasActiveDossier ? 'dossier-confirm' : 'detect-changes';

  return (
    <PrimaryOwnerProvider activeOwnerId={activePrimaryOwner}>
      <div
        className="flex flex-col h-screen w-screen overflow-hidden select-none"
        style={{ background: 'var(--bg)', color: 'var(--ink)' }}
      >
        {/* Row 1: SLOT-00 Marquee (18px fixed) */}
        <Slot id="SLOT-00" h={18} className="shrink-0">
          {marqueeNode}
        </Slot>

        {/* Row 2: SLOT-01 Command Bar (56px fixed) */}
        <Slot id="SLOT-01" h={56} className="shrink-0">
          {headerNode}
        </Slot>

        {/* Row 3: SLOT-02 Temporal Bar (44px fixed) */}
        <Slot id="SLOT-02" h={44} className="shrink-0">
          {temporalBarNode}
        </Slot>

        {/* Row 4: Main Stage (flex) */}
        <div className="flex-1 flex overflow-hidden relative min-h-0">
          {/* SLOT-05: Icon Rail (56px fixed) */}
          <Slot id="SLOT-05" w={56} className="shrink-0 h-full">
            {railNode}
          </Slot>

          {/* Map Stage flex column (Well + Timeline) */}
          <main
            className="flex-1 flex flex-col relative overflow-hidden min-w-0"
            style={{ background: 'var(--well)' }}
          >
            {/* SLOT-10: Map Stage (flex well) */}
            <Slot id="SLOT-10" className="flex-1 relative overflow-hidden min-h-0">
              {stageNode}
            </Slot>

            {/* SLOT-30: Timeline Strip (72px fixed) */}
            <Slot id="SLOT-30" h={72} className="shrink-0">
              {timelineNode}
            </Slot>
          </main>

          {/* SLOT-20: Dossier Panel (380px fixed) */}
          {hasActiveDossier && dossierNode && (
            <Slot
              id="SLOT-20"
              w={windowWidth >= 1440 ? 380 : 340}
              className="shrink-0 h-full overflow-hidden"
            >
              {dossierNode}
            </Slot>
          )}
        </div>

        {/* Row 5: SLOT-40 Status Line (24px fixed) */}
        <Slot id="SLOT-40" h={24} className="shrink-0">
          {statusLineNode}
        </Slot>

        {/* Global Overlays & Modals */}
        {overlayNode}

        {/* Help / Shortcuts Modal */}
        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />
      </div>
    </PrimaryOwnerProvider>
  );
};
