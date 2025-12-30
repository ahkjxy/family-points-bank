import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Routes, Route, Navigate, useNavigate, useLocation, useMatch } from 'react-router-dom';
import { FamilyState, Transaction, Profile, Category } from './types';
import { INITIAL_TASKS, INITIAL_REWARDS, INITIAL_PROFILES, FIXED_SYNC_ID } from './constants';
import { supabase } from './supabaseClient';
import { printReport } from './utils/export';
import {
  Sidebar,
  HeaderBar,
  DashboardSection,
  EarnSection,
  RedeemSection,
  HistorySection,
  SettingsSection,
  ProfileSwitcherModal,
  EditModal,
  PendingActionModal,
  DocsPage,
  MobileNav,
  AuthGate,
  PasswordResetModal,
  PasswordResetPage,
  ToastProvider,
  useToast,
  ThemeProvider,
  useTheme,
} from './components';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const matchAny = useMatch('/:syncId/*');
  const matchExact = useMatch('/:syncId');
  const match = matchAny || matchExact;
  const syncId = match?.params?.syncId;
  const fallbackSyncId = syncId || '';

  const [state, setState] = useState<FamilyState>({
    currentProfileId: INITIAL_PROFILES[1].id,
    profiles: INITIAL_PROFILES,
    tasks: INITIAL_TASKS,
    rewards: INITIAL_REWARDS,
    syncId: fallbackSyncId,
  });

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bootingFamily, setBootingFamily] = useState(false);

  const resolveFamilyId = () => syncId || state.syncId || '';

  const [editingItem, setEditingItem] = useState<{ type: 'task' | 'reward'; item: any } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ title: string; points: number; type: 'earn' | 'penalty' | 'redeem' } | null>(null);
  const [crudSaving, setCrudSaving] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const [taskFilter, setTaskFilter] = useState<Category | 'all'>('all');
  const [rewardFilter, setRewardFilter] = useState<'实物奖品' | '特权奖励' | 'all'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showToast, dismissToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const ensureCurrentProfileId = (profiles: Profile[], preferredId?: string) => {
    if (!profiles.length) return '';
    if (preferredId && profiles.some(p => p.id === preferredId)) return preferredId;
    const admin = profiles.find(p => p.role === 'admin');
    return admin?.id ?? profiles[0].id;
  };

  const [fatalError, setFatalError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingAction) setPendingError(null);
  }, [pendingAction]);

  const notifyError = (message: string, e?: any) => {
    console.warn(message, e);
    showToast({ type: 'error', title: message, description: (e as Error)?.message || '请稍后重试', duration: 3800 });
  };

  const seedFamilyIfEmpty = async (familyId: string) => {
    try {
      const { count: profileCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId);
      if ((profileCount ?? 0) > 0) return;

      const adminName = (session?.user?.email?.split('@')[0] || '管理员').slice(0, 20);
      const { data: insertedProfiles } = await supabase
        .from('profiles')
        .insert([
          { family_id: familyId, name: adminName, balance: 0, role: 'admin', avatar_color: 'bg-blue-600' },
        ])
        .select();

      const adminProfileId = insertedProfiles?.[0]?.id;

      await supabase.from('tasks').insert(
        INITIAL_TASKS.map(t => ({
          family_id: familyId,
          category: t.category,
          title: t.title,
          description: t.description,
          points: t.points,
          frequency: t.frequency,
        }))
      );

      await supabase.from('rewards').insert(
        INITIAL_REWARDS.map(r => ({
          family_id: familyId,
          title: r.title,
          points: r.points,
          type: r.type,
          image_url: r.imageUrl,
        }))
      );

      if (adminProfileId) {
        await supabase.from('families').update({ current_profile_id: adminProfileId }).eq('id', familyId);
      }
    } catch (e) {
      console.warn('Seed family failed', e);
    }
  };

  const ensureFamilyForSession = async (sess: Session) => {
    const userId = sess.user.id;
    let targetFamilyId = syncId?.trim() || '';

    if (targetFamilyId) {
      await supabase.from('family_members').upsert({ family_id: targetFamilyId, user_id: userId, role: 'owner' }, { onConflict: 'family_id,user_id' });
    } else {
      const { data: memberships } = await supabase
        .from('family_members')
        .select('family_id, role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (memberships?.length) {
        targetFamilyId = memberships[0].family_id as string;
      }
    }

    if (!targetFamilyId) {
      const { data: created, error: createErr } = await supabase
        .from('families')
        .insert({ name: `${sess.user.email?.split('@')[0] || '我的'}的家庭` })
        .select()
        .single();
      if (createErr || !created?.id) throw createErr || new Error('创建家庭失败');
      targetFamilyId = created.id as string;
    }

    await supabase.from('family_members').upsert({ family_id: targetFamilyId, user_id: userId, role: 'owner' }, { onConflict: 'family_id,user_id' });
    await seedFamilyIfEmpty(targetFamilyId);
    return targetFamilyId;
  };

  const fetchData = async (targetSyncId: string) => {
    const normalized = targetSyncId?.trim();
    if (!normalized) {
      setFatalError('缺少 Sync ID，请在 URL 中使用 /{syncId}/dashboard 访问');
      setIsLoading(false);
      setIsSyncing(false);
      return;
    }
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('families')
        .select(`
          id, name, current_profile_id,
          profiles (*),
          tasks (*),
          rewards (*),
          transactions (*, profile_id, family_id)
        `)
        .eq('id', targetSyncId)
        .single();

      if (error || !data) {
        setFatalError('家庭未开通或链接失效，请检查 Sync ID。');
        return;
      }

      const tx = (data as any).transactions || [];
      const profiles = ((data as any).profiles || []).map((p: any) => {
        const history = tx
          .filter((t: any) => t.profile_id === p.id)
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            points: t.points,
            timestamp: t.timestamp ? new Date(t.timestamp).getTime() : Date.now(),
            type: t.type,
          }))
          .sort((a: any, b: any) => b.timestamp - a.timestamp);
        return { ...p, avatarColor: p.avatar_color || p.avatarColor, avatarUrl: p.avatar_url || p.avatarUrl || null, history } as Profile;
      });

      const normalizedRemote: FamilyState = {
        currentProfileId: ensureCurrentProfileId(profiles, (data as any).current_profile_id || state.currentProfileId),
        profiles,
        tasks: (data as any).tasks || [],
        rewards: (data as any).rewards || [],
        syncId: targetSyncId,
      };
      setState(normalizedRemote);
      setFatalError(null);
    } catch (e) {
      console.warn('Sync failed', e);
      if (!fatalError) setFatalError((e as Error)?.message || '同步失败');
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const refreshFamily = async (fid?: string) => {
    const target = fid || resolveFamilyId();
    await fetchData(target);
  };

  useEffect(() => {
    const init = async () => {
      const url = window.location.href;
      if (url.includes('code=')) { // 仅 OAuth/PKCE 使用 code 交换；magiclink 不需要
        try {
          await supabase.auth.exchangeCodeForSession(url);
          const cleaned = new URL(url);
          cleaned.searchParams.delete('code');
          cleaned.searchParams.delete('token');
          cleaned.searchParams.delete('type');
          if (cleaned.hash) cleaned.hash = '';
          window.history.replaceState({}, document.title, cleaned.toString());
        } catch (e) {
          console.warn('exchangeCodeForSession failed', e);
        }
      }

      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setAuthReady(true);
      if (!data.session) {
        setIsLoading(false);
      }
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
      }
      if (!sess) {
        setFatalError(null);
        setIsLoading(false);
        setState(s => ({ ...s, syncId: fallbackSyncId }));
      }
    });
    return () => sub?.subscription?.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!session) return;
    let cancelled = false;
    (async () => {
      setBootingFamily(true);
      setIsLoading(true);
      try {
        const familyId = await ensureFamilyForSession(session);
        if (cancelled) return;
        setState(s => ({ ...s, syncId: familyId }));
        const segments = location.pathname.split('/').filter(Boolean);
        const currentId = segments[0];
        if (currentId !== familyId) {
          navigate(`/${familyId}/dashboard`, { replace: true });
        }
        await fetchData(familyId);
      } catch (e) {
        if (!cancelled) setFatalError((e as Error)?.message || '初始化家庭失败');
      } finally {
        if (!cancelled) setBootingFamily(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, authReady, syncId]);

  const currentProfile = useMemo<Profile>(() =>
    state.profiles.find(p => p.id === state.currentProfileId) || state.profiles[0] || INITIAL_PROFILES[0]
  , [state.profiles, state.currentProfileId]);

  const isAdmin = currentProfile.role === 'admin';

  const pathToTab: Record<string, 'dashboard' | 'earn' | 'redeem' | 'history' | 'settings' | 'doc'> = {
    'dashboard': 'dashboard',
    'earn': 'earn',
    'redeem': 'redeem',
    'history': 'history',
    'settings': 'settings',
    'doc': 'doc',
  };

  const activeTab = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const tab = segments[1]; // /:syncId/:tab
    return pathToTab[tab] || 'dashboard';
  }, [location.pathname]);

  useEffect(() => {
    if (!isAdmin && activeTab === 'settings') {
      navigate(`/${resolveFamilyId()}/dashboard`, { replace: true });
    }
  }, [isAdmin, activeTab, navigate, syncId, state.syncId]);

  const syncToCloud = async (newState: FamilyState) => {
    // Supabase 模式下，写操作在各自函数内完成，这里仅更新本地状态
    setState({ ...newState, lastSyncedAt: Date.now() } as FamilyState);
  };

  const handleTransaction = async () => {
    if (!pendingAction || transactionLoading) return;
    setPendingError(null);
    const { title, points, type } = pendingAction;

    if (type === 'redeem' && currentProfile.balance < Math.abs(points)) {
      const msg = '当前元气值不足';
      setPendingError(msg);
      showToast({ type: 'error', title: msg, description: '请先完成任务赚取元气值' });
      return;
    }

    setTransactionLoading(true);

    const txId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `tx-${Date.now()}`;
    const transaction: Transaction = {
      id: txId,
      title,
      points,
      timestamp: Date.now(),
      type,
    };

    const newState = {
      ...state,
      profiles: state.profiles.map(p => p.id === state.currentProfileId ? {
        ...p,
        balance: p.balance + points,
        history: [transaction, ...p.history].slice(0, 50)
      } : p)
    };

    setState(newState);

    const familyId = resolveFamilyId();
    const loadingId = showToast({ type: 'loading', title: '正在同步积分...', duration: 0 });
    let synced = false;
    try {
      const { data: inserted, error: txErr } = await supabase.from('transactions').insert({
        id: transaction.id,
        family_id: familyId,
        profile_id: state.currentProfileId,
        title,
        points,
        type,
        timestamp: new Date(transaction.timestamp).toISOString(),
      }).select().single();
      if (txErr) throw txErr;
      const { error: balErr } = await supabase
        .from('profiles')
        .update({ balance: currentProfile.balance + points })
        .eq('id', state.currentProfileId);
      if (balErr) throw balErr;
      if (inserted) {
        await refreshFamily(familyId);
      }
      synced = true;
      showToast({ type: 'success', title: '已记录元气变动', description: `${title}：${points > 0 ? '+' : ''}${points} pts` });
    } catch (e) {
      notifyError('积分变动失败', e);
    } finally {
      if (loadingId) dismissToast(loadingId);
      setTransactionLoading(false);
      setPendingAction(null);
    }
    await syncToCloud(newState);
    if (!synced) {
      showToast({ type: 'info', title: '本地已保存', description: '同步遇到问题，请稍后刷新重试' });
    }
  };

  const handleDeleteTransactions = async (ids: string[]): Promise<boolean> => {
    if (!isAdmin || !ids.length) return false;
    const familyId = resolveFamilyId();
    const profileId = state.currentProfileId;
    const profile = state.profiles.find(p => p.id === profileId);
    if (!familyId || !profile) return false;

    const toRemove = profile.history.filter(h => ids.includes(h.id));
    if (!toRemove.length) return false;

    const delta = toRemove.reduce((sum, tx) => sum + tx.points, 0);
    const newBalance = profile.balance - delta;

    const newState = {
      ...state,
      profiles: state.profiles.map(p => p.id === profileId ? {
        ...p,
        balance: newBalance,
        history: p.history.filter(h => !ids.includes(h.id)),
      } : p)
    } as FamilyState;

    setState(newState);
    const loadingId = showToast({ type: 'loading', title: '正在删除账单...', duration: 0 });

    try {
      const { error: delErr } = await supabase
        .from('transactions')
        .delete()
        .eq('family_id', familyId)
        .in('id', ids);
      if (delErr) throw delErr;
      const { error: balErr } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', profileId)
        .eq('family_id', familyId);
      if (balErr) throw balErr;
      await refreshFamily(familyId);
      showToast({ type: 'success', title: '已删除账单', description: `共删除 ${toRemove.length} 条记录，余额已更新` });
      return true;
    } catch (e) {
      notifyError('删除账单失败', e);
      await refreshFamily(familyId);
      return false;
    } finally {
      if (loadingId) dismissToast(loadingId);
      await syncToCloud(newState);
    }
  };

  const handleAdjustBalance = async (profileId: string, payload: { title: string; points: number; type: 'earn' | 'penalty' }) => {
    if (!isAdmin) return;
    const familyId = resolveFamilyId();
    const profile = state.profiles.find(p => p.id === profileId);
    if (!familyId || !profile) return;

    const adjPoints = payload.type === 'penalty' ? -Math.abs(payload.points) : Math.abs(payload.points);
    const txId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `tx-${Date.now()}`;
    const transaction: Transaction = {
      id: txId,
      title: payload.title,
      points: adjPoints,
      timestamp: Date.now(),
      type: payload.type,
    };

    const newState = {
      ...state,
      profiles: state.profiles.map(p => p.id === profileId ? {
        ...p,
        balance: p.balance + adjPoints,
        history: [transaction, ...p.history].slice(0, 50),
      } : p)
    } as FamilyState;

    setState(newState);
    const loadingId = showToast({ type: 'loading', title: '正在调整元气值...', duration: 0 });
    try {
      const { error: txErr } = await supabase.from('transactions').insert({
        id: transaction.id,
        family_id: familyId,
        profile_id: profileId,
        title: transaction.title,
        points: transaction.points,
        type: transaction.type,
        timestamp: new Date(transaction.timestamp).toISOString(),
      });
      if (txErr) throw txErr;
      const { error: balErr } = await supabase
        .from('profiles')
        .update({ balance: profile.balance + adjPoints })
        .eq('id', profileId)
        .eq('family_id', familyId);
      if (balErr) throw balErr;
      await refreshFamily(familyId);
      showToast({ type: 'success', title: '已调整元气值', description: `${profile.name}: ${adjPoints > 0 ? '+' : ''}${adjPoints}` });
    } catch (e) {
      notifyError('调整元气值失败', e);
      await refreshFamily(familyId);
    } finally {
      if (loadingId) dismissToast(loadingId);
      await syncToCloud(newState);
    }
  };

  const crudAction = async (type: 'task' | 'reward', action: 'save' | 'delete', item: any) => {
    if (!isAdmin) return;
    if (action === 'save' && crudSaving) return;
    if (action === 'save') setCrudSaving(true);
    const familyId = resolveFamilyId();
    let newState = { ...state } as FamilyState;
    let success = false;
    const typeLabel = type === 'task' ? '任务' : '奖品';

    try {
      if (type === 'task') {
        if (action === 'save') {
          const exists = state.tasks.find(t => t.id === item.id);
          const payload = { ...item, id: item.id || undefined, family_id: familyId };
          if (exists) {
            const { error } = await supabase.from('tasks').update(payload).eq('id', item.id);
            if (error) throw error;
          } else {
            const { data, error } = await supabase.from('tasks').insert(payload).select().single();
            if (error) throw error;
            item = data;
          }
          await refreshFamily(familyId);
          setEditingItem(null);
          success = true;
          showToast({ type: 'success', title: '任务已保存', description: item.title || '已更新任务配置' });
          return;
        } else {
          await supabase.from('tasks').delete().eq('id', item.id);
          newState.tasks = state.tasks.filter(t => t.id !== item.id);
          success = true;
        }
      } else if (type === 'reward') {
        if (action === 'save') {
          const exists = state.rewards.find(r => r.id === item.id);
          const payload = { ...item, id: item.id || undefined, family_id: familyId };
          if (exists) {
            const { error } = await supabase.from('rewards').update(payload).eq('id', item.id);
            if (error) throw error;
          } else {
            const { data, error } = await supabase.from('rewards').insert(payload).select().single();
            if (error) throw error;
            item = data;
          }
          await refreshFamily(familyId);
          setEditingItem(null);
          success = true;
          showToast({ type: 'success', title: '任务已保存', description: item.title || '已更新任务配置' });
          return;
        } else {
          await supabase.from('rewards').delete().eq('id', item.id);
          newState.rewards = state.rewards.filter(r => r.id !== item.id);
          success = true;
        }
      }
    } catch (e) {
      notifyError(`${typeLabel}${action === 'save' ? '保存' : '删除'}失败`, e);
    } finally {
      if (action === 'save') setCrudSaving(false);
    }

    if (!success) return;

    if (action === 'delete') {
      setState(newState);
      await syncToCloud(newState);
      await refreshFamily(familyId);
      showToast({ type: 'success', title: `${typeLabel}已删除` });
    }
  };

  const avatarPalette = ['bg-blue-600', 'bg-pink-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500'];

  const handleProfileNameChange = async (id: string, name: string) => {
    if (!isAdmin) return;
    const newState = {
      ...state,
      profiles: state.profiles.map(p => p.id === id ? { ...p, name } : p)
    } as FamilyState;
    setState(newState);
    const familyId = resolveFamilyId();
    try {
      const { error } = await supabase.from('profiles').update({ name }).eq('id', id).eq('family_id', familyId);
      if (error) throw error;
      await refreshFamily(familyId);
      showToast({ type: 'success', title: '姓名已更新' });
    } catch (e) {
      notifyError('更新成员姓名失败', e);
    }
    await syncToCloud(newState);
  };

  const handleUpdateProfileAvatar = async (id: string, avatarUrl: string | null) => {
    if (!isAdmin) return;
    const newState = {
      ...state,
      profiles: state.profiles.map(p => p.id === id ? { ...p, avatarUrl } : p)
    } as FamilyState;
    setState(newState);
    const familyId = resolveFamilyId();
    try {
      const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', id).eq('family_id', familyId);
      if (error) throw error;
      await refreshFamily(familyId);
      showToast({ type: 'success', title: '头像已更新' });
    } catch (e) {
      notifyError('更新头像失败', e);
    }
    await syncToCloud(newState);
  };

  const handleAddProfile = async (name: string, role: 'admin' | 'child', initialBalance?: number, avatarUrl?: string | null) => {
    if (!isAdmin) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const familyId = resolveFamilyId();
    const balance = Number.isFinite(initialBalance) ? Number(initialBalance) : 0;
    const newProfile: Profile = {
      id: `p-${Date.now()}`,
      name: trimmed,
      balance,
      history: [],
      avatarColor: avatarPalette[state.profiles.length % avatarPalette.length],
      avatarUrl: avatarUrl || null,
      role,
    };
    const newState = { ...state, profiles: [...state.profiles, newProfile] } as FamilyState;
    setState(newState);
    try {
      const { data, error } = await supabase.from('profiles').insert({
        family_id: familyId,
        name: newProfile.name,
        balance: newProfile.balance,
        role: newProfile.role,
        avatar_color: newProfile.avatarColor,
        avatar_url: avatarUrl || null,
      }).select().single();
      if (error) throw error;
      if (data) {
        await refreshFamily(familyId);
      }
      showToast({ type: 'success', title: '成员已新增', description: newProfile.name });
    } catch (e) {
      notifyError('新增成员失败', e);
    }
    await syncToCloud(newState);
  };

  const handleDeleteProfile = async (id: string) => {
    if (!isAdmin) return;
    const target = state.profiles.find(p => p.id === id);
    if (!target) return;
    if (state.profiles.length <= 1) {
      showToast({ type: 'error', title: '至少保留一位成员', description: '无法删除最后一名成员' });
      return;
    }
    const admins = state.profiles.filter(p => p.role === 'admin');
    if (target.role === 'admin' && admins.length <= 1) {
      showToast({ type: 'error', title: '至少保留一位管理员', description: '请先指定其他管理员后再删除' });
      return;
    }
    const remainingProfiles = state.profiles.filter(p => p.id !== id);
    const nextCurrent = state.currentProfileId === id
      ? (remainingProfiles.find(p => p.role === 'admin')?.id || remainingProfiles[0].id)
      : state.currentProfileId;

    const newState = { ...state, profiles: remainingProfiles, currentProfileId: nextCurrent } as FamilyState;
    setState(newState);
    const familyId = resolveFamilyId();
    try {
      await supabase.from('profiles').delete().eq('id', id).eq('family_id', familyId);
      await refreshFamily(familyId);
      showToast({ type: 'success', title: '成员已删除', description: target.name });
    } catch (e) {
      notifyError('删除成员失败', e);
    }
    await syncToCloud(newState);
  };

  const handleSwitchProfile = async (id: string) => {
    if (state.currentProfileId === id) {
      setShowProfileSwitcher(false);
      return;
    }
    const familyId = resolveFamilyId();
    const newState = { ...state, currentProfileId: id } as FamilyState;
    setState(newState);
    setShowProfileSwitcher(false);
    try {
      await supabase.from('families').update({ current_profile_id: id }).eq('id', familyId);
    } catch (e) {
      console.warn('Profile switch sync failed', e);
    }
    await syncToCloud(newState);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingItem({
        ...editingItem,
        item: { ...editingItem.item, imageUrl: reader.result as string }
      });
    };
    reader.readAsDataURL(file);
  };

  const filteredTasks = useMemo(() => {
    const sorted = [...state.tasks].sort((a, b) => a.points - b.points);
    return taskFilter === 'all' ? sorted : sorted.filter(t => t.category === taskFilter);
  }, [state.tasks, taskFilter]);

  const filteredRewards = useMemo(() => {
    const sorted = [...state.rewards].sort((a, b) => a.points - b.points);
    return rewardFilter === 'all' ? sorted : sorted.filter(r => r.type === rewardFilter);
  }, [state.rewards, rewardFilter]);

  const goTab = (tab: 'dashboard' | 'earn' | 'redeem' | 'history' | 'settings' | 'doc') => {
    const target = resolveFamilyId();
    if (!target) return;
    navigate(`/${target}/${tab}`);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setFatalError(null);
      setBootingFamily(false);
      setIsSyncing(false);
      setState({
        currentProfileId: INITIAL_PROFILES[1].id,
        profiles: INITIAL_PROFILES,
        tasks: INITIAL_TASKS,
        rewards: INITIAL_REWARDS,
        syncId: '',
      });
      navigate('/', { replace: true });
    } catch (e) {
      notifyError('退出登录失败', e);
    } finally {
      setIsLoading(false);
    }
  };

  const resolvedFamilyId = resolveFamilyId();

  if (!authReady) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FDFCFD]">
        <div className="w-12 h-12 border-4 border-[#FF4D94] border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-bold text-[#FF4D94] font-display">正在初始化...</h2>
      </div>
    );
  }

  if (!session) {
    const path = location.pathname;
    if (path.startsWith('/reset')) {
      return <PasswordResetPage />;
    }
    return <AuthGate />;
  }

  if (isLoading || bootingFamily) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FDFCFD]">
        <div className="w-12 h-12 border-4 border-[#FF4D94] border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-bold text-[#FF4D94] font-display">正在启动系统...</h2>
      </div>
    );
  }

  const displayFatal = fatalError;

  if (displayFatal) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#FFF5F9] via-white to-[#F2ECFF] px-6 py-12">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 p-8 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#FF4D94]/15 to-[#7C4DFF]/15 text-[#FF4D94] flex items-center justify-center text-2xl shadow-inner">!</div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Access Limited</p>
            <h2 className="text-2xl font-black text-gray-900">家庭未开通或链接失效</h2>
            <p className="text-sm text-gray-600">请联系管理员开通后再访问，开通过的家庭将获得完整的积分银行功能。</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">购买联系人</span>
              <span className="text-sm font-bold text-[#FF4D94]">微信：liaoyuan3256</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">价格</span>
              <span className="font-bold text-gray-900">66 元 · 终身</span>
            </div>
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="font-semibold text-gray-800 mb-1">主要功能</p>
              <ul className="list-disc list-inside space-y-1">
                <li>多成员积分 / 扣分与历史记录</li>
                <li>任务与奖品配置，实时存入 Supabase</li>
                <li>兑换记录与打印制度手册</li>
                <li>按家庭 ID（Supabase families.id）独立的家庭空间</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <a href="weixin://" className="block w-full px-5 py-3 rounded-xl bg-[#FF4D94] text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95">打开微信添加 liaoyuan3256</a>
            <button onClick={() => window.location.reload()} className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:border-[#FF4D94] hover:text-[#FF4D94]">刷新重试</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row transition-colors"
      style={{ background: 'var(--app-bg)', color: 'var(--text-primary)' }}
    >
      <div className="hidden lg:block lg:sticky lg:top-0 lg:h-screen">
        <Sidebar 
          activeTab={activeTab}
          onChangeTab={goTab}
          isAdmin={isAdmin}
          currentProfile={currentProfile}
          onProfileClick={() => setShowProfileSwitcher(true)}
        />
      </div>

      <main className="flex-1 w-full lg:p-8 px-4 pt-6 pb-28 lg:pt-5 lg:pb-10 overflow-y-auto no-scrollbar">
        <HeaderBar 
          activeTab={activeTab}
          currentProfile={currentProfile}
          isAdmin={isAdmin}
          theme={theme}
          onToggleTheme={toggleTheme}
          onPrint={() => printReport(state)}
          onLogout={handleLogout}
        />

        <Routes>
          <Route path="/" element={resolvedFamilyId ? <Navigate to={`/${resolvedFamilyId}/dashboard`} replace /> : <AuthGate />} />
          <Route path="/reset" element={<PasswordResetPage />} />
          <Route path="/:syncId" element={resolvedFamilyId ? <Navigate to={`/${resolvedFamilyId}/dashboard`} replace /> : <AuthGate />} />
          <Route 
            path="/:syncId/dashboard" 
            element={
              <DashboardSection 
                currentProfile={currentProfile}
                profiles={state.profiles}
                onGoEarn={() => goTab('earn')}
                onGoRedeem={() => goTab('redeem')}
              />
            }
          />
          <Route 
            path="/:syncId/earn" 
            element={
              <EarnSection 
                tasks={state.tasks}
                onSelectTask={(payload) => setPendingAction(payload)}
              />
            }
          />
          <Route 
            path="/:syncId/redeem" 
            element={
              <RedeemSection 
                rewards={state.rewards}
                balance={currentProfile.balance}
                onRedeem={(payload) => setPendingAction(payload)}
              />
            }
          />
          <Route 
            path="/:syncId/history" 
            element={
              <HistorySection 
                history={currentProfile.history} 
                isAdmin={isAdmin} 
                onDeleteTransactions={handleDeleteTransactions} 
              />
            }
          />
          <Route 
            path="/:syncId/settings" 
            element={isAdmin ? (
              <SettingsSection 
                profiles={state.profiles}
                tasks={filteredTasks}
                rewards={filteredRewards}
                taskFilter={taskFilter}
                rewardFilter={rewardFilter}
                onTaskFilterChange={setTaskFilter}
                onRewardFilterChange={setRewardFilter}
                onEdit={(payload) => setEditingItem(payload)}
                onDelete={(type, item) => crudAction(type, 'delete', item)}
                onSync={() => refreshFamily()}
                onPrint={() => printReport(state)}
                onProfileNameChange={(id, name) => handleProfileNameChange(id, name)}
                onUpdateProfileAvatar={(id, avatarUrl) => handleUpdateProfileAvatar(id, avatarUrl)}
                onAddProfile={(name, role, balance, avatarUrl) => handleAddProfile(name, role, balance, avatarUrl)}
                onDeleteProfile={(id) => handleDeleteProfile(id)}
                onAdjustBalance={(profileId, payload) => handleAdjustBalance(profileId, payload)}
                isSyncing={isSyncing}
                currentSyncId={resolveFamilyId()}
              />
            ) : <Navigate to={`/${resolveFamilyId()}/dashboard`} replace />}
          />
          <Route path="/:syncId/doc" element={<DocsPage />} />
          <Route path="*" element={<Navigate to={`/${resolveFamilyId()}/dashboard`} replace />} />
        </Routes>
      </main>

      <MobileNav 
        activeTab={activeTab}
        onChangeTab={goTab}
        isAdmin={isAdmin}
        onProfileClick={() => setShowProfileSwitcher(true)}
      />

      <ProfileSwitcherModal 
        open={showProfileSwitcher}
        profiles={state.profiles}
        currentProfileId={state.currentProfileId}
        onSelect={(id) => handleSwitchProfile(id)}
        onClose={() => setShowProfileSwitcher(false)}
      />

      {editingItem && isAdmin && (
        <EditModal 
          editingItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(type, item) => crudAction(type, 'save', item)}
          onUpdate={setEditingItem}
          fileInputRef={fileInputRef}
          onImageChange={handleImageUpload}
          saving={crudSaving}
        />
      )}

      <PendingActionModal 
        pendingAction={pendingAction}
        error={pendingError}
        loading={transactionLoading}
        onCancel={() => {
          setPendingError(null);
          setPendingAction(null);
        }}
        onConfirm={handleTransaction}
      />

      <PasswordResetModal 
        open={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
      />
    </div>
  );
}
