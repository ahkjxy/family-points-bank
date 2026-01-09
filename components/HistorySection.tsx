import React, { useEffect, useMemo, useState } from 'react';
import { Transaction } from '../types';
import { formatDateTime } from '../utils/datetime';
import { useToast } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';

type HistoryTab = 'all' | 'earn' | 'penalty' | 'redeem';
const TAB_LABELS: Record<HistoryTab, string> = {
  all: '全部账单',
  earn: '赚取',
  penalty: '扣减',
  redeem: '兑换',
};

interface HistorySectionProps {
  history: Transaction[];
  isAdmin?: boolean;
  onDeleteTransactions?: (ids: string[]) => Promise<boolean>;
}

export function HistorySection({ history, isAdmin = false, onDeleteTransactions }: HistorySectionProps) {
  const { showToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    tone?: 'primary' | 'danger';
    onConfirm: () => void;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<HistoryTab>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = isAdmin && typeof onDeleteTransactions === 'function';
  const closeConfirm = () => setConfirmDialog(null);

  const filtered = useMemo(() => {
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    if (activeTab === 'all') return sorted;
    return sorted.filter(h => h.type === activeTab);
  }, [activeTab, history]);

  const stats = useMemo(() => {
    const total = history.length;
    const earn = history.filter(h => h.type === 'earn');
    const penalty = history.filter(h => h.type === 'penalty');
    const redeem = history.filter(h => h.type === 'redeem');
    const now = Date.now();
    const week = history.filter(h => now - h.timestamp <= 7 * 24 * 60 * 60 * 1000).length;
    const sum = (list: Transaction[]) => list.reduce((s, h) => s + h.points, 0);
    return {
      total,
      week,
      earnCount: earn.length,
      earnPoints: sum(earn),
      penaltyCount: penalty.length,
      penaltyPoints: sum(penalty),
      redeemCount: redeem.length,
      redeemPoints: sum(redeem),
      net: sum(history),
    };
  }, [history]);

  const renderTypeBadge = (type: HistoryTab) => {
    const map: Record<HistoryTab, { label: string; cls: string; icon: string }> = {
      earn: { label: 'Earned', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-transparent', icon: 'plus' },
      penalty: { label: 'Penalty', cls: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-transparent', icon: 'penalty' },
      redeem: { label: 'Redeem', cls: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-transparent', icon: 'reward' },
      all: { label: 'Bill', cls: 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-white/5 dark:text-gray-400 dark:border-transparent', icon: 'history' },
    };
    const item = map[type];
    return <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${item.cls}`}>{item.label}</span>;
  };

  useEffect(() => {
    setSelectedIds((prev: Set<string>) => {
      const next = new Set<string>();
      filtered.forEach((h: Transaction) => {
        if (prev.has(h.id)) next.add(h.id);
      });
      return next;
    });
  }, [filtered]);

  const toggleSelect = (id: string) => {
    if (!canDelete) return;
    setSelectedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!canDelete) return;
    setSelectedIds(new Set(filtered.map((h: Transaction) => h.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBatchDelete = async () => {
    if (!canDelete || !onDeleteTransactions) return;
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);
    setConfirmDialog({
      title: `删除选中的 ${idsToDelete.length} 条账单？`,
      description: '删除后会同步更新余额，且不可恢复。',
      confirmText: '确认删除',
      tone: 'danger',
      onConfirm: async () => {
        setIsDeleting(true);
        const ok = await onDeleteTransactions(idsToDelete);
        if (ok) {
          setSelectedIds(new Set());
          showToast({ type: 'success', title: '账单已成功清理' });
        }
        setIsDeleting(false);
        closeConfirm();
      },
    });
  };

  const selectedCount = selectedIds.size;
  const allSelected = filtered.length > 0 && selectedCount === filtered.length;

  return (
    <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Refined Stats Header */}
      <div className="relative overflow-hidden rounded-[40px] bg-white dark:bg-[#0F172A] border border-gray-100 dark:border-white/5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] p-8 lg:p-10 mobile-card">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-gradient-to-br from-[#7C4DFF]/10 to-[#FF4D94]/10 blur-[60px] rounded-full"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4D94]/10 text-[#FF4D94] text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D94] animate-pulse"></div>
              Transaction Logs
            </div>
            <h3 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-2">能量收支明细</h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium">追踪每一份元气能量的流向，见证成长的轨迹。</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
            {[
              { label: '全部记录', val: stats.total, color: 'text-gray-900 dark:text-white' },
              { label: '本周活跃', val: stats.week, color: 'text-blue-500' },
              { label: '净能量', val: `${stats.net > 0 ? '+' : ''}${stats.net}`, color: stats.net >= 0 ? 'text-emerald-500' : 'text-rose-500' },
              { label: '兑换数', val: stats.redeemCount, color: 'text-[#7C4DFF]' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50/50 dark:bg-white/5 p-4 rounded-[24px] border border-gray-100 dark:border-transparent text-center">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 truncate">{s.label}</p>
                <p className={`text-xl font-black points-font ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-10 flex flex-wrap gap-2.5 p-1.5 bg-gray-100/50 dark:bg-white/5 rounded-[28px] border border-gray-100/50 dark:border-transparent">
          {(['all', 'earn', 'penalty', 'redeem'] as HistoryTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[100px] flex items-center justify-center px-6 py-3.5 rounded-[22px] text-sm font-black transition-all duration-300 ${
                activeTab === tab 
                  ? 'bg-white dark:bg-gray-800 text-[#FF4D94] shadow-md scale-[1.02]' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Admin Action Bar */}
      {canDelete && selectedCount > 0 && (
        <div className="flex items-center justify-between px-8 py-4 bg-[#1A1A1A] dark:bg-white text-white dark:text-gray-900 rounded-[24px] shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-[#FF4D94] flex items-center justify-center text-xs font-black">{selectedCount}</div>
            <span className="text-sm font-black uppercase tracking-widest">Selected Transactions</span>
          </div>
          <div className="flex gap-3">
            <button onClick={clearSelection} className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/20 dark:border-gray-200 hover:bg-white/10 transition-all">Cancel</button>
            <button 
              onClick={handleBatchDelete} 
              disabled={isDeleting}
              className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/30"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      )}

      {/* Timeline List */}
      <div className="space-y-4">
        {filtered.map((h: Transaction, idx: number) => (
          <div 
            key={h.id} 
            onClick={() => canDelete && toggleSelect(h.id)}
            className={`group relative flex items-center gap-6 p-6 rounded-[32px] bg-white dark:bg-[#0F172A] border transition-all duration-300 cursor-pointer ${
              selectedIds.has(h.id) 
                ? 'border-[#FF4D94] shadow-[0_15px_30px_-10px_rgba(255,77,148,0.2)] scale-[1.01]' 
                : 'border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 shadow-sm'
            }`}
          >
            {/* Type Icon */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0 ${
              h.type === 'earn' ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10' : 
              h.type === 'penalty' ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10' : 
              'bg-blue-50 text-blue-500 dark:bg-blue-500/10'
            }`}>
              <Icon name={h.type === 'redeem' ? 'reward' : h.type === 'penalty' ? 'penalty' : 'plus'} size={24} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                {renderTypeBadge(h.type as HistoryTab)}
                <span className="text-[10px] font-bold text-gray-400 uppercase tabular-nums tracking-widest">{formatDateTime(h.timestamp)}</span>
              </div>
              <h4 className="text-lg font-black text-gray-900 dark:text-white truncate pr-4">{h.title}</h4>
            </div>

            {/* Points */}
            <div className="text-right shrink-0">
              <p className={`text-2xl font-black points-font ${h.points > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {h.points > 0 ? '+' : ''}{h.points}
              </p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vitality Energy</p>
            </div>

            {/* Selection Indicator (Admin) */}
            {canDelete && (
              <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                selectedIds.has(h.id) ? 'bg-[#FF4D94] border-[#FF4D94]' : 'bg-transparent border-gray-200 dark:border-white/10 opacity-0 group-hover:opacity-100'
              }`}>
                {selectedIds.has(h.id) && <div className="w-2 h-2 rounded-full bg-white shadow-sm"></div>}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center text-center gap-4 bg-white/50 dark:bg-white/5 rounded-[40px] border border-dashed border-gray-200 dark:border-white/10">
            <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-4xl opacity-50">📑</div>
            <p className="text-lg font-black text-gray-400 uppercase tracking-widest">目前没有任何账单记录</p>
          </div>
        )}
      </div>

      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          tone={confirmDialog.tone}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}
