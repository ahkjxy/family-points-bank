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

  const getRewardImage = (reward: Reward) =>
    reward.imageUrl || `https://ui-avatars.com/api/?background=FF4D94&color=fff&name=${encodeURIComponent(reward.title)}`;

  return (
    <div className="space-y-6 pb-16 animate-in zoom-in-95 duration-500">
      <div className="rounded-[28px] bg-gradient-to-br from-[#FFF1F7] via-white to-[#F4F0FF] border border-white shadow-[0_18px_60px_-36px_rgba(255,77,148,0.35)] p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FF4D94]">梦想商店</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900">选一份心愿好礼</h3>
            <p className="text-xs text-gray-500">余额 {balance} · 兑换越多，动力越足</p>
          </div>
          <div className="flex flex-wrap gap-2 bg-white/70 backdrop-blur px-3 py-2 rounded-2xl border border-gray-100 text-xs text-gray-600">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> 可兑换</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> 差一点点</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"></span> 未满足</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 bg-white/80 backdrop-blur rounded-2xl p-2 border border-gray-100 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-full text-[12px] font-bold transition-all min-w-[110px] min-h-[44px] text-center ${activeTab === tab ? 'bg-[#FF4D94] text-white shadow-md shadow-[#FF4D94]/20' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]'}`}
            >
              {tab === 'all' ? '全部奖品' : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
        {filtered.map(reward => {
          const canAfford = balance >= reward.points;
          const gap = Math.max(0, reward.points - balance);
          return (
            <div 
              key={reward.id} 
              className={`group relative h-full rounded-2xl border bg-white p-3 sm:p-4 flex flex-col gap-3 shadow-sm transition-all ${canAfford ? 'hover:-translate-y-1 hover:shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] hover:border-[#FF4D94]/30' : 'border-gray-100 bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}
            >
              <div className="relative overflow-hidden rounded-xl aspect-[4/3] bg-gray-50">
                <img src={getRewardImage(reward)} alt={reward.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/85 text-gray-700 border border-gray-100 shadow-sm">{reward.type}</div>
                <div className="absolute top-2 right-2 px-3 py-1 rounded-full text-[11px] font-black text-white bg-gradient-to-r from-[#FF4D94] to-[#FF7AB5] shadow-md">
                  {reward.points} pts
                </div>
                {!canAfford && (
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/40 text-white flex items-end p-2 text-[11px] font-semibold">
                    还差 {gap} 元气值
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 w-2 h-2 rounded-full ${canAfford ? 'bg-emerald-400' : gap <= 10 ? 'bg-amber-400' : 'bg-gray-300'}`}></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-tight truncate group-hover:text-[#FF4D94]">{reward.title}</p>
                    <p className="text-[11px] text-gray-500 truncate">{reward.type === '实物奖品' ? '实物' : '特权'} · {canAfford ? '现在就能兑换' : `差 ${gap} 分即可`}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-auto">
                  <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-[12px] font-black text-[#FF4D94] bg-[#FFF2F7] points-font">{reward.points} pts</span>
                  <button
                    disabled={!canAfford}
                    onClick={() => onRedeem({ title: reward.title, points: -reward.points, type: 'redeem' })}
                    className={`px-4 py-2.5 min-w-[120px] min-h-[44px] rounded-xl text-[13px] font-bold transition-all ${canAfford ? 'bg-gradient-to-r from-[#FF4D94] to-[#FF7AB5] text-white shadow-md shadow-[#FF4D94]/30 hover:brightness-110 active:scale-95' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                  >
                    {canAfford ? '立即兑换' : '继续加油'}
                  </button>
                </div>
              </div>
            </div>
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
