import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useMatch } from 'react-router-dom';
import { FamilyState, Transaction, Profile, Category } from './types';
import { INITIAL_TASKS, INITIAL_REWARDS, INITIAL_PROFILES, FIXED_SYNC_ID, SYNC_API_PREFIX } from './constants';
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
} from './components';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const match = useMatch('/:syncId/*');
  const syncId = match?.params?.syncId;
  const fallbackSyncId = syncId || FIXED_SYNC_ID;

  const [state, setState] = useState<FamilyState>({
    currentProfileId: INITIAL_PROFILES[1].id,
    profiles: INITIAL_PROFILES,
    tasks: INITIAL_TASKS,
    rewards: INITIAL_REWARDS,
    syncId: fallbackSyncId,
  });

  const [editingItem, setEditingItem] = useState<{ type: 'task' | 'reward'; item: any } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ title: string; points: number; type: 'earn' | 'penalty' | 'redeem' } | null>(null);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [taskFilter, setTaskFilter] = useState<Category | 'all'>('all');
  const [rewardFilter, setRewardFilter] = useState<'实物奖品' | '特权奖励' | 'all'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const ensureCurrentProfileId = (profiles: Profile[], preferredId?: string) => {
    if (!profiles.length) return '';
    if (preferredId && profiles.some(p => p.id === preferredId)) return preferredId;
    const admin = profiles.find(p => p.role === 'admin');
    return admin?.id ?? profiles[0].id;
  };

  const [fatalError, setFatalError] = useState<string | null>(null);

  const fetchData = async (targetSyncId: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${SYNC_API_PREFIX}${encodeURIComponent(targetSyncId)}?t=${Date.now()}`);
      if (res.status === 404) {
        setFatalError('家庭未开通或链接失效，请联系管理员购买：微信 liaoyuan3256 · 66 元终身。功能：多成员积分/扣分、任务与奖品配置、兑换记录、打印手册、本地文件同步。');
        return;
      }
      if (!res.ok) {
        throw new Error('同步失败，请稍后重试');
      }
      const data = await res.json();
      if (!data || !data.profiles) {
        throw new Error('数据格式不完整');
      }
      const preferredId = data.currentProfileId ?? state.currentProfileId;
      const normalizedRemote = { ...data, syncId: targetSyncId, currentProfileId: ensureCurrentProfileId(data.profiles, preferredId) } as FamilyState;
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

  useEffect(() => {
    const target = syncId || FIXED_SYNC_ID;
    setState(s => ({ ...s, syncId: target }));
    fetchData(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncId]);

  const currentProfile = useMemo<Profile>(() =>
    state.profiles.find(p => p.id === state.currentProfileId) || state.profiles[1]
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
      navigate('/dashboard', { replace: true });
    }
  }, [isAdmin, activeTab, navigate]);

  const syncToCloud = async (newState: FamilyState) => {
    setIsSyncing(true);
    const mergedState = { ...newState, lastSyncedAt: Date.now() } as FamilyState;
    const targetSyncId = syncId || state.syncId || FIXED_SYNC_ID;
    try {
      const res = await fetch(`${SYNC_API_PREFIX}${encodeURIComponent(targetSyncId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedState),
      });
      if (!res.ok) throw new Error('保存失败');
      setState(mergedState);
    } catch (e) {
      console.warn('Save failed', e);
      throw e;
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleTransaction = async () => {
    if (!pendingAction) return;
    const { title, points, type } = pendingAction;

    if (type === 'redeem' && currentProfile.balance < Math.abs(points)) {
      alert('当前元气值不足哦！✨');
      setPendingAction(null);
      return;
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
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

    setPendingAction(null);
    setState(newState);
    await syncToCloud(newState);
  };

  const crudAction = async (type: 'task' | 'reward', action: 'save' | 'delete', item: any) => {
    if (!isAdmin) return;
    let newState = { ...state } as FamilyState;

    if (type === 'task') {
      if (action === 'save') {
        const exists = state.tasks.find(t => t.id === item.id);
        newState.tasks = exists ? state.tasks.map(t => t.id === item.id ? item : t) : [...state.tasks, { ...item, id: `task-${Date.now()}` }];
      } else {
        newState.tasks = state.tasks.filter(t => t.id !== item.id);
      }
    } else if (type === 'reward') {
      if (action === 'save') {
        const exists = state.rewards.find(r => r.id === item.id);
        newState.rewards = exists ? state.rewards.map(r => r.id === item.id ? item : r) : [...state.rewards, { ...item, id: `reward-${Date.now()}` }];
      } else {
        newState.rewards = state.rewards.filter(r => r.id !== item.id);
      }
    }

    setEditingItem(null);
    setState(newState);
    await syncToCloud(newState);
  };

  const avatarPalette = ['bg-blue-600', 'bg-pink-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500'];

  const handleProfileNameChange = async (id: string, name: string) => {
    if (!isAdmin) return;
    const newState = {
      ...state,
      profiles: state.profiles.map(p => p.id === id ? { ...p, name } : p)
    } as FamilyState;
    setState(newState);
    await syncToCloud(newState);
  };

  const handleAddProfile = async (name: string, role: 'admin' | 'child') => {
    if (!isAdmin) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const newProfile: Profile = {
      id: `p-${Date.now()}`,
      name: trimmed,
      balance: 0,
      history: [],
      avatarColor: avatarPalette[state.profiles.length % avatarPalette.length],
      role,
    };
    const newState = { ...state, profiles: [...state.profiles, newProfile] } as FamilyState;
    setState(newState);
    await syncToCloud(newState);
  };

  const handleDeleteProfile = async (id: string) => {
    if (!isAdmin) return;
    const target = state.profiles.find(p => p.id === id);
    if (!target) return;
    if (state.profiles.length <= 1) {
      alert('至少保留一位成员');
      return;
    }
    const admins = state.profiles.filter(p => p.role === 'admin');
    if (target.role === 'admin' && admins.length <= 1) {
      alert('至少保留一位管理员');
      return;
    }
    const remainingProfiles = state.profiles.filter(p => p.id !== id);
    const nextCurrent = state.currentProfileId === id
      ? (remainingProfiles.find(p => p.role === 'admin')?.id || remainingProfiles[0].id)
      : state.currentProfileId;

    const newState = { ...state, profiles: remainingProfiles, currentProfileId: nextCurrent } as FamilyState;
    setState(newState);
    await syncToCloud(newState);
  };

  const handleSwitchProfile = async (id: string) => {
    if (state.currentProfileId === id) {
      setShowProfileSwitcher(false);
      return;
    }
    const newState = { ...state, currentProfileId: id } as FamilyState;
    setState(newState);
    setShowProfileSwitcher(false);
    try {
      await syncToCloud(newState);
    } catch (e) {
      console.warn('Profile switch sync failed', e);
    }
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

  const filteredTasks = useMemo(() =>
    taskFilter === 'all' ? state.tasks : state.tasks.filter(t => t.category === taskFilter)
  , [state.tasks, taskFilter]);

  const filteredRewards = useMemo(() =>
    rewardFilter === 'all' ? state.rewards : state.rewards.filter(r => r.type === rewardFilter)
  , [state.rewards, rewardFilter]);

  const goTab = (tab: 'dashboard' | 'earn' | 'redeem' | 'history' | 'settings' | 'doc') => {
    const target = syncId || state.syncId || FIXED_SYNC_ID;
    navigate(`/${target}/${tab}`);
  };

  if (isLoading) {
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
                <li>任务与奖品配置、同步到本地文件</li>
                <li>兑换记录与打印制度手册</li>
                <li>按 Sync ID 独立的家庭空间</li>
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
    <div className="flex min-h-screen bg-[#FDFCFD]">
      <Sidebar 
        activeTab={activeTab}
        onChangeTab={goTab}
        isAdmin={isAdmin}
        currentProfile={currentProfile}
        onProfileClick={() => setShowProfileSwitcher(true)}
      />

      <main className="flex-1 p-8 overflow-y-auto no-scrollbar">
        <HeaderBar 
          activeTab={activeTab}
          currentProfile={currentProfile}
          isAdmin={isAdmin}
          onPrint={() => printReport(state)}
        />

        <Routes>
          <Route path="/" element={<Navigate to={`/${fallbackSyncId}/dashboard`} replace />} />
          <Route path="/:syncId" element={<Navigate to={`/${fallbackSyncId}/dashboard`} replace />} />
          <Route 
            path="/:syncId/dashboard" 
            element={
              <DashboardSection 
                currentProfile={currentProfile}
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
            element={<HistorySection history={currentProfile.history} />}
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
                onSync={() => fetchData(syncId || state.syncId || FIXED_SYNC_ID)}
                onPrint={() => printReport(state)}
                onProfileNameChange={(id, name) => handleProfileNameChange(id, name)}
                onAddProfile={(name, role) => handleAddProfile(name, role)}
                onDeleteProfile={(id) => handleDeleteProfile(id)}
                isSyncing={isSyncing}
                currentSyncId={syncId || state.syncId}
              />
            ) : <Navigate to={`/${syncId}/dashboard`} replace />}
          />
          <Route path="/:syncId/doc" element={<DocsPage />} />
          <Route path="*" element={<Navigate to={syncId ? `/${syncId}/dashboard` : '/'} replace />} />
        </Routes>
      </main>

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
        />
      )}

      <PendingActionModal 
        pendingAction={pendingAction}
        onCancel={() => setPendingAction(null)}
        onConfirm={handleTransaction}
      />
    </div>
  );
}
