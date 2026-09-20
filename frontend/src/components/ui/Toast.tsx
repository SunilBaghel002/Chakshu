import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Button } from './Button';
import { TOAST_COPY } from '../../lib/copy';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
  onUndo?: () => void;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

/**
 * Single Toast Item (PRD 11 §7 / K9)
 * 1-line text + optional UNDO ghost button.
 * Pauses auto-dismiss timer on mouse enter.
 */
const ToastCard: React.FC<{
  toast: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const duration = toast.duration || (toast.type === 'error' ? 8000 : 4000);

  React.useEffect(() => {
    if (isHovered) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, duration, isHovered, onDismiss]);

  return (
    <div
      role="alert"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded shadow-lg transition-all"
      style={{
        background: 'var(--panel)',
        border: `1px solid ${toast.type === 'error' ? 'var(--danger)' : 'var(--line-strong)'}`,
        color: 'var(--ink)',
        minWidth: 260,
        maxWidth: 360,
        animation: 'toast-in 160ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <span className="t-body text-xs line-clamp-1 flex-1 font-medium">
        {toast.message}
      </span>
      {toast.onUndo && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.onUndo?.();
            onDismiss(toast.id);
          }}
          className="shrink-0"
        >
          {TOAST_COPY.undo}
        </Button>
      )}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>): string => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newItem: ToastItem = { ...toast, id };
      // Stack max 3 (PRD 11 §7)
      setToasts((prev) => [...prev.slice(-2), newItem]);
      return id;
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      {/* Toast Stack: bottom-right, above SLOT-40 (24px) */}
      <div
        className="fixed bottom-8 right-4 flex flex-col-reverse gap-2 pointer-events-auto select-none"
        style={{ zIndex: 'var(--z-toast)' }}
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
