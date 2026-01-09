import { useMemo, useState } from 'react';
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
    reward.imageUrl || `https://ui-avatars.com/api/?background=7C4DFF&color=fff&name=${encodeURIComponent(reward.title)}&bold=true&font-size=0.33`;

  return (
    <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[40px] bg-white dark:bg-[#0F172A] border border-gray-100 dark:border-white/5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] p-8 lg:p-10 mobile-card">
        <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-gradient-to-br from-[#7C4DFF]/10 to-[#FF4D94]/10 blur-[60px] rounded-full"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7C4DFF]/10 text-[#7C4DFF] text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#7C4DFF] animate-pulse"></div>
              梦想商店
            </div>
            <h3 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-2">想要兑换哪份心愿？</h3>
            <div className="flex items-center gap-3">
              <p className="text-gray-500 dark:text-gray-400 font-medium">当前拥有</p>
              <div className="px-4 py-1 rounded-2xl bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white text-lg font-black points-font shadow-lg shadow-[#FF4D94]/20">
                {balance} 元气值
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex gap-4 p-4 bg-gray-50/50 dark:bg-white/5 rounded-[32px] border border-gray-100 dark:border-transparent">
            <div className="flex items-center gap-3 px-4">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">可即刻拥有</span>
            </div>
            <div className="w-px h-8 bg-gray-200 dark:bg-white/10"></div>
            <div className="flex items-center gap-3 px-4">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">差一点点</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-10 flex flex-wrap gap-2.5 p-1.5 bg-gray-100/50 dark:bg-white/5 rounded-[28px] border border-gray-100/50 dark:border-transparent">
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-[22px] text-sm font-black transition-all duration-300 ${
                  isActive 
                    ? 'bg-white dark:bg-gray-800 text-[#7C4DFF] shadow-md shadow-gray-200/50 dark:shadow-none scale-[1.02]' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <span className="truncate tracking-tight">{tab === 'all' ? '全部梦想' : tab}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reward Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
        {filtered.map(reward => {
          const canAfford = balance >= reward.points;
          const gap = Math.max(0, reward.points - balance);
          const progress = Math.min(100, Math.round((balance / reward.points) * 100));
          
          return (
            <div 
              key={reward.id} 
              className={`group relative flex flex-col rounded-[40px] bg-white dark:bg-[#0F172A] border-2 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.15)] mobile-card ${
                canAfford 
                  ? 'border-transparent hover:border-[#FF4D94]/30' 
                  : 'border-transparent opacity-95 grayscale-[0.3]'
              }`}
            >
              {/* Product Image Area */}
              <div className="relative p-3">
                <div className="relative aspect-[1/1] rounded-[32px] overflow-hidden bg-gray-50 dark:bg-white/5">
                  <img src={getRewardImage(reward)} alt={reward.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  
                  {/* Category Tag */}
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/90 dark:bg-black/50 backdrop-blur-md text-gray-900 dark:text-white border border-white/20 shadow-sm">
                    {reward.type === '实物奖品' ? '实物' : '特权'}
                  </div>

                  {/* Points Badge */}
                  <div className="absolute bottom-4 right-4 px-4 py-2 rounded-2xl bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] text-white text-sm font-black points-font shadow-lg transform translate-y-0 group-hover:-translate-y-1 transition-transform">
                    {reward.points} 元气值
                  </div>

                  {/* Progress Overlay if not affordable */}
                  {!canAfford && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-xs font-black uppercase tracking-[0.2em] mb-2">成长进度</p>
                      <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-[#FF4D94] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                      </div>
                      <p className="text-white font-black text-sm">还差 {gap} 元气值</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-6 pt-2 flex flex-col flex-1">
                <div className="mb-4">
                  <h4 className="text-lg font-black text-gray-900 dark:text-white tracking-tight group-hover:text-[#FF4D94] transition-colors truncate">{reward.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                    {canAfford ? '✨ 立即兑换，享受惊喜' : `⚡ 再加油获得 ${gap} 元气值`}
                  </p>
                </div>

                <div className="mt-auto">
                  {!canAfford && (
                    <div className="mb-4 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <span>当前进度</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#7C4DFF] opacity-50" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  )}

                  <button
                    disabled={!canAfford}
                    onClick={() => onRedeem({ title: reward.title, points: -reward.points, type: 'redeem' })}
                    className={`w-full py-4 rounded-[20px] text-sm font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                      canAfford 
                        ? 'bg-[#1A1A1A] dark:bg-white text-white dark:text-black hover:bg-[#FF4D94] dark:hover:bg-[#FF4D94] hover:text-white dark:hover:text-white shadow-lg active:scale-95' 
                        : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? (
                      <>
                        <Icon name="reward" size={16} />
                        立即兑换
                      </>
                    ) : (
                      '元气不足'
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-center gap-4 bg-white/50 dark:bg-white/5 rounded-[40px] border border-dashed border-gray-200 dark:border-white/10">
          <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-4xl opacity-50">🎁</div>
          <p className="text-lg font-black text-gray-400 uppercase tracking-widest">目前商店空空如也</p>
        </div>
      )}
    </div>
  );
}
