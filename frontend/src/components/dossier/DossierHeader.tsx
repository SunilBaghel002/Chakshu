import React, { useState } from 'react';
import { X, Copy, Check, Fingerprint } from 'lucide-react';
import type { Evidence } from '../../lib/types';
import { getClassBadge, getSemanticTransition } from '../../lib/palette';
import { DOSSIER_COPY } from '../../lib/copy';

interface DossierHeaderProps {
  evidence: Evidence;
  decision: 'pending' | 'confirmed' | 'rejected';
  onClose?: () => void;
}

/**
 * DossierHeader — SLOT-20 (PRD 10 §4 / L4)
 * Displays facility title, semantic transition, verified status, and full copyable Vector ID.
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
  const transitionInfo = getSemanticTransition(facilityName, evidence.change_type);

  const shortCode = `CHK-${evidence.change_object_id.slice(0, 8).toUpperCase()}`;

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
      className="px-3.5 py-3 flex flex-col gap-2 shrink-0 w-full"
      style={{
        borderBottom: '1px solid var(--line)',
        background: 'linear-gradient(180deg, rgba(14, 22, 38, 0.95) 0%, var(--bg) 100%)',
      }}
    >
      {/* Top Row: Class Badge + Status Badge + Close Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="t-tag font-bold"
            style={{
              background: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.color}60`,
              padding: '2px 7px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 9,
              letterSpacing: '0.06em',
            }}
          >
            {badge.name}
          </span>
          <span
            className="t-tag font-bold"
            style={{
              padding: '2px 7px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 9,
              letterSpacing: '0.06em',
              background: isConfirmed
                ? 'var(--confirmed-fill)'
                : isRejected
                ? 'var(--rejected-fill)'
                : 'var(--cyan-wash)',
              border: `1px solid ${
                isConfirmed
                  ? 'var(--confirmed-border)'
                  : isRejected
                  ? 'var(--rejected-border)'
                  : 'var(--primary-cyan)'
              }`,
              color: isConfirmed
                ? 'var(--confirmed-text)'
                : isRejected
                ? 'var(--rejected-text)'
                : 'var(--primary-cyan)',
            }}
          >
            {isConfirmed
              ? DOSSIER_COPY.verified
              : isRejected
              ? DOSSIER_COPY.rejected
              : DOSSIER_COPY.pending}
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close dossier (Esc)"
            className="w-6 h-6 flex items-center justify-center rounded cursor-pointer transition-colors shrink-0"
            style={{
              color: 'var(--ink-3)',
              background: 'transparent',
              border: '1px solid transparent',
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Facility Title */}
      <div
        className="font-bold text-[var(--ink)] font-mono leading-snug"
        style={{ fontSize: 12.5 }}
        title={facilityName}
      >
        {facilityName}
      </div>

      {/* Semantic Transition Pill */}
      <div
        className="flex items-center gap-1.5 py-1 px-2 rounded t-mono w-fit max-w-full"
        style={{
          background: 'var(--cyan-wash)',
          border: '1px solid rgba(63, 169, 245, 0.25)',
          fontSize: 9.5,
        }}
      >
        <span className="truncate" style={{ color: 'var(--warning-orange)', fontWeight: 600 }}>
          {transitionInfo.fromClass}
        </span>
        <span style={{ color: 'var(--primary-cyan)', fontWeight: 700 }}>{'➔'}</span>
        <span className="truncate" style={{ color: 'var(--primary-cyan)', fontWeight: 700 }}>
          {transitionInfo.toClass}
        </span>
      </div>

      {/* Vector Object ID Bar — Full visibility + Copy button */}
      <div
        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded"
        style={{
          background: 'var(--panel-2)',
          border: '1px solid var(--line)',
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Fingerprint className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary-cyan)' }} />
          <span
            className="t-tag font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{
              background: 'rgba(63, 169, 245, 0.14)',
              color: 'var(--primary-cyan)',
              fontSize: 8.5,
            }}
          >
            {shortCode}
          </span>
          <span
            className="t-mono truncate"
            style={{ color: 'var(--ink-2)', fontSize: 9.5 }}
            title={evidence.change_object_id}
          >
            {`ID: ${evidence.change_object_id}`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyId}
          title="Copy Target ID (C)"
          className="flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-all shrink-0 t-mono"
          style={{
            background: copied ? 'rgba(16, 185, 129, 0.15)' : 'var(--panel)',
            color: copied ? 'var(--verified-green)' : 'var(--ink-2)',
            border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.4)' : 'var(--line-strong)'}`,
            fontSize: 8.5,
            fontWeight: 600,
          }}
        >
          {copied ? (
            <>
              <Check className="w-2.5 h-2.5" style={{ color: 'var(--verified-green)' }} />
              <span>{'COPIED'}</span>
            </>
          ) : (
            <>
              <Copy className="w-2.5 h-2.5" />
              <span>{'COPY ID'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
