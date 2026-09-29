import React from 'react';
import { Button } from '../ui/Button';
import { DOSSIER_COPY } from '../../lib/copy';

interface DossierActionsFooterProps {
  onExport?: () => void;
  onReject?: () => void;
  onConfirm?: () => void;
  onOpenAsk?: () => void;
  disabled?: boolean;
}

/**
 * DossierActionsFooter — SLOT-25
 * Left-anchored EXPORT button + Dual decision buttons: REJECT [R] and CONFIRM [C]
 * Plus copilot link wired to open the Ask view
 */
export const DossierActionsFooter: React.FC<DossierActionsFooterProps> = ({
  onExport,
  onReject,
  onConfirm,
  onOpenAsk,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2 p-3 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="md"
          onClick={onExport}
          disabled={disabled}
          title="Export Dossier (E)"
        >
          {DOSSIER_COPY.export}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="danger-outline"
            size="md"
            shortcut="R"
            onClick={onReject}
            disabled={disabled}
            title="Reject Target (R)"
            className="font-bold"
          >
            {DOSSIER_COPY.reject}
          </Button>

          <Button
            id="dossier-confirm"
            variant="primary"
            size="md"
            shortcut="C"
            onClick={onConfirm}
            disabled={disabled}
            title="Confirm Target (C)"
            className="font-bold"
            style={{
              background: 'var(--primary-cyan)',
              color: 'var(--tricolour-white)',
            }}
          >
            {DOSSIER_COPY.confirm}
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenAsk}
        className="w-full text-center cursor-pointer t-mono py-1 rounded transition-colors hover:bg-[var(--panel-2)]"
        style={{
          color: 'var(--primary-cyan)',
          fontSize: 10,
          background: 'none',
          border: 'none',
        }}
      >
        {'💬 Ask Chakshu copilot about this vector →'}
      </button>
    </div>
  );
};
