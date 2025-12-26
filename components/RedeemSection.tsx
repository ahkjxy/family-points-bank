import React, { useMemo, useState } from 'react';
import { Reward } from '../types';
import { Icon } from './Icon';

interface RedeemSectionProps {
  rewards: Reward[];
  balance: number;
  onRedeem: (payload: { title: string; points: number; type: 'redeem' }) => void;
}

export function RedeemSection({ rewards, balance, onRedeem }: RedeemSectionProps) {
  const tabs = ['all', '实物奖品', '特权奖励'] as const;
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('all');

  const filtered = useMemo(() => {
    const sorted = [...rewards].sort((a, b) => a.points - b.points);
    if (activeTab === 'all') return sorted;
    return sorted.filter(r => r.type === activeTab);
  }, [activeTab, rewards]);

  return (
    <div className="space-y-6 pb-16 animate-in zoom-in-95 duration-500">
      <div className="flex flex-wrap gap-2 bg-white/60 backdrop-blur rounded-2xl p-2 border border-gray-100 shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all min-w-[96px] text-center ${activeTab === tab ? 'bg-[#FF4D94] text-white shadow-md shadow-[#FF4D94]/20' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]'}`}
          >
            {tab === 'all' ? '全部奖品' : tab}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(reward => {
          const canAfford = balance >= reward.points;
          return (
            <button 
              key={reward.id} 
              disabled={!canAfford}
              onClick={() => onRedeem({ title: reward.title, points: -reward.points, type: 'redeem' })}
              className={`w-full flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all text-left group ${canAfford ? 'bg-white hover:border-[#FF4D94]/30 hover:shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] active:scale-[0.99]' : 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-60 grayscale'}`}
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${reward.type === '实物奖品' ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'}`}>
                  {reward.imageUrl ? <img src={reward.imageUrl} alt={reward.title} className="w-full h-full object-cover" /> : <Icon name="reward" size={18} />}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-gray-900 truncate group-hover:text-[#FF4D94]">{reward.title}</p>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide truncate">{reward.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-black text-[#FF4D94] bg-[#FFF2F7] points-font">{reward.points} pts</span>
                <span className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#FF4D94] to-[#FF7AB5] text-white font-black text-sm flex items-center justify-center shadow-lg shadow-[#FF4D94]/30">{reward.points}</span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white p-8 rounded-[24px] border border-dashed border-gray-200 text-center text-gray-400 font-semibold">
          暂无该分类的奖品
        </div>
      )}
    </div>
  );
}
