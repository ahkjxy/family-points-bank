
import React from 'react';

export function DocsPage() {
  const Section = ({ title, children, icon }: { title: string; children: React.ReactNode; icon?: string }) => (
    <section className="bg-white dark:bg-[#0F172A] rounded-[40px] border border-gray-100 dark:border-white/5 p-8 lg:p-10 space-y-6 shadow-sm group hover:shadow-xl transition-all duration-500">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-500 shadow-inner">
          {icon || '📄'}
        </div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex flex-col">
          <span className="text-[10px] font-black text-[#FF4D94] uppercase tracking-[0.4em] mb-1">Documentation</span>
          {title}
        </h3>
      </div>
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed space-y-4">{children}</div>
    </section>
  );

  const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="px-4 py-1.5 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{children}</span>
  );

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#333] dark:from-[#0F172A] dark:to-[#1E293B] rounded-[48px] p-10 lg:p-14 shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-gradient-to-br from-[#FF4D94]/20 to-[#7C4DFF]/20 blur-[100px] rounded-full animate-pulse"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <p className="text-[11px] font-black text-[#FF4D94] uppercase tracking-[0.5em] mb-1">Architecture & Guide</p>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight">家庭元气银行<br/>使用说明与技术手册</h2>
          </div>
          <p className="text-base font-bold text-white/60 max-w-2xl leading-relaxed">
            本指南详细汇总了应用的功能模块、操作流程及同步策略。旨在帮助家庭成员快速上手，同时为系统管理员提供完整的维护参考。
          </p>
          <div className="flex flex-wrap gap-3 pt-4">
            <Badge>React 18</Badge>
            <Badge>Tailwind CSS</Badge>
            <Badge>Supabase Cloud</Badge>
            <Badge>Realtime Sync</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title="路由架构 / Navigation" icon="🗺️">
          <div className="space-y-3">
            {[
              { path: '/dashboard', label: '账户概览', desc: '核心看板，展示余额与趋势' },
              { path: '/earn', label: '元气任务', desc: '赚取积分与违规扣减入口' },
              { path: '/redeem', label: '梦想商店', desc: '积分兑换实物 or 特权奖励' },
              { path: '/history', label: '能量账单', desc: '全量交易流水查询' },
              { path: '/settings', label: '系统配置', desc: '仅管理员可见的规则与成员管理' },
            ].map(r => (
              <div key={r.path} className="flex items-start gap-4 p-4 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-transparent hover:border-[#FF4D94]/30 transition-all">
                <code className="bg-white dark:bg-gray-800 px-3 py-1 rounded-xl text-[10px] font-black text-[#FF4D94] shadow-sm">{r.path}</code>
                <div>
                  <p className="text-sm font-black text-gray-800 dark:text-gray-200">{r.label}</p>
                  <p className="text-xs font-bold text-gray-400 mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="页面核心功能 / Modules" icon="🚀">
          <div className="grid gap-4">
            <div className="p-5 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-transparent hover:border-[#7C4DFF]/30 transition-all group">
              <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#7C4DFF]"></span>
                数据实时同步
              </h4>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                所有积分变动、成员信息及任务规则均直接持久化至 Supabase 云端，确保多设备访问时数据的一致性与实时性。
              </p>
            </div>
            <div className="p-5 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-transparent hover:border-emerald-500/30 transition-all group">
              <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                自动化管理
              </h4>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                支持设置每日、每周、每月等多种结算周期的任务；系统每日会自动发放“元气奖励”以保持成员活跃度。
              </p>
            </div>
            <div className="p-5 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-transparent hover:border-[#FF4D94]/30 transition-all group">
              <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF4D94]"></span>
                多角色权限
              </h4>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                严谨的权限控制：普通成员仅能执行赚取与兑换，管理员拥有规则制定权与账单审计权。
              </p>
            </div>
          </div>
        </Section>

        <Section title="管理流程 / Workflow" icon="🛠️">
          <ul className="space-y-4">
            {[
              '录入任务：选择分类下的具体事项，确认后系统即刻更新成员余额。',
              '兑换奖品：商品网格展示，余额不足时自动置灰锁定，防止超支。',
              '规则制定：管理员可在设置中随时调整任务点数、商品库存或图片。',
              '成员更替：支持管理员增删成员及调整权限，确保家庭空间的私密性。',
            ].map((text, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-[#FF4D94]">{i + 1}</span>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 leading-relaxed pt-0.5">{text}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="技术规范 / Specs" icon="💻">
          <div className="space-y-4">
            <div className="p-6 rounded-[32px] bg-[#1A1A1A] text-white space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF4D94]">Tech Stack</span>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-[#FF4D94] animate-pulse delay-75"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/40 uppercase">Frontend</p>
                  <p className="text-xs font-bold italic">React + TypeScript</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/40 uppercase">Styling</p>
                  <p className="text-xs font-bold italic">Tailwind + Radix</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/40 uppercase">Backend</p>
                  <p className="text-xs font-bold italic">Supabase BaaS</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/40 uppercase">Storage</p>
                  <p className="text-xs font-bold italic">Supabase S3 Bucket</p>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <div className="text-center pt-10">
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.5em]">Family Points Bank · 2026 Edition</p>
      </div>
    </div>
  );
}
