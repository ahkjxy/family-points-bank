import { Icon } from './Icon';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  const confirmColor = tone === 'danger'
    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30'
    : 'bg-[#FF4D94] hover:brightness-105 text-white shadow-lg shadow-[#FF4D94]/30';

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-xl" onClick={onCancel}></div>
      <div className="relative w-full max-w-[420px] bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-2xl rounded-[48px] border border-white/20 dark:border-white/5 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.4)] p-10 space-y-8 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center shadow-xl ${
            tone === 'danger' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-[#FF4D94]/5 text-[#FF4D94]'
          }`}>
            <Icon name="warning" size={36} />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">System Action</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h3>
            {description && (
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed px-4">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-4 rounded-[20px] bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-black text-[11px] uppercase tracking-widest border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-[1.5] py-4 rounded-[20px] font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${confirmColor}`}
          >
            <Icon name="plus" size={16} className="rotate-45" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
