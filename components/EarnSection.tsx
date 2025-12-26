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

  const filtered = useMemo(() => {
    if (activeTab === 'all') return tasks;
    return tasks.filter(t => t.category === activeTab);
  }, [activeTab, tasks]);

  return (
    <div className="space-y-6 pb-14 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all ${activeTab === cat ? 'bg-[#FF4D94] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:border-[#FF4D94]'}`}
          >
            {renderLabel(cat)}
          </button>
        ))}
      </div>

      {categories
        .filter(cat => cat === activeTab || activeTab === 'all')
        .filter(cat => cat !== 'all')
        .map(cat => {
          const list = filtered.filter(t => t.category === cat);
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

              <div className="overflow-x-auto no-scrollbar">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50/60">
                    <tr>
                      <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">事项 / 描述</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">周期</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">元气值</th>
                      <th className="px-3 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((task, idx) => (
                      <tr 
                        key={task.id}
                        onClick={() => onSelectTask({ title: task.title, points: task.points, type: task.category === 'penalty' ? 'penalty' : 'earn' })}
                        className={`cursor-pointer transition-colors group border-l-4 border-l-transparent ${idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/70 hover:bg-gray-100'} group-hover:border-l-[#FF4D94]`}
                      >
                        <td className="px-5 py-3 text-[13px] text-gray-800">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-500 uppercase">{task.frequency}</span>
                            <span className="group-hover:text-[#FF4D94] transition-colors font-bold leading-tight line-clamp-1">{task.title}</span>
                            <span className="text-[11px] text-gray-400 font-semibold truncate max-w-full">· {task.description || '暂无详细描述'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-500 font-semibold whitespace-nowrap">{task.frequency}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-black points-font ${task.points > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                            {task.points > 0 ? '+' : ''}{task.points}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-gray-300 group-hover:text-[#FF4D94]">
                          <Icon name={task.category === 'penalty' ? 'penalty' : 'plus'} size={14} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

      {filtered.filter(t => activeTab === 'all' ? true : t.category === activeTab).length === 0 && (
        <div className="bg-white p-8 rounded-[24px] border border-dashed border-gray-200 text-center text-gray-400 font-semibold">
          暂无可用任务
        </div>
      )}
    </div>
  );
}
