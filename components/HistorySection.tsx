import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { formatDateTime } from '../utils/datetime';

type HistoryTab = 'all' | 'earn' | 'penalty' | 'redeem';
const TAB_LABELS: Record<HistoryTab, string> = {
  all: '全部账单',
  earn: '赚取',
  penalty: '扣减',
  redeem: '兑换',
};

interface HistorySectionProps {
  history: Transaction[];
}

export function HistorySection({ history }: HistorySectionProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('all');

  const filtered = useMemo(() => {
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    if (activeTab === 'all') return sorted;
    return sorted.filter(h => h.type === activeTab);
  }, [activeTab, history]);

  return (
    <div className="space-y-6 pb-16 animate-in zoom-in-95 duration-500">
      <div className="flex flex-wrap gap-2 bg-white/60 backdrop-blur rounded-2xl p-2 border border-gray-100 shadow-sm">
        {(['all', 'earn', 'penalty', 'redeem'] as HistoryTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all min-w-[96px] text-center ${activeTab === tab ? 'bg-[#FF4D94] text-white shadow-md shadow-[#FF4D94]/20' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]'}`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              <th className="px-6 sm:px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">操作时间</th>
              <th className="px-6 sm:px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">能量明细</th>
              <th className="px-6 sm:px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">数值变动</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((h, idx) => (
              <tr
                key={h.id}
                className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-gray-50/90 transition-colors`}
              >
                <td className="px-6 sm:px-8 py-3 text-[11px] text-gray-400 font-medium tabular-nums whitespace-nowrap">{formatDateTime(h.timestamp)}</td>
                <td className="px-6 sm:px-8 py-3 text-sm font-bold text-gray-800 leading-tight">{h.title}</td>
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
    </div>
  );
}
