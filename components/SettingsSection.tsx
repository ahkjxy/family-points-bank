import { useEffect, useMemo, useState } from 'react';
import { Task, Reward, Category, Profile, UserRole } from '../types';
import { Icon } from './Icon';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';

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
  onUpdateProfileAvatar: (id: string, avatarUrl: string | null) => void;
  onAddProfile: (name: string, role: UserRole, balance?: number, avatarUrl?: string | null) => void;
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
  onUpdateProfileAvatar,
  onAddProfile,
  onDeleteProfile,
  onAdjustBalance,
  isSyncing,
  currentSyncId,
}: SettingsSectionProps) {
  const { showToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    tone?: 'primary' | 'danger';
    onConfirm: () => void;
  } | null>(null);
  const closeConfirm = () => setConfirmDialog(null);
  const [activeTab, setActiveTab] = useState<'members' | 'tasks' | 'rewards' | 'sync'>('members');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedRewardIds, setSelectedRewardIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [roleLoading, setRoleLoading] = useState<Set<string>>(new Set());
  const [deletingTask, setDeletingTask] = useState(false);
  const [deletingReward, setDeletingReward] = useState(false);
  const [memberModal, setMemberModal] = useState<{ mode: 'create' | 'edit'; profile?: Profile } | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalRole, setModalRole] = useState<UserRole>('child');
  const [modalInitialBalance, setModalInitialBalance] = useState<number | ''>('');
  const [modalAvatar, setModalAvatar] = useState<string | null>(null);
  const [modalInitialAvatar, setModalInitialAvatar] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  const [adjustModal, setAdjustModal] = useState<Profile | null>(null);
  const [adjustPoints, setAdjustPoints] = useState<number>(0);
  const [adjustMemo, setAdjustMemo] = useState('');
  const [adjustType, setAdjustType] = useState<'earn' | 'penalty'>('earn');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustLoading, setAdjustLoading] = useState(false);

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
      showToast({ type: 'error', title: '至少保留一名管理员' });
      return;
    }
    if (!currentSyncId) {
      showToast({ type: 'error', title: '缺少 Sync ID，无法更新角色' });
      return;
    }
    setRoleLoading(prev => new Set(prev).add(profileId));
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId).eq('family_id', currentSyncId);
      if (error) throw error;
      await onSync();
      showToast({ type: 'success', title: '角色已更新' });
    } catch (e) {
      showToast({ type: 'error', title: '角色更新失败', description: (e as Error)?.message || '' });
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
      showToast({ type: 'error', title: '缺少 Sync ID，无法批量更新角色' });
      return;
    }
    const selectedIds = Array.from(selectedMemberIds);
    const selectedAdmins = profiles.filter(p => selectedMemberIds.has(p.id) && p.role === 'admin').length;
    if (role !== 'admin' && adminCount - selectedAdmins <= 0) {
      showToast({ type: 'error', title: '至少保留一名管理员，无法全部降级' });
      return;
    }
    setRoleLoading(prev => new Set([...prev, ...selectedIds]));
    try {
      const { error } = await supabase.from('profiles').update({ role }).in('id', selectedIds).eq('family_id', currentSyncId);
      if (error) throw error;
      await onSync();
      showToast({ type: 'success', title: '角色批量更新成功' });
    } catch (e) {
      showToast({ type: 'error', title: '批量更新失败', description: (e as Error)?.message || '' });
    } finally {
      setRoleLoading(new Set());
    }
  };

  const handleBulkDeleteMembers = () => {
    if (!selectedMemberIds.size) return;
    const selectedAdmins = profiles.filter(p => selectedMemberIds.has(p.id) && p.role === 'admin').length;
    if (adminCount - selectedAdmins <= 0) {
      showToast({ type: 'error', title: '至少保留一名管理员，无法删除全部管理员' });
      return;
    }
    const idsToDelete: string[] = Array.from(selectedMemberIds);
    setConfirmDialog({
      title: `确认删除 ${idsToDelete.length} 位成员？`,
      description: '将同步删除其账单和余额记录，此操作不可恢复。',
      confirmText: '确认删除',
      tone: 'danger',
      onConfirm: () => {
        idsToDelete.forEach(id => onDeleteProfile(id));
        setSelectedMemberIds(new Set());
        showToast({ type: 'success', title: '成员删除已提交' });
        closeConfirm();
      },
    });
  };

  const handleBatchDeleteTasks = () => {
    if (!selectedTaskIds.size) return;
    const idsToDelete = Array.from(selectedTaskIds);
    setConfirmDialog({
      title: `确认删除 ${idsToDelete.length} 个任务？`,
      description: '删除后无法恢复，相关配置将被移除。',
      confirmText: '确认删除',
      tone: 'danger',
      onConfirm: () => {
        setDeletingTask(true);
        idsToDelete.forEach(id => {
          const item = tasks.find(t => t.id === id);
          if (item) onDelete('task', item);
        });
        setSelectedTaskIds(new Set());
        setDeletingTask(false);
        showToast({ type: 'success', title: '任务删除已提交' });
        closeConfirm();
      },
    });
  };

  const handleBatchDeleteRewards = () => {
    if (!selectedRewardIds.size) return;
    const idsToDelete = Array.from(selectedRewardIds);
    setConfirmDialog({
      title: `确认删除 ${idsToDelete.length} 个奖品？`,
      description: '删除后无法恢复，将从商店下架并移除。',
      confirmText: '确认删除',
      tone: 'danger',
      onConfirm: () => {
        setDeletingReward(true);
        idsToDelete.forEach(id => {
          const item = rewards.find(r => r.id === id);
          if (item) onDelete('reward', item);
        });
        setSelectedRewardIds(new Set());
        setDeletingReward(false);
        showToast({ type: 'success', title: '奖品删除已提交' });
        closeConfirm();
      },
    });
  };

  const openCreateModal = () => {
    setMemberModal({ mode: 'create' });
    setModalName('');
    setModalRole('child');
    setModalInitialBalance('');
    setModalAvatar(null);
    setModalInitialAvatar(null);
    setModalError(null);
  };

  const openEditModal = (profile: Profile) => {
    setMemberModal({ mode: 'edit', profile });
    setModalName(profile.name);
    setModalRole(profile.role);
    setModalInitialBalance('');
    setModalAvatar(profile.avatarUrl || null);
    setModalInitialAvatar(profile.avatarUrl || null);
    setModalError(null);
  };

  const closeModal = () => setMemberModal(null);

  const handleModalSave = async () => {
    setModalError(null);
    const trimmed = modalName.trim();
    if (!trimmed) {
      setModalError('请输入姓名');
      return;
    }
    if (trimmed.length > 20) {
      setModalError('姓名不超过 20 个字符');
      return;
    }
    const duplicate = profiles.some(p => p.name.trim().toLowerCase() === trimmed.toLowerCase() && p.id !== memberModal?.profile?.id);
    if (duplicate) {
      setModalError('已存在同名成员');
      return;
    }
    setModalSaving(true);
    try {
      if (memberModal?.mode === 'create') {
        await onAddProfile(
          trimmed,
          modalRole,
          modalInitialBalance === '' ? undefined : Number(modalInitialBalance),
          modalAvatar || null
        );
      } else if (memberModal?.mode === 'edit' && memberModal.profile) {
        if (trimmed !== memberModal.profile.name) {
          await onProfileNameChange(memberModal.profile.id, trimmed);
        }
        if (modalRole !== memberModal.profile.role) {
          await handleChangeRole(memberModal.profile.id, modalRole);
        }
        if (modalAvatar !== modalInitialAvatar) {
          await onUpdateProfileAvatar(memberModal.profile.id, modalAvatar || null);
          setModalInitialAvatar(modalAvatar || null);
        }
      }
      closeModal();
    } catch (e) {
      setModalError((e as Error)?.message || '保存失败，请重试');
    } finally {
      setModalSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setModalAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const openAdjustModal = (profile: Profile) => {
    setAdjustModal(profile);
    setAdjustPoints(0);
    setAdjustMemo('');
    setAdjustType('earn');
    setAdjustError(null);
  };

  const closeAdjustModal = () => {
    setAdjustModal(null);
    setAdjustPoints(0);
    setAdjustMemo('');
    setAdjustType('earn');
    setAdjustError(null);
    setAdjustLoading(false);
  };

  const handleModalAdjust = async () => {
    if (!adjustModal) return;
    setAdjustError(null);
    const amount = Math.abs(Number(adjustPoints));
    if (!amount) {
      setAdjustError('请输入大于 0 的元气值');
      return;
    }
    const title = adjustMemo.trim() || (adjustType === 'earn' ? '管理员加分' : '管理员扣分');
    try {
      setAdjustLoading(true);
      await onAdjustBalance(adjustModal.id, { title, points: amount, type: adjustType });
      showToast({ type: 'success', title: '已记录元气值', description: `${adjustModal.name}: ${adjustType === 'earn' ? '+' : '-'}${amount}` });
      closeAdjustModal();
    } catch (e) {
      setAdjustError((e as Error)?.message || '调整失败，请稍后重试');
      setAdjustLoading(false);
    }
  };

  const handleModalDelete = () => {
    if (!memberModal?.profile) return;
    const target = memberModal.profile;
    const isOnlyAdmin = target.role === 'admin' && adminCount <= 1;
    if (isOnlyAdmin) {
      setModalError('至少保留一名管理员');
      return;
    }
    showToast({ type: 'info', title: `已提交删除 ${target.name}`, description: '相关账单与余额记录将被清除' });
    onDeleteProfile(target.id);
    closeModal();
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
        <div className="bg-gradient-to-r from-[#0F172A] via-[#111827] to-[#1F2937] p-5 sm:p-8 rounded-[32px] text-white flex flex-col md:flex-row md:justify-between md:items-center shadow-2xl relative overflow-hidden border border-white/10 gap-4">
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


      <div className="flex flex-wrap gap-2 bg-white/60 backdrop-blur rounded-2xl p-2 border border-gray-100 shadow-sm mobile-card overflow-x-auto no-scrollbar">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mobile-tight">
        <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-600 mobile-card">
          <span>成员总数</span>
          <span className="text-lg font-black text-gray-900">{overview.members}</span>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-600 mobile-card">
          <span>管理员</span>
          <span className="text-lg font-black text-indigo-600">{overview.admins}</span>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-600 mobile-card">
          <span>任务规则</span>
          <span className="text-lg font-black text-[#FF4D94]">{overview.tasks}</span>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-600 mobile-card">
          <span>商店奖品</span>
          <span className="text-lg font-black text-emerald-600">{overview.rewards}</span>
        </div>
      </div>

      {activeTab === 'members' && (
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 space-y-4 mobile-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">成员管理</p>
              <h3 className="text-lg font-bold text-gray-900 font-display">新增 / 修改 / 删除</h3>
              <p className="text-xs text-gray-500 mt-1">支持快速录入、改名和移除成员，至少保留一名管理员。</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="p-4 rounded-2xl border border-gray-100 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-bold">快速新增成员</p>
                <p className="text-[12px]">点击打开弹窗，录入姓名与角色</p>
              </div>
              <button
                onClick={openCreateModal}
                className="px-5 py-3 rounded-xl text-[11px] font-bold bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white shadow-md shadow-[#FF4D94]/30 hover:brightness-110 active:scale-95"
              >
                新增成员
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-white/90 border border-gray-100 shadow-[0_12px_36px_-24px_rgba(15,23,42,0.35)] flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-600">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-100 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#FF4D94]" />
                    <span>成员选择</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />管理员 {adminCount}
                  </div>
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-500 font-semibold">
                    已选 {selectedMemberIds.size} / {profiles.length}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={!selectedMemberIds.size}
                    onClick={() => handleBulkRole('admin')}
                    className={`px-3 py-2 rounded-xl font-bold text-[12px] shadow-sm transition-all ${!selectedMemberIds.size ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:brightness-105 active:scale-95'}`}
                  >
                    设为管理员
                  </button>
                  <button
                    disabled={!selectedMemberIds.size || adminCount <= 1 && Array.from(selectedMemberIds).some(id => profiles.find(p => p.id === id && p.role === 'admin'))}
                    onClick={() => handleBulkRole('child')}
                    className={`px-3 py-2 rounded-xl font-bold text-[12px] transition-all ${!selectedMemberIds.size ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:brightness-105 active:scale-95'}`}
                  >
                    降为成员
                  </button>
                  <button
                    disabled={!selectedMemberIds.size || adminCount - profiles.filter(p => selectedMemberIds.has(p.id) && p.role === 'admin').length <= 0}
                    onClick={handleBulkDeleteMembers}
                    className={`px-3 py-2 rounded-xl font-bold text-[12px] border transition-all ${!selectedMemberIds.size ? 'bg-gray-100 text-gray-400 border-gray-100' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 active:scale-95'}`}
                  >
                    批量删除
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[12px] text-gray-600 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedMemberIds.size > 0 && selectedMemberIds.size === profiles.length && profiles.length > 0}
                  onChange={() => setSelectedMemberIds(selectedMemberIds.size === profiles.length ? new Set() : new Set(profiles.map(p => p.id)))}
                  className="w-5 h-5 rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                />
                <span className="font-semibold">全选当前家庭成员</span>
                <span className="text-gray-400">({selectedMemberIds.size}/{profiles.length})</span>
              </div>

              <div className="grid gap-3">
                {profiles.length === 0 && (
                  <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center text-sm text-gray-500 bg-gray-50">
                    暂无成员，点击“新增成员”先添加一位吧。
                  </div>
                )}
                {profiles.map(p => {
                  const isOnlyAdmin = p.role === 'admin' && adminCount <= 1;
                  const loadingRole = roleLoading.has(p.id);
                  return (
                    <div key={p.id} className="p-4 rounded-2xl bg-white/90 border border-gray-100 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)]">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedMemberIds.has(p.id)}
                              onChange={() => toggleMember(p.id)}
                              className="mt-1 w-5 h-5 rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                            />
                            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-inner shrink-0 flex items-center justify-center bg-gray-100">
                              {p.avatarUrl ? (
                                <img src={p.avatarUrl} className="w-full h-full object-cover" />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center font-bold text-white text-base ${p.avatarColor} uppercase`}>{p.name[0]}</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-bold text-gray-900 truncate max-w-[240px]">{p.name}</span>
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${p.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{p.role === 'admin' ? '管理员' : '成员'}</span>
                                <select
                                  value={p.role}
                                  onChange={e => handleChangeRole(p.id, e.target.value as UserRole)}
                                  disabled={isOnlyAdmin || loadingRole}
                                  className={`px-3 py-1 rounded-full text-[11px] font-bold border bg-white ${loadingRole ? 'opacity-70 cursor-not-allowed' : 'hover:border-[#FF4D94]/60'} ${p.role === 'admin' ? 'text-indigo-700 border-indigo-100' : 'text-gray-700 border-gray-200'}`}
                                >
                                  <option value="admin">管理员</option>
                                  <option value="child">成员</option>
                                </select>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                                <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 text-emerald-700 border border-emerald-100 shadow-inner points-font">余额 {p.balance}</span>
                                <span className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-gray-500">ID: {p.id}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2 shrink-0 min-w-[190px]">
                            <button
                              onClick={() => openEditModal(p)}
                              className="px-4 py-2 rounded-xl text-[12px] font-bold bg-white border border-gray-200 text-gray-700 hover:border-[#FF4D94] hover:text-[#FF4D94] transition-all shadow-sm"
                            >
                              编辑头像 / 资料
                            </button>
                            <button
                              onClick={() => openAdjustModal(p)}
                              className="px-4 py-2 rounded-xl text-[12px] font-bold bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white shadow-md shadow-[#FF4D94]/30 hover:brightness-110 active:scale-95"
                            >
                              调整元气值
                            </button>
                            <button
                              disabled={isOnlyAdmin}
                              onClick={() => {
                                if (isOnlyAdmin) return;
                                setConfirmDialog({
                                  title: `删除成员“${p.name}”？`,
                                  description: '将同步删除其账单和余额记录，此操作不可恢复。',
                                  confirmText: '确认删除',
                                  tone: 'danger',
                          onConfirm: () => {
                            onDeleteProfile(p.id);
                            showToast({ type: 'success', title: `${p.name} 删除已提交` });
                            closeConfirm();
                          },
                        });
                      }}

                              className={`px-4 py-2 rounded-xl text-[12px] font-bold border transition-all ${isOnlyAdmin ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 active:scale-95'}`}
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
        </div>

      )}

      {activeTab === 'tasks' && (
        <div className="bg-white p-6 rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 flex flex-col lg:h-[650px] mobile-card">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-400 font-display uppercase tracking-[0.2em]">元气任务配置</h3>
                <p className="text-xs text-gray-400">分类筛选 + 快速新增任务</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onEdit({ type: 'task', item: { category: 'learning', title: '', description: '', points: 1, frequency: '每日' } })} className="px-5 py-2.5 min-h-[44px] bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-xl text-[12px] font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#FF4D94]/30">
                  <Icon name="plus" size={13} /> 新增规则
                </button>
                <button
                  disabled={!selectedTaskIds.size || deletingTask}
                  onClick={handleBatchDeleteTasks}
                  className={`px-5 py-2.5 min-h-[44px] rounded-xl text-[12px] font-bold flex items-center gap-2 border transition-all ${!selectedTaskIds.size || deletingTask ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}`}
                >
                  {deletingTask ? '删除中...' : `批量删除 (${selectedTaskIds.size})`}
                </button>
                <button
                  onClick={() => setSelectedTaskIds(new Set())}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-[12px] font-bold bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D94]/50 hover:text-[#FF4D94] transition-all"
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
                  className={`px-5 py-2.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all border min-h-[44px] ${taskFilter === cat ? 'bg-[#FF4D94] text-white border-[#FF4D94] shadow-md shadow-[#FF4D94]/30' : 'bg-white border-gray-200 text-gray-500 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]'}`}
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
                  className="w-5 h-5 rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
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
                      className="w-5 h-5 rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                    />
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-gray-600 shrink-0 uppercase tracking-wide">{t.category[0]}</span>
                    <div className="overflow-hidden">
                      <span className="text-sm font-bold text-gray-800 block truncate group-hover:text-[#FF4D94]">{t.title}</span>
                      <span className="text-[11px] text-gray-400 truncate block">{t.description || '暂无详细描述'}</span>
                    </div>
                  </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm font-black text-[#FF4D94] points-font bg-[#FFF2F7] px-3 py-1 rounded-xl">{t.points}</span>
                    <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                      <button onClick={() => onEdit({ type: 'task', item: t })} className="p-2.5 text-gray-300 hover:text-[#FF4D94] hover:bg-pink-50 rounded-lg transition-all"><Icon name="settings" size={17} /></button>
                      <button onClick={() => setConfirmDialog({
                        title: `删除任务 “${t.title || '未命名任务'}”？`,
                        description: '删除后无法恢复。',
                        confirmText: '确认删除',
                        tone: 'danger',
                        onConfirm: () => {
                          onDelete('task', t);
                          showToast({ type: 'success', title: '任务删除已提交', description: t.title || undefined });
                          closeConfirm();
                        },
                      })} className="p-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Icon name="trash" size={17} /></button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="bg-white p-6 rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 flex flex-col lg:h-[650px] mobile-card">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-400 font-display uppercase tracking-[0.2em]">梦想商店配置</h3>
                <p className="text-xs text-gray-400">筛选类别 / 上架新品</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onEdit({ type: 'reward', item: { title: '', points: 5, type: '实物奖品' } })} className="px-5 py-2.5 min-h-[44px] bg-gradient-to-r from-[#111827] to-[#0F172A] text-white rounded-xl text-[12px] font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#0F172A]/20">
                  <Icon name="plus" size={13} /> 上架新品
                </button>
                <button
                  disabled={!selectedRewardIds.size || deletingReward}
                  onClick={handleBatchDeleteRewards}
                  className={`px-5 py-2.5 min-h-[44px] rounded-xl text-[12px] font-bold flex items-center gap-2 border transition-all ${!selectedRewardIds.size || deletingReward ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}`}
                >
                  {deletingReward ? '删除中...' : `批量删除 (${selectedRewardIds.size})`}
                </button>
                <button
                  onClick={() => setSelectedRewardIds(new Set())}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-[12px] font-bold bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D94]/50 hover:text-[#FF4D94] transition-all"
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
                  className={`px-5 py-2.5 rounded-full text-[12px] font-bold transition-all border min-h-[44px] ${rewardFilter === type ? 'bg-[#FF4D94] text-white border-[#FF4D94] shadow-md shadow-[#FF4D94]/30' : 'bg-white border-gray-200 text-gray-500 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]'}`}
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
                  className="w-5 h-5 rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
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
                      className="w-5 h-5 rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
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
                    <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                      <button onClick={() => onEdit({ type: 'reward', item: r })} className="p-2.5 text-gray-300 hover:text-[#FF4D94] hover:bg-pink-50 rounded-lg"><Icon name="settings" size={17} /></button>
                      <button onClick={() => setConfirmDialog({
                        title: `删除奖品 “${r.title || '奖品'}”？`,
                        description: '删除后无法恢复，将从商店下架。',
                        confirmText: '确认删除',
                        tone: 'danger',
                        onConfirm: () => {
                          onDelete('reward', r);
                          showToast({ type: 'success', title: '奖品删除已提交', description: r.title || undefined });
                          closeConfirm();
                        },
                      })} className="p-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Icon name="trash" size={17} /></button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'sync' && (
        <div className="bg-white p-6 rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 space-y-4 mobile-card">
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

      {memberModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative w-full max-w-[460px] bg-white rounded-[28px] shadow-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">{memberModal.mode === 'create' ? '新增成员' : '编辑成员'}</p>
                <h3 className="text-xl font-black text-gray-900">{memberModal.mode === 'create' ? '录入新账户' : memberModal.profile?.name || '成员'}</h3>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-[#FF4D94]">✕</button>
            </div>

            {modalError && <div className="text-[12px] text-rose-500 font-semibold bg-rose-50 border border-rose-100 rounded-2xl px-3 py-2">{modalError}</div>}

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-500 font-semibold">姓名</label>
                <input
                  value={modalName}
                  onChange={e => setModalName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
                  placeholder="输入姓名"
                  maxLength={32}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-500 font-semibold">角色</label>
                <select
                  value={modalRole}
                  onChange={e => setModalRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
                  disabled={memberModal.mode === 'edit' && memberModal.profile?.role === 'admin' && adminCount <= 1}
                >
                  <option value="child">成员</option>
                  <option value="admin">管理员</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl border border-dashed border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                    {modalAvatar ? (
                      <img src={modalAvatar} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400 font-bold">无头像</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 text-[11px] text-gray-500">
                    <label className="font-semibold text-gray-600">成员头像（可选）</label>
                    <div className="flex gap-2">
                      <label className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-[11px] font-bold cursor-pointer hover:border-[#FF4D94]/60">
                        上传头像
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      </label>
                      {modalAvatar && (
                        <button onClick={() => setModalAvatar(null)} className="px-3 py-2 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-500 border border-gray-200 hover:text-rose-500">移除</button>
                      )}
                    </div>
                  </div>
                </div>
                {memberModal.mode === 'create' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-gray-500 font-semibold">初始元气值（可选）</label>
                    <input
                      type="number"
                      value={modalInitialBalance === '' ? '' : modalInitialBalance}
                      onChange={e => setModalInitialBalance(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
                      placeholder="留空则为 0"
                    />
                  </div>
                )}
              </div>

            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              {memberModal.mode === 'edit' ? (
                <button
                  onClick={handleModalDelete}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100"
                  disabled={memberModal.profile?.role === 'admin' && adminCount <= 1}
                >
                  删除成员
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button onClick={closeModal} className="px-4 py-2 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200 hover:text-[#FF4D94] hover:border-[#FF4D94]/40">
                  取消
                </button>
                <button
                  onClick={handleModalSave}
                  disabled={modalSaving}
                  className={`px-5 py-2 rounded-xl text-[11px] font-bold transition-all ${modalSaving ? 'bg-gray-200 text-gray-400' : 'bg-[#FF4D94] text-white shadow-md shadow-[#FF4D94]/30 hover:brightness-110 active:scale-95'}`}
                >
                  {modalSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adjustModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeAdjustModal}></div>
          <div className="relative w-full max-w-[420px] bg-white rounded-[24px] shadow-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">元气值调整</p>
                <h3 className="text-xl font-black text-gray-900">{adjustModal.name}</h3>
              </div>
              <button onClick={closeAdjustModal} className="text-gray-400 hover:text-[#FF4D94]">✕</button>
            </div>

            {adjustError && <div className="text-[12px] text-rose-500 font-semibold bg-rose-50 border border-rose-100 rounded-2xl px-3 py-2">{adjustError}</div>}

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-500 font-semibold">元气值</label>
                <input
                  type="number"
                  value={adjustPoints || ''}
                  onChange={e => setAdjustPoints(Number(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
                  placeholder="输入数值"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                <button
                  onClick={() => setAdjustType('earn')}
                  className={`px-3 py-2 rounded-xl border ${adjustType === 'earn' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  增加
                </button>
                <button
                  onClick={() => setAdjustType('penalty')}
                  className={`px-3 py-2 rounded-xl border ${adjustType === 'penalty' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  扣减
                </button>
                <span className="px-3 py-1 rounded-xl bg-gray-50 border border-gray-100 text-gray-500 points-font">当前余额：{adjustModal.balance}</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-500 font-semibold">说明</label>
                <input
                  value={adjustMemo}
                  onChange={e => setAdjustMemo(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
                  placeholder="如：奖励完成作业 / 迟到扣分"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={closeAdjustModal} className="px-4 py-2 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200 hover:text-[#FF4D94] hover:border-[#FF4D94]/40">
                取消
              </button>
              <button
                onClick={handleModalAdjust}
                disabled={adjustLoading}
                className={`px-5 py-2 rounded-xl text-[11px] font-bold transition-all ${adjustLoading ? 'bg-gray-200 text-gray-400' : 'bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white shadow-md shadow-[#FF4D94]/30 hover:brightness-110 active:scale-95'}`}
              >
                {adjustLoading ? '保存中...' : '记录'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          tone={confirmDialog.tone}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}

