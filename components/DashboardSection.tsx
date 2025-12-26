import React from 'react';
import { Profile } from '../types';
import { Icon } from './Icon';

interface DashboardSectionProps {
  currentProfile: Profile;
  onGoEarn: () => void;
  onGoRedeem: () => void;
}

export function DashboardSection({ currentProfile, onGoEarn, onGoRedeem }: DashboardSectionProps) {
  const todayGain = currentProfile.history
    .filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString() && h.points > 0)
    .reduce((a, b) => a + b.points, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-[60px] -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] opacity-80 mb-2">VITALITY BALANCE</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-bold points-font tracking-tighter">{currentProfile.balance}</span>
            </div>
          </div>
          <div className="flex gap-3 relative z-10">
            <button onClick={onGoEarn} className="px-6 py-3 bg-white text-[#FF4D94] rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg">进入元气任务</button>
            <button onClick={onGoRedeem} className="px-6 py-3 bg-white/10 text-white rounded-2xl text-xs font-bold hover:bg-white/20 active:scale-95 transition-all">前往梦想商店</button>
          </div>
        </div>
        <div className="bg-white p-6 vibrant-card flex flex-col justify-center items-center text-center">
          <div className="w-14 h-14 bg-[#FFF0F6] text-[#FF4D94] rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <Icon name="history" size={28} />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">今日累计收益</p>
          <p className="text-4xl font-bold text-gray-900 points-font">
            +{todayGain}
          </p>
        </div>
      </div>
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 font-display">最近账单摘要</h3>
          <span className="text-xs font-bold text-[#FF4D94]">最近 4 条</span>
        </div>
        <div className="space-y-3">
          {currentProfile.history.slice(0, 4).map(h => (
            <div key={h.id} className="p-4 flex items-center justify-between bg-gray-50/50 rounded-2xl hover:bg-white border border-transparent hover:border-gray-100 transition-all group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${h.points > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'} shadow-sm group-hover:scale-110 transition-all`}>
                  <Icon name={h.type === 'redeem' ? 'reward' : 'plus'} size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{h.title}</p>
                  <p className="text-[10px] text-gray-400">{new Date(h.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <span className={`text-xl font-bold points-font ${h.points > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {h.points > 0 ? '+' : ''}{h.points}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
