import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Cpu, HardDrive, Lock, Unlock, Activity } from 'lucide-react';
import { Button } from './ui/Button';
import { ChakshuLogo } from './ui/ChakshuLogo';
import { ADMIN_COPY, LANDING_COPY } from '../lib/landingCopy';

/**
 * /admin — Sovereign Admin Panel & Telemetry Console
 * Specs: PRD 16 (D1–D9), PRD 9 v3 Sovereign Console & PRD 14 §S4/§S6
 */
export const AdminScreen: React.FC = () => {
  const navigate = useNavigate();
  // Role simulation: by default a fresh anonymous guest sees 401/403 notice per PRD 16 §10
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-mono select-none selection:bg-[var(--signal)] selection:text-[var(--bg)]">
      {/* 3px Sovereign Tricolour Rule */}
      <div className="tricolour-rule shrink-0" />

      {/* Top Header */}
      <header className="h-14 border-b border-[var(--line)] bg-[var(--panel)] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ChakshuLogo size={24} />
            <span className="text-lg font-bold tracking-wider text-[var(--signal)] font-sans">
              {LANDING_COPY.appNameDevanagari}
            </span>
            <span className="text-xs tracking-widest text-[var(--steel)] font-cond font-bold">
              {LANDING_COPY.appName}
            </span>
          </div>
          <span className="text-xs uppercase tracking-widest text-[var(--signal)] bg-[var(--signal-wash)] px-2 py-0.5 rounded-[var(--r-tag)] border border-[var(--signal)]">
            {ADMIN_COPY.adminBadge}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[var(--well)] border border-[var(--line)] rounded text-xs text-[var(--ink-2)]">
          <span className="w-2 h-2 rounded-full bg-[var(--signal)] animate-pulse" />
          <span>{ADMIN_COPY.restrictedHeader}</span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/console')}>
            {ADMIN_COPY.consoleLink}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 dot-grid overflow-y-auto">
        {!isAdmin ? (
          /* 401/403 Security Clearance Frame */
          <div className="w-full max-w-lg p-8 bg-[var(--panel)] border border-[var(--line-strong)] rounded-[var(--r-panel)] flex flex-col items-center gap-6 text-center shadow-2xl relative">
            <div className="absolute top-3 right-3">
              <Lock className="w-4 h-4 text-[var(--ink-3)]" />
            </div>

            <div className="w-14 h-14 rounded-full border-2 border-[var(--danger)] bg-[var(--danger-wash)] flex items-center justify-center text-[var(--danger)]">
              <ShieldAlert className="w-7 h-7 text-[var(--danger)]" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-[var(--signal)] font-bold">
                {ADMIN_COPY.clearanceLevel}
              </span>
              <h1 className="text-base font-bold tracking-wider text-[var(--danger)] uppercase">
                {ADMIN_COPY.forbiddenTitle}
              </h1>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed max-w-sm mx-auto">
                {ADMIN_COPY.forbiddenSub}
              </p>
            </div>

            <div className="w-full p-4 bg-[var(--well)] border border-[var(--line)] rounded-[var(--r-panel)] text-left space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--ink-3)]">
                <span>{ADMIN_COPY.noAdminPrefix}</span>
              </div>
              <div className="flex items-center justify-between bg-[var(--panel)] px-3 py-2 rounded border border-[var(--line-strong)]">
                <code className="text-xs text-[var(--signal)] font-mono select-all">
                  {ADMIN_COPY.noAdminCommand}
                </code>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/console')}
              >
                {ADMIN_COPY.returnBtn}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsAdmin(true)}
              >
                {ADMIN_COPY.simulateAccessBtn}
              </Button>
            </div>
          </div>
        ) : (
          /* Sovereign Telemetry & Health Dashboard */
          <div className="w-full max-w-5xl flex flex-col gap-6 py-6">
            {/* Title & Controls */}
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-[var(--success)]" />
                  <h1 className="text-lg font-bold tracking-wider text-[var(--ink)]">
                    {ADMIN_COPY.telemetryTitle}
                  </h1>
                </div>
                <p className="text-xs text-[var(--ink-2)] mt-1">
                  {ADMIN_COPY.telemetrySub}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAdmin(false)}
                >
                  {ADMIN_COPY.lockAccessBtn}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/console')}
                >
                  {ADMIN_COPY.consoleLink}
                </Button>
              </div>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-[var(--steel)]">
                  <span>{ADMIN_COPY.metricInference}</span>
                  <Cpu className="w-4 h-4 text-[var(--ion)]" />
                </div>
                <span className="text-sm font-bold text-[var(--ion)]">
                  {ADMIN_COPY.valInference}
                </span>
              </div>

              <div className="p-4 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-[var(--steel)]">
                  <span>{ADMIN_COPY.metricEgress}</span>
                  <ShieldCheck className="w-4 h-4 text-[var(--signal)]" />
                </div>
                <span className="text-sm font-bold text-[var(--signal)]">
                  {ADMIN_COPY.valEgress}
                </span>
              </div>

              <div className="p-4 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-[var(--steel)]">
                  <span>{ADMIN_COPY.metricLedger}</span>
                  <Activity className="w-4 h-4 text-[var(--success)]" />
                </div>
                <span className="text-sm font-bold text-[var(--success)]">
                  {ADMIN_COPY.valLedger}
                </span>
              </div>

              <div className="p-4 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-[var(--steel)]">
                  <span>{ADMIN_COPY.metricStorage}</span>
                  <HardDrive className="w-4 h-4 text-[var(--steel)]" />
                </div>
                <span className="text-sm font-bold text-[var(--ink)]">
                  {ADMIN_COPY.valStorage}
                </span>
              </div>
            </div>

            {/* Sub-system Status Table */}
            <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--steel)]">
                {ADMIN_COPY.serviceStatusHeader}
              </h2>
              <div className="flex flex-col divide-y divide-[var(--line)]">
                {[
                  ADMIN_COPY.serviceDetector,
                  ADMIN_COPY.serviceVlm,
                  ADMIN_COPY.servicePmtiles,
                  ADMIN_COPY.serviceGeoip,
                ].map((svc) => (
                  <div key={svc} className="py-3 flex items-center justify-between text-xs">
                    <span className="text-[var(--ink)]">{svc}</span>
                    <span className="flex items-center gap-2 text-[var(--success)] font-bold">
                      <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                      <span>{ADMIN_COPY.statusNominal}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
