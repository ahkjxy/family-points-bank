import { Icon } from './Icon';

interface MobileNavProps {
  activeTab: 'dashboard' | 'earn' | 'redeem' | 'history' | 'settings' | 'doc';
  onChangeTab: (tab: MobileNavProps['activeTab']) => void;
  isAdmin: boolean;
  onProfileClick: () => void;
}

export function MobileNav({ activeTab, onChangeTab, isAdmin, onProfileClick }: MobileNavProps) {
  const tabs = [
    { id: 'dashboard', label: '概览', icon: 'home' },
    { id: 'earn', label: '任务', icon: 'plus' },
    { id: 'redeem', label: '商店', icon: 'reward' },
    { id: 'history', label: '账单', icon: 'history' },
    { id: 'doc', label: '文档', icon: 'info' },
    ...(isAdmin ? [{ id: 'settings', label: '配置', icon: 'settings' }] : []),
  ];

  return (
    <nav className="fixed bottom-6 left-0 right-0 z-40 mx-auto w-full max-w-lg px-6 lg:hidden">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] rounded-[32px] p-2 flex items-stretch gap-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id as MobileNavProps['activeTab'])}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] text-white shadow-lg shadow-[#FF4D94]/30 scale-[1.05] -translate-y-1' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-[#FF4D94] hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              <Icon name={tab.icon} size={22} />
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={onProfileClick}
          className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 flex items-center justify-center border border-white dark:border-white/10 shadow-inner hover:text-[#FF4D94] transition-all"
          aria-label="切换成员"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm">
            <div className="w-full h-full bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] flex items-center justify-center text-white font-bold text-[10px]">P</div>
          </div>
        </button>
      </div>
    </nav>
  );
}
