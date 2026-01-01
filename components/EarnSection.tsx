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

  const getMeta = (cat: typeof categories[number]) => {
    switch (cat) {
      case 'learning':
        return { label: '学习习惯', chip: '📘', tone: 'text-indigo-600 bg-indigo-50' };
      case 'chores':
        return { label: '家务帮手', chip: '🧹', tone: 'text-emerald-600 bg-emerald-50' };
      case 'discipline':
        return { label: '自律养成', chip: '⏰', tone: 'text-amber-600 bg-amber-50' };
      case 'penalty':
        return { label: '违规警示', chip: '⚠️', tone: 'text-rose-600 bg-rose-50' };
      default:
        return { label: '全部任务', chip: '✨', tone: 'text-[#FF4D94] bg-pink-50' };
    }
  };

  const filtered = useMemo<Task[]>(() => {
    const sorted = [...tasks].sort((a, b) => a.points - b.points);
    if (activeTab === 'all') return sorted;
    return sorted.filter((t: Task) => t.category === activeTab);
  }, [activeTab, tasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const daily = tasks.filter(t => (t.frequency || '').includes('日')).length;
    const penalty = tasks.filter(t => t.category === 'penalty').length;
    return { total, daily, penalty };
  }, [tasks]);

  return (
    <div className="space-y-6 pb-14 animate-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-[28px] bg-gradient-to-br from-[#FFF1F7] via-white to-[#F4F0FF] border border-white shadow-[0_18px_60px_-36px_rgba(255,77,148,0.35)] p-5 sm:p-6 flex flex-col gap-4 mobile-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FF4D94]">元气任务</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900">今天完成几个小目标</h3>
            <p className="text-xs text-gray-500">点击卡片立刻记分，越快完成越能兑换心愿</p>
          </div>
          <div className="flex flex-wrap gap-2 bg-white/80 backdrop-blur px-3 py-2 rounded-2xl border border-gray-100 text-xs text-gray-600">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> 正向奖励</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span> 违规扣分</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 bg-white/80 backdrop-blur rounded-2xl p-2 border border-gray-100 shadow-sm">
          {categories.map(cat => {
            const meta = getMeta(cat);
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-5 py-2.5 rounded-full text-[12px] font-bold transition-all min-w-[116px] text-center min-h-[44px] ${activeTab === cat ? 'bg-[#FF4D94] text-white shadow-md shadow-[#FF4D94]/20' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D94]/50 hover:text-[#FF4D94]'}`}
              >
                {meta.chip} {meta.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between mobile-card">
            <span className="text-gray-500">全部任务</span>
            <span className="text-lg font-black text-[#FF4D94]">{stats.total}</span>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between mobile-card">
            <span className="text-gray-500">每日必做</span>
            <span className="text-lg font-black text-emerald-600">{stats.daily}</span>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 flex items-center justify-between mobile-card">
            <span className="text-gray-500">警示项</span>
            <span className="text-lg font-black text-rose-600">{stats.penalty}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map((task: Task) => {
          const meta = getMeta(task.category as typeof categories[number]);
          const isPenalty = task.category === 'penalty';
          return (
            <button
              key={task.id}
              onClick={() => onSelectTask({ title: task.title, points: task.points, type: isPenalty ? 'penalty' : 'earn' })}
              className={`w-full text-left group rounded-2xl border bg-white p-4 flex flex-col gap-3 transition-all ${isPenalty ? 'border-rose-100 hover:border-rose-200 hover:shadow-[0_16px_38px_-26px_rgba(225,29,72,0.45)]' : 'border-gray-100 hover:border-[#FF4D94]/30 hover:shadow-[0_16px_38px_-26px_rgba(255,77,148,0.35)]'} hover:-translate-y-0.5 active:scale-[0.99] mobile-card`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${isPenalty ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}> {meta.chip} </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-600 uppercase whitespace-nowrap">{task.frequency}</span>
                    <span className="text-sm font-bold text-gray-900 leading-tight truncate group-hover:text-[#FF4D94]">{task.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{task.description || '暂无详细描述'}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-black points-font shrink-0 ${task.points > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                  {task.points > 0 ? '+' : ''}{task.points}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold">
                <span className="inline-flex items-center gap-1"><Icon name={isPenalty ? 'penalty' : 'plus'} size={14} /> {isPenalty ? '立即记录扣分' : '点击奖励积分'}</span>
                <span className={`text-[10px] px-2 py-1 rounded-full border ${isPenalty ? 'border-rose-100 text-rose-500 bg-rose-50/60' : 'border-gray-100 text-gray-600 bg-gray-50'}`}>{meta.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white p-8 rounded-[24px] border border-dashed border-gray-200 text-center text-gray-400 font-semibold">
          暂无可用任务
        </div>
      )}
    </div>
  );
}
