import React, { useMemo, useState } from 'react';
import { Profile, Transaction } from '../types';
import { Icon } from './Icon';
import { formatDateTime } from '../utils/datetime';

interface DashboardSectionProps {
  currentProfile: Profile;
  profiles: Profile[];
  onGoEarn: () => void;
  onGoRedeem: () => void;
}

type ChartPoint = { label: string; value: number };
type ProfileInsight = {
  id: string;
  name: string;
  avatarColor: string;
  balance: number;
  activity7d: number;
  completionRate: number;
  net7d: number;
  trend7d: ChartPoint[];
};

type MessageItem = { title: string; desc: string; time: string; tone: 'indigo' | 'rose' | 'emerald' | 'slate' };

function buildTrend(transactions: (Transaction & { profileId: string })[], days: number): ChartPoint[] {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const buckets: ChartPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const start = d.getTime();
    const endTime = start + 24 * 60 * 60 * 1000;
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const value = transactions
      .filter((t: Transaction & { profileId: string }) => t.timestamp >= start && t.timestamp < endTime)
      .reduce((sum: number, t: Transaction) => sum + t.points, 0);
    buckets.push({ label, value });
  }
  return buckets;
}

export function DashboardSection({ currentProfile, profiles, onGoEarn, onGoRedeem }: DashboardSectionProps) {
  const todayGain = currentProfile.history
    .filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString() && h.points > 0)
    .reduce((a, b) => a + b.points, 0);

  const totals = currentProfile.history.reduce(
    (acc, h) => {
      if (h.points > 0) acc.earned += h.points;
      if (h.points < 0) acc.spent += Math.abs(h.points);
      acc.count += 1;
      return acc;
    },
    { earned: 0, spent: 0, count: 0 }
  );
  const systemReward = useMemo(() =>
    currentProfile.history
      .filter(h => h.type === 'earn' && /奖励/.test(h.title))
      .reduce((s, h) => s + h.points, 0),
  [currentProfile.history]);
  const lastTx = currentProfile.history[0];

  const allTransactions = useMemo<(Transaction & { profileId: string; profileName: string })[]>(() =>
    profiles.flatMap(p => p.history.map(tx => ({ ...tx, profileId: p.id, profileName: p.name }))),
  [profiles]);

  const weekly = useMemo<ChartPoint[]>(() => buildTrend(allTransactions, 7), [allTransactions]);
  const monthly = useMemo<ChartPoint[]>(() => buildTrend(allTransactions, 30), [allTransactions]);
  const maxWeek = Math.max(...weekly.map((d: ChartPoint) => Math.abs(d.value)), 1);
  const maxMonth = Math.max(...monthly.map((d: ChartPoint) => Math.abs(d.value)), 1);

  const topMembers = useMemo(() => {
    return [...profiles]
      .map((p: Profile) => ({
        id: p.id,
        name: p.name,
        avatarColor: p.avatarColor,
        balance: p.balance,
        total: p.history.reduce((s: number, tx: Transaction) => s + tx.points, 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [profiles]);


  const profileInsights = useMemo<ProfileInsight[]>(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    return profiles.map((p: Profile) => {
      const last7 = p.history.filter((tx: Transaction) => now - tx.timestamp <= oneDay * 7);
      const activity7d = last7.length;
      const earn = last7.filter((tx: Transaction) => tx.type === 'earn').length;
      const penalty = last7.filter((tx: Transaction) => tx.type === 'penalty').length;
      const completionRate = earn + penalty === 0 ? 0 : Math.round((earn / (earn + penalty)) * 100);
      const net7d = last7.reduce((s: number, tx: Transaction) => s + tx.points, 0);
      const trend7d = buildTrend(last7.map(tx => ({ ...tx, profileId: p.id })), 7);
      return { id: p.id, name: p.name, avatarColor: p.avatarColor, balance: p.balance, activity7d, completionRate, net7d, trend7d };
    });
  }, [profiles]);

  const anomalies = useMemo<string[]>(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const lastDayTx = allTransactions.filter((t: Transaction & { profileName?: string }) => now - t.timestamp <= oneDay);
    const lastDayNet = lastDayTx.reduce((s: number, t: Transaction) => s + t.points, 0);
    const lastDayAbs = lastDayTx.reduce((s: number, t: Transaction) => s + Math.abs(t.points), 0);
    const lastDayRedeemList = lastDayTx.filter((t: Transaction & { profileName?: string }) => t.type === 'redeem');
    const lastDayRedeem = lastDayRedeemList.length;
    const largePenalty = allTransactions.find((t: Transaction & { profileName?: string }) => t.type === 'penalty' && t.points <= -20);
    const recentNames = Array.from(new Set(lastDayTx.map((t: { profileName?: string }) => t.profileName || '未知'))).join('、');

    const flags: string[] = [];
    if (lastDayAbs >= 60 || Math.abs(lastDayNet) >= 40) {
      flags.push(`24小时内积分波动异常（${recentNames || '成员'}）：净变动 ${lastDayNet}，绝对值 ${lastDayAbs}`);
    }
    if (lastDayRedeem >= 3) {
      const redeemNames = Array.from(new Set(lastDayRedeemList.map((t: Transaction & { profileName?: string }) => t.profileName || '未知'))).join('、');
      flags.push(`24小时内兑换 ${lastDayRedeem} 次（${redeemNames}），请确认是否正常`);
    }
    if (largePenalty) {
      flags.push(`发现大额扣减 ${largePenalty.points}：${largePenalty.title}（${largePenalty.profileName || '成员'}）`);
    }
    return flags;
  }, [allTransactions]);

  const messageCenter = useMemo<MessageItem[]>(() => {
    const sorted = [...allTransactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
    const items: MessageItem[] = sorted.map((t: Transaction & { profileName?: string }) => ({
      title: t.type === 'redeem' ? '兑换提醒' : t.type === 'penalty' ? '扣减提醒' : '任务完成',
      desc: `${t.title} · ${t.points > 0 ? '+' : ''}${t.points} · ${t.profileName || ''}`.trim(),
      time: formatDateTime(t.timestamp),
      tone: t.type === 'redeem' ? 'indigo' : t.type === 'penalty' ? 'rose' : 'emerald',
    }));
    anomalies.slice(0, 2).forEach((msg: string) => items.unshift({ title: '异常警告', desc: msg, time: '刚刚', tone: 'rose' }));
    items.push({ title: '申诉 / 反馈', desc: '成员可提交问题，管理员处理后反馈', time: '随时', tone: 'slate' });
    return items;
  }, [allTransactions, anomalies]);

  const [openNotice, setOpenNotice] = useState<boolean>(false);
  const displayMessages = useMemo<MessageItem[]>(() => (openNotice ? messageCenter : messageCenter.slice(0, 4)), [messageCenter, openNotice]);

  const renderLineChart = (data: ChartPoint[], max: number) => {
    if (!data.length) return <div className="text-sm text-gray-400">暂无数据</div>;
    const height = 120;
    const maxValue = Math.max(max, 1);
    const step = data.length === 1 ? 0 : Math.max(22, 260 / (data.length - 1));
    const points = data.map((d, i) => {
      const x = i * step;
      const y = (1 - (d.value / (maxValue * 2) + 0.5)) * height;
      return `${x},${y}`;
    }).join(' ');
    const zeroY = height / 2;
    const width = (data.length - 1) * step || 1;

    return (
      <div className="overflow-x-auto no-scrollbar">
        <svg viewBox={`0 0 ${Math.max(width, 1)} ${height}`} className="w-full min-w-[320px]" preserveAspectRatio="xMidYMid meet">
          <line x1={0} y1={zeroY} x2={width} y2={zeroY} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth={1} strokeDasharray="4 4" />
          <polyline points={points} fill="none" className="stroke-[#FF4D94]" strokeWidth={3} strokeLinecap="round" />
          {data.map((d, i) => {
            const x = i * step;
            const y = (1 - (d.value / (maxValue * 2) + 0.5)) * height;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={5} className={`fill-white stroke-2 ${d.value >= 0 ? 'stroke-emerald-400' : 'stroke-rose-400'}`} title={`${d.label}: ${d.value}`} />
                <text x={x} y={y - 10} textAnchor="middle" className="text-[10px] fill-gray-500">{d.value}</text>
                <text x={x} y={height + 12} textAnchor="middle" className="text-[10px] fill-gray-400 tabular-nums">{d.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderMiniTrend = (data: ChartPoint[]) => {
    if (!data.length) return <div className="text-[12px] text-gray-400">暂无</div>;
    const height = 70;
    const maxVal = Math.max(...data.map(d => Math.abs(d.value)), 1);
    const step = data.length === 1 ? 0 : Math.max(16, 160 / (data.length - 1));
    const width = (data.length - 1) * step || 1;
    const zeroY = height / 2;
    const points = data.map((d, i) => {
      const x = i * step;
      const y = zeroY - (d.value / (maxVal * 1.4)) * (height / 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${Math.max(width, 1)} ${height}`} className="w-full min-w-[200px]" preserveAspectRatio="xMidYMid meet">
        <line x1={0} y1={zeroY} x2={width} y2={zeroY} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth={1} strokeDasharray="4 4" />
        <polyline points={points} fill="none" className="stroke-[#22C55E]" strokeWidth={2} strokeLinecap="round" />
        {data.map((d, i) => {
          const x = i * step;
          const y = zeroY - (d.value / (maxVal * 1.4)) * (height / 2);
          return <circle key={i} cx={x} cy={y} r={4} className={`fill-white stroke-2 ${d.value >= 0 ? 'stroke-emerald-400' : 'stroke-rose-400'}`} title={`${d.label}: ${d.value}`} />;
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-4 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-8 bg-gradient-to-br from-[#FF4D94] via-[#FF7AB5] to-[#7C4DFF] p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden flex flex-col min-h-[260px]">
          <div className="absolute inset-0 opacity-60" style={{background:"radial-gradient(circle at 20% 20%, rgba(255,255,255,0.14), transparent 35%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.12), transparent 30%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.1), transparent 32%)"}}></div>
          <div className="relative z-10 flex flex-col gap-5 h-full">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">账户概览</p>
                <h3 className="text-4xl md:text-5xl font-black points-font leading-tight tracking-tight">{currentProfile.balance}</h3>
                <p className="text-sm text-white/80 mt-1">当前元气值 · {currentProfile.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 rounded-2xl bg-white/15 text-white text-xs font-bold">今日 +{todayGain}</span>
                <span className="px-3 py-2 rounded-2xl bg-white/10 text-white text-xs font-bold">记录 {totals.count}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-white/10 border border-white/15 p-3">
                <p className="text-[11px] text-white/70 font-semibold">累计获得</p>
                <p className="text-2xl font-black points-font">+{totals.earned}</p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/15 p-3">
                <p className="text-[11px] text-white/70 font-semibold">已消费 / 扣减</p>
                <p className="text-2xl font-black points-font text-rose-50">-{totals.spent}</p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/15 p-3">
                <p className="text-[11px] text-white/70 font-semibold">系统奖励</p>
                <p className="text-2xl font-black points-font">+{systemReward}</p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/15 p-3">
                <p className="text-[11px] text-white/70 font-semibold">当前余额</p>
                <p className="text-2xl font-black points-font">{currentProfile.balance}</p>
              </div>
            </div>

            <div className="relative z-10 flex flex-wrap gap-3 mt-auto">
              <button onClick={onGoEarn} className="px-7 py-3.5 min-h-[46px] bg-white text-[#FF4D94] rounded-2xl text-sm font-bold hover:translate-y-[-1px] active:scale-95 transition-all shadow-lg shadow-[#FF4D94]/20">进入元气任务</button>
              <button onClick={onGoRedeem} className="px-7 py-3.5 min-h-[46px] bg-white/15 text-white rounded-2xl text-sm font-bold hover:bg-white/25 active:scale-95 transition-all">前往梦想商店</button>
            </div>
          </div>
        </div>
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-[var(--surface)] p-5 rounded-2xl border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-[0.2em]">今日收益</p>
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">+{todayGain}</span>
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-gray-100 points-font mt-3">+{todayGain} pts</p>
            <p className="text-[12px] text-gray-500 dark:text-gray-300">继续完成任务提升余额</p>
          </div>
          <div className="bg-white dark:bg-[var(--surface)] p-5 rounded-2xl border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-[0.2em]">最近记录</p>
              <span className="text-[11px] text-gray-400 dark:text-gray-300">{lastTx ? formatDateTime(lastTx.timestamp) : '暂无'}</span>
            </div>
            {lastTx ? (
              <div className="mt-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${lastTx.points > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                  <Icon name={lastTx.type === 'redeem' ? 'reward' : 'plus'} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{lastTx.title}</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-300 points-font">{lastTx.points > 0 ? '+' : ''}{lastTx.points} pts</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-300 mt-2">暂无记录</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3 bg-white dark:bg-[var(--surface)] p-6 rounded-[24px] border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-300 uppercase tracking-[0.25em]">成员画像</p>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">活跃度 / 完成率 / 走势</h3>
                </div>
              </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profileInsights.map((p: ProfileInsight) => (
              <div key={p.id} className="rounded-2xl border border-gray-100 dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--surface)] p-3 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.45)] transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${p.avatarColor}`}>{p.name[0]}</div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">{p.name}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-300">余额 {p.balance}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${p.net7d >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-100' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-100'}`}>
                    7天 {p.net7d >= 0 ? '+' : ''}{p.net7d}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-300 font-semibold">
                  <span>活跃 {p.activity7d} 次</span>
                  <span>完成率 {p.completionRate}%</span>
                </div>
                <div className="mt-3 bg-gray-50/80 dark:bg-white/5 rounded-xl p-2 border border-gray-100 dark:border-[var(--border-subtle)]">
                  {renderMiniTrend(p.trend7d)}
                </div>
              </div>
            ))}
            {profileInsights.length === 0 && <div className="text-sm text-gray-400">暂无成员</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[var(--surface)] p-6 rounded-[24px] border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-300 uppercase tracking-[0.25em]">趋势图</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">周 / 月净流入</h3>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-300 mb-2"><span>最近7天</span><span>净变动</span></div>
              {renderLineChart(weekly, maxWeek)}
            </div>
            <div className="border-t border-gray-50 pt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-300 mb-2"><span>最近30天</span><span>净变动</span></div>
              {renderLineChart(monthly.slice(-14), maxMonth)}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[var(--surface)] p-6 rounded-[24px] border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">Top 成员榜</p>
          <h3 className="text-lg font-bold text-gray-900 mb-4">累计净得分</h3>
          <div className="space-y-3">
            {topMembers.map((m: { id: string; name: string; avatarColor: string; balance: number; total: number }, idx: number) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${m.avatarColor}`}>{m.name[0]}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 leading-tight">{m.name}</p>
                    <p className="text-[11px] text-gray-400">余额 {m.balance} · 排名 #{idx + 1}</p>
                  </div>
                </div>
                <span className={`text-sm font-black px-3 py-1 rounded-lg ${m.total >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} points-font`}>
                  {m.total >= 0 ? '+' : ''}{m.total}
                </span>
              </div>
            ))}
            {topMembers.length === 0 && <div className="text-sm text-gray-400">暂无数据</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[var(--surface)] p-6 rounded-[24px] border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">最近账单摘要</p>
              <h3 className="text-lg font-bold text-gray-900">最近 4 条</h3>
            </div>
          </div>
          <div className="space-y-3">
              {currentProfile.history.slice(0, 4).map(h => (
              <div key={h.id} className="p-3 flex items-center justify-between bg-gray-50/70 dark:bg-white/5 rounded-2xl hover:bg-white dark:hover:bg-white/10 border border-transparent hover:border-gray-100 dark:hover:border-[var(--border-subtle)] transition-all group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${h.points > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'} shadow-sm`}>
                    <Icon name={h.type === 'redeem' ? 'reward' : 'plus'} size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 leading-tight truncate">{h.title}</p>
                    <p className="text-[10px] text-gray-400 tabular-nums">{formatDateTime(h.timestamp)}</p>
                  </div>
                </div>
                <span className={`text-base font-bold points-font w-16 text-right shrink-0 ${h.points > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {h.points > 0 ? '+' : ''}{h.points}
                </span>
              </div>
            ))}

            {currentProfile.history.length === 0 && <div className="text-sm text-gray-400">暂无记录</div>}
          </div>
        </div>

        <div className="bg-white dark:bg-[var(--surface)] p-6 rounded-[24px] border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">异常监控</p>
              <h3 className="text-lg font-bold text-gray-900">积分波动 / 兑换</h3>
            </div>
          </div>
          {anomalies.length === 0 ? (
            <div className="text-sm text-emerald-600 dark:text-emerald-100 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-2xl px-4 py-3">暂无异常</div>
          ) : (
            <ul className="space-y-2">
              {anomalies.map((msg: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 rounded-2xl border border-rose-100 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-600 dark:text-rose-100">
                  <span className="mt-0.5 w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-[var(--surface)] p-6 rounded-[24px] border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">消息中心</p>
              <h3 className="text-lg font-bold text-gray-900">提醒 / 公告</h3>
            </div>
            <button
              onClick={() => setOpenNotice((prev: boolean) => !prev)}
              className="text-[11px] font-semibold text-[#FF4D94] hover:underline"
            >
              {openNotice ? '收起' : '展开更多'}
            </button>
          </div>
          <div className="space-y-3">
            {displayMessages.map((msg: MessageItem, idx: number) => (
              <div key={idx} className="p-3 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-[var(--border-subtle)] flex items-start gap-3">
                <span className={`mt-1 w-2.5 h-2.5 rounded-full ${msg.tone === 'rose' ? 'bg-rose-400' : msg.tone === 'indigo' ? 'bg-indigo-400' : msg.tone === 'slate' ? 'bg-gray-400' : 'bg-emerald-400'}`}></span>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight truncate">{msg.title}</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-300 truncate">{msg.desc}</p>
                  <p className="text-[11px] text-gray-400 tabular-nums">{msg.time}</p>
                </div>
              </div>
            ))}

            {messageCenter.length === 0 && (
              <div className="text-sm text-gray-400 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                暂无提醒，继续保持良好习惯！
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
