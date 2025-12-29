import React, { useMemo, useState } from 'react';
import { Task } from '../types';
import { Icon } from './Icon';

interface EarnSectionProps {
  tasks: Task[];
  onSelectTask: (payload: { title: string; points: number; type: 'earn' | 'penalty' }) => void;
}

export function EarnSection({ tasks, onSelectTask }: EarnSectionProps) {
  const categories = ['all', 'learning', 'chores', 'discipline', 'penalty'] as const;
  const [activeTab, setActiveTab] = useState<typeof categories[number]>('all');

  const renderLabel = (cat: string) => {
    if (cat === 'learning') return '📘 学习习惯类';
    if (cat === 'chores') return '🧹 家务帮手类';
    if (cat === 'discipline') return '⏰ 自律养成类';
    if (cat === 'penalty') return '⚠️ 违规警示项';
    return '全部任务';
  };

  const renderTone = (cat: string) => cat === 'penalty' ? 'text-rose-500 bg-rose-50' : 'text-[#FF4D94] bg-pink-50';

  const filtered = useMemo<Task[]>(() => {
    const sorted = [...tasks].sort((a, b) => a.points - b.points);
    if (activeTab === 'all') return sorted;
    return sorted.filter((t: Task) => t.category === activeTab);
  }, [activeTab, tasks]);

  return (
    <div className="space-y-6 pb-14 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap gap-2 bg-white/60 backdrop-blur rounded-2xl p-2 border border-gray-100 shadow-sm">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all min-w-[96px] text-center ${activeTab === cat ? 'bg-[#FF4D94] text-white shadow-md shadow-[#FF4D94]/20' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]'}`}
          >
            {renderLabel(cat)}
          </button>
        ))}
      </div>

      {categories
        .filter((cat: typeof categories[number]) => cat === activeTab || activeTab === 'all')
        .filter((cat: typeof categories[number]) => cat !== 'all')
        .map((cat: typeof categories[number]) => {
          const list = filtered.filter((t: Task) => t.category === cat);
          if (list.length === 0) return null;
          return (
            <section key={cat} className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${renderTone(cat)} shadow-inner`}>
                    <Icon name={cat} size={18} />
                  </div>
                  <div className="flex items-center gap-3 text-sm font-display">
                    <span className="text-gray-800 font-bold leading-tight">{renderLabel(cat)}</span>
                    <span className="text-[11px] text-gray-400 font-semibold">点击行即可录入元气值</span>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{list.length} 项</span>
              </div>

              <div className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {list.map((task: Task) => (
                    <button
                      key={task.id}
                      onClick={() => onSelectTask({ title: task.title, points: task.points, type: task.category === 'penalty' ? 'penalty' : 'earn' })}
                      className="w-full text-left group rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.35)] hover:border-[#FF4D94]/40 hover:shadow-[0_14px_38px_-22px_rgba(255,77,148,0.35)] transition-all p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-500 uppercase whitespace-nowrap">{task.frequency}</span>
                            <span className="text-sm font-bold text-gray-800 leading-tight group-hover:text-[#FF4D94] truncate">{task.title}</span>
                          </div>
                          <p className="text-[11px] text-gray-400 font-semibold line-clamp-2 mt-1">{task.description || '暂无详细描述'}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-black points-font shrink-0 ${task.points > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                          {task.points > 0 ? '+' : ''}{task.points}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold">
                        <span className="inline-flex items-center gap-1"><Icon name={task.category === 'penalty' ? 'penalty' : 'plus'} size={14} /> 点击快速录入</span>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-gray-50 text-gray-500">{renderLabel(task.category)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

      {filtered.filter((t: Task) => (activeTab === 'all' ? true : t.category === activeTab)).length === 0 && (
        <div className="bg-white p-8 rounded-[24px] border border-dashed border-gray-200 text-center text-gray-400 font-semibold">
          暂无可用任务
        </div>
      )}
    </div>
  );
}
