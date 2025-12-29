import React from 'react';
import { Icon } from './Icon';

interface PendingActionModalProps {
  pendingAction: { title: string; points: number; type: 'earn' | 'penalty' | 'redeem' } | null;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PendingActionModal({ pendingAction, error, onCancel, onConfirm }: PendingActionModalProps) {
  if (!pendingAction) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md" onClick={onCancel}></div>
      <div className="bg-white w-full max-w-[380px] rounded-[48px] shadow-2xl relative z-10 p-12 text-center border border-gray-100 animate-in zoom-in-95 duration-200">
        <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-xl ${pendingAction.points > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
          <Icon name={pendingAction.type === 'redeem' ? 'reward' : 'plus'} size={36} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 font-display">确认执行?</h3>
        <p className="text-xs text-gray-500 font-bold px-4 leading-relaxed">
          事项说明：<span className="text-gray-900 font-bold block my-2 text-sm">"{pendingAction.title}"</span>
          元气值变动：<span className={`${pendingAction.points > 0 ? 'text-emerald-500' : 'text-rose-500'} font-black text-xl tabular-nums`}>{pendingAction.points > 0 ? '+' : ''}{pendingAction.points} PTS</span>
        </p>
        {error && (
          <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-3 font-semibold">
            {error}
          </div>
        )}
        <div className="mt-10 flex gap-4">
          <button onClick={onCancel} className="flex-1 py-4 bg-gray-50 rounded-2xl text-[10px] font-bold text-gray-400 hover:bg-gray-100 transition-all">取消</button>
          <button onClick={onConfirm} className="flex-1 py-4 btn-pop rounded-2xl text-[10px] font-bold tracking-widest shadow-xl">确认录入</button>
        </div>
      </div>
    </div>
  );
}
