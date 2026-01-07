import { useState } from 'react';
import { Profile, UserRole } from '../types';
import { Icon } from './Icon';
import { useToast } from './Toast';

interface MemberSettingsProps {
  profiles: Profile[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onRoleChange: (id: string, role: UserRole) => void;
  onBulkRole: (role: UserRole) => void;
  onDelete: () => void;
  onAddMember: () => void;
  onEditMember: (profile: Profile) => void;
  roleLoading: Set<string>;
  adminCount: number;
  isSyncing: boolean;
}

export function MemberSettings({
  profiles,
  selectedIds,
  onToggle,
  onRoleChange,
  onBulkRole,
  onDelete,
  onAddMember,
  onEditMember,
  roleLoading,
  adminCount,
  isSyncing,
}: MemberSettingsProps) {
  const { showToast } = useToast();
  const [adjustModal, setAdjustModal] = useState<Profile | null>(null);
  const [adjustPoints, setAdjustPoints] = useState<number>(0);
  const [adjustMemo, setAdjustMemo] = useState('');
  const [adjustType, setAdjustType] = useState<'earn' | 'penalty'>('earn');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustLoading, setAdjustLoading] = useState(false);

  const handleAdjust = async () => {
    if (!adjustModal) return;
    if (!adjustPoints) {
      setAdjustError('请输入调整金额');
      return;
    }
    if (!adjustMemo.trim()) {
      setAdjustError('请输入调整说明');
      return;
    }
    setAdjustError(null);
    setAdjustLoading(true);
    try {
      setAdjustModal(null);
      showToast({ type: 'success', title: '余额调整已提交' });
    } catch (e) {
      setAdjustError((e as Error)?.message || '调整失败');
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedIds.size === profiles.length && profiles.length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                profiles.forEach(p => onToggle(p.id));
              } else {
                profiles.forEach(p => onToggle(p.id));
              }
            }}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">已选 {selectedIds.size} 位成员</span>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => onBulkRole('admin')}
                disabled={roleLoading.size > 0 || isSyncing}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                设为管理员
              </button>
              <button
                onClick={() => onBulkRole('child')}
                disabled={roleLoading.size > 0 || isSyncing}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                设为成员
              </button>
              <button
                onClick={onDelete}
                disabled={isSyncing}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                删除
              </button>
            </>
          )}
          <button
            onClick={onAddMember}
            disabled={isSyncing}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            <Icon name="plus" size={16} className="inline-block mr-1" />
            添加成员
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(profile.id)}
              onChange={() => onToggle(profile.id)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold" style={{ backgroundColor: profile.avatarColor || '#F3F4F6' }}>
              {profile.name?.[0] || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{profile.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${profile.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {profile.role === 'admin' ? '管理员' : '成员'}
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-0.5">
                余额: <span className="font-semibold text-gray-700">{profile.balance}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onEditMember(profile)}
                disabled={isSyncing}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Icon name="edit" size={18} />
              </button>
              <button
                onClick={() => setAdjustModal(profile)}
                disabled={isSyncing}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Icon name="add" size={18} />
              </button>
              <button
                onClick={() => onRoleChange(profile.id, profile.role === 'admin' ? 'child' : 'admin')}
                disabled={roleLoading.has(profile.id) || isSyncing || (profile.role === 'admin' && adminCount <= 1)}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  profile.role === 'admin'
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {roleLoading.has(profile.id) ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon name={profile.role === 'admin' ? 'admin' : 'user'} size={18} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {adjustModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAdjustModal(null)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative z-10">
            <h3 className="text-lg font-bold text-gray-900 mb-4">调整余额 - {adjustModal.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">调整金额</label>
                <input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF4D94]"
                  placeholder="输入正数为加分，负数为扣分"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">调整说明</label>
                <input
                  type="text"
                  value={adjustMemo}
                  onChange={(e) => setAdjustMemo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF4D94]"
                  placeholder="例如：手动调整、特殊奖励等"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">调整类型</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as 'earn' | 'penalty')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF4D94]"
                >
                  <option value="earn">奖励（加分）</option>
                  <option value="penalty">扣减（减分）</option>
                </select>
              </div>
              {adjustError && <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{adjustError}</div>}
              <div className="flex gap-3">
                <button
                  onClick={() => setAdjustModal(null)}
                  disabled={adjustLoading}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleAdjust}
                  disabled={adjustLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {adjustLoading ? '处理中...' : '确认调整'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
