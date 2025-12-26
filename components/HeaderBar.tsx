import React from 'react';
import { Profile } from '../types';
import { Icon } from './Icon';

interface HeaderBarProps {
  activeTab: 'dashboard' | 'earn' | 'redeem' | 'history' | 'settings' | 'doc';
  currentProfile: Profile;
  isAdmin: boolean;
  onPrint: () => void;
}

export function HeaderBar({ activeTab, currentProfile, isAdmin, onPrint }: HeaderBarProps) {
  return (
    <header className="sticky top-3 z-20 mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white/90 backdrop-blur-xl rounded-3xl px-4 py-3 border border-white/80 shadow-[0_24px_80px_-38px_rgba(124,77,255,0.55)]">
      <div className="space-y-1">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-display">
          {activeTab === 'dashboard' && `您好, ${currentProfile.name}!`}
          {activeTab === 'earn' && '元气任务'}
          {activeTab === 'redeem' && '梦想商店'}
          {activeTab === 'history' && '能量账单'}
          {activeTab === 'settings' && '系统配置中心'}
          {activeTab === 'doc' && '使用说明与文档'}
        </h2>
        <p className="text-gray-500 text-sm md:text-base">
          {activeTab === 'dashboard' && '查看您的当前元气值状态'}
          {activeTab === 'earn' && '完成元气任务来获得更多元气值奖励'}
          {activeTab === 'redeem' && '兑换心仪的奖品与特权'}
          {activeTab === 'settings' && '调整银行运行规则与商店货架'}
          {activeTab === 'doc' && '阅读项目说明、路由与操作指引'}
        </p>
      </div>
      <div className="flex gap-3 items-center w-full md:w-auto">
        {isAdmin && (
          <button 
            onClick={onPrint} 
            className="px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 bg-gradient-to-br from-white to-[#F7F2FF] border border-white/80 shadow-[0_16px_50px_-28px_rgba(0,0,0,0.45)] hover:-translate-y-[1px] transition-all w-full md:w-auto"
          >
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF4D94]/15 to-[#7C4DFF]/15 flex items-center justify-center text-[#7C4DFF]">
              <Icon name="print" size={14} />
            </span>
            <span className="text-gray-700">打印手册</span>
          </button>
        )}
        <div className="flex-1 md:flex-none px-4 py-3 bg-white rounded-2xl border border-white/80 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.45)] flex items-center gap-3 min-w-[160px]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF4D94]/15 to-[#7C4DFF]/15 text-[#FF4D94] flex items-center justify-center font-bold points-font">∞</div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-bold text-[#FF4D94] uppercase tracking-[0.3em]">可用元气值</span>
            <span className="text-3xl font-black text-gray-900 points-font">{currentProfile.balance}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
