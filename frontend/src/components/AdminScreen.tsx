import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { ADMIN_COPY } from '../lib/landingCopy';

/**
 * /admin — Sovereign Admin Panel & Telemetry Console
 * Specs: PRD 16 (D1–D9) & PRD 14 §S4/§S6
 */
export const AdminScreen: React.FC = () => {
  const navigate = useNavigate();
  // Role simulation: by default a fresh anonymous guest sees 401/403 notice per PRD 16 §10
  const [isAdmin] = useState(false);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col items-center justify-center p-6 font-mono select-none">
        <div className="w-full max-w-md p-6 bg-[var(--panel)] border border-[var(--danger)] rounded-[var(--r-panel)] flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 rounded-full border border-[var(--danger)] bg-[var(--danger)]/10 flex items-center justify-center text-[var(--danger)] text-lg font-bold">
            {'!'}
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-[var(--danger)] uppercase">
              {ADMIN_COPY.forbiddenTitle}
            </h1>
            <p className="text-xs text-[var(--ink-2)] mt-2 leading-relaxed">
              {ADMIN_COPY.forbiddenSub}
            </p>
            <p style={{ fontSize: 11 }} className="text-[var(--ink-3)] mt-1">
              <span>{ADMIN_COPY.noAdminPrefix}</span>{' '}
              <code className="text-[var(--signal)]">{ADMIN_COPY.noAdminCommand}</code>
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/console')}
            >
              {ADMIN_COPY.returnBtn}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-6 font-mono">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-wider text-[var(--signal)] font-sans">
              {'चक्षु'}
            </span>
            <span className="text-xs uppercase tracking-widest text-[var(--signal)] bg-[var(--signal-wash)] px-2 py-0.5 rounded-[var(--r-tag)] border border-[var(--signal)]">
              {ADMIN_COPY.adminBadge}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/console')}>
            {ADMIN_COPY.consoleLink}
          </Button>
        </div>
      </div>
    </div>
  );
};
