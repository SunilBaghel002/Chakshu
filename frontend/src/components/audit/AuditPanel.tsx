import React from 'react';
import { ShieldCheck, FileCheck, Cpu, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { AUDIT_PANEL_COPY } from '../../lib/copy';

interface AuditPanelProps {
  onExportReport?: () => void;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({ onExportReport }) => {
  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden bg-[var(--panel)]">
      {/* Header */}
      <div className="h-10 px-4 border-b border-[var(--line)] flex items-center justify-between shrink-0 bg-[var(--bg)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--signal)]" />
          <span className="text-xs font-bold font-cond tracking-wider text-[var(--ink)]">
            {AUDIT_PANEL_COPY.headerTitle}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--signal-wash)] text-[var(--signal)] t-tag">
          <span>{AUDIT_PANEL_COPY.badgeVerified}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
        {/* Merkle Root / Tamper Evidence */}
        <div className="p-3 bg-[var(--well)] border border-[var(--line)] rounded-[var(--r-panel)] space-y-2">
          <div className="flex items-center justify-between t-tag">
            <span className="text-[var(--ink-2)]">{AUDIT_PANEL_COPY.cryptoChain}</span>
            <span className="text-[var(--signal)] font-bold">{AUDIT_PANEL_COPY.merkleRoot}</span>
          </div>
          <div className="t-tag text-[var(--ink-3)] font-mono break-all bg-[var(--panel)] p-2 rounded border border-[var(--line)]">
            {AUDIT_PANEL_COPY.merkleHash}
          </div>
          <div className="t-tag text-[var(--ink-2)]">
            {AUDIT_PANEL_COPY.auditSummary}
          </div>
        </div>

        {/* Decisions Log */}
        <div className="space-y-2">
          <div className="t-tag font-bold text-[var(--ink-2)] tracking-wide flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-[var(--signal)]" />
            <span>{AUDIT_PANEL_COPY.analystDecisionsTitle}</span>
          </div>
          <div className="space-y-1.5">
            <div className="p-2.5 bg-[var(--well)] border border-[var(--line)] rounded flex items-center justify-between">
              <div>
                <div className="font-bold text-[var(--ink)]">chg_jewar_crop_001</div>
                <div className="t-tag text-[var(--ink-3)]">Runway A Earthworks · 475.83 ha</div>
              </div>
              <span className="px-2 py-0.5 rounded t-tag font-bold bg-[var(--signal-wash)] text-[var(--signal)]">
                {AUDIT_PANEL_COPY.confirmed}
              </span>
            </div>
            <div className="p-2.5 bg-[var(--well)] border border-[var(--line)] rounded flex items-center justify-between">
              <div>
                <div className="font-bold text-[var(--ink)]">chg_jewar_crop_002</div>
                <div className="t-tag text-[var(--ink-3)]">Terminal Perimeter Foundation · 12.40 ha</div>
              </div>
              <span className="px-2 py-0.5 rounded t-tag font-bold bg-[var(--signal-wash)] text-[var(--signal)]">
                {AUDIT_PANEL_COPY.confirmed}
              </span>
            </div>
            <div className="p-2.5 bg-[var(--well)] border border-[var(--line)] rounded flex items-center justify-between">
              <div>
                <div className="font-bold text-[var(--ink)]">chg_jewar_crop_003</div>
                <div className="t-tag text-[var(--ink-3)]">Transient Agrarian Furrow · 0.85 ha</div>
              </div>
              <span className="px-2 py-0.5 rounded t-tag font-bold bg-[var(--signal-wash)] text-[var(--danger)]">
                {AUDIT_PANEL_COPY.rejected}
              </span>
            </div>
          </div>
        </div>

        {/* Model Bill of Materials */}
        <div className="space-y-2">
          <div className="t-tag font-bold text-[var(--ink-2)] tracking-wide flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[var(--signal)]" />
            <span>{AUDIT_PANEL_COPY.modelBomTitle}</span>
          </div>
          <div className="p-2.5 bg-[var(--well)] border border-[var(--line)] rounded space-y-2 t-tag">
            <div className="flex justify-between border-b border-[var(--line)] pb-1.5">
              <span className="text-[var(--ink-2)]">{AUDIT_PANEL_COPY.model1}</span>
              <span className="text-[var(--ink)]">{AUDIT_PANEL_COPY.licence1}</span>
            </div>
            <div className="flex justify-between border-b border-[var(--line)] pb-1.5">
              <span className="text-[var(--ink-2)]">{AUDIT_PANEL_COPY.model2}</span>
              <span className="text-[var(--ink)]">{AUDIT_PANEL_COPY.licence2}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ink-2)]">{AUDIT_PANEL_COPY.model3}</span>
              <span className="text-[var(--ink)]">{AUDIT_PANEL_COPY.licence3}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--line)] bg-[var(--bg)] flex items-center justify-between shrink-0">
        <span className="t-tag text-[var(--ink-3)] font-mono">
          {AUDIT_PANEL_COPY.footerSigned}
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={onExportReport}
          id="audit-export-primary"
        >
          <Download className="w-3.5 h-3.5 mr-1.5 inline" />
          <span>{AUDIT_PANEL_COPY.exportBtn}</span>
        </Button>
      </div>
    </div>
  );
};
