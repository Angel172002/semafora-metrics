'use client';

import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration?: number; // ms, 0 = permanente hasta cerrar
}

interface ToastState {
  toasts: Toast[];
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: number };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      // Máximo 5 toasts simultáneos
      return { toasts: [...state.toasts.slice(-4), action.toast] };
    case 'REMOVE':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  success: (message: string, duration?: number) => void;
  error:   (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info:    (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

  const add = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = nextId++;
    dispatch({ type: 'ADD', toast: { id, type, message, duration } });
  }, []);

  const remove = useCallback((id: number) => dispatch({ type: 'REMOVE', id }), []);

  const value: ToastContextValue = {
    success: (msg, dur) => add('success', msg, dur),
    error:   (msg, dur) => add('error',   msg, dur ?? 6000),
    warning: (msg, dur) => add('warning', msg, dur),
    info:    (msg, dur) => add('info',    msg, dur),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={state.toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ─── Toast item ───────────────────────────────────────────────────────────────

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; color: string; icon: React.ReactNode }> = {
  success: {
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.3)',
    color: '#4ade80',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.3)',
    color: '#f87171',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  warning: {
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.3)',
    color: '#fbbf24',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  info: {
    bg: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.3)',
    color: '#60a5fa',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const style = TOAST_STYLES[toast.type];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast.duration) return;
    timerRef.current = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm animate-slide-up"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.color,
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        maxWidth: 360,
        minWidth: 240,
      }}
    >
      <span className="shrink-0 mt-0.5">{style.icon}</span>
      <span className="flex-1 font-medium text-xs leading-relaxed">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{ color: style.color, opacity: 0.7, lineHeight: 1 }}
        className="hover:opacity-100 transition-opacity shrink-0"
      >
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed z-50 flex flex-col gap-2"
      style={{ bottom: 24, right: 24, pointerEvents: 'none' }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
