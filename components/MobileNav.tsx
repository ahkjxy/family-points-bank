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
    // { id: 'doc', label: '文档', icon: 'info' },
    ...(isAdmin ? [{ id: 'settings', label: '配置', icon: 'settings' }] : []),
  ];

  return (
    <nav className="fixed bottom-3 left-0 right-0 z-40 mx-auto w-full max-w-3xl px-4 lg:hidden">
      <div className="bg-white/90 backdrop-blur-2xl border border-white/70 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.65)] rounded-3xl p-2.5 flex items-stretch gap-2">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id as MobileNavProps['activeTab'])}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 min-h-12 rounded-2xl transition-all ${isActive ? 'bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] text-white shadow-lg shadow-[#7C4DFF]/30' : 'text-gray-500 hover:text-[#7C4DFF] hover:bg-white/70'}`}
            >
              <Icon name={tab.icon} size={20} />
              <span className="text-[12px] font-semibold tracking-wide">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={onProfileClick}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#22D3EE]/20 to-[#4F46E5]/20 text-[#4F46E5] flex items-center justify-center border border-white/80 shadow-inner hover:brightness-110 transition-all"
          aria-label="切换成员"
        >
          <Icon name="reward" size={18} />
        </button>
      </div>
    </nav>
  );
}
