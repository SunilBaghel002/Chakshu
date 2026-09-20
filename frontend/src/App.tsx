import React from 'react';
import { ToastProvider } from './components/ui/Toast';
import { ConsoleApp } from './components/layout/ConsoleApp';
import { ContactSheet } from './components/ContactSheet';
import { StatesContactSheet } from './components/StatesContactSheet';

/**
 * Chakshu — Main Application Entry Point
 * PRD 10 §1–§8 / PRD 12 §1–§9
 */
export const App: React.FC = () => {
  const isControlsRoute =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/controls' ||
      window.location.pathname === '/dev/controls' ||
      window.location.search.includes('view=controls'));

  const isStatesRoute =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/states' ||
      window.location.pathname === '/dev/states' ||
      window.location.search.includes('view=states'));

  if (isControlsRoute) {
    return <ContactSheet />;
  }

  if (isStatesRoute) {
    return <StatesContactSheet />;
  }

  return (
    <ToastProvider>
      <ConsoleApp />
    </ToastProvider>
  );
};
