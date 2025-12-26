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
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all ${activeTab === tab ? 'bg-[#FF4D94] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:border-[#FF4D94]'}`}
          >
            {tab === 'all' ? '全部奖品' : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {filtered.map(reward => {
          const canAfford = balance >= reward.points;
          return (
            <button 
              key={reward.id} 
              disabled={!canAfford}
              onClick={() => onRedeem({ title: reward.title, points: -reward.points, type: 'redeem' })}
              className={`p-0 vibrant-card flex flex-col items-center text-center group active:scale-95 transition-all overflow-hidden ${!canAfford ? 'opacity-50 grayscale bg-gray-50' : ''}`}
            >
              <div className="w-full h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                {reward.imageUrl ? (
                  <img src={reward.imageUrl} alt={reward.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${reward.type === '实物奖品' ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'} group-hover:scale-110 transition-all shadow-sm`}>
                    <Icon name="reward" size={28} />
                  </div>
                )}
              </div>
              <div className="p-4 w-full">
                <span className="text-xs font-bold text-gray-800 mb-3 h-8 line-clamp-2 leading-tight px-1 font-display block">{reward.title}</span>
                <div className={`w-full py-2.5 rounded-xl text-[10px] font-bold ${canAfford ? 'btn-pop' : 'bg-gray-200 text-gray-500'}`}>
                  {reward.points} PTS
                </div>
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
