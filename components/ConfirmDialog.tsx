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
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-gray-900/45 backdrop-blur-sm" onClick={onCancel}></div>
      <div className="relative w-full max-w-[400px] bg-white rounded-[28px] border border-gray-100 shadow-2xl p-8 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner">
            <Icon name="warning" size={22} />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-lg font-black text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-500 leading-relaxed">{description}</p>}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-gray-50 text-gray-500 font-bold text-sm border border-gray-200 hover:bg-gray-100 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${confirmColor} active:scale-95`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
