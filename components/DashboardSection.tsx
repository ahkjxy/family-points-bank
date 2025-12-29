import React, { useMemo } from 'react';
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

  const funnel = useMemo(() => {
    const earnCount = allTransactions.filter((t: Transaction) => t.type === 'earn').length;
    const penaltyCount = allTransactions.filter((t: Transaction) => t.type === 'penalty').length;
    const redeemCount = allTransactions.filter((t: Transaction) => t.type === 'redeem').length;
    const totalTask = earnCount + penaltyCount;
    const toRedeemRate = totalTask ? Math.round((redeemCount / totalTask) * 100) : 0;
    const earnRate = totalTask ? Math.round((earnCount / totalTask) * 100) : 0;
    return { earnCount, penaltyCount, redeemCount, totalTask, toRedeemRate, earnRate };
  }, [allTransactions]);

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
      const redeemNames = Array.from(new Set(lastDayRedeemList.map(t => t.profileName || '未知'))).join('、');
      flags.push(`24小时内兑换 ${lastDayRedeem} 次（${redeemNames}），请确认是否正常`);
    }
    if (largePenalty) {
      flags.push(`发现大额扣减 ${largePenalty.points}：${largePenalty.title}（${largePenalty.profileName || '成员'}）`);
    }
    return flags;
  }, [allTransactions]);

  const messageCenter = useMemo(() => {
    const sorted = [...allTransactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
    const items = sorted.map((t: Transaction & { profileName?: string }) => ({
      title: t.type === 'redeem' ? '兑换提醒' : t.type === 'penalty' ? '扣减提醒' : '任务完成',
      desc: `${t.title} · ${t.points > 0 ? '+' : ''}${t.points} · ${t.profileName || ''}`.trim(),
      time: formatDateTime(t.timestamp),
      tone: t.type === 'redeem' ? 'indigo' : t.type === 'penalty' ? 'rose' : 'emerald',
    }));
    anomalies.slice(0, 2).forEach((msg: string) => items.unshift({ title: '异常警告', desc: msg, time: '刚刚', tone: 'rose' }));
    items.push({ title: '申诉 / 反馈', desc: '成员可提交问题，管理员处理后反馈', time: '随时', tone: 'slate' });
    return items;
  }, [allTransactions, anomalies]);

  const renderBars = (data: ChartPoint[], max: number) => (
    <div className="flex gap-2 items-end h-28">
      {data.map((d: ChartPoint, idx: number) => (
        <div key={idx} className="flex flex-col items-center gap-1">
          <div
            className={`w-3 sm:w-4 rounded-full transition-all duration-500 ${d.value >= 0 ? 'bg-emerald-400/80 dark:bg-emerald-500' : 'bg-rose-400/80 dark:bg-rose-500'}`}
            style={{ height: `${Math.max(8, Math.abs(d.value) / max * 100)}%` }}
            title={`${d.label} : ${d.value}`}
          ></div>
          <span className="text-[10px] text-gray-400 dark:text-gray-300 tabular-nums">{d.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-[60px] -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] opacity-80 mb-2">VITALITY BALANCE</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-bold points-font tracking-tighter">{currentProfile.balance}</span>
            </div>
          </div>
          <div className="flex gap-3 relative z-10">
            <button onClick={onGoEarn} className="px-6 py-3 bg-white text-[#FF4D94] rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg">进入元气任务</button>
            <button onClick={onGoRedeem} className="px-6 py-3 bg-white/10 text-white rounded-2xl text-xs font-bold hover:bg-white/20 active:scale-95 transition-all">前往梦想商店</button>
          </div>
        </div>
        <div className="bg-white dark:bg-[var(--surface)] p-6 vibrant-card flex flex-col justify-center items-center text-center border border-gray-100 dark:border-[var(--border-subtle)]">
          <div className="w-14 h-14 bg-[#FFF0F6] text-[#FF4D94] rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <Icon name="history" size={28} />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">今日累计收益</p>
          <p className="text-4xl font-bold text-gray-900 points-font">
            +{todayGain}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[var(--surface)] p-5 rounded-2xl border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">累计获得</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600 points-font">+{totals.earned}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[var(--surface)] p-5 rounded-2xl border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">已消费 / 扣减</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-500 points-font">-{totals.spent}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[var(--surface)] p-5 rounded-2xl border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">当前元气值</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 points-font">{currentProfile.balance}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[var(--surface)] p-5 rounded-2xl border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">记录总数</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-600 points-font">{totals.count}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3 bg-white dark:bg-[var(--surface)] p-6 rounded-[24px] border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">成员画像</p>
              <h3 className="text-lg font-bold text-gray-900">活跃度 / 完成率 / 走势</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profileInsights.map((p: ProfileInsight) => {
              const maxTrend = Math.max(...p.trend7d.map(t => Math.abs(t.value)), 1);
              return (
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
                  <div className="mt-2 flex gap-1 items-end h-12">
                    {p.trend7d.map((d: ChartPoint, idx: number) => (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div
                          className={`w-full rounded-full transition-all duration-500 ${d.value >= 0 ? 'bg-emerald-400/80 dark:bg-emerald-500' : 'bg-rose-400/80 dark:bg-rose-500'}`}
                          style={{ height: `${Math.max(4, Math.abs(d.value) / maxTrend * 100)}%` }}
                          title={`${d.label} : ${d.value}`}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {profileInsights.length === 0 && <div className="text-sm text-gray-400">暂无成员</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[var(--surface)] p-6 rounded-[24px] border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">趋势图</p>
              <h3 className="text-lg font-bold text-gray-900">周 / 月净流入</h3>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2"><span>最近7天</span><span>净变动</span></div>
              {renderBars(weekly, maxWeek)}
            </div>
            <div className="border-t border-gray-50 pt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2"><span>最近30天</span><span>净变动</span></div>
              <div className="overflow-x-auto no-scrollbar">
                <div className="min-w-[360px]">{renderBars(monthly.slice(-14), maxMonth)}</div>
              </div>
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
        <div className="bg-white dark:bg-[var(--surface)] p-6 rounded-[24px] border border-gray-100 dark:border-[var(--border-subtle)] shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">任务 / 兑换漏斗</p>
              <h3 className="text-lg font-bold text-gray-900">任务完成 → 兑换</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-100 dark:border-[var(--border-subtle)] p-4 bg-gray-50/60 dark:bg-white/5">
              <p className="text-xs text-gray-500 font-semibold">任务（含扣分）</p>
              <p className="text-2xl font-black text-gray-900 points-font mt-1">{funnel.totalTask}</p>
              <p className="text-[11px] text-gray-400">Earn {funnel.earnCount} / Penalty {funnel.penaltyCount}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 dark:border-[var(--border-subtle)] p-4 bg-gray-50/80 dark:bg-white/5">
              <p className="text-xs text-gray-500 font-semibold">Earn 占比</p>
              <p className="text-2xl font-black text-emerald-600 points-font mt-1">{funnel.earnRate}%</p>
              <p className="text-[11px] text-gray-400">正向完成的比例</p>
            </div>
            <div className="rounded-2xl border border-gray-100 dark:border-[var(--border-subtle)] p-4 bg-gray-50 dark:bg-white/5">
              <p className="text-xs text-gray-500 font-semibold">兑换次数</p>
              <p className="text-2xl font-black text-indigo-600 points-font mt-1">{funnel.redeemCount}</p>
              <p className="text-[11px] text-gray-400">兑换率 {funnel.toRedeemRate}%</p>
            </div>
          </div>
        </div>

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
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${h.points > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'} shadow-sm`}>
                    <Icon name={h.type === 'redeem' ? 'reward' : 'plus'} size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 leading-tight">{h.title}</p>
                    <p className="text-[10px] text-gray-400 tabular-nums">{formatDateTime(h.timestamp)}</p>
                  </div>
                </div>
                <span className={`text-base font-bold points-font ${h.points > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {h.points > 0 ? '+' : ''}{h.points}
                </span>
              </div>
            ))}
            {currentProfile.history.length === 0 && <div className="text-sm text-gray-400">暂无记录</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <h3 className="text-lg font-bold text-gray-900">重置 / 任务 / 兑换 / 反馈</h3>
            </div>
          </div>
          <ul className="space-y-2">
            {messageCenter.map((msg: { title: string; desc: string; time: string; tone: string }, idx: number) => (
              <li key={idx} className="rounded-2xl border border-gray-100 dark:border-[var(--border-subtle)] bg-gray-50/70 dark:bg-white/5 px-4 py-3 flex items-start gap-3">
                <span className={`mt-0.5 w-2.5 h-2.5 rounded-full ${msg.tone === 'rose' ? 'bg-rose-400' : msg.tone === 'indigo' ? 'bg-indigo-400' : msg.tone === 'emerald' ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 leading-tight">{msg.title}</p>
                  <p className="text-[12px] text-gray-500 truncate">{msg.desc}</p>
                  <p className="text-[11px] text-gray-400 tabular-nums">{msg.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
