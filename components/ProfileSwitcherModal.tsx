import { Profile } from '../types';

interface ProfileSwitcherModalProps {
  open: boolean;
  profiles: Profile[];
  currentProfileId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function ProfileSwitcherModal({ open, profiles, currentProfileId, onSelect, onClose }: ProfileSwitcherModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xl" onClick={onClose}></div>
      <div className="bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-2xl w-full max-w-[360px] rounded-[48px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] relative z-10 p-10 space-y-6 border border-white/20 dark:border-white/5 animate-in zoom-in-95 duration-300">
        <div className="text-center space-y-1">
          <p className="text-[10px] font-black text-[#FF4D94] uppercase tracking-[0.4em] mb-1">Account System</p>
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">切换账户身份</h3>
        </div>

        <div className="space-y-3">
          {profiles.map(p => (
            <button 
              key={p.id}
              onClick={() => { onSelect(p.id); onClose(); }}
              className={`w-full flex items-center gap-4 p-4 rounded-[32px] transition-all duration-300 group ${
                currentProfileId === p.id 
                  ? 'bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white shadow-[0_12px_24px_-8px_rgba(255,77,148,0.5)] scale-[1.02]' 
                  : 'hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-gray-100 dark:hover:border-white/10'
              }`}
            >
              <div className="relative">
                <div className={`w-14 h-14 rounded-[20px] overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 ${
                  currentProfileId === p.id ? 'border-white/40' : 'border-transparent group-hover:border-[#FF4D94]/30'
                } transition-all duration-300 shadow-md`}>
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center font-black text-white text-xl ${p.avatarColor}`}>{p.name[0]}</div>
                  )}
                </div>
                {currentProfileId === p.id && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full flex items-center justify-center animate-in zoom-in duration-500 delay-200">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="text-left overflow-hidden flex-1">
                <p className={`text-base font-black truncate ${currentProfileId === p.id ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    currentProfileId === p.id ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500'
                  }`}>
                    {p.role === 'admin' ? 'Master' : 'Member'}
                  </span>
                  {p.balance > 0 && (
                    <span className={`text-[9px] font-black points-font ${
                      currentProfileId === p.id ? 'text-white/80' : 'text-[#FF4D94]'
                    }`}>
                      {p.balance} PTS
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 hover:text-[#FF4D94] transition-colors"
        >
          取消切换
        </button>
      </div>
    </div>
  );
}
