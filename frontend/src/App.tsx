import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { ConsoleApp } from './components/layout/ConsoleApp';
import { ContactSheet } from './components/ContactSheet';
import { StatesContactSheet } from './components/StatesContactSheet';
import { LandingScreen } from './components/LandingScreen';
import { PrivacyScreen } from './components/PrivacyScreen';
import { AdminScreen } from './components/AdminScreen';

export const NotFoundScreen: React.FC = () => (
  <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col items-center justify-center p-6 font-mono select-none">
    <div className="p-6 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--r-panel)] flex flex-col items-center gap-4 text-center max-w-md">
      <h1 className="text-xl font-bold font-cond tracking-wider text-[var(--signal)]">
        404 · NOT FOUND
      </h1>
      <p className="text-xs text-[var(--ink-2)] leading-relaxed">
        The requested screen does not exist on this console.
      </p>
      <Link
        to="/console"
        className="px-4 py-2 bg-[var(--signal)] text-[var(--bg)] font-bold text-xs rounded hover:bg-[var(--signal-hot)] transition-colors cursor-pointer"
      >
        RETURN TO CONSOLE →
      </Link>
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

