import React, { useEffect, useState } from 'react';
import { Task, Reward, Category, Profile, UserRole } from '../types';
import { Icon } from './Icon';
import { FIXED_SYNC_ID } from '../constants';

interface SettingsSectionProps {
  profiles: Profile[];
  tasks: Task[];
  rewards: Reward[];
  taskFilter: Category | 'all';
  rewardFilter: '实物奖品' | '特权奖励' | 'all';
  onTaskFilterChange: (value: Category | 'all') => void;
  onRewardFilterChange: (value: '实物奖品' | '特权奖励' | 'all') => void;
  onEdit: (payload: { type: 'task' | 'reward'; item: any }) => void;
  onDelete: (type: 'task' | 'reward', item: any) => void;
  onSync: () => void;
  onPrint: () => void;
  onProfileNameChange: (id: string, name: string) => void;
  onAddProfile: (name: string, role: UserRole) => void;
  onDeleteProfile: (id: string) => void;
  isSyncing: boolean;
  currentSyncId?: string;
}

export function SettingsSection({
  profiles,
  tasks,
  rewards,
  taskFilter,
  rewardFilter,
  onTaskFilterChange,
  onRewardFilterChange,
  onEdit,
  onDelete,
  onSync,
  onPrint,
  onProfileNameChange,
  onAddProfile,
  onDeleteProfile,
  isSyncing,
  currentSyncId,
}: SettingsSectionProps) {
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('child');
  const [activeTab, setActiveTab] = useState<'members' | 'tasks' | 'rewards' | 'sync'>('members');

  useEffect(() => {
    setDraftNames(Object.fromEntries(profiles.map(p => [p.id, p.name])));
  }, [profiles]);

  const tabs = [
    { id: 'members', label: '成员管理' },
    { id: 'tasks', label: '任务配置' },
    { id: 'rewards', label: '商店配置' },
    { id: 'sync', label: '同步 / 打印' },
  ] as const;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-gray-900 p-8 rounded-[32px] text-white flex justify-between items-center shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px]"></div>
        <div className="relative z-10">
          <h3 className="text-lg font-bold font-display mb-1 uppercase tracking-widest">系统配置核心</h3>
          <p className="text-[10px] text-white/40 font-mono tracking-wider">SYNC ID: {currentSyncId || '未指定'}</p>
        </div>
        {activeTab === 'sync' && (
          <div className="flex gap-3 relative z-10">
            <button 
              onClick={onSync} 
              disabled={isSyncing}
              className={`px-6 py-3 rounded-2xl text-[10px] font-bold transition-all flex items-center gap-2 ${isSyncing ? 'bg-white/5 text-white/60 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'}`}
            >
              {isSyncing && <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />}同步云端
            </button>
            <button onClick={onPrint} className="px-6 py-3 bg-[#FF4D94] rounded-2xl text-[10px] font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all">打印制度手册</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all ${activeTab === tab.id ? 'bg-[#FF4D94] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:border-[#FF4D94]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'members' && (
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">成员管理</p>
              <h3 className="text-lg font-bold text-gray-900 font-display">新增 / 修改 / 删除</h3>
            </div>
          </div>
          <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
              placeholder="输入新成员姓名"
            />
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as UserRole)}
              className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
            >
              <option value="child">成员</option>
              <option value="admin">管理员</option>
            </select>
            <button
              disabled={!newName.trim()}
              onClick={() => newName.trim() && onAddProfile(newName, newRole)}
              className={`px-4 py-3 rounded-xl text-[11px] font-bold transition-all ${!newName.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#FF4D94] text-white hover:brightness-110 active:scale-95'}`}
            >
              新增成员
            </button>
          </div>

          {profiles.map(p => {
            const draft = draftNames[p.id] ?? p.name;
            const disabled = !draft.trim() || draft === p.name;
            return (
              <div key={p.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm ${p.avatarColor} shadow-inner`}>{p.name[0]}</div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${p.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-600'}`}>
                    {p.role === 'admin' ? '管理员' : '成员'}
                  </span>
                </div>
                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3">
                  <input
                    value={draft}
                    onChange={e => setDraftNames(prev => ({ ...prev, [p.id]: e.target.value }))}
                    className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
                    placeholder="输入新的姓名"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={disabled}
                      onClick={() => !disabled && onProfileNameChange(p.id, draft.trim())}
                      className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${disabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#FF4D94] text-white hover:brightness-110 active:scale-95'}`}
                    >
                      保存
                    </button>
                    <button
                      onClick={() => onDeleteProfile(p.id)}
                      className="px-4 py-2 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 transition-all"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      )}

      {activeTab === 'tasks' && (
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col h-[650px]">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-400 font-display uppercase tracking-[0.2em]">元气任务配置</h3>
              <button onClick={() => onEdit({ type: 'task', item: { category: 'learning', title: '', description: '', points: 1, frequency: '每日' } })} className="px-4 py-2 bg-gray-800 text-white rounded-xl text-[10px] font-bold flex items-center gap-2 hover:bg-black transition-all shadow-md"><Icon name="plus" size={12} /> 新增规则</button>
              <button onClick={() => onEdit({ type: 'reward', item: { title: '', description: '', points: 1, type: '实物奖品', imageUrl: '' } })} className="px-4 py-2 bg-white text-gray-800 rounded-xl text-[10px] font-bold flex items-center gap-2 hover:border hover:border-[#FF4D94] transition-all shadow-sm"><Icon name="gift" size={12} /> 新增奖品</button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['all', 'learning', 'chores', 'discipline', 'penalty'].map(cat => (
                <button 
                  key={cat} 
                  onClick={() => onTaskFilterChange(cat as Category | 'all')}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${taskFilter === cat ? 'bg-[#FF4D94] text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                >
                  {cat === 'all' ? '全部' : cat === 'learning' ? '学习' : cat === 'chores' ? '家务' : cat === 'discipline' ? '自律' : '警告'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 no-scrollbar border-t border-gray-50 pt-4 space-y-2">
            {tasks.map((t, idx) => (
              <div 
                key={t.id} 
                className={`flex items-center justify-between p-4 rounded-2xl group border border-transparent border-l-4 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-white hover:border-gray-100 group-hover:border-l-[#FF4D94]`}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <span className="text-[9px] font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-500 shrink-0 uppercase">{t.category[0]}</span>
                  <div className="overflow-hidden">
                    <span className="text-sm font-bold text-gray-800 block truncate group-hover:text-[#FF4D94]">{t.title}</span>
                    <span className="text-[11px] text-gray-400 truncate block">{t.description || '暂无详细描述'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-sm font-bold text-[#FF4D94] points-font">{t.points}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => onEdit({ type: 'task', item: t })} className="p-2 text-gray-300 hover:text-[#FF4D94] hover:bg-pink-50 rounded-lg transition-all"><Icon name="settings" size={16} /></button>
                    <button onClick={() => window.confirm(`下架任务: "${t.title}"？`) && onDelete('task', t)} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Icon name="trash" size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col h-[650px]">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-400 font-display uppercase tracking-[0.2em]">梦想商店配置</h3>
              <button onClick={() => onEdit({ type: 'reward', item: { title: '', points: 5, type: '实物奖品' } })} className="px-4 py-2 bg-[#FF4D94] text-white rounded-xl text-[10px] font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md"><Icon name="plus" size={12} /> 上架新品</button>
            </div>
            <div className="flex gap-2">
              {['all', '实物奖品', '特权奖励'].map(type => (
                <button 
                  key={type} 
                  onClick={() => onRewardFilterChange(type as '实物奖品' | '特权奖励' | 'all')}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all ${rewardFilter === type ? 'bg-[#FF4D94] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:border-[#FF4D94]'}`}
                >
                  {type === 'all' ? '全部' : type}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 no-scrollbar border-t border-gray-50 pt-4 space-y-2">
            {rewards.map((r, idx) => (
              <div 
                key={r.id} 
                className={`flex items-center justify-between p-4 rounded-2xl group border border-transparent border-l-4 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-white hover:border-pink-100 group-hover:border-l-[#FF4D94]`}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${r.type === '实物奖品' ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'}`}>
                    {r.imageUrl ? <img src={r.imageUrl} className="w-full h-full object-cover" /> : <Icon name="reward" size={18} />}
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-sm font-bold text-gray-800 block truncate group-hover:text-[#FF4D94]">{r.title}</span>
                    <span className="text-[11px] text-gray-400 block tracking-wider uppercase">{r.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-sm font-bold text-[#FF4D94] points-font">{r.points}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => onEdit({ type: 'reward', item: r })} className="p-2 text-gray-300 hover:text-[#FF4D94] hover:bg-pink-50 rounded-lg"><Icon name="settings" size={16} /></button>
                    <button onClick={() => window.confirm(`下架奖品: "${r.title}"？`) && onDelete('reward', r)} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Icon name="trash" size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sync' && (
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">同步与打印</p>
              <h3 className="text-lg font-bold text-gray-900 font-display">云端同步 / 打印</h3>
              <p className="text-xs text-gray-500 mt-1">当前 SYNC ID: {currentSyncId || '未指定'}</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={onSync} 
                disabled={isSyncing}
                className={`px-6 py-3 rounded-2xl text-[10px] font-bold transition-all flex items-center gap-2 ${isSyncing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:brightness-110 active:scale-95'}`}
              >
                {isSyncing && <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />}同步云端
              </button>
              <button onClick={onPrint} className="px-6 py-3 bg-[#FF4D94] rounded-2xl text-[10px] font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all">打印制度手册</button>
            </div>
          </div>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>同步会重新从 Supabase 读取 families / profiles / tasks / rewards / transactions 并刷新当前家庭状态。</li>
            <li>写入（任务、奖品、记账、成员）通过 Supabase 表完成，成功后会更新页面数据。</li>
            <li>若无权限或找不到家庭，将提示检查登录状态或访问链接。</li>
          </ul>
        </div>
      )}
    </div>
  );
}

