import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Icon } from './Icon';

export type ToastType = 'info' | 'success' | 'error' | 'loading';

export interface ToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number; // 0 = persist until手动关闭
}

interface ToastItem extends Required<Pick<ToastOptions, 'title'>> {
  id: string;
  type: ToastType;
  description?: string;
  duration: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const genId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `toast-${Date.now()}-${Math.random()}`);

const toneClass: Record<ToastType, string> = {
  info: 'bg-sky-100 text-sky-700 border-sky-200 dark:border-white/10 dark:bg-sky-900/50 dark:text-sky-100',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:border-white/10 dark:bg-emerald-900/40 dark:text-emerald-100',
  error: 'bg-rose-100 text-rose-700 border-rose-200 dark:border-white/10 dark:bg-rose-900/40 dark:text-rose-100',
  loading: 'bg-gray-100 text-gray-700 border-gray-200 dark:border-white/10 dark:bg-gray-900/50 dark:text-gray-100',
};

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: (id: string) => void }) {
  const iconName = toast.type === 'success' ? 'check' : toast.type === 'error' ? 'penalty' : toast.type === 'info' ? 'info' : null;
  return (
    <div className={`pointer-events-auto w-full max-w-xs sm:max-w-sm border shadow-lg shadow-black/5 dark:shadow-black/30 rounded-2xl px-4 py-3 flex gap-3 items-start bg-white/95 dark:bg-[#0F172A]/90 ${toneClass[toast.type]}`}>
      <div className="mt-1">
        {toast.type === 'loading' ? (
          <span className="w-9 h-9 rounded-xl border-2 border-current border-t-transparent animate-spin inline-flex items-center justify-center"></span>
        ) : (
          <span className="w-9 h-9 rounded-xl bg-white/70 dark:bg-white/5 inline-flex items-center justify-center shadow-inner">
            <Icon name={iconName || 'info'} size={16} />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{toast.title}</p>
        {toast.description && <p className="text-xs text-gray-600 dark:text-gray-200/80 mt-1 leading-snug">{toast.description}</p>}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="text-xs font-bold text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-100 transition"
        aria-label="关闭通知"
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const { title, description, type = 'info' } = options;
    const duration = options.duration === undefined ? (type === 'loading' ? 0 : 2600) : options.duration;
    const id = genId();
    setToasts(prev => [...prev, { id, title, description, type, duration }]);
    if (duration > 0) {
      window.setTimeout(() => dismissToast(id), duration);
    }
    return id;
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      <div className="fixed top-4 right-4 z-[999] flex flex-col gap-3 items-end pointer-events-none">
        {toasts.map(toast => (
          <ToastCard key={toast.id} toast={toast} onClose={dismissToast} />
        ))}
      </div>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
