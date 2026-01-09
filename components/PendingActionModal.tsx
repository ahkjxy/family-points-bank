import { Icon } from './Icon';

interface PendingActionModalProps {
  pendingAction: { title: string; points: number; type: 'earn' | 'penalty' | 'redeem' } | null;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function PendingActionModal({ pendingAction, error, onCancel, onConfirm, loading = false }: PendingActionModalProps) {
  if (!pendingAction) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xl" onClick={loading ? undefined : onCancel}></div>
      <div className="bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-2xl w-full max-w-[420px] rounded-[56px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.4)] relative z-10 p-12 text-center border border-white/20 dark:border-white/5 animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center shadow-2xl rotate-12 transition-transform hover:rotate-0 duration-500 ${
            pendingAction.points > 0 
              ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white' 
              : 'bg-gradient-to-br from-rose-400 to-pink-600 text-white'
          }`}>
            <Icon name={pendingAction.type === 'redeem' ? 'reward' : 'plus'} size={48} />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <p className="text-[11px] font-black text-[#FF4D94] uppercase tracking-[0.4em]">Confirmation</p>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">确认执行该事项?</h3>
        </div>

        <div className="mt-8 p-8 rounded-[40px] bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">事项说明 / Description</p>
            <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">“{pendingAction.title}”</p>
          </div>
          
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent"></div>

          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">元气变动 / Impact</p>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-4xl font-black points-font tracking-tighter ${
                pendingAction.points > 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {pendingAction.points > 0 ? '+' : ''}{pendingAction.points}
              </span>
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest pt-2">Pts</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black leading-relaxed animate-in slide-in-from-top-2">
            ⚠️ {error}
          </div>
        )}

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className={`flex-1 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-[24px] transition-all ${loading ? 'opacity-0 scale-95 pointer-events-none' : ''}`}
          >
            我再想想
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-[1.5] py-5 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-12px_rgba(255,77,148,0.4)] hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center justify-center gap-3 ${
              loading ? 'opacity-80 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Icon name="plus" size={18} />
            )}
            {loading ? '正在同步云端...' : '确认录入'}
          </button>
        </div>
      </div>
    </div>
  );
}
