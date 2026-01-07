import { Task, Category } from '../types';
import { Icon } from './Icon';

interface TaskSettingsProps {
  tasks: Task[];
  filter: Category | 'all';
  selectedIds: Set<string>;
  onFilterChange: (value: Category | 'all') => void;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onBatchDelete: () => void;
  isDeleting: boolean;
}

const CATEGORY_LABELS: Record<Category, string> = {
  learning: '学习',
  chores: '家务',
  discipline: '自律',
  penalty: '违规',
  reward: '奖励',
};

const CATEGORY_COLORS: Record<Category, string> = {
  learning: 'bg-blue-100 text-blue-700',
  chores: 'bg-green-100 text-green-700',
  discipline: 'bg-purple-100 text-purple-700',
  penalty: 'bg-red-100 text-red-700',
  reward: 'bg-yellow-100 text-yellow-700',
};

export function TaskSettings({
  tasks,
  filter,
  selectedIds,
  onFilterChange,
  onToggle,
  onEdit,
  onBatchDelete,
  isDeleting,
}: TaskSettingsProps) {
  const categories: (Category | 'all')[] = ['all', 'learning', 'chores', 'discipline', 'penalty'];

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onFilterChange(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filter === cat
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat === 'all' ? '全部' : CATEGORY_LABELS[cat]}
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
            共 {filteredTasks.length} 个任务
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {filteredTasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(task.id)}
              onChange={() => onToggle(task.id)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: CATEGORY_COLORS[task.category]?.split(' ')[0] || '#F3F4F6' }}>
              <span className="text-xs font-bold" style={{ color: CATEGORY_COLORS[task.category]?.split(' ')[1] || '#374151' }}>
                {CATEGORY_LABELS[task.category][0]}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[task.category]}`}>
                  {CATEGORY_LABELS[task.category]}
                </span>
                <span className="font-semibold text-gray-900 text-sm">{task.title}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{task.description}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-gray-700">
                  {task.points > 0 ? '+' : ''}{task.points}
                </span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500">{task.frequency}</span>
              </div>
            </div>
            <button
              onClick={() => onEdit(task)}
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
