/**
 * Error and Clearance states for Admin Screen.
 * Specs: PRD 16 D8, PRD 14 §4
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { ADMIN_PANEL_COPY } from '../../lib/landingCopy';
import { loginAdmin } from '../../lib/api';

export const UnconfiguredScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-mono select-none">
      <div className="tricolour-rule shrink-0" />
      <div className="flex-1 flex flex-col items-center justify-center p-6 dot-grid">
        <div className="w-full max-w-lg p-8 bg-[var(--panel)] border border-[var(--warn)] rounded-[var(--r-panel)] text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--warn-wash)] border border-[var(--warn)] flex items-center justify-center text-[var(--warn)]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-sm font-bold uppercase tracking-wider text-[var(--warn)]">
              {ADMIN_PANEL_COPY.noAdminTitle}
            </h1>
            <p className="text-xs text-[var(--ink-2)]">
              {ADMIN_PANEL_COPY.noAdminSub}
            </p>
          </div>
          <div className="p-3 bg-[var(--well)] border border-[var(--line)] rounded text-left font-mono text-xs text-[var(--signal)] select-all">
            {'python scripts/make_admin.py create admin@chakshu.internal'}
          </div>
          <Button variant="secondary" size="md" onClick={() => navigate('/console')}>
            {ADMIN_PANEL_COPY.returnToConsole}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ClearanceScreen: React.FC<{
  authError: string | null;
  onLoginSuccess?: () => void;
}> = ({ authError, onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('admin@chakshu.internal');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (email || 'admin@chakshu.internal').trim();
    const targetPassword = password.trim();
    if (!targetPassword) {
      setErrorMsg('PLEASE ENTER PASSWORD');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await loginAdmin(targetEmail, targetPassword);
      if (res.kind === 'ok' && res.data.role === 'admin') {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          window.location.reload();
        }
      } else {
        setErrorMsg('INVALID EMAIL OR PASSWORD');
      }
    } catch {
      setErrorMsg('LOGIN FAILED · SERVER UNREACHABLE');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-mono select-none">
      <div className="tricolour-rule shrink-0" />
      <div className="flex-1 flex flex-col items-center justify-center p-6 dot-grid">
        <div className="w-full max-w-lg p-6 bg-[var(--panel)] border border-[var(--danger)] rounded-[var(--r-panel)] text-center space-y-4 shadow-2xl relative">
          <div className="absolute top-3 right-3 text-[var(--ink-3)]"><Lock className="w-4 h-4" /></div>
          <div className="w-10 h-10 mx-auto rounded-full bg-[var(--danger-wash)] border border-[var(--danger)] flex items-center justify-center text-[var(--danger)]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-widest text-[var(--signal)] font-bold">{ADMIN_PANEL_COPY.clearanceRequired}</span>
            <h1 className="text-sm font-bold uppercase tracking-wider text-[var(--danger)]">
              {authError === 'ROLE_REQUIRED' ? ADMIN_PANEL_COPY.forbiddenAdmin : ADMIN_PANEL_COPY.authRequired}
            </h1>
            <p className="text-xs text-[var(--ink-2)] max-w-xs mx-auto">
              {ADMIN_PANEL_COPY.forbiddenSub}
            </p>
          </div>

          {/* ADMIN LOGIN FORM */}
          <form onSubmit={handleLogin} className="p-4 bg-[var(--well)] border border-[var(--line)] rounded space-y-3 text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
              {'ADMIN LOGIN'}
            </div>
            {errorMsg && (
              <div className="p-2 bg-[var(--danger-wash)] border border-[var(--danger)] rounded text-xs text-[var(--danger)] font-mono">
                {errorMsg}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs text-[var(--ink-3)] font-mono block">{'EMAIL'}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@chakshu.internal"
                className="w-full bg-[var(--panel)] border border-[var(--line)] rounded px-2.5 py-1.5 text-xs font-mono text-[var(--ink)] placeholder-[var(--ink-3)] outline-none focus:border-[var(--signal)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--ink-3)] font-mono block">{'PASSWORD'}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[var(--panel)] border border-[var(--line)] rounded px-2.5 py-1.5 text-xs font-mono text-[var(--ink)] placeholder-[var(--ink-3)] outline-none focus:border-[var(--signal)]"
              />
            </div>
            <div className="pt-1 flex justify-end">
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={submitting}
                onClick={handleLogin}
                id="admin-login-submit-btn"
              >
                {submitting ? 'AUTHENTICATING…' : 'SIGN IN'}
              </Button>
            </div>
          </form>

          {/* CLI ELEVATION FALLBACK */}
          <div className="p-3 bg-[var(--well)] border border-[var(--line)] rounded text-left text-xs space-y-1">
            <div className="text-xs text-[var(--ink-3)] font-mono">{ADMIN_PANEL_COPY.elevateTitle}</div>
            <code className="text-xs text-[var(--signal)] font-mono select-all block">
              {ADMIN_PANEL_COPY.elevateCmd}
            </code>
          </div>

          <div className="flex gap-2 justify-center">
            <Button variant="secondary" size="md" onClick={() => navigate('/console')}>
              {ADMIN_PANEL_COPY.returnToConsole}
            </Button>
            <Button variant="ghost" size="md" onClick={() => window.location.reload()}>
              {ADMIN_PANEL_COPY.retry}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
