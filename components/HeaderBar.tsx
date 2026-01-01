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
    <header className="sticky top-0 z-30 bg-white/96 dark:bg-[#0F172A]/92 backdrop-blur-md border-b border-gray-100/80 dark:border-white/10 px-4 py-2.5 mb-4 lg:mb-6 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white font-display leading-tight tracking-tight">
            {activeTab === 'dashboard' && `您好, ${currentProfile.name}!`}
            {activeTab === 'earn' && '元气任务'}
            {activeTab === 'redeem' && '梦想商店'}
            {activeTab === 'history' && '能量账单'}
            {activeTab === 'settings' && '系统配置中心'}
            {activeTab === 'doc' && '使用说明与文档'}
          </h2>
          <p className="text-gray-500 dark:text-gray-300 text-xs md:text-sm leading-snug">
            {activeTab === 'dashboard' && '查看您的当前元气值状态'}
            {activeTab === 'earn' && '完成元气任务来获得更多元气值奖励'}
            {activeTab === 'redeem' && '兑换心仪的奖品与特权'}
            {activeTab === 'history' && '查看您的历史交易'}
            {activeTab === 'settings' && '调整银行运行规则与商店货架'}
            {activeTab === 'doc' && '阅读项目说明、路由与操作指引'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-1.5 lg:gap-2">
          <div className="relative" ref={noticeRef}>
            <button
              onClick={() => setOpenNotice((prev: boolean) => !prev)}
              className="h-11 w-11 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#FF4D94] dark:text-[#FF7AB8] hover:border-[#FF4D94] hover:text-[#FF4D94] transition-all flex items-center justify-center shadow-[0_4px_12px_-6px_rgba(255,77,148,0.45)]"
              aria-label="系统通知"
            >
              <Icon name="bell" size={15} />
              <span className="sr-only">系统通知</span>
              <span className="absolute -top-1 -right-1 text-[9px] text-white bg-[#FF4D94] px-1 py-0.5 rounded-full shadow-sm leading-none">{messageCenter.length}</span>
            </button>
            {openNotice && (
              <div className="absolute top-full mt-2 left-[-20px] -translate-x-0 w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] md:left-auto md:translate-x-0 md:right-0 md:w-72 bg-white border border-gray-100 rounded-2xl shadow-2xl z-40 overflow-hidden transform origin-top-right">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">消息中心</p>
                    <p className="text-sm font-bold text-gray-900">最新提醒</p>
                  </div>
                  <button onClick={() => setOpenNotice(false)} className="text-xs text-gray-400 hover:text-[#FF4D94]">收起</button>
                </div>
                <ul className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
                  {hasMessages ? (
                    messageCenter.map((msg: HeaderMessage, idx: number) => (
                      <li key={idx} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                        <span className={`mt-0.5 w-2 h-2 rounded-full ${msg.tone === 'rose' ? 'bg-rose-400' : msg.tone === 'indigo' ? 'bg-indigo-400' : msg.tone === 'slate' ? 'bg-gray-400' : 'bg-emerald-400'}`}></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{msg.title}</p>
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
              className="h-11 w-11 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#7C4DFF] dark:text-[#BBA5FF] hover:border-[#7C4DFF] hover:text-[#7C4DFF] transition-all flex items-center justify-center shadow-[0_4px_12px_-6px_rgba(124,77,255,0.45)]"
              aria-label="打印手册"
            >
              <Icon name="print" size={15} />
              <span className="sr-only">打印手册</span>
            </button>
          )}

          <button
            onClick={onToggleTheme}
            className="h-11 w-11 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#7C4DFF] dark:text-[#BBA5FF] hover:border-[#7C4DFF] hover:text-[#7C4DFF] transition-all flex items-center justify-center shadow-[0_4px_12px_-6px_rgba(124,77,255,0.45)]"
            aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到夜间模式'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
            <span className="sr-only">{theme === 'dark' ? '浅色模式' : '夜间模式'}</span>
          </button>

          <button
            onClick={onLogout}
            className="h-11 w-11 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#FF4D94] dark:text-[#FF7AB8] hover:border-[#FF4D94] hover:text-[#FF4D94] transition-all flex items-center justify-center shadow-[0_4px_12px_-6px_rgba(255,77,148,0.45)]"
            aria-label="退出登录"
          >
            <Icon name="logout" size={15} />
            <span className="sr-only">退出登录</span>
          </button>

          <div className="flex-1 lg:flex-none px-3 py-2 bg-gradient-to-br from-[#FFF5FB] via-white to-[#EEF2FF] dark:from-[#0F172A] dark:via-[#0B1224] dark:to-[#0B1224] rounded-2xl border border-gray-100 dark:border-white/10 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.25)] flex items-center gap-2 min-w-[180px]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4D94]/18 to-[#7C4DFF]/18 text-[#FF4D94] flex items-center justify-center font-bold points-font">∞</div>
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] font-semibold text-[#FF4D94] uppercase tracking-[0.28em]">可用元气值</span>
              <span className="text-2xl font-black text-gray-900 dark:text-white points-font">{currentProfile.balance}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
