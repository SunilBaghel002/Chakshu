import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { ConsoleApp } from './components/layout/ConsoleApp';
import { ContactSheet } from './components/ContactSheet';
import { StatesContactSheet } from './components/StatesContactSheet';
import { LandingScreen } from './components/LandingScreen';
import { PrivacyScreen } from './components/PrivacyScreen';
import { AdminScreen } from './components/AdminScreen';

import { ChakshuLogo } from './components/ui/ChakshuLogo';

export const NotFoundScreen: React.FC = () => (
  <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-mono select-none">
    <div className="tricolour-rule shrink-0" />
    <div className="flex-1 flex flex-col items-center justify-center p-6 dot-grid">
      <div className="p-8 bg-[var(--panel)] border border-[var(--line-strong)] rounded-[var(--r-panel)] flex flex-col items-center gap-5 text-center max-w-md shadow-2xl">
        <ChakshuLogo size={36} />
        <div>
          <span className="text-xs uppercase tracking-widest text-[var(--steel)] font-bold">
            {'TARGET COORDINATES UNRESOLVED'}
          </span>
          <h1 className="text-2xl font-bold font-cond tracking-wider text-[var(--signal)] mt-1">
            {'404 · NOT FOUND'}
          </h1>
        </div>
        <p className="text-xs text-[var(--ink-2)] leading-relaxed">
          {'The requested screen does not exist on this sovereign console. Please return to active operations.'}
        </p>
        <Link
          to="/console"
          className="px-5 py-2.5 bg-[var(--signal)] text-[var(--bg)] font-bold text-xs rounded hover:bg-[var(--signal-hot)] transition-colors cursor-pointer shadow-lg"
        >
          {'RETURN TO CONSOLE →'}
        </Link>
      </div>
    </div>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingScreen />} />
      <Route
        path="/console"
        element={
          <ToastProvider>
            <ConsoleApp />
          </ToastProvider>
        }
      />
      <Route path="/admin" element={<AdminScreen />} />
      <Route path="/privacy" element={<PrivacyScreen />} />
      <Route path="/controls" element={<ContactSheet />} />
      <Route path="/dev/controls" element={<ContactSheet />} />
      <Route path="/states" element={<StatesContactSheet />} />
      <Route path="/dev/states" element={<StatesContactSheet />} />
      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
  );
};

/**
 * Chakshu — Main Application Entry Point
 * Routing: PRD 5 §1.2 & PRD 7 Task 8.0 (react-router-dom v7)
 */
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

