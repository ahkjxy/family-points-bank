import { useEffect, useMemo, useRef, useState } from 'react';
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
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-xl border-b border-white/40 dark:border-white/5 px-4 lg:px-6 py-4 mb-6 lg:mb-8 rounded-b-[32px] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white font-display leading-tight tracking-tight">
              {activeTab === 'dashboard' && `您好, ${currentProfile.name} 👋`}
              {activeTab === 'earn' && '元气任务'}
              {activeTab === 'redeem' && '梦想商店'}
              {activeTab === 'history' && '能量账单'}
              {activeTab === 'settings' && '系统配置中心'}
            </h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">
            {activeTab === 'dashboard' && '查看您的当前元气值与近期动态'}
            {activeTab === 'earn' && '完成任务即可获得更多元气能量'}
            {activeTab === 'redeem' && '挑选心仪的梦想奖励'}
            {activeTab === 'history' && '追踪每一笔元气能量的流动'}
            {activeTab === 'settings' && '管理银行核心规则与成员名单'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 lg:gap-3">
          <div className="relative" ref={noticeRef}>
            <button
              onClick={() => setOpenNotice((prev: boolean) => !prev)}
              className="h-12 w-12 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-[#FF4D94] hover:text-[#FF4D94] transition-all flex items-center justify-center shadow-sm relative group"
            >
              <Icon name="bell" size={18} />
              {messageCenter.length > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 text-[9px] font-bold text-white bg-gradient-to-br from-[#FF4D94] to-[#FF7AB8] flex items-center justify-center rounded-full shadow-lg ring-2 ring-white dark:ring-gray-900 group-hover:scale-110 transition-transform">{messageCenter.length}</span>
              )}
            </button>
            {openNotice && (
              <div className="absolute top-full mt-3 left-[-20px] md:left-auto md:right-0 w-[calc(100vw-32px)] md:w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-gray-100 dark:border-white/10 rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] z-40 overflow-hidden transform origin-top-right animate-in fade-in zoom-in-95 duration-200">
                <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                  <div>
                    <p className="text-[10px] font-bold text-[#FF4D94] uppercase tracking-[0.25em]">通知中心</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">近期提醒</p>
                  </div>
                  <button onClick={() => setOpenNotice(false)} className="text-xs font-bold text-gray-400 hover:text-[#FF4D94] transition-colors">全部清除</button>
                </div>
                <ul className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50 dark:divide-white/5">
                  {hasMessages ? (
                    messageCenter.map((msg: HeaderMessage, idx: number) => (
                      <li key={idx} className="px-5 py-4 flex items-start gap-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                        <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${
                          msg.tone === 'rose' ? 'bg-[#FF4D94] shadow-[#FF4D94]/40' : 
                          msg.tone === 'indigo' ? 'bg-[#7C4DFF] shadow-[#7C4DFF]/40' : 
                          msg.tone === 'slate' ? 'bg-gray-400 shadow-gray-400/40' : 
                          'bg-[#10B981] shadow-[#10B981]/40'
                        } group-hover:scale-125 transition-transform`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight truncate">{msg.title}</p>
                          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{msg.desc}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 tabular-nums font-medium uppercase">{msg.time}</p>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="px-5 py-8 text-sm text-gray-400 dark:text-gray-500 text-center font-medium italic">暂无新消息，保持元气满满哦 ✨</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-gray-100/50 dark:bg-white/5 rounded-2xl">
            {isAdmin && (
              <button
                onClick={onPrint}
                className="h-10 w-10 rounded-[14px] bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-[#7C4DFF] hover:shadow-md transition-all flex items-center justify-center"
                title="打印报表"
              >
                <Icon name="print" size={16} />
              </button>
            )}
            <button
              onClick={onToggleTheme}
              className="h-10 w-10 rounded-[14px] bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-[#7C4DFF] hover:shadow-md transition-all flex items-center justify-center"
              title={theme === 'dark' ? '日间模式' : '夜间模式'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
            </button>
            <button
              onClick={onLogout}
              className="h-10 w-10 rounded-[14px] bg-white dark:bg-white/10 text-rose-500 hover:bg-rose-50 hover:shadow-md transition-all flex items-center justify-center"
              title="退出登录"
            >
              <Icon name="logout" size={16} />
            </button>
          </div>

          <div className="flex-1 lg:flex-none pl-3 pr-5 py-2.5 bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] rounded-[24px] shadow-[0_12px_24px_-8px_rgba(255,77,148,0.4)] flex items-center gap-3.5 min-w-[160px] group hover:scale-[1.02] transition-transform duration-300">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-black text-xl shadow-inner group-hover:rotate-12 transition-transform">⚡</div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em]">账户元气值</span>
              <span className="text-2xl font-black text-white points-font">{currentProfile.balance}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
