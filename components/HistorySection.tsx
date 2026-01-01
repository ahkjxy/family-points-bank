import React, { useEffect, useMemo, useState } from 'react';
import { Transaction } from '../types';
import { formatDateTime } from '../utils/datetime';
import { useToast } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';

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
    const map: Record<HistoryTab, { label: string; cls: string }> = {
      earn: { label: '赚取', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
      penalty: { label: '扣减', cls: 'bg-rose-50 text-rose-600 border-rose-100' },
      redeem: { label: '兑换', cls: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
      all: { label: '账单', cls: 'bg-gray-50 text-gray-600 border-gray-100' },
    };
    const item = map[type];
    return <span className={`px-2 py-1 rounded-full text-[11px] font-bold border ${item.cls}`}>{item.label}</span>;
  };

  useEffect(() => {
    // 清理已不在当前筛选列表中的选择
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
        showToast({ type: 'info', title: `正在删除 ${idsToDelete.length} 条账单`, description: '请稍候...' });
        setIsDeleting(true);
        const ok = await onDeleteTransactions(idsToDelete);
        if (ok) {
          setSelectedIds(new Set());
          showToast({ type: 'success', title: '账单已删除', description: '余额已同步更新' });
        } else {
          showToast({ type: 'error', title: '删除失败', description: '请稍后重试' });
        }
        setIsDeleting(false);
        closeConfirm();
      },
    });
  };

  const selectedCount = selectedIds.size;
  const allSelected = filtered.length > 0 && selectedCount === filtered.length;

  return (
    <div className="space-y-6 pb-16 animate-in zoom-in-95 duration-500">
      <div className="rounded-[28px] bg-gradient-to-br from-[#F9FBFF] via-white to-[#FFF1F7] border border-white shadow-[0_18px_60px_-36px_rgba(124,77,255,0.25)] p-5 sm:p-6 flex flex-col gap-4 mobile-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FF4D94]">能量账单</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900">最近收支一览</h3>
            <p className="text-xs text-gray-500">点击筛选查看不同类型，管理员可批量删除异常记录</p>
          </div>
          <div className="flex flex-wrap gap-2 bg-white/80 backdrop-blur px-3 py-2 rounded-2xl border border-gray-100 text-xs text-gray-600">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> 赚取</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span> 扣减</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> 兑换</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-700 mobile-tight">
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between mobile-card">
            <span className="text-gray-500">全部记录</span>
            <span className="text-lg font-black text-[#FF4D94]">{stats.total}</span>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between mobile-card">
            <span className="text-gray-500">近7天</span>
            <span className="text-lg font-black text-indigo-600">{stats.week}</span>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between mobile-card">
            <span className="text-gray-500">净变动</span>
            <span className={`text-lg font-black ${stats.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{stats.net >= 0 ? '+' : ''}{stats.net}</span>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between mobile-card">
            <span className="text-gray-500">兑换次数</span>
            <span className="text-lg font-black text-indigo-600">{stats.redeemCount}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 bg-white/80 backdrop-blur rounded-2xl p-2 border border-gray-100 shadow-sm mobile-card">
          {(['all', 'earn', 'penalty', 'redeem'] as HistoryTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-full text-[12px] font-bold transition-all min-w-[110px] min-h-[44px] text-center ${activeTab === tab ? 'bg-[#FF4D94] text-white shadow-md shadow-[#FF4D94]/20' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]'}`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {canDelete && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl px-4 py-3.5 border border-gray-100 shadow-sm mobile-card">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="text-xs text-gray-500">已选 {selectedCount} / {filtered.length}</span>
            <button
              onClick={allSelected ? clearSelection : selectAll}
              className="px-4 py-2 min-h-[40px] rounded-xl text-sm font-semibold border border-gray-200 hover:border-[#FF4D94] hover:text-[#FF4D94] transition-all"
            >
              {allSelected ? '取消全选' : '全选当前筛选'}
            </button>
            {selectedCount > 0 && (
              <button
                onClick={clearSelection}
                className="px-4 py-2 min-h-[40px] rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:text-[#FF4D94] hover:border-[#FF4D94]/60 transition-all"
              >
                清空选择
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={selectedCount === 0 || isDeleting}
              onClick={handleBatchDelete}
              className={`px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-bold flex items-center gap-2 transition-all border ${selectedCount === 0 || isDeleting ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}`}
            >
              {isDeleting ? '删除中...' : `批量删除 (${selectedCount})`}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 overflow-hidden hidden lg:block mobile-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              {canDelete && (
                <th className="w-12 px-4 py-4">
                  <input
                    type="checkbox"
                    aria-label="全选"
                    checked={allSelected && filtered.length > 0}
                    onChange={() => (allSelected ? clearSelection() : selectAll())}
                    className="w-5 h-5 rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                  />
                </th>
              )}
              <th className="px-6 sm:px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">操作时间</th>
              <th className="px-6 sm:px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">能量明细</th>
              <th className="px-6 sm:px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">类型</th>
              <th className="px-6 sm:px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">数值变动</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((h: Transaction, idx: number) => (
              <tr
                key={h.id}
                className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-gray-50/90 transition-colors`}
              >
                {canDelete && (
                  <td className="px-4 py-3 align-middle">
                    <input
                      type="checkbox"
                      aria-label={`选择账单 ${h.title}`}
                      checked={selectedIds.has(h.id)}
                      onChange={() => toggleSelect(h.id)}
                      className="w-5 h-5 rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                    />
                  </td>
                )}
                <td className="px-6 sm:px-8 py-3 text-[11px] text-gray-400 font-medium tabular-nums whitespace-nowrap">{formatDateTime(h.timestamp)}</td>
                <td className="px-6 sm:px-8 py-3 text-sm font-bold text-gray-800 leading-tight">{h.title}</td>
                <td className="px-6 sm:px-8 py-3 text-sm text-gray-700">{renderTypeBadge(h.type as HistoryTab)}</td>
                <td className="px-6 sm:px-8 py-3 text-right">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-black points-font ${h.points > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                    {h.points > 0 ? '+' : ''}{h.points}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-10 text-center text-gray-400 font-semibold">暂无该分类的账单</div>
        )}
      </div>

      <div className="space-y-3 lg:hidden">
        {filtered.map((h: Transaction) => (
          <div key={h.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            {canDelete && (
                <input
                  type="checkbox"
                  aria-label={`选择账单 ${h.title}`}
                  checked={selectedIds.has(h.id)}
                  onChange={() => toggleSelect(h.id)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                />

            )}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {renderTypeBadge(h.type as HistoryTab)}
                  <p className="text-sm font-bold text-gray-800 truncate">{h.title}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-black points-font whitespace-nowrap ${h.points > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                  {h.points > 0 ? '+' : ''}{h.points}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 tabular-nums">{formatDateTime(h.timestamp)}</p>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-6 text-center text-gray-400 font-semibold rounded-2xl border border-dashed border-gray-200">暂无该分类的账单</div>
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
