import React from 'react';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-[340px] rounded-[40px] shadow-2xl relative z-10 p-8 space-y-5 border border-gray-50 animate-in zoom-in-95 duration-200">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center mb-2">切换账户身份</p>
        {profiles.map(p => (
          <button 
            key={p.id}
            onClick={() => { onSelect(p.id); onClose(); }}
            className={`w-full flex items-center gap-5 p-4 rounded-[24px] transition-all ${currentProfileId === p.id ? 'bg-[#FF4D94] text-white shadow-xl scale-105' : 'hover:bg-gray-50'}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-lg ${p.avatarColor} border-2 border-white/20`}>{p.name[0]}</div>
            <div className="text-left overflow-hidden">
              <p className="text-base font-bold truncate font-display">{p.name}</p>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${currentProfileId === p.id ? 'text-white/60' : 'text-gray-400'}`}>{p.role === 'admin' ? '系统管理员' : '账户成员'}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
