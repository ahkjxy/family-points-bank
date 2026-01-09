import { createContext, useCallback, useContext, useMemo, useState } from 'react';
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
  info: 'border-sky-500/20 text-sky-600 dark:text-sky-400',
  success: 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  error: 'border-rose-500/20 text-rose-600 dark:text-rose-400',
  loading: 'border-gray-500/20 text-gray-600 dark:text-gray-400',
};

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: (id: string) => void }) {
  const iconName = toast.type === 'success' ? 'check' : toast.type === 'error' ? 'penalty' : toast.type === 'info' ? 'info' : null;
  const accentColor = toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#F43F5E' : toast.type === 'info' ? '#0EA5E9' : '#64748B';

  return (
    <div className={`pointer-events-auto w-full max-w-xs sm:max-w-sm border-[1.5px] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.4)] rounded-[24px] px-5 py-4 flex gap-4 items-center bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-2xl animate-in slide-in-from-right-8 duration-500 ${toneClass[toast.type]}`}>
      <div className="shrink-0">
        {toast.type === 'loading' ? (
          <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center shadow-inner">
            <div className="w-5 h-5 border-3 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden group" style={{ backgroundColor: `${accentColor}15` }}>
            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-white to-transparent"></div>
            <Icon name={iconName || 'info'} size={20} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black tracking-tight text-gray-900 dark:text-white leading-tight">{toast.title}</p>
        {toast.description && <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed truncate">{toast.description}</p>}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
        aria-label="Close"
      >
        <Icon name="plus" size={20} className="rotate-45" />
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
