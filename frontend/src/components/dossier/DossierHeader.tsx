import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import type { Evidence } from '../../lib/types';
import { getClassBadge } from '../../lib/palette';
import { Button } from '../ui/Button';
import { DOSSIER_COPY } from '../../lib/copy';

interface DossierHeaderProps {
  evidence: Evidence;
  decision: 'pending' | 'confirmed' | 'rejected';
  onClose?: () => void;
}

/**
 * DossierHeader — SLOT-20 (PRD 10 §4 / L4)
 * Header left: Target ID + copy button (shortcut C)
 * Header under ID: VERIFIED chip
 * Right: Close affordance
 */
export const DossierHeader: React.FC<DossierHeaderProps> = ({
  evidence,
  decision,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const { measurement } = evidence;
  const facilityName =
    measurement.measured_by?.replace(/^Semantic vectorisation, UTM 43N:\s*/, '') ||
    measurement.area_label;
  const badge = getClassBadge(facilityName || evidence.change_type);

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(evidence.change_object_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isConfirmed = decision === 'confirmed';
  const isRejected = decision === 'rejected';

  return (
    <div
      className="p-3 flex items-start justify-between shrink-0"
      style={{
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg)',
      }}
    >
      <div className="flex flex-col gap-1.5 min-w-0 pr-2">
        <div className="flex items-center gap-2">
          <span
            className="t-tag font-bold"
            style={{
              background: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.color}60`,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 9,
            }}
          >
            {badge.name}
          </span>
          <span
            className="t-tag font-bold"
            style={{
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 9,
              background: isConfirmed
                ? 'var(--confirmed-fill)'
                : isRejected
                ? 'var(--rejected-fill)'
                : 'var(--amber-wash)',
              border: `1px solid ${
                isConfirmed
                  ? 'var(--confirmed-border)'
                  : isRejected
                  ? 'var(--rejected-border)'
                  : 'var(--amber)'
              }`,
              color: isConfirmed
                ? 'var(--confirmed-text)'
                : isRejected
                ? 'var(--rejected-text)'
                : 'var(--amber)',
            }}
          >
            {isConfirmed
              ? DOSSIER_COPY.verified
              : isRejected
              ? DOSSIER_COPY.rejected
              : DOSSIER_COPY.pending}
          </span>
        </div>

        <div
          className="font-bold text-xs text-[var(--ink)] font-mono line-clamp-1"
          style={{ maxWidth: 280 }}
          title={facilityName}
        >
          {facilityName}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 10 }}>
            ID: {evidence.change_object_id.slice(0, 16)}…
          </span>
          <Button
            variant="icon-ghost"
            size="sm"
            onClick={handleCopyId}
            shortcut="C"
            title="Copy Target ID (C)"
            className="w-5 h-5 p-0.5"
          >
            {copied ? (
              <Check className="w-3 h-3 text-teal-400" />
            ) : (
              <Copy className="w-3 h-3 text-[var(--ink-3)]" />
            )}
          </Button>
        </div>
      </div>

      {onClose && (
        <Button
          variant="icon-ghost"
          size="sm"
          onClick={onClose}
          title="Close dossier (Esc)"
          className="shrink-0"
        >
          <X className="w-4 h-4 text-[var(--ink-3)]" />
        </Button>
      )}
    </div>
  );
};
