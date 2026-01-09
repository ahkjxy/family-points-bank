import { useEffect, useMemo, useState } from "react";
import { Task, Reward, Category, Profile, UserRole } from "../types";
import { Icon } from "./Icon";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";

import { supabase } from "../supabaseClient";

interface SettingsSectionProps {
  profiles: Profile[];
  tasks: Task[];
  rewards: Reward[];
  taskFilter: Category | "all";
  rewardFilter: "实物奖品" | "特权奖励" | "all";
  onTaskFilterChange: (value: Category | "all") => void;
  onRewardFilterChange: (value: "实物奖品" | "特权奖励" | "all") => void;
  onEdit: (payload: { type: "task" | "reward"; item: any }) => void;
  onDelete: (type: "task" | "reward", item: any) => void;
  onSync: () => void;
  onPrint: () => void;
  onProfileNameChange: (id: string, name: string) => void;
  onUpdateProfileAvatar: (id: string, avatarUrl: string | null) => void;
  onAddProfile: (name: string, role: UserRole, balance?: number, avatarUrl?: string | null) => void;
  onDeleteProfile: (id: string) => void;
  onAdjustBalance: (
    profileId: string,
    payload: { title: string; points: number; type: "earn" | "penalty" }
  ) => Promise<void>;
  isSyncing: boolean;
  currentSyncId?: string;
  currentProfileId?: string;
  onSendSystemNotification?: (content: string) => void;
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
  currentProfileId,
  onSendSystemNotification,
}: SettingsSectionProps) {
  const { showToast } = useToast();
  const currentProfile = profiles.find((p) => p.id === currentProfileId);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    tone?: "primary" | "danger";
    onConfirm: () => void;
  } | null>(null);
  const closeConfirm = () => setConfirmDialog(null);
  const [activeTab, setActiveTab] = useState<"members" | "tasks" | "rewards" | "sync">("members");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedRewardIds, setSelectedRewardIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [roleLoading, setRoleLoading] = useState<Set<string>>(new Set());
  const [deletingTask, setDeletingTask] = useState(false);
  const [deletingReward, setDeletingReward] = useState(false);
  const [memberModal, setMemberModal] = useState<{
    mode: "create" | "edit";
    profile?: Profile;
  } | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalRole, setModalRole] = useState<UserRole>("child");
  const [modalInitialBalance, setModalInitialBalance] = useState<number | "">("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  const [adjustModal, setAdjustModal] = useState<Profile | null>(null);
  const [adjustPoints, setAdjustPoints] = useState<number>(0);
  const [adjustMemo, setAdjustMemo] = useState("");
  const [adjustType, setAdjustType] = useState<"earn" | "penalty">("earn");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustLoading, setAdjustLoading] = useState(false);

  const [avatarModal, setAvatarModal] = useState<Profile | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    setSelectedTaskIds((prev) => new Set([...prev].filter((id) => tasks.some((t) => t.id === id))));
  }, [tasks]);

  useEffect(() => {
    setSelectedRewardIds(
      (prev) => new Set([...prev].filter((id) => rewards.some((r) => r.id === id)))
    );
  }, [rewards]);

  useEffect(() => {
    setSelectedMemberIds(
      (prev) => new Set([...prev].filter((id) => profiles.some((p) => p.id === id)))
    );
  }, [profiles]);

  const adminCount = useMemo(() => profiles.filter((p) => p.role === "admin").length, [profiles]);
  const overview = useMemo(
    () => ({
      members: profiles.length,
      admins: adminCount,
      tasks: tasks.length,
      rewards: rewards.length,
    }),
    [profiles.length, adminCount, tasks.length, rewards.length]
  );

  const toggleTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleReward = (id: string) => {
    setSelectedRewardIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleChangeRole = async (profileId: string, role: UserRole) => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target || target.role === role) return;
    if (target.role === "admin" && role !== "admin" && adminCount <= 1) {
      showToast({ type: "error", title: "至少保留一名管理员" });
      return;
    }
    if (!currentSyncId) {
      showToast({ type: "error", title: "缺少 Sync ID，无法更新角色" });
      return;
    }
    setRoleLoading((prev) => new Set(prev).add(profileId));
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", profileId)
        .eq("family_id", currentSyncId);
      if (error) throw error;
      await onSync();
      if (target && onSendSystemNotification) {
        const roleText = role === "admin" ? "管理员" : "普通成员";
        await onSendSystemNotification(
          `${currentProfile?.name || "管理员"} 将 ${target.name} 设置为${roleText}`
        );
      }
      showToast({ type: "success", title: "角色已更新" });
    } catch (e) {
      showToast({ type: "error", title: "角色更新失败", description: (e as Error)?.message || "" });
    } finally {
      setRoleLoading((prev) => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    }
  };

  const handleBulkRole = async (role: UserRole) => {
    if (!selectedMemberIds.size) return;
    if (!currentSyncId) {
      showToast({ type: "error", title: "缺少 Sync ID，无法批量更新角色" });
      return;
    }
    const selectedIds = Array.from(selectedMemberIds);
    const selectedAdmins = profiles.filter(
      (p) => selectedMemberIds.has(p.id) && p.role === "admin"
    ).length;
    if (role !== "admin" && adminCount - selectedAdmins <= 0) {
      showToast({ type: "error", title: "至少保留一名管理员，无法全部降级" });
      return;
    }
    setRoleLoading((prev) => new Set([...prev, ...selectedIds]));
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .in("id", selectedIds)
        .eq("family_id", currentSyncId);
      if (error) throw error;
      await onSync();
      showToast({ type: "success", title: "角色批量更新成功" });
    } catch (e) {
      showToast({ type: "error", title: "批量更新失败", description: (e as Error)?.message || "" });
    } finally {
      setRoleLoading(new Set());
    }
  };

  const handleBulkDeleteMembers = () => {
    if (!selectedMemberIds.size) return;
    const selectedAdmins = profiles.filter(
      (p) => selectedMemberIds.has(p.id) && p.role === "admin"
    ).length;
    if (adminCount - selectedAdmins <= 0) {
      showToast({ type: "error", title: "至少保留一名管理员，无法删除全部管理员" });
      return;
    }
    const idsToDelete: string[] = Array.from(selectedMemberIds);
    setConfirmDialog({
      title: `确认删除 ${idsToDelete.length} 位成员？`,
      description: "将同步删除其账单和余额记录，此操作不可恢复。",
      confirmText: "确认删除",
      tone: "danger",
      onConfirm: () => {
        idsToDelete.forEach((id) => onDeleteProfile(id));
        setSelectedMemberIds(new Set());
        showToast({ type: "success", title: "成员删除已提交" });
        closeConfirm();
      },
    });
  };

  const handleBatchDeleteTasks = () => {
    if (!selectedTaskIds.size) return;
    const idsToDelete = Array.from(selectedTaskIds);
    setConfirmDialog({
      title: `确认删除 ${idsToDelete.length} 个任务？`,
      description: "删除后无法恢复，相关配置将被移除。",
      confirmText: "确认删除",
      tone: "danger",
      onConfirm: () => {
        setDeletingTask(true);
        idsToDelete.forEach((id) => {
          const item = tasks.find((t) => t.id === id);
          if (item) onDelete("task", item);
        });
        setSelectedTaskIds(new Set());
        setDeletingTask(false);
        showToast({ type: "success", title: "任务删除已提交" });
        closeConfirm();
      },
    });
  };

  const handleBatchDeleteRewards = () => {
    if (!selectedRewardIds.size) return;
    const idsToDelete = Array.from(selectedRewardIds);
    setConfirmDialog({
      title: `确认删除 ${idsToDelete.length} 个奖品？`,
      description: "删除后无法恢复，将从商店下架并移除。",
      confirmText: "确认删除",
      tone: "danger",
      onConfirm: () => {
        setDeletingReward(true);
        idsToDelete.forEach((id) => {
          const item = rewards.find((r) => r.id === id);
          if (item) onDelete("reward", item);
        });
        setSelectedRewardIds(new Set());
        setDeletingReward(false);
        showToast({ type: "success", title: "奖品删除已提交" });
        closeConfirm();
      },
    });
  };

  const openCreateModal = () => {
    setMemberModal({ mode: "create" });
    setModalName("");
    setModalRole("child");
    setModalInitialBalance("");
    setModalError(null);
  };

  const openEditModal = (profile: Profile) => {
    setMemberModal({ mode: "edit", profile });
    setModalName(profile.name);
    setModalRole(profile.role);
    setModalInitialBalance("");
    setModalError(null);
  };

  const closeModal = () => setMemberModal(null);

  const handleModalSave = async () => {
    setModalError(null);
    const trimmed = modalName.trim();
    if (!trimmed) {
      setModalError("请输入姓名");
      return;
    }
    if (trimmed.length > 20) {
      setModalError("姓名不超过 20 个字符");
      return;
    }
    const duplicate = profiles.some(
      (p) =>
        p.name.trim().toLowerCase() === trimmed.toLowerCase() && p.id !== memberModal?.profile?.id
    );
    if (duplicate) {
      setModalError("已存在同名成员");
      return;
    }
    setModalSaving(true);
    try {
      if (memberModal?.mode === "create") {
        await onAddProfile(
          trimmed,
          modalRole,
          modalInitialBalance === "" ? undefined : Number(modalInitialBalance)
        );
      } else if (memberModal?.mode === "edit" && memberModal.profile) {
        if (trimmed !== memberModal.profile.name) {
          await onProfileNameChange(memberModal.profile.id, trimmed);
        }
        if (modalRole !== memberModal.profile.role) {
          await handleChangeRole(memberModal.profile.id, modalRole);
        }
      }
      closeModal();
    } catch (e) {
      setModalError((e as Error)?.message || "保存失败，请重试");
    } finally {
      setModalSaving(false);
    }
  };

  const openAdjustModal = (profile: Profile) => {
    setAdjustModal(profile);
    setAdjustPoints(0);
    setAdjustMemo("");
    setAdjustType("earn");
    setAdjustError(null);
  };

  const closeAdjustModal = () => {
    setAdjustModal(null);
    setAdjustPoints(0);
    setAdjustMemo("");
    setAdjustType("earn");
    setAdjustError(null);
    setAdjustLoading(false);
  };

  const openAvatarModal = (profile: Profile) => {
    setAvatarModal(profile);
    setAvatarPreview(profile.avatarUrl || null);
  };

  const closeAvatarModal = () => {
    setAvatarModal(null);
    setAvatarPreview(null);
    setAvatarLoading(false);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarSave = async () => {
    if (!avatarModal) return;
    setAvatarLoading(true);
    try {
      await onUpdateProfileAvatar(avatarModal.id, avatarPreview);
      showToast({ type: "success", title: "头像已更新" });
      closeAvatarModal();
    } catch (e) {
      showToast({ type: "error", title: "头像更新失败", description: (e as Error)?.message || "" });
      setAvatarLoading(false);
    }
  };

  const handleModalAdjust = async () => {
    if (!adjustModal) return;
    setAdjustError(null);
    const amount = Math.abs(Number(adjustPoints));
    if (!amount) {
      setAdjustError("请输入大于 0 的元气值");
      return;
    }
    const title = adjustMemo.trim() || (adjustType === "earn" ? "管理员加分" : "管理员扣分");
    try {
      setAdjustLoading(true);
      await onAdjustBalance(adjustModal.id, { title, points: amount, type: adjustType });
      showToast({
        type: "success",
        title: "已记录元气值",
        description: `${adjustModal.name}: ${adjustType === "earn" ? "+" : "-"}${amount}`,
      });
      closeAdjustModal();
    } catch (e) {
      setAdjustError((e as Error)?.message || "调整失败，请稍后重试");
      setAdjustLoading(false);
    }
  };

  const handleSendReset = async () => {
    const trimmed = resetEmail.trim();
    if (!trimmed) return;
    setResetLoading(true);
    setResetMessage(null);
    try {
      const redirectTo = `${window.location.origin}/${currentSyncId || ""}/dashboard`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (error) throw error;
      setResetMessage("重置邮件已发送，请让用户查收并点击邮件中的链接设置新密码。");
    } catch (e) {
      setResetMessage(`发送失败：${(e as Error)?.message || "请稍后重试"}`);
    } finally {
      setResetLoading(false);
    }
  };

  const tabs = [
    { id: "members", label: "成员管理" },
    { id: "tasks", label: "任务配置" },
    { id: "rewards", label: "商店配置" },
    { id: "sync", label: "同步 / 打印" },
  ] as const;

  return (
    <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Settings Hub Header */}
      <div className="relative overflow-hidden rounded-[40px] bg-[#1A1A1A] dark:bg-[#0F172A] p-8 lg:p-10 text-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/5 mobile-card">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-gradient-to-br from-[#7C4DFF]/30 to-[#FF4D94]/30 blur-[100px] rounded-full"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#FF4D94] text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D94] animate-pulse"></div>
              管理中心
            </div>
            <h3 className="text-3xl lg:text-4xl font-black leading-tight tracking-tight mb-2">
              系统配置与权限管理
            </h3>
            <p className="text-white/50 font-medium max-w-lg tracking-wide">
              在这里调整银行的核心运行规则，管理家庭成员及其元气权限。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onSync}
              disabled={isSyncing}
              className={`flex-1 sm:flex-none px-8 py-4 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                isSyncing
                  ? "bg-white/5 text-white/40 cursor-not-allowed"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md"
              }`}
            >
              {isSyncing && (
                <span className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              )}
              同步数据
            </button>
            <button
              onClick={onPrint}
              className="flex-1 sm:flex-none px-8 py-4 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] rounded-[20px] text-xs font-black uppercase tracking-widest shadow-[0_20px_40px_-12px_rgba(255,77,148,0.4)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              打印报表
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-10 flex flex-wrap gap-2 p-1.5 bg-white/5 rounded-[28px] border border-white/5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[100px] px-6 py-3.5 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                  isActive
                    ? "bg-white text-gray-900 shadow-xl"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "成员总数",
            val: overview.members,
            color: "text-gray-900 dark:text-white",
            sub: "活跃",
          },
          { label: "系统管理员", val: overview.admins, color: "text-indigo-500", sub: "拥有者" },
          { label: "任务规则", val: overview.tasks, color: "text-[#FF4D94]", sub: "任务规则" },
          { label: "商店奖品", val: overview.rewards, color: "text-emerald-500", sub: "已上架" },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#0F172A] p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm"
          >
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              {s.label}
            </p>
            <p className={`text-3xl font-black points-font ${s.color}`}>{s.val}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter opacity-60 mt-1">
              {s.sub} 条
            </p>
          </div>
        ))}
      </div>

      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                成员权限矩阵
              </h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                快速管理家庭成员的权限、余额与个人资料。
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-8 py-4 bg-[#1A1A1A] dark:bg-white text-white dark:text-gray-900 rounded-[20px] text-xs font-black uppercase tracking-widest hover:bg-[#FF4D94] dark:hover:bg-[#FF4D94] hover:text-white transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Icon name="plus" size={14} />
              添加新成员
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {profiles.map((p) => {
              const isOnlyAdmin = p.role === "admin" && adminCount <= 1;
              const loadingRole = roleLoading.has(p.id);
              return (
                <div
                  key={p.id}
                  className="group bg-white dark:bg-[#0F172A] rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50/50 dark:bg-white/5 rounded-bl-[80px] -z-0"></div>

                  <div className="relative z-10 flex items-start gap-6">
                    <div className="relative">
                      <div
                        className={`w-20 h-20 rounded-[28px] overflow-hidden shadow-2xl flex items-center justify-center text-3xl font-black text-white ${p.avatarColor} transition-transform group-hover:rotate-6 duration-500`}
                      >
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                          p.name[0]
                        )}
                      </div>
                      <div
                        className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-2xl flex items-center justify-center border-4 border-white dark:border-[#0F172A] shadow-lg ${
                          p.role === "admin" ? "bg-indigo-500 text-white" : "bg-gray-400 text-white"
                        }`}
                      >
                        <Icon name={p.role === "admin" ? "settings" : "plus"} size={12} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-xl font-black text-gray-900 dark:text-white truncate">
                          {p.name}
                        </h4>
                        <span
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            p.role === "admin"
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-gray-50 text-gray-500"
                          }`}
                        >
                          {p.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span>{p.balance} PTS</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                          <span>ID: {p.id.slice(0, 8)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => openAvatarModal(p)}
                          className="py-3 px-3 rounded-2xl bg-gray-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Icon name="reward" size={11} />
                          头像
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="py-3 px-4 rounded-2xl bg-gray-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:bg-gray-100 transition-colors"
                        >
                          编辑资料
                        </button>
                        <button
                          onClick={() => openAdjustModal(p)}
                          className="py-3 px-4 rounded-2xl bg-[#FF4D94]/10 text-[10px] font-black uppercase tracking-widest text-[#FF4D94] hover:bg-[#FF4D94] hover:text-white transition-all"
                        >
                          调整余额
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        角色权限
                      </label>
                      <select
                        value={p.role}
                        onChange={(e) => handleChangeRole(p.id, e.target.value as UserRole)}
                        disabled={isOnlyAdmin || loadingRole}
                        className="bg-transparent text-xs font-black text-[#7C4DFF] focus:outline-none cursor-pointer hover:underline"
                      >
                        <option value="admin">管理员</option>
                        <option value="child">成员</option>
                      </select>
                    </div>
                    {!isOnlyAdmin && (
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            title: `确认删除 ${p.name}？`,
                            description: "所有关联数据和余额将被永久删除。",
                            confirmText: "删除成员",
                            tone: "danger",
                            onConfirm: () => {
                              onDeleteProfile(p.id);
                              showToast({ type: "success", title: "成员删除成功" });
                              closeConfirm();
                            },
                          });
                        }}
                        className="text-gray-300 hover:text-rose-500 transition-colors"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="bg-white p-6 rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 flex flex-col lg:h-[650px] mobile-card">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-400 font-display uppercase tracking-[0.2em]">
                  元气任务配置
                </h3>
                <p className="text-xs text-gray-400">分类筛选 + 快速新增任务</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    onEdit({
                      type: "task",
                      item: {
                        category: "learning",
                        title: "",
                        description: "",
                        points: 1,
                        frequency: "每日",
                      },
                    })
                  }
                  className="px-5 py-2.5 min-h-[44px] bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-xl text-[12px] font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#FF4D94]/30"
                >
                  <Icon name="plus" size={13} /> 新增规则
                </button>
                <button
                  disabled={!selectedTaskIds.size || deletingTask}
                  onClick={handleBatchDeleteTasks}
                  className={`px-5 py-2.5 min-h-[44px] rounded-xl text-[12px] font-bold flex items-center gap-2 border transition-all ${!selectedTaskIds.size || deletingTask ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed" : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"}`}
                >
                  {deletingTask ? "删除中..." : `批量删除 (${selectedTaskIds.size})`}
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
              {["all", "learning", "chores", "discipline", "penalty"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => onTaskFilterChange(cat as Category | "all")}
                  className={`px-5 py-2.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all border min-h-[44px] ${taskFilter === cat ? "bg-[#FF4D94] text-white border-[#FF4D94] shadow-md shadow-[#FF4D94]/30" : "bg-white border-gray-200 text-gray-500 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]"}`}
                >
                  {cat === "all"
                    ? "全部"
                    : cat === "learning"
                      ? "学习"
                      : cat === "chores"
                        ? "家务"
                        : cat === "discipline"
                          ? "自律"
                          : "警告"}
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
                  onChange={() =>
                    setSelectedTaskIds(
                      selectedTaskIds.size === tasks.length
                        ? new Set()
                        : new Set(tasks.map((t) => t.id))
                    )
                  }
                  className="w-5 h-5 rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                />
                <span>
                  全选任务 ({selectedTaskIds.size}/{tasks.length})
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {tasks.map((t) => (
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
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-gray-600 shrink-0 uppercase tracking-wide">
                      {t.category[0]}
                    </span>
                    <div className="overflow-hidden">
                      <span className="text-sm font-bold text-gray-800 block truncate group-hover:text-[#FF4D94]">
                        {t.title}
                      </span>
                      <span className="text-[11px] text-gray-400 truncate block">
                        {t.description || "暂无详细描述"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm font-black text-[#FF4D94] points-font bg-[#FFF2F7] px-3 py-1 rounded-xl">
                      {t.points}
                    </span>
                    <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => onEdit({ type: "task", item: t })}
                        className="p-2.5 text-gray-300 hover:text-[#FF4D94] hover:bg-pink-50 rounded-lg transition-all"
                      >
                        <Icon name="settings" size={17} />
                      </button>
                      <button
                        onClick={() =>
                          setConfirmDialog({
                            title: `删除任务 “${t.title || "未命名任务"}”？`,
                            description: "删除后无法恢复。",
                            confirmText: "确认删除",
                            tone: "danger",
                            onConfirm: () => {
                              onDelete("task", t);
                              showToast({
                                type: "success",
                                title: "任务删除已提交",
                                description: t.title || undefined,
                              });
                              closeConfirm();
                            },
                          })
                        }
                        className="p-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "rewards" && (
        <div className="bg-white p-6 rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 flex flex-col lg:h-[650px] mobile-card">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-400 font-display uppercase tracking-[0.2em]">
                  梦想商店配置
                </h3>
                <p className="text-xs text-gray-400">筛选类别 / 上架新品</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    onEdit({ type: "reward", item: { title: "", points: 5, type: "实物奖品" } })
                  }
                  className="px-5 py-2.5 min-h-[44px] bg-gradient-to-r from-[#111827] to-[#0F172A] text-white rounded-xl text-[12px] font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#0F172A]/20"
                >
                  <Icon name="plus" size={13} /> 上架新品
                </button>
                <button
                  disabled={!selectedRewardIds.size || deletingReward}
                  onClick={handleBatchDeleteRewards}
                  className={`px-5 py-2.5 min-h-[44px] rounded-xl text-[12px] font-bold flex items-center gap-2 border transition-all ${!selectedRewardIds.size || deletingReward ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed" : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"}`}
                >
                  {deletingReward ? "删除中..." : `批量删除 (${selectedRewardIds.size})`}
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
              {["all", "实物奖品", "特权奖励"].map((type) => (
                <button
                  key={type}
                  onClick={() => onRewardFilterChange(type as "实物奖品" | "特权奖励" | "all")}
                  className={`px-5 py-2.5 rounded-full text-[12px] font-bold transition-all border min-h-[44px] ${rewardFilter === type ? "bg-[#FF4D94] text-white border-[#FF4D94] shadow-md shadow-[#FF4D94]/30" : "bg-white border-gray-200 text-gray-500 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]"}`}
                >
                  {type === "all" ? "全部" : type}
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
                  onChange={() =>
                    setSelectedRewardIds(
                      selectedRewardIds.size === rewards.length
                        ? new Set()
                        : new Set(rewards.map((r) => r.id))
                    )
                  }
                  className="w-5 h-5 rounded border-gray-300 text-[#FF4D94] focus:ring-[#FF4D94]"
                />
                <span>
                  全选奖品 ({selectedRewardIds.size}/{rewards.length})
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {rewards.map((r) => (
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
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${r.type === "实物奖品" ? "bg-amber-50 text-amber-500" : "bg-indigo-50 text-indigo-500"}`}
                    >
                      <img
                        src={
                          r.imageUrl ||
                          `https://ui-avatars.com/api/?background=FF4D94&color=fff&name=${encodeURIComponent(r.title)}`
                        }
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-sm font-bold text-gray-800 block truncate group-hover:text-[#FF4D94]">
                        {r.title}
                      </span>
                      <span className="text-[11px] text-gray-400 block tracking-wider uppercase">
                        {r.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm font-black text-[#FF4D94] points-font bg-[#FFF2F7] px-3 py-1 rounded-xl">
                      {r.points}
                    </span>
                    <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => onEdit({ type: "reward", item: r })}
                        className="p-2.5 text-gray-300 hover:text-[#FF4D94] hover:bg-pink-50 rounded-lg"
                      >
                        <Icon name="settings" size={17} />
                      </button>
                      <button
                        onClick={() =>
                          setConfirmDialog({
                            title: `删除奖品 “${r.title || "奖品"}”？`,
                            description: "删除后无法恢复，将从商店下架。",
                            confirmText: "确认删除",
                            tone: "danger",
                            onConfirm: () => {
                              onDelete("reward", r);
                              showToast({
                                type: "success",
                                title: "奖品删除已提交",
                                description: r.title || undefined,
                              });
                              closeConfirm();
                            },
                          })
                        }
                        className="p-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "sync" && (
        <div className="bg-white p-6 rounded-[32px] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] border border-gray-100 space-y-4 mobile-card">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                同步与打印
              </p>
              <h3 className="text-lg font-bold text-gray-900 font-display">云端同步 / 打印</h3>
              <p className="text-xs text-gray-500">当前 SYNC ID: {currentSyncId || "未指定"}</p>
            </div>
          </div>
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside bg-[#F8FAFC] rounded-2xl p-4 border border-gray-100">
            <li>
              同步会重新从 Supabase 读取 families / profiles / tasks / rewards / transactions
              并刷新当前家庭状态。
            </li>
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
                onChange={(e) => setResetEmail(e.target.value)}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#FF4D94] outline-none"
                placeholder="输入用户邮箱"
                type="email"
              />
              <button
                disabled={!resetEmail.trim() || resetLoading}
                onClick={handleSendReset}
                className={`px-5 py-3 rounded-xl text-[11px] font-bold transition-all ${!resetEmail.trim() || resetLoading ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-[#111827] to-[#0F172A] text-white shadow-md shadow-[#0F172A]/20 hover:brightness-110 active:scale-95"}`}
              >
                {resetLoading ? "发送中..." : "发送重置邮件"}
              </button>
            </div>
            {resetMessage && (
              <p className="text-[12px] text-gray-500 leading-relaxed">{resetMessage}</p>
            )}
            <p className="text-[11px] text-gray-400 leading-relaxed">
              说明：Supabase
              将向该邮箱发送重置链接，用户点击邮件后即可设置新密码。若需自定义跳转地址，可调整
              redirectTo。
            </p>
          </div>
        </div>
      )}

      {memberModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div
            className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-xl"
            onClick={closeModal}
          ></div>
          <div className="relative w-full max-w-[480px] bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-2xl rounded-[56px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.4)] border border-white/20 dark:border-white/5 p-10 lg:p-14 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[11px] font-black text-[#FF4D94] uppercase tracking-[0.4em] mb-1">
                  Account Portal
                </p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {memberModal.mode === "create"
                    ? "录入新账户"
                    : memberModal.profile?.name || "编辑成员"}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-300 dark:text-gray-600 hover:text-[#FF4D94] transition-all p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <Icon name="plus" size={32} className="rotate-45" />
              </button>
            </div>

            {modalError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black animate-in slide-in-from-top-2">
                ⚠️ {modalError}
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">
                  真实姓名 / Full Name
                </label>
                <input
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[24px] font-black text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner"
                  placeholder="输入姓名"
                  maxLength={32}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">
                    系统权限 / Role
                  </label>
                  <select
                    value={modalRole}
                    onChange={(e) => setModalRole(e.target.value as UserRole)}
                    className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[24px] font-black text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner appearance-none cursor-pointer"
                    disabled={
                      memberModal.mode === "edit" &&
                      memberModal.profile?.role === "admin" &&
                      adminCount <= 1
                    }
                  >
                    <option value="child">成员 (Member)</option>
                    <option value="admin">管理员 (Master)</option>
                  </select>
                </div>
                {memberModal.mode === "create" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">
                      初始元气 / Initial
                    </label>
                    <input
                      type="number"
                      value={modalInitialBalance === "" ? "" : modalInitialBalance}
                      onChange={(e) =>
                        setModalInitialBalance(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[24px] font-black text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={closeModal}
                  className="flex-1 sm:flex-none px-8 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleModalSave}
                  disabled={modalSaving}
                  className={`flex-[2] sm:flex-none px-10 py-4 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_12px_24px_-8px_rgba(255,77,148,0.5)] hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center justify-center gap-2 ${modalSaving ? "opacity-80" : ""}`}
                >
                  {modalSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "确认保存"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adjustModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div
            className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-xl"
            onClick={closeAdjustModal}
          ></div>
          <div className="relative w-full max-w-[440px] bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-2xl rounded-[56px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.4)] border border-white/20 dark:border-white/5 p-12 text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="space-y-2">
              <p className="text-[11px] font-black text-[#7C4DFF] uppercase tracking-[0.4em] mb-1">
                余额调整
              </p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {adjustModal.name}
              </h3>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                手动调整该成员的元气值余额。
              </p>
            </div>

            {adjustError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black animate-in slide-in-from-top-2">
                ⚠️ {adjustError}
              </div>
            )}

            <div className="space-y-6">
              <div className="relative group">
                <input
                  type="number"
                  value={adjustPoints || ""}
                  onChange={(e) => setAdjustPoints(Number(e.target.value) || 0)}
                  className="w-full px-8 py-6 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[32px] font-black text-4xl points-font text-center outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner"
                  placeholder="0"
                />
                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300 uppercase tracking-widest pointer-events-none">
                  Pts
                </span>
              </div>

              <div className="flex p-1.5 bg-gray-100 dark:bg-white/5 rounded-[24px] text-[11px] font-black uppercase tracking-widest">
                <button
                  onClick={() => setAdjustType("earn")}
                  className={`flex-1 py-4 rounded-[20px] transition-all duration-300 flex items-center justify-center gap-2 ${adjustType === "earn" ? "bg-white dark:bg-white/10 shadow-sm text-emerald-500" : "text-gray-400 dark:text-gray-500 hover:text-gray-600"}`}
                >
                  <Icon name="plus" size={14} />
                  增加 (Plus)
                </button>
                <button
                  onClick={() => setAdjustType("penalty")}
                  className={`flex-1 py-4 rounded-[20px] transition-all duration-300 flex items-center justify-center gap-2 ${adjustType === "penalty" ? "bg-white dark:bg-white/10 shadow-sm text-rose-500" : "text-gray-400 dark:text-gray-500 hover:text-gray-600"}`}
                >
                  <Icon name="plus" size={14} className="rotate-45" />
                  扣减 (Minus)
                </button>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">
                  备注说明 / Reason
                </label>
                <input
                  value={adjustMemo}
                  onChange={(e) => setAdjustMemo(e.target.value)}
                  className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[24px] font-black text-sm outline-none focus:ring-2 focus:ring-[#7C4DFF] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner"
                  placeholder="如：奖励完成作业 / 迟到扣分"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={closeAdjustModal}
                className="flex-1 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-[24px] transition-all"
              >
                返回
              </button>
              <button
                onClick={handleModalAdjust}
                disabled={adjustLoading}
                className={`flex-[1.5] py-5 bg-gradient-to-r from-[#7C4DFF] to-[#9E7AFF] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_12px_24px_-8px_rgba(124,77,255,0.5)] hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center justify-center gap-3 ${adjustLoading ? "opacity-80" : ""}`}
              >
                {adjustLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icon name="check" size={18} />
                )}
                {adjustLoading ? "记录同步中..." : "确认记录"}
              </button>
            </div>

            <p className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest">
              当前账户余额：{adjustModal.balance} PTS
            </p>
          </div>
        </div>
      )}

      {avatarModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div
            className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-xl"
            onClick={closeAvatarModal}
          ></div>
          <div className="relative w-full max-w-[400px] bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-2xl rounded-[56px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.4)] border border-white/20 dark:border-white/5 p-8 lg:p-10 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[11px] font-black text-[#FF4D94] uppercase tracking-[0.4em]">
                  Avatar
                </p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  编辑头像
                </h3>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                  {avatarModal.name}
                </p>
              </div>
              <button
                onClick={closeAvatarModal}
                className="text-gray-300 dark:text-gray-600 hover:text-[#FF4D94] transition-all p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <Icon name="plus" size={24} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center">
                <div
                  className={`w-32 h-32 rounded-[36px] overflow-hidden shadow-2xl flex items-center justify-center text-5xl font-black text-white ${avatarPreview ? "" : "bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"} transition-transform duration-500`}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} className="w-full h-full object-cover" />
                  ) : (
                    avatarModal.name[0]
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <label className="flex-1 px-6 py-4 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] rounded-2xl text-[10px] font-black uppercase tracking-widest text-center cursor-pointer hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                  <Icon name="plus" size={14} />
                  上传新头像
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                </label>
                {avatarPreview && (
                  <button
                    onClick={() => setAvatarPreview(null)}
                    className="px-6 py-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
                  >
                    移除
                  </button>
                )}
              </div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">
                推荐正方形尺寸的高清照片
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={closeAvatarModal}
                className="flex-1 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:bg-gray-100 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleAvatarSave}
                disabled={avatarLoading}
                className={`flex-[1.5] py-4 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-[0_12px_24px_-8px_rgba(255,77,148,0.5)] hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center justify-center gap-2 ${avatarLoading ? "opacity-80" : ""}`}
              >
                {avatarLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icon name="check" size={16} />
                )}
                保存头像
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
