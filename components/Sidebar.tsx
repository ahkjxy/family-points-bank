import React from 'react';
import { Icon } from './Icon';
import { Profile } from '../types';

interface SidebarProps {
  activeTab: 'dashboard' | 'earn' | 'redeem' | 'history' | 'settings' | 'doc';
  onChangeTab: (tab: SidebarProps['activeTab']) => void;
  isAdmin: boolean;
  currentProfile: Profile;
  onProfileClick: () => void;
}

export function Sidebar({ activeTab, onChangeTab, isAdmin, currentProfile, onProfileClick }: SidebarProps) {
  return (
    <aside className="glass-sidebar w-64 flex flex-col p-6 h-screen sticky top-0 shrink-0 overflow-hidden">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] rounded-2xl flex items-center justify-center text-white shadow-lg">
          <Icon name="reward" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display leading-tight">元气银行</h1>
          <p className="text-[10px] font-bold text-[#FF4D94] uppercase tracking-widest opacity-60">Family Bank System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {[
          { id: 'dashboard', icon: 'home', label: '账户概览' },
          { id: 'earn', icon: 'plus', label: '元气任务' },
          { id: 'redeem', icon: 'reward', label: '梦想商店' },
          { id: 'history', icon: 'history', label: '能量账单' },
          { id: 'doc', icon: 'info', label: '使用说明' },
          ...(isAdmin ? [{ id: 'settings', icon: 'settings', label: '系统配置' }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id as SidebarProps['activeTab'])}
            className={`w-full h-11 flex items-center gap-3 px-4 rounded-xl transition-all font-display font-semibold text-sm border border-transparent ${activeTab === tab.id ? 'bg-[#FF4D94] text-white shadow-md shadow-[#FF4D94]/30' : 'text-gray-400 hover:bg-white hover:text-[#FF4D94] hover:border-[#FF4D94]/30'}`}
          >
            <Icon name={tab.icon} size={18} />
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-100">
        <button
          onClick={onProfileClick}
          className="w-full bg-white border border-gray-100 p-3 rounded-2xl flex items-center gap-3 hover:border-[#FF4D94] hover:shadow-[0_10px_30px_-26px_rgba(255,77,148,0.3)] transition-all shadow-sm"
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm ${currentProfile.avatarColor} shadow-inner`}>{currentProfile.name[0]}</div>
          <div className="text-left overflow-hidden">
            <p className="text-xs font-bold text-gray-800 truncate">{currentProfile.name}</p>
            <p className="text-[9px] text-[#FF4D94] font-bold uppercase tracking-wider">{currentProfile.role === 'admin' ? '系统管理员' : '账户成员'}</p>
          </div>
        </button>
      </div>
    </aside>
  );
}
