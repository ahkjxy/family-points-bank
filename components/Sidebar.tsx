import { Icon } from "./Icon";
import { Profile } from "../types";

interface SidebarProps {
  activeTab: "dashboard" | "earn" | "redeem" | "history" | "settings" | "achievements";
  onChangeTab: (tab: SidebarProps["activeTab"]) => void;
  isAdmin: boolean;
  currentProfile: Profile;
  onProfileClick: () => void;
}

export function Sidebar({
  activeTab,
  onChangeTab,
  isAdmin,
  currentProfile,
  onProfileClick,
}: SidebarProps) {
  return (
    <aside className="glass-sidebar w-64 flex flex-col p-6 h-screen sticky top-0 shrink-0 overflow-hidden border-r border-white/20 dark:border-white/5 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-3 mb-10 group cursor-pointer">
        <div className="w-11 h-11 bg-gradient-to-br from-[#FF4D94] via-[#FF7AB8] to-[#7C4DFF] rounded-2xl flex items-center justify-center text-white shadow-[0_8px_20px_-6px_rgba(255,77,148,0.5)] group-hover:scale-110 transition-transform duration-300">
          <Icon name="reward" size={26} />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display leading-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            元气银行
          </h1>
          <p className="text-[10px] font-bold text-[#FF4D94] uppercase tracking-[0.2em] opacity-80">
            家庭元气银行
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5">
        {[
          { id: "dashboard", icon: "home", label: "账户概览" },
          { id: "earn", icon: "plus", label: "元气任务" },
          { id: "redeem", icon: "reward", label: "梦想商店" },
          { id: "history", icon: "history", label: "能量账单" },
          { id: "achievements", icon: "reward", label: "成就中心" },
          ...(isAdmin ? [{ id: "settings", icon: "settings", label: "系统配置" }] : []),
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id as SidebarProps["activeTab"])}
              className={`w-full h-12 flex items-center gap-3.5 px-4 rounded-2xl transition-all duration-300 font-display font-bold text-sm border ${
                isActive
                  ? "bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white border-transparent shadow-[0_8px_16px_-4px_rgba(255,77,148,0.3)]"
                  : "text-gray-500 dark:text-gray-400 border-transparent hover:bg-white/60 dark:hover:bg-white/5 hover:text-[#FF4D94] hover:border-[#FF4D94]/10 hover:translate-x-1"
              }`}
            >
              <div
                className={`${isActive ? "text-white" : "text-gray-400 group-hover:text-[#FF4D94]"} transition-colors`}
              >
                <Icon name={tab.icon} size={19} />
              </div>
              <span className="truncate tracking-wide">{tab.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-100/50 dark:border-white/5">
        <button
          onClick={onProfileClick}
          className="w-full group bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 p-3.5 rounded-[24px] flex items-center gap-3.5 hover:border-[#FF4D94] hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-[0_12px_24px_-8px_rgba(255,77,148,0.2)] transition-all duration-300 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-white/10 shadow-inner group-hover:ring-2 ring-[#FF4D94]/30 transition-all">
            {currentProfile.avatarUrl ? (
              <img src={currentProfile.avatarUrl} className="w-full h-full object-cover" />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center font-bold text-white text-base ${currentProfile.avatarColor}`}
              >
                {currentProfile.name[0]}
              </div>
            )}
          </div>
          <div className="text-left overflow-hidden flex-1">
            <p className="text-sm font-bold truncate text-gray-900 dark:text-white group-hover:text-[#FF4D94] transition-colors">
              {currentProfile.name}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider group-hover:text-[#FF4D94]/70 transition-colors">
              {currentProfile.role === "admin" ? "系统管理员" : "账户成员"}
            </p>
          </div>
          <div className="text-gray-300 group-hover:text-[#FF4D94] transition-colors">
            <Icon name="settings" size={14} />
          </div>
        </button>
      </div>
    </aside>
  );
}
