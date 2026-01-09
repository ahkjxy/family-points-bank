import { useMemo, useState } from 'react';
import { Task } from '../types';
import { Icon } from './Icon';

interface EarnSectionProps {
  tasks: Task[];
  onSelectTask: (payload: { title: string; points: number; type: 'earn' | 'penalty' }) => void;
}

export function EarnSection({ tasks, onSelectTask }: EarnSectionProps) {
  const categories = ['all', 'learning', 'chores', 'discipline', 'penalty'] as const;
  const [activeTab, setActiveTab] = useState<typeof categories[number]>('all');

  const getMeta = (cat: typeof categories[number]) => {
    switch (cat) {
      case 'learning':
        return { label: '学习习惯', chip: '📘', tone: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400', icon: 'home' };
      case 'chores':
        return { label: '家务帮手', chip: '🧹', tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400', icon: 'plus' };
      case 'discipline':
        return { label: '自律养成', chip: '⏰', tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400', icon: 'history' };
      case 'penalty':
        return { label: '违规警示', chip: '⚠️', tone: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400', icon: 'penalty' };
      default:
        return { label: '全部任务', chip: '✨', tone: 'text-[#FF4D94] bg-pink-50 dark:bg-pink-500/10 dark:text-pink-400', icon: 'reward' };
    }
  };

  const filtered = useMemo<Task[]>(() => {
    const sorted = [...tasks].sort((a, b) => b.points - a.points); // Sort by highest points first
    if (activeTab === 'all') return sorted;
    return sorted.filter((t: Task) => t.category === activeTab);
  }, [activeTab, tasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const daily = tasks.filter(t => (t.frequency || '').includes('日')).length;
    const highValue = tasks.filter(t => t.points >= 5).length;
    return { total, daily, highValue };
  }, [tasks]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden rounded-[40px] bg-white dark:bg-[#0F172A] border border-gray-100 dark:border-white/5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] p-8 lg:p-10 mobile-card">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-gradient-to-br from-[#FF4D94]/10 to-[#7C4DFF]/10 blur-[60px] rounded-full"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4D94]/10 text-[#FF4D94] text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D94] animate-pulse"></div>
              任务中心
            </div>
            <h3 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-2">今天想赚取多少元气？</h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium">每完成一个小任务，都在为实现梦想积攒能量。点击卡片立刻记分。</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4 lg:min-w-[360px]">
            {[
              { label: '任务库', val: stats.total, sub: '总数', color: 'text-gray-900 dark:text-white' },
              { label: '每日必做', val: stats.daily, sub: '每日', color: 'text-emerald-500' },
              { label: '高额挑战', val: stats.highValue, sub: '高额', color: 'text-[#7C4DFF]' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50/50 dark:bg-white/5 p-4 rounded-[24px] border border-gray-100 dark:border-transparent text-center">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                <p className={`text-2xl font-black points-font ${s.color}`}>{s.val}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter opacity-60 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-10 flex flex-wrap gap-2.5 p-1.5 bg-gray-100/50 dark:bg-white/5 rounded-[28px] border border-gray-100/50 dark:border-transparent">
          {categories.map(cat => {
            const meta = getMeta(cat);
            const isActive = activeTab === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-[22px] text-sm font-black transition-all duration-300 ${
                  isActive 
                    ? 'bg-white dark:bg-gray-800 text-[#FF4D94] shadow-md shadow-gray-200/50 dark:shadow-none scale-[1.02]' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <span className="text-base">{meta.chip}</span>
                <span className="truncate tracking-tight">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((task: Task) => {
          const meta = getMeta(task.category as typeof categories[number]);
          const isPenalty = task.category === 'penalty';
          return (
            <button
              key={task.id}
              onClick={() => onSelectTask({ title: task.title, points: task.points, type: isPenalty ? 'penalty' : 'earn' })}
              className={`group relative text-left w-full p-6 rounded-[32px] bg-white dark:bg-[#0F172A] border transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] active:scale-[0.98] mobile-card ${
                isPenalty 
                  ? 'border-gray-100 dark:border-white/5 hover:border-rose-200' 
                  : 'border-gray-100 dark:border-white/5 hover:border-[#FF4D94]/30'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-transform group-hover:rotate-12 duration-500 ${meta.tone}`}>
                  {meta.chip}
                </div>
                <div className={`px-4 py-2 rounded-xl text-[11px] font-black points-font shadow-sm ${
                  task.points > 0 
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' 
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
                }`}>
                  {task.points > 0 ? '+' : ''}{task.points} 元气值
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                    {task.frequency || '随时'}
                  </span>
                  <div className={`w-1 h-1 rounded-full ${isPenalty ? 'bg-rose-400' : 'bg-emerald-400'}`}></div>
                </div>
                <h4 className="text-lg font-black text-gray-900 dark:text-white tracking-tight group-hover:text-[#FF4D94] transition-colors line-clamp-1">{task.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium line-clamp-2 leading-relaxed h-[40px]">{task.description || '完成后请点击记录元气能量'}</p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isPenalty ? 'bg-rose-500' : 'bg-emerald-500'} shadow-sm animate-pulse`}></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isPenalty ? '点此扣分' : '点此加分'}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-300 dark:text-gray-600 group-hover:bg-[#FF4D94] group-hover:text-white transition-all">
                  <Icon name="plus" size={14} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-center gap-4 bg-white/50 dark:bg-white/5 rounded-[40px] border border-dashed border-gray-200 dark:border-white/10">
          <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-4xl opacity-50">📋</div>
          <p className="text-lg font-black text-gray-400 uppercase tracking-widest">暂无该分类任务</p>
        </div>
      )}
    </div>
  );
}
