import React from 'react';
import { Button } from '../ui/Button';
import { DOSSIER_COPY } from '../../lib/copy';

interface DossierActionsFooterProps {
  onExport?: () => void;
  onReject?: () => void;
  onConfirm?: () => void;
  disabled?: boolean;
}

/**
 * DossierActionsFooter — SLOT-25 (PRD 10 §4 / L4)
 * Sticky bottom footer (reflow ban):
 * Left: EXPORT (secondary, shortcut E)
 * Middle: REJECT (danger-outline, shortcut ⌫)
 * Right: CONFIRM (primary, shortcut ⏎)
 */
export const DossierActionsFooter: React.FC<DossierActionsFooterProps> = ({
  onExport,
  onReject,
  onConfirm,
  disabled = false,
}) => {
  return (
    <div
      className="p-3 flex items-center justify-between shrink-0"
      style={{
        position: 'sticky',
        bottom: 0,
        background: 'var(--panel)',
        borderTop: '1px solid var(--line)',
        zIndex: 'var(--z-base)',
      }}
    >
      <Button
        variant="secondary"
        size="md"
        shortcut="E"
        onClick={onExport}
        disabled={disabled}
        title="Export Report (E)"
      >
        {DOSSIER_COPY.export}
      </Button>

      <div className="flex items-center gap-3">
        <Button
          variant="danger-outline"
          size="md"
          shortcut="⌫"
          onClick={onReject}
          disabled={disabled}
          title="Reject Target (Backspace)"
        >
          {DOSSIER_COPY.reject}
        </Button>

        <Button
          id="dossier-confirm"
          variant="primary"
          size="md"
          shortcut="⏎"
          onClick={onConfirm}
          disabled={disabled}
          title="Confirm Target (Enter)"
        >
          {DOSSIER_COPY.confirm}
        </Button>
      </div>
    </div>
  );
};
