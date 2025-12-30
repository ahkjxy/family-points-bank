import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Profile } from '../types';
import { Icon } from './Icon';
import { ThemeMode } from './ThemeProvider';
import { formatDateTime } from '../utils/datetime';

interface HeaderBarProps {
  activeTab: 'dashboard' | 'earn' | 'redeem' | 'history' | 'settings' | 'doc';
  currentProfile: Profile;
  isAdmin: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onPrint: () => void;
  onLogout: () => void;
}

type HeaderMessage = { title: string; desc: string; time: string; tone: 'indigo' | 'rose' | 'emerald' | 'slate' };

export function HeaderBar({ activeTab, currentProfile, isAdmin, theme, onToggleTheme, onPrint, onLogout }: HeaderBarProps) {
  const [openNotice, setOpenNotice] = useState<boolean>(false);
  const messageCenter = useMemo<HeaderMessage[]>(() => {
    const sorted = [...currentProfile.history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
    return sorted.map(tx => ({
      title: tx.type === 'redeem' ? '兑换提醒' : tx.type === 'penalty' ? '扣减提醒' : '任务完成',
      desc: `${tx.title} · ${tx.points > 0 ? '+' : ''}${tx.points}`,
      time: formatDateTime(tx.timestamp),
      tone: tx.type === 'redeem' ? 'indigo' : tx.type === 'penalty' ? 'rose' : 'emerald',
    }));
  }, [currentProfile.history]);

  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openNotice && noticeRef.current && !noticeRef.current.contains(e.target as Node)) {
        setOpenNotice(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenNotice(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [openNotice]);

  const hasMessages = messageCenter.length > 0;

  return (
    <header className="sticky top-3 z-20 mb-6 bg-white/90 backdrop-blur-xl rounded-3xl px-4 py-3 border border-white/80 shadow-[0_24px_80px_-38px_rgba(124,77,255,0.55)]">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
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
            {activeTab === 'history' && '查看您的历史交易'}
            {activeTab === 'settings' && '调整银行运行规则与商店货架'}
            {activeTab === 'doc' && '阅读项目说明、路由与操作指引'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 lg:gap-3">
          <div className="relative" ref={noticeRef}>
            <button
              onClick={() => setOpenNotice((prev: boolean) => !prev)}
              className="h-11 w-11 rounded-2xl bg-white border border-gray-200 text-[#FF4D94] hover:border-[#FF4D94] hover:text-[#FF4D94] transition-all flex items-center justify-center shadow-sm"
              aria-label="系统通知"
            >
              <Icon name="bell" size={16} />
              <span className="sr-only">系统通知</span>
              <span className="absolute -top-1 -right-1 text-[10px] text-white bg-[#FF4D94] px-1.5 py-0.5 rounded-full shadow-sm leading-none">{messageCenter.length}</span>
            </button>
            {openNotice && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-30 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">消息中心</p>
                    <p className="text-sm font-bold text-gray-900">最新提醒</p>
                  </div>
                  <button onClick={() => setOpenNotice(false)} className="text-xs text-gray-400 hover:text-[#FF4D94]">收起</button>
                </div>
                <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {hasMessages ? (
                    messageCenter.map((msg: HeaderMessage, idx: number) => (
                      <li key={idx} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                        <span className={`mt-0.5 w-2.5 h-2.5 rounded-full ${msg.tone === 'rose' ? 'bg-rose-400' : msg.tone === 'indigo' ? 'bg-indigo-400' : msg.tone === 'slate' ? 'bg-gray-400' : 'bg-emerald-400'}`}></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 leading-tight truncate">{msg.title}</p>
                          <p className="text-[12px] text-gray-500 truncate">{msg.desc}</p>
                          <p className="text-[11px] text-gray-400 tabular-nums">{msg.time}</p>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-6 text-sm text-gray-400 text-center">暂无消息，去完成任务或兑换看看~</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {isAdmin && (
            <button
              onClick={onPrint}
              className="h-11 w-11 rounded-2xl bg-white border border-gray-200 text-[#7C4DFF] hover:border-[#7C4DFF] hover:text-[#7C4DFF] transition-all flex items-center justify-center shadow-sm"
              aria-label="打印手册"
            >
              <Icon name="print" size={16} />
              <span className="sr-only">打印手册</span>
            </button>
          )}

          <button
            onClick={onToggleTheme}
            className="h-11 w-11 rounded-2xl bg-white border border-gray-200 text-[#7C4DFF] hover:border-[#7C4DFF] hover:text-[#7C4DFF] transition-all flex items-center justify-center shadow-sm"
            aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到夜间模式'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
            <span className="sr-only">{theme === 'dark' ? '浅色模式' : '夜间模式'}</span>
          </button>

          <button
            onClick={onLogout}
            className="h-11 w-11 rounded-2xl bg-white border border-gray-200 text-[#FF4D94] hover:border-[#FF4D94] hover:text-[#FF4D94] transition-all flex items-center justify-center shadow-sm"
            aria-label="退出登录"
          >
            <Icon name="logout" size={16} />
            <span className="sr-only">退出登录</span>
          </button>

          <div className="flex-1 lg:flex-none px-4 py-3 bg-white rounded-2xl border border-white/80 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.45)] flex items-center gap-3 min-w-[200px]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF4D94]/15 to-[#7C4DFF]/15 text-[#FF4D94] flex items-center justify-center font-bold points-font">∞</div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-bold text-[#FF4D94] uppercase tracking-[0.3em]">可用元气值</span>
              <span className="text-3xl font-black text-gray-900 points-font">{currentProfile.balance}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
