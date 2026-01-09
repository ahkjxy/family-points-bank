import { useMemo, useState } from 'react';
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
  // const maxMonth = Math.max(...monthly.map((d: ChartPoint) => Math.abs(d.value)), 1);

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
    if (!data.length) return <div className="text-sm text-gray-400 py-10 text-center">暂无波动数据</div>;
    const height = 140;
    const maxValue = Math.max(max, 1);
    const step = data.length === 1 ? 0 : Math.max(30, 320 / (data.length - 1));
    const zeroY = height / 2;
    
    // Generate points for the path
    const points = data.map((d, i) => {
      const x = i * step;
      const y = zeroY - (d.value / (maxValue * 2)) * height;
      return { x, y };
    });

    const pathData = points.length > 1 
      ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
      : '';

    const width = (data.length - 1) * step || 1;

    return (
      <div className="overflow-x-auto no-scrollbar py-4">
        <svg viewBox={`0 -20 ${Math.max(width, 1)} ${height + 40}`} className="w-full min-w-[320px] h-[160px]" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4D94" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#FF4D94" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Base Line */}
          <line x1={0} y1={zeroY} x2={width} y2={zeroY} className="stroke-gray-100 dark:stroke-white/5" strokeWidth={1} strokeDasharray="4 4" />
          
          {/* Path */}
          {pathData && (
            <>
              <path d={pathData} fill="none" className="stroke-[#FF4D94]" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              <path d={`${pathData} L ${width} ${height} L 0 ${height} Z`} fill="url(#chartGradient)" />
            </>
          )}

          {data.map((d, i) => {
            const { x, y } = points[i];
            return (
              <g key={i} className="group cursor-pointer">
                <circle cx={x} cy={y} r={6} className="fill-white dark:fill-gray-900 stroke-[3] stroke-[#FF4D94] transition-all group-hover:r-8" />
                <rect x={x - 15} y={y - 32} width={30} height={20} rx={6} className="fill-gray-900 dark:fill-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <text x={x} y={y - 18} textAnchor="middle" className="text-[10px] font-bold fill-white dark:fill-gray-900 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">{d.value}</text>
                <text x={x} y={height + 15} textAnchor="middle" className="text-[10px] font-bold fill-gray-400 dark:text-gray-500 tabular-nums">{d.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderMiniTrend = (data: ChartPoint[]) => {
    if (!data.length) return <div className="text-[10px] text-gray-400 italic">能量平衡</div>;
    const height = 40;
    const maxVal = Math.max(...data.map(d => Math.abs(d.value)), 1);
    const step = data.length === 1 ? 0 : Math.max(20, 140 / (data.length - 1));
    const width = (data.length - 1) * step || 1;
    const zeroY = height / 2;
    
    const points = data.map((d, i) => {
      const x = i * step;
      const y = zeroY - (d.value / (maxVal * 2)) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${Math.max(width, 1)} ${height}`} className="w-full h-10" preserveAspectRatio="xMidYMid meet">
        <path d={`M ${points}`} fill="none" className="stroke-[#FF4D94]" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {data.length > 0 && (
          <circle cx={(data.length - 1) * step} cy={zeroY - (data[data.length - 1].value / (maxVal * 2)) * height} r={3} className="fill-[#FF4D94] shadow-sm" />
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Card Section */}
      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-8 bg-gradient-to-br from-[#1A1A1A] to-[#333] dark:from-[#0F172A] dark:to-[#1E293B] p-8 lg:p-10 rounded-[40px] text-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col min-h-[320px] border border-white/5">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-gradient-to-br from-[#FF4D94]/30 to-[#7C4DFF]/30 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[80%] bg-[#FF4D94]/10 blur-[80px] rounded-full"></div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#FF4D94] mb-2">当前余额</p>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-5xl md:text-7xl font-black points-font tracking-tighter">{currentProfile.balance}</h3>
                  <span className="text-xl font-bold text-white/40 uppercase">元气值</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF4D94] animate-pulse"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">当前会话活跃</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] flex items-center justify-center shadow-lg">
                  <Icon name="reward" size={24} className="text-white" />
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '今日获得', value: `+${todayGain}`, trend: 'emerald' },
                { label: '累计获得', value: totals.earned, trend: 'white' },
                { label: '梦想支出', value: `-${totals.spent}`, trend: 'rose' },
                { label: '任务总数', value: totals.count, trend: 'white' },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 group-hover:text-white/60">{stat.label}</p>
                  <p className={`text-xl font-black points-font ${
                    stat.trend === 'emerald' ? 'text-emerald-400' : 
                    stat.trend === 'rose' ? 'text-rose-400' : 'text-white'
                  }`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-10 flex flex-wrap gap-4">
              <button onClick={onGoEarn} className="px-8 py-4 bg-[#FF4D94] text-white rounded-[20px] text-sm font-black uppercase tracking-widest hover:scale-[1.05] active:scale-95 transition-all shadow-[0_20px_40px_-12px_rgba(255,77,148,0.5)] flex items-center gap-2">
                <Icon name="plus" size={16} />
                赚取元气
              </button>
              <button onClick={onGoRedeem} className="px-8 py-4 bg-white/10 text-white border border-white/10 backdrop-blur-md rounded-[20px] text-sm font-black uppercase tracking-widest hover:bg-white/20 active:scale-95 transition-all flex items-center gap-2">
                <Icon name="reward" size={16} />
                兑换梦想
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex-1 bg-white dark:bg-[#1E293B] p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-[#FF4D94]/30 transition-colors">
            <div className="absolute top-[-20px] right-[-20px] text-gray-50 dark:text-white/5 group-hover:text-[#FF4D94]/10 transition-colors">
              <Icon name="home" size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-[#FF4D94] uppercase tracking-[0.3em] mb-1">最近动态</p>
              {lastTx ? (
                <>
                  <h4 className="text-xl font-black text-gray-900 dark:text-white truncate">{lastTx.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium italic">{formatDateTime(lastTx.timestamp)}</p>
                  <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                    lastTx.points > 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
                  }`}>
                    {lastTx.points > 0 ? '获得' : '支出'} {Math.abs(lastTx.points)} 元气值
                  </div>
                </>
              ) : (
                <p className="text-gray-400 font-bold italic">暂无记录...</p>
              )}
            </div>
          </div>
          
          <div className="flex-1 bg-gradient-to-br from-[#7C4DFF] to-[#9E7AFF] p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
            <div className="absolute bottom-[-10px] right-[-10px] rotate-[-12deg] opacity-20 group-hover:rotate-0 transition-transform duration-500">
              <Icon name="reward" size={100} />
            </div>
            <div className="relative z-10 h-full flex flex-col">
              <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-1">系统奖励</p>
              <h4 className="text-3xl font-black points-font">+{systemReward}</h4>
              <p className="text-xs text-white/80 mt-1 font-bold">累计获得系统加成奖励</p>
              <div className="mt-auto pt-4 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-[#7C4DFF] bg-white/20 backdrop-blur-sm"></div>
                  ))}
                </div>
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">成长等级提升</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Trends */}
        <div className="lg:col-span-8 bg-white dark:bg-[#0F172A] p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[11px] font-black text-[#FF4D94] uppercase tracking-[0.3em] mb-1">元气数据分析</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">元气波动走势</h3>
            </div>
            <div className="flex gap-2 p-1 bg-gray-50 dark:bg-white/5 rounded-xl">
              <button className="px-4 py-1.5 rounded-lg text-[10px] font-black bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white uppercase">周视图</button>
              <button className="px-4 py-1.5 rounded-lg text-[10px] font-black text-gray-400 uppercase hover:text-gray-600 transition-colors">月视图</button>
            </div>
          </div>
          <div className="space-y-8">
            <div className="p-6 bg-gray-50/50 dark:bg-white/5 rounded-[32px] border border-gray-100 dark:border-transparent">
              {renderLineChart(weekly, maxWeek)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { label: '单日峰值', value: `+${maxWeek}`, icon: 'plus' },
                { label: '日均活跃', value: (weekly.reduce((s, d) => s + Math.abs(d.value), 0) / 7).toFixed(1), icon: 'history' },
                { label: '达成率', value: '94%', icon: 'home' },
                { label: '状态', value: '完美', icon: 'reward' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Icon name={item.icon as any} size={10} />
                    {item.label}
                  </p>
                  <p className="text-lg font-black text-gray-800 dark:text-gray-200">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0F172A] p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-sm">
          <p className="text-[11px] font-black text-[#7C4DFF] uppercase tracking-[0.3em] mb-1">荣誉榜</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-8">成员积分榜</h3>
          <div className="space-y-4">
            {topMembers.map((m, idx) => (
              <div key={m.id} className="group flex items-center justify-between p-4 rounded-[28px] bg-gray-50/50 dark:bg-white/5 border border-transparent hover:border-[#7C4DFF]/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg ${m.avatarColor}`}>
                      {m.name[0]}
                    </div>
                    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center text-[10px] font-black text-gray-900 dark:text-white">
                      {idx + 1}
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-black text-gray-900 dark:text-white">{m.name}</p>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">余额: {m.balance}</p>
                  </div>
                </div>
                <div className={`text-right ${m.total >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  <p className="text-lg font-black points-font">{m.total >= 0 ? '+' : ''}{m.total}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">影响力</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-4 bg-gray-50 dark:bg-white/5 rounded-2xl text-[11px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-100 transition-colors">查看所有成员</button>
        </div>
      </div>

      {/* Insights Section */}
      <div className="bg-white dark:bg-[#0F172A] p-8 lg:p-10 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">成长洞察</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">成员画像与成长走势</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profileInsights.map((p) => (
              <div key={p.id} className="bg-gray-50/30 dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-transparent hover:shadow-xl transition-all group">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ${p.avatarColor} group-hover:rotate-12 transition-transform`}>
                      {p.name[0]}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-gray-900 dark:text-white">{p.name}</h4>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">净变动: {p.net7d}</p>
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${
                    p.completionRate >= 80 ? 'border-emerald-500 text-emerald-500' : 'border-rose-500 text-rose-500'
                  }`}>
                    {p.completionRate}%
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">7日活跃</p>
                      <p className="text-xl font-black text-gray-800 dark:text-gray-200">{p.activity7d} 次</p>
                    </div>
                    <div className="w-24 h-12">
                      {renderMiniTrend(p.trend7d)}
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-[#FF4D94] transition-all duration-1000" style={{ width: `${p.completionRate}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts & Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bills */}
        <div className="bg-white dark:bg-[#0F172A] p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">近期账单</h3>
            <button className="text-[10px] font-black text-[#FF4D94] uppercase tracking-widest hover:underline">查看全部</button>
          </div>
          <div className="space-y-4">
            {currentProfile.history.slice(0, 5).map(h => (
              <div key={h.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    h.points > 0 ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-500 dark:bg-rose-500/10'
                  }`}>
                    <Icon name={h.type === 'redeem' ? 'reward' : 'plus'} size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800 dark:text-gray-200 truncate max-w-[120px]">{h.title}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{formatDateTime(h.timestamp)}</p>
                  </div>
                </div>
                <span className={`text-sm font-black points-font ${h.points > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {h.points > 0 ? '+' : ''}{h.points}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Anomaly Alerts */}
        <div className="bg-white dark:bg-[#0F172A] p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">异常监控</h3>
            <Icon name="history" size={16} className="text-rose-500" />
          </div>
          <div className="space-y-3">
            {anomalies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <Icon name="home" size={32} className="text-emerald-500" />
                </div>
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">未发现异常</p>
              </div>
            ) : (
              anomalies.map((msg, idx) => (
                <div key={idx} className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-[20px] text-xs font-bold text-rose-600 dark:text-rose-400 leading-relaxed flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0"></div>
                  {msg}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Center */}
        <div className="bg-white dark:bg-[#0F172A] p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">消息提醒</h3>
            <button onClick={() => setOpenNotice(!openNotice)} className="text-[10px] font-black text-[#7C4DFF] uppercase tracking-widest hover:underline">
              {openNotice ? '收起' : '展开'}
            </button>
          </div>
          <div className="space-y-4">
            {displayMessages.map((msg, idx) => (
              <div key={idx} className="flex gap-4 group">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                  msg.tone === 'rose' ? 'bg-rose-500' : 
                  msg.tone === 'indigo' ? 'bg-[#7C4DFF]' : 
                  msg.tone === 'emerald' ? 'bg-emerald-500' : 'bg-gray-400'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-800 dark:text-gray-200 leading-tight group-hover:text-[#FF4D94] transition-colors">{msg.title}</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{msg.desc}</p>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase mt-1 tracking-widest">{msg.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
