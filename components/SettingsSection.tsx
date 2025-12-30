import React, { useEffect, useMemo, useState } from 'react';
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
  onAdjustBalance: (profileId: string, payload: { title: string; points: number; type: 'earn' | 'penalty' }) => Promise<void>;
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
  onAdjustBalance,
  isSyncing,
  currentSyncId,
}: SettingsSectionProps) {
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('child');
  const [newError, setNewError] = useState<string | null>(null);
  const [newSuccess, setNewSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'tasks' | 'rewards' | 'sync'>('members');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [adjustMemo, setAdjustMemo] = useState<Record<string, string>>({});
  const [adjustPoints, setAdjustPoints] = useState<Record<string, number>>({});
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedRewardIds, setSelectedRewardIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [roleLoading, setRoleLoading] = useState<Set<string>>(new Set());
  const [deletingTask, setDeletingTask] = useState(false);
  const [deletingReward, setDeletingReward] = useState(false);

  useEffect(() => {
    setDraftNames(Object.fromEntries(profiles.map(p => [p.id, p.name])));
  }, [profiles]);

  useEffect(() => {
    setSelectedTaskIds(prev => new Set([...prev].filter(id => tasks.some(t => t.id === id))));
  }, [tasks]);

  useEffect(() => {
    setSelectedRewardIds(prev => new Set([...prev].filter(id => rewards.some(r => r.id === id))));
  }, [rewards]);

  useEffect(() => {
    setSelectedMemberIds(prev => new Set([...prev].filter(id => profiles.some(p => p.id === id))));
  }, [profiles]);

  const adminCount = useMemo(() => profiles.filter(p => p.role === 'admin').length, [profiles]);
  const overview = useMemo(() => ({
    members: profiles.length,
    admins: adminCount,
    tasks: tasks.length,
    rewards: rewards.length,
  }), [profiles.length, adminCount, tasks.length, rewards.length]);

  const handleAdjust = async (profileId: string, mode: 'earn' | 'penalty') => {
    const amount = Math.abs(Number(adjustPoints[profileId] ?? 0));
    if (!amount) {
      window.alert('请输入大于 0 的元气值');
      return;
    }
    const title = (adjustMemo[profileId] || '').trim() || (mode === 'earn' ? '管理员加分' : '管理员扣分');
    await onAdjustBalance(profileId, { title, points: amount, type: mode });
    setAdjustMemo(prev => ({ ...prev, [profileId]: '' }));
    setAdjustPoints(prev => ({ ...prev, [profileId]: 0 }));
  };

  const toggleTask = (id: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleReward = (id: string) => {
    setSelectedRewardIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleChangeRole = async (profileId: string, role: UserRole) => {
    const target = profiles.find(p => p.id === profileId);
    if (!target || target.role === role) return;
    if (target.role === 'admin' && role !== 'admin' && adminCount <= 1) {
      window.alert('至少保留一名管理员');
      return;
    }
    if (!currentSyncId) {
      window.alert('缺少 Sync ID，无法更新角色');
      return;
    }
    setRoleLoading(prev => new Set(prev).add(profileId));
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId).eq('family_id', currentSyncId);
      if (error) throw error;
      await onSync();
    } catch (e) {
      window.alert(`角色更新失败：${(e as Error)?.message || ''}`);
    } finally {
      setRoleLoading(prev => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    }
  };

  const handleBulkRole = async (role: UserRole) => {
    if (!selectedMemberIds.size) return;
    if (!currentSyncId) {
      window.alert('缺少 Sync ID，无法批量更新角色');
      return;
    }
    const selectedIds = Array.from(selectedMemberIds);
    const selectedAdmins = profiles.filter(p => selectedMemberIds.has(p.id) && p.role === 'admin').length;
    if (role !== 'admin' && adminCount - selectedAdmins <= 0) {
      window.alert('至少保留一名管理员，无法全部降级');
      return;
    }
    setRoleLoading(prev => new Set([...prev, ...selectedIds]));
    try {
      const { error } = await supabase.from('profiles').update({ role }).in('id', selectedIds).eq('family_id', currentSyncId);
      if (error) throw error;
      await onSync();
    } catch (e) {
      window.alert(`批量更新失败：${(e as Error)?.message || ''}`);
    } finally {
      setRoleLoading(new Set());
    }
  };

  const handleBulkDeleteMembers = async () => {
    if (!selectedMemberIds.size) return;
    const selectedAdmins = profiles.filter(p => selectedMemberIds.has(p.id) && p.role === 'admin').length;
    if (adminCount - selectedAdmins <= 0) {
      window.alert('至少保留一名管理员，无法删除全部管理员');
      return;
    }
    if (!window.confirm(`将删除选中的 ${selectedMemberIds.size} 位成员，包含其账单和余额记录，确认继续？`)) return;
    for (const id of Array.from(selectedMemberIds)) {
      onDeleteProfile(id);
    }
    setSelectedMemberIds(new Set());
  };

  const handleBatchDeleteTasks = async () => {
    if (!selectedTaskIds.size) return;
    if (!window.confirm(`确认删除选中的 ${selectedTaskIds.size} 个任务？`)) return;
    setDeletingTask(true);
    for (const id of Array.from(selectedTaskIds)) {
      const item = tasks.find(t => t.id === id);
      if (item) onDelete('task', item);
    }
    setSelectedTaskIds(new Set());
    setDeletingTask(false);
  };

  const handleBatchDeleteRewards = async () => {
    if (!selectedRewardIds.size) return;
    if (!window.confirm(`确认删除选中的 ${selectedRewardIds.size} 个奖品？`)) return;
    setDeletingReward(true);
    for (const id of Array.from(selectedRewardIds)) {
      const item = rewards.find(r => r.id === id);
      if (item) onDelete('reward', item);
    }
    setSelectedRewardIds(new Set());
    setDeletingReward(false);
  };

  const handleAddNew = () => {
    const trimmed = newName.trim();
    setNewError(null);
    setNewSuccess(null);
    if (!trimmed) {
      setNewError('请输入成员姓名');
      return;
    }
    if (trimmed.length > 20) {
      setNewError('姓名不超过 20 个字符');
      return;
    }
    const exists = profiles.some(p => p.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setNewError('已存在同名成员，请使用其他昵称');
      return;
    }
    onAddProfile(trimmed, newRole);
    setNewSuccess(`已新增 “${trimmed}”`);
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
            className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all min-w-[96px] text-center ${activeTab === tab.id ? 'bg-[#FF4D94] text-white shadow-md shadow-[#FF4D94]/20' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-600">
          <span>成员总数</span>
          <span className="text-lg font-black text-gray-900">{overview.members}</span>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-600">
          <span>管理员</span>
          <span className="text-lg font-black text-indigo-600">{overview.admins}</span>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-600">
          <span>任务规则</span>
          <span className="text-lg font-black text-[#FF4D94]">{overview.tasks}</span>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-600">
          <span>商店奖品</span>
          <span className="text-lg font-black text-emerald-600">{overview.rewards}</span>
        </div>
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
                  onKeyDown={e => e.key === 'Enter' && handleAddNew()}
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
                  placeholder="输入新成员姓名（回车快速提交）"
                  maxLength={32}
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
              <div className="mt-2 space-y-1">
                {newError && <p className="text-[11px] text-rose-500 font-semibold">{newError}</p>}
                {newSuccess && <p className="text-[11px] text-emerald-600 font-semibold">{newSuccess}</p>}
                <p className="text-[11px] text-gray-400 leading-relaxed">提示：新增后可在列表直接改名或删除。管理员至少保留 1 人，不能全部删除。</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.35)] flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-gray-600">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.size > 0 && selectedMemberIds.size === profiles.length && profiles.length > 0}
                    onChange={() => setSelectedMemberIds(selectedMemberIds.size === profiles.length ? new Set() : new Set(profiles.map(p => p.id)))}
                    className="rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                  />
                  <span>全选成员 ({selectedMemberIds.size}/{profiles.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={!selectedMemberIds.size}
                    onClick={() => handleBulkRole('admin')}
                    className={`px-3 py-2 rounded-xl font-bold ${!selectedMemberIds.size ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'}`}
                  >
                    设为管理员
                  </button>
                  <button
                    disabled={!selectedMemberIds.size || adminCount <= 1 && Array.from(selectedMemberIds).some(id => profiles.find(p => p.id === id && p.role === 'admin'))}
                    onClick={() => handleBulkRole('child')}
                    className={`px-3 py-2 rounded-xl font-bold ${!selectedMemberIds.size ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-700 border border-gray-200 hover:border-[#FF4D94]/40 hover:text-[#FF4D94]'}`}
                  >
                    降为成员
                  </button>
                  <button
                    disabled={!selectedMemberIds.size || adminCount - profiles.filter(p => selectedMemberIds.has(p.id) && p.role === 'admin').length <= 0}
                    onClick={handleBulkDeleteMembers}
                    className={`px-3 py-2 rounded-xl font-bold border ${!selectedMemberIds.size ? 'bg-gray-100 text-gray-400 border-gray-100' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}`}
                  >
                    批量删除
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                {profiles.length === 0 && (
                  <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center text-sm text-gray-500 bg-gray-50">
                    暂无成员，先在上方输入姓名新增一位吧。
                  </div>
                )}
                {profiles.map(p => {
                  const draft = draftNames[p.id] ?? p.name;
                  const disabled = !draft.trim() || draft === p.name;
                  const isOnlyAdmin = p.role === 'admin' && adminCount <= 1;
                  const loadingRole = roleLoading.has(p.id);
                  return (
                    <div key={p.id} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.45)]">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.has(p.id)}
                            onChange={() => toggleMember(p.id)}
                            className="rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                          />
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm ${p.avatarColor} shadow-inner uppercase`}>{p.name[0]}</div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900 truncate max-w-[180px]">{p.name}</span>
                              <select
                                value={p.role}
                                onChange={e => handleChangeRole(p.id, e.target.value as UserRole)}
                                disabled={isOnlyAdmin || loadingRole}
                                className={`px-3 py-1 rounded-full text-[11px] font-bold border ${p.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-100 text-gray-600 border-gray-200'} ${loadingRole ? 'opacity-70 cursor-not-allowed' : ''}`}
                              >
                                <option value="admin">管理员</option>
                                <option value="child">成员</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                              <span className="font-bold text-gray-700">余额</span>
                              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 text-emerald-700 border border-emerald-100 shadow-inner points-font">
                                {p.balance}
                              </span>
                              <span className="text-gray-400">ID: {p.id}</span>
                            </div>
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
                              disabled={isOnlyAdmin}
                              onClick={() => !isOnlyAdmin && window.confirm(`确定删除成员“${p.name}”吗？此操作将清除其账单和余额记录。`) && onDeleteProfile(p.id)}
                              className={`px-4 py-2.5 rounded-xl text-[11px] font-bold border transition-all ${isOnlyAdmin ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-white text-gray-500 hover:text-rose-600 hover:bg-rose-50 border-gray-200'}`}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-12 lg:items-center">
                        <div className="md:col-span-5 flex flex-col gap-1">
                          <label className="text-[11px] text-gray-400 font-semibold">调整说明</label>
                          <input
                            value={adjustMemo[p.id] ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdjustMemo(prev => ({ ...prev, [p.id]: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
                            placeholder="如：奖励完成作业 / 迟到扣分"
                          />
                        </div>
                        <div className="md:col-span-3 flex flex-col gap-1">
                          <label className="text-[11px] text-gray-400 font-semibold">元气值</label>
                          <input
                            type="number"
                            value={Number.isFinite(adjustPoints[p.id]) ? adjustPoints[p.id] : ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const value = Number(e.target.value);
                              setAdjustPoints(prev => ({ ...prev, [p.id]: Number.isFinite(value) ? value : 0 }));
                            }}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
                            placeholder="输入数值"
                          />
                        </div>
                        <div className="md:col-span-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleAdjust(p.id, 'earn')}
                            className="flex-1 min-w-[140px] px-4 py-3 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all"
                          >
                            增加元气值
                          </button>
                          <button
                            onClick={() => handleAdjust(p.id, 'penalty')}
                            className="flex-1 min-w-[140px] px-4 py-3 rounded-xl text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all"
                          >
                            扣减元气值
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      )}

      {activeTab === 'tasks' && (
        <div className="bg-white p-6 rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 flex flex-col h-[650px]">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-400 font-display uppercase tracking-[0.2em]">元气任务配置</h3>
                <p className="text-xs text-gray-400">分类筛选 + 快速新增任务</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onEdit({ type: 'task', item: { category: 'learning', title: '', description: '', points: 1, frequency: '每日' } })} className="px-4 py-2 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-xl text-[11px] font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#FF4D94]/30">
                  <Icon name="plus" size={12} /> 新增规则
                </button>
                <button
                  disabled={!selectedTaskIds.size || deletingTask}
                  onClick={handleBatchDeleteTasks}
                  className={`px-4 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2 border transition-all ${!selectedTaskIds.size || deletingTask ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}`}
                >
                  {deletingTask ? '删除中...' : `批量删除 (${selectedTaskIds.size})`}
                </button>
                <button
                  onClick={() => setSelectedTaskIds(new Set())}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D94]/50 hover:text-[#FF4D94] transition-all"
                >
                  清空选择
                </button>
              </div>
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
          <div className="flex-1 overflow-y-auto pr-2 no-scrollbar border-t border-gray-50 pt-4">
            <div className="flex items-center justify-between text-[12px] text-gray-500 mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTaskIds.size > 0 && selectedTaskIds.size === tasks.length}
                  onChange={() => setSelectedTaskIds(selectedTaskIds.size === tasks.length ? new Set() : new Set(tasks.map(t => t.id)))}
                  className="rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                />
                <span>全选任务 ({selectedTaskIds.size}/{tasks.length})</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {tasks.map(t => (
                <div 
                  key={t.id} 
                  className="flex items-center justify-between p-3 sm:p-4 rounded-2xl group border bg-white border-gray-100 hover:border-[#FF4D94]/30 hover:shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)] transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.has(t.id)}
                      onChange={() => toggleTask(t.id)}
                      className="rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                    />
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-gray-600 shrink-0 uppercase tracking-wide">{t.category[0]}</span>
                    <div className="overflow-hidden">
                      <span className="text-sm font-bold text-gray-800 block truncate group-hover:text-[#FF4D94]">{t.title}</span>
                      <span className="text-[11px] text-gray-400 truncate block">{t.description || '暂无详细描述'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm font-black text-[#FF4D94] points-font bg-[#FFF2F7] px-3 py-1 rounded-xl">{t.points}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => onEdit({ type: 'task', item: t })} className="p-2 text-gray-300 hover:text-[#FF4D94] hover:bg-pink-50 rounded-lg transition-all"><Icon name="settings" size={16} /></button>
                      <button onClick={() => window.confirm(`下架任务: \"${t.title}\"？`) && onDelete('task', t)} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Icon name="trash" size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="bg-white p-6 rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 flex flex-col h-[650px]">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-400 font-display uppercase tracking-[0.2em]">梦想商店配置</h3>
                <p className="text-xs text-gray-400">筛选类别 / 上架新品</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onEdit({ type: 'reward', item: { title: '', points: 5, type: '实物奖品' } })} className="px-4 py-2 bg-gradient-to-r from-[#111827] to-[#0F172A] text-white rounded-xl text-[11px] font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#0F172A]/20">
                  <Icon name="plus" size={12} /> 上架新品
                </button>
                <button
                  disabled={!selectedRewardIds.size || deletingReward}
                  onClick={handleBatchDeleteRewards}
                  className={`px-4 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2 border transition-all ${!selectedRewardIds.size || deletingReward ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}`}
                >
                  {deletingReward ? '删除中...' : `批量删除 (${selectedRewardIds.size})`}
                </button>
                <button
                  onClick={() => setSelectedRewardIds(new Set())}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D94]/50 hover:text-[#FF4D94] transition-all"
                >
                  清空选择
                </button>
              </div>
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
          <div className="flex-1 overflow-y-auto pr-2 no-scrollbar border-t border-gray-50 pt-4">
            <div className="flex items-center justify-between text-[12px] text-gray-500 mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedRewardIds.size > 0 && selectedRewardIds.size === rewards.length}
                  onChange={() => setSelectedRewardIds(selectedRewardIds.size === rewards.length ? new Set() : new Set(rewards.map(r => r.id)))}
                  className="rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                />
                <span>全选奖品 ({selectedRewardIds.size}/{rewards.length})</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {rewards.map(r => (
                <div 
                  key={r.id} 
                  className="flex items-center justify-between p-3 sm:p-4 rounded-2xl group border bg-white border-gray-100 hover:border-[#FF4D94]/30 hover:shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)] transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <input
                      type="checkbox"
                      checked={selectedRewardIds.has(r.id)}
                      onChange={() => toggleReward(r.id)}
                      className="rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                    />
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${r.type === '实物奖品' ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'}`}> 
                      <img src={r.imageUrl || `https://ui-avatars.com/api/?background=FF4D94&color=fff&name=${encodeURIComponent(r.title)}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-sm font-bold text-gray-800 block truncate group-hover:text-[#FF4D94]">{r.title}</span>
                      <span className="text-[11px] text-gray-400 block tracking-wider uppercase">{r.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm font-black text-[#FF4D94] points-font bg-[#FFF2F7] px-3 py-1 rounded-xl">{r.points}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => onEdit({ type: 'reward', item: r })} className="p-2 text-gray-300 hover:text-[#FF4D94] hover:bg-pink-50 rounded-lg"><Icon name="settings" size={16} /></button>
                      <button onClick={() => window.confirm(`下架奖品: \"${r.title}\"？`) && onDelete('reward', r)} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Icon name="trash" size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

