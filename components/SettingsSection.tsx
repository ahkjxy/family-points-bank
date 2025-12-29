import React, { useEffect, useState } from 'react';
import { Task, Reward, Category, Profile, UserRole } from '../types';
import { Icon } from './Icon';
import { FIXED_SYNC_ID } from '../constants';
import { supabase } from '../supabaseClient';

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
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftNames(Object.fromEntries(profiles.map(p => [p.id, p.name])));
  }, [profiles]);

  const handleAddNew = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddProfile(trimmed, newRole);
    setNewName('');
    setNewRole('child');
  };

  const handleSendReset = async () => {
    const trimmed = resetEmail.trim();
    if (!trimmed) return;
    setResetLoading(true);
    setResetMessage(null);
    try {
      const redirectTo = `${window.location.origin}/${currentSyncId || ''}/dashboard`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (error) throw error;
      setResetMessage('重置邮件已发送，请让用户查收并点击邮件中的链接设置新密码。');
    } catch (e) {
      setResetMessage(`发送失败：${(e as Error)?.message || '请稍后重试'}`);
    } finally {
      setResetLoading(false);
    }
  };

  const tabs = [
    { id: 'members', label: '成员管理' },
    { id: 'tasks', label: '任务配置' },
    { id: 'rewards', label: '商店配置' },
    { id: 'sync', label: '同步 / 打印' },
  ] as const;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-gradient-to-r from-[#0F172A] via-[#111827] to-[#1F2937] p-8 rounded-[32px] text-white flex flex-col md:flex-row md:justify-between md:items-center shadow-2xl relative overflow-hidden border border-white/10 gap-4">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/25 rounded-full blur-[60px]"></div>
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-[0.25em]">
            <span className="w-2 h-2 rounded-full bg-[#FF4D94] shadow-[0_0_0_4px_rgba(255,77,148,0.15)]" />
            System Hub
          </div>
          <h3 className="text-xl font-bold font-display">系统配置核心</h3>
          <p className="text-[10px] text-white/60 font-mono tracking-wider">SYNC ID: {currentSyncId || '未指定'}</p>
        </div>
        {activeTab === 'sync' ? (
          <div className="flex flex-wrap gap-3 relative z-10">
            <button 
              onClick={onSync} 
              disabled={isSyncing}
              className={`px-6 py-3 rounded-2xl text-[11px] font-bold transition-all flex items-center gap-2 shadow-lg shadow-black/20 ${isSyncing ? 'bg-white/10 text-white/60 cursor-not-allowed' : 'bg-white/15 text-white hover:bg-white/25 active:scale-95'}`}
            >
              {isSyncing && <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />}同步云端
            </button>
            <button onClick={onPrint} className="px-6 py-3 bg-[#FF4D94] rounded-2xl text-[11px] font-bold shadow-lg shadow-[#FF4D94]/40 hover:brightness-110 active:scale-95 transition-all">打印制度手册</button>
          </div>
        ) : (
          <div className="relative z-10 text-xs text-white/70 space-y-1">
            <p>请先进入“同步 / 打印”页签以执行同步或打印操作。</p>
          </div>
        )}
      </div>


      <div className="flex flex-wrap gap-2 bg-white/60 backdrop-blur rounded-2xl p-2 border border-gray-100 shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all min-w-[96px] text-center ${activeTab === tab.id ? 'bg-[#FF4D94] text-white shadow-md shadow-[#FF4D94]/20' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]'} ${tab.id === 'tasks' ? 'order-first' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'members' && (
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">成员管理</p>
              <h3 className="text-lg font-bold text-gray-900 font-display">新增 / 修改 / 删除</h3>
              <p className="text-xs text-gray-500 mt-1">支持快速录入、改名和移除成员，至少保留一名管理员。</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-gray-100 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)]">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
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
                  onClick={handleAddNew}
                  className={`px-5 py-3 rounded-xl text-[11px] font-bold transition-all ${!newName.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white shadow-md shadow-[#FF4D94]/30 hover:brightness-110 active:scale-95'}`}
                >
                  新增成员
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">提示：新增后可在列表直接改名或删除。管理员至少保留 1 人，不能全部删除。</p>
            </div>

            <div className="grid gap-3">
              {profiles.map(p => {
                const draft = draftNames[p.id] ?? p.name;
                const disabled = !draft.trim() || draft === p.name;
                return (
                  <div key={p.id} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.45)]">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm ${p.avatarColor} shadow-inner uppercase`}>{p.name[0]}</div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 truncate max-w-[180px]">{p.name}</span>
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${p.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-600'}`}>
                              {p.role === 'admin' ? '管理员' : '成员'}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400">ID: {p.id}</span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3">
                        <input
                          value={draft}
                          onChange={e => setDraftNames(prev => ({ ...prev, [p.id]: e.target.value }))}
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
                          placeholder="输入新的姓名"
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={disabled}
                            onClick={() => !disabled && onProfileNameChange(p.id, draft.trim())}
                            className={`px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all ${disabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#FF4D94] text-white hover:brightness-110 active:scale-95'}`}
                          >
                            保存
                          </button>
                          <button
                            onClick={() => window.confirm(`确定删除成员“${p.name}”吗？`) && onDeleteProfile(p.id)}
                            className="px-4 py-2.5 rounded-xl text-[11px] font-bold bg-white text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 transition-all"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      )}

      {activeTab === 'tasks' && (
        <div className="bg-white p-6 rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 flex flex-col h-[650px]">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-400 font-display uppercase tracking-[0.2em]">元气任务配置</h3>
                <p className="text-xs text-gray-400">分类筛选 + 快速新增任务</p>
              </div>
              <button onClick={() => onEdit({ type: 'task', item: { category: 'learning', title: '', description: '', points: 1, frequency: '每日' } })} className="px-4 py-2 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-xl text-[11px] font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#FF4D94]/30">
                <Icon name="plus" size={12} /> 新增规则
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['all', 'learning', 'chores', 'discipline', 'penalty'].map(cat => (
                <button 
                  key={cat} 
                  onClick={() => onTaskFilterChange(cat as Category | 'all')}
                  className={`px-4 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${taskFilter === cat ? 'bg-[#FF4D94] text-white border-[#FF4D94] shadow-md shadow-[#FF4D94]/30' : 'bg-white border-gray-200 text-gray-500 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]'}`}
                >
                  {cat === 'all' ? '全部' : cat === 'learning' ? '学习' : cat === 'chores' ? '家务' : cat === 'discipline' ? '自律' : '警告'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 no-scrollbar border-t border-gray-50 pt-4 space-y-3">
            {tasks.map((t, idx) => (
              <div 
                key={t.id} 
                className={`flex items-center justify-between p-4 rounded-2xl group border transition-all ${idx % 2 === 0 ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100/70'} hover:bg-white hover:border-[#FF4D94]/30 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)]`}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-gray-600 shrink-0 uppercase tracking-wide">{t.category[0]}</span>
                  <div className="overflow-hidden">
                    <span className="text-sm font-bold text-gray-800 block truncate group-hover:text-[#FF4D94]">{t.title}</span>
                    <span className="text-[11px] text-gray-400 truncate block">{t.description || '暂无详细描述'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-sm font-black text-[#FF4D94] points-font bg-[#FFF2F7] px-3 py-1 rounded-xl">{t.points}</span>
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
        <div className="bg-white p-6 rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 flex flex-col h-[650px]">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-400 font-display uppercase tracking-[0.2em]">梦想商店配置</h3>
                <p className="text-xs text-gray-400">筛选类别 / 上架新品</p>
              </div>
              <button onClick={() => onEdit({ type: 'reward', item: { title: '', points: 5, type: '实物奖品' } })} className="px-4 py-2 bg-gradient-to-r from-[#111827] to-[#0F172A] text-white rounded-xl text-[11px] font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#0F172A]/20">
                <Icon name="plus" size={12} /> 上架新品
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['all', '实物奖品', '特权奖励'].map(type => (
                <button 
                  key={type} 
                  onClick={() => onRewardFilterChange(type as '实物奖品' | '特权奖励' | 'all')}
                  className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all border ${rewardFilter === type ? 'bg-[#FF4D94] text-white border-[#FF4D94] shadow-md shadow-[#FF4D94]/30' : 'bg-white border-gray-200 text-gray-500 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]'}`}
                >
                  {type === 'all' ? '全部' : type}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 no-scrollbar border-t border-gray-50 pt-4 space-y-3">
            {rewards.map((r, idx) => (
              <div 
                key={r.id} 
                className={`flex items-center justify-between p-4 rounded-2xl group border transition-all ${idx % 2 === 0 ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100/70'} hover:bg-white hover:border-[#FF4D94]/30 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)]`}
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
                  <span className="text-sm font-black text-[#FF4D94] points-font bg-[#FFF2F7] px-3 py-1 rounded-xl">{r.points}</span>
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
        <div className="bg-white p-6 rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">同步与打印</p>
              <h3 className="text-lg font-bold text-gray-900 font-display">云端同步 / 打印</h3>
              <p className="text-xs text-gray-500">当前 SYNC ID: {currentSyncId || '未指定'}</p>
            </div>
          </div>
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside bg-[#F8FAFC] rounded-2xl p-4 border border-gray-100">
            <li>同步会重新从 Supabase 读取 families / profiles / tasks / rewards / transactions 并刷新当前家庭状态。</li>
            <li>写入（任务、奖品、记账、成员）通过 Supabase 表完成，成功后会更新页面数据。</li>
            <li>若无权限或找不到家庭，将提示检查登录状态或访问链接。</li>
          </ul>

          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Icon name="info" size={16} />
              <span>给指定邮箱发送“重置密码”邮件</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <input
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
                placeholder="输入用户邮箱"
                type="email"
              />
              <button
                disabled={!resetEmail.trim() || resetLoading}
                onClick={handleSendReset}
                className={`px-5 py-3 rounded-xl text-[11px] font-bold transition-all ${!resetEmail.trim() || resetLoading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#111827] to-[#0F172A] text-white shadow-md shadow-[#0F172A]/20 hover:brightness-110 active:scale-95'}`}
              >
                {resetLoading ? '发送中...' : '发送重置邮件'}
              </button>
            </div>
            {resetMessage && <p className="text-[12px] text-gray-500 leading-relaxed">{resetMessage}</p>}
            <p className="text-[11px] text-gray-400 leading-relaxed">说明：Supabase 将向该邮箱发送重置链接，用户点击邮件后即可设置新密码。若需自定义跳转地址，可调整 redirectTo。</p>
          </div>
        </div>
      )}
    </div>
  );
}

