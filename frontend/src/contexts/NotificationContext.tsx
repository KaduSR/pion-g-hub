import { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: number;
  type: ToastType;
  message: string;
}

interface NotificationContextValue {
  notify: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
  toasts: ToastData[];
  dismiss: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: '#ecfdf5', border: '#6ee7b7', color: '#065f46', icon: '✓' },
  error: { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: '✕' },
  warning: { bg: '#fffbeb', border: '#fcd34d', color: '#92400e', icon: '⚠' },
  info: { bg: '#eff6ff', border: '#93c5fd', color: '#1e40af', icon: 'ℹ' },
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idRef = useRef(0);

  const notify = useCallback(
    (type: ToastType, message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, AUTO_DISMISS_MS);
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify: { success: (m) => notify('success', m), error: (m) => notify('error', m), warning: (m) => notify('warning', m), info: (m) => notify('info', m) }, toasts, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotify deve ser usado dentro de NotificationProvider');
  return ctx.notify;
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;

  return (
    <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '380px', width: '100%' }}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
  const style = TYPE_STYLES[toast.type];

  const handleStop = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.dataset.dismiss === '1') {
      onDismiss(toast.id);
    }
  };

  return (
    <div
      data-dismiss="1"
      onClick={handleStop}
      style={{
        background: style.bg,
        borderLeft: `4px solid ${style.border}`,
        color: style.color,
        padding: '0.875rem 1rem',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        animation: 'toast-slide-in 0.25s ease-out',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}>{style.icon}</span>
      <span style={{ flex: 1, lineHeight: '1.4' }}>{toast.message}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        style={{ background: 'none', border: 'none', color: style.color, cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: 0 }}
        aria-label="Fechar notificacao"
      >
        ×
      </button>
    </div>
  );
}
