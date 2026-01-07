import { Reward } from '../types';
import { Icon } from './Icon';

interface RewardSettingsProps {
  rewards: Reward[];
  filter: '实物奖品' | '特权奖励' | 'all';
  selectedIds: Set<string>;
  onFilterChange: (value: '实物奖品' | '特权奖励' | 'all') => void;
  onToggle: (id: string) => void;
  onEdit: (reward: Reward) => void;
  onBatchDelete: () => void;
  isDeleting: boolean;
}

const REWARD_COLORS: Record<string, string> = {
  '实物奖品': 'bg-orange-100 text-orange-700',
  '特权奖励': 'bg-purple-100 text-purple-700',
};

export function RewardSettings({
  rewards,
  filter,
  selectedIds,
  onFilterChange,
  onToggle,
  onEdit,
  onBatchDelete,
  isDeleting,
}: RewardSettingsProps) {
  const filters: ('实物奖品' | '特权奖励' | 'all')[] = ['all', '实物奖品', '特权奖励'];

  const filteredRewards = filter === 'all' ? rewards : rewards.filter(r => r.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filter === f
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? '全部' : f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={onBatchDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              <Icon name="delete" size={14} className="inline-block mr-1" />
              删除 {selectedIds.size}
            </button>
          )}
          <span className="text-xs text-gray-500">
            共 {filteredRewards.length} 个奖品
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {filteredRewards.map(reward => (
          <div
            key={reward.id}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(reward.id)}
              onChange={() => onToggle(reward.id)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
              {reward.imageUrl ? (
                <img src={reward.imageUrl} alt={reward.title} className="w-full h-full object-cover" />
              ) : (
                <Icon name="reward" size={24} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${REWARD_COLORS[reward.type] || 'bg-gray-100 text-gray-700'}`}>
                  {reward.type}
                </span>
                <span className="font-semibold text-gray-900 text-sm">{reward.title}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-[#FF4D94]">
                  {reward.points} 积分
                </span>
              </div>
            </div>
            <button
              onClick={() => onEdit(reward)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Icon name="edit" size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
