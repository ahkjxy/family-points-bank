
export function DocsPage() {
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="bg-white rounded-[28px] shadow-sm border border-gray-100 p-6 space-y-3 mobile-card">
      <h3 className="text-lg font-bold text-gray-900 font-display flex items-center gap-2">
        <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#FF4D94] to-[#7C4DFF]"></span>
        {title}
      </h3>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </section>
  );

  const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-bold uppercase tracking-widest">{children}</span>
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="via-white border border-white rounded-[32px] p-6 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.35)] flex flex-col gap-3">
        <p className="text-xs font-bold text-[#FF4D94] uppercase tracking-[0.3em]">Docs & API</p>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 font-display">家庭元气银行 · 使用指南</h2>
        <p className="text-sm text-gray-600 max-w-3xl">本页汇总应用的路由、页面功能、操作流程与同步策略，可用于新用户上手或内部分发。</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge>React + Vite</Badge>
          <Badge>Supabase</Badge>
          <Badge>Server Sync</Badge>
          <Badge>Admin / Member</Badge>
        </div>
      </div>

      <Section title="路由 / Routes">
        <ul className="space-y-1 list-disc list-inside">
          <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">/dashboard</code> 账户概览</li>
          <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">/earn</code> 元气任务（赚取 / 扣减）</li>
          <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">/redeem</code> 梦想商店（兑换奖品）</li>
          <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">/history</code> 能量账单</li>
          <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">/settings</code> 系统配置（管理员）</li>
          <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">/doc</code> 本文档</li>
        </ul>
      </Section>

      <Section title="页面功能">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <h4 className="text-sm font-bold text-gray-900">账户概览</h4>
            <p>余额、今日收益、最近账单摘要；快捷进入任务/商店。</p>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <h4 className="text-sm font-bold text-gray-900">元气任务</h4>
            <p>分组列表（学习/家务/自律/违规），点击行即录入（违规为扣减）。</p>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <h4 className="text-sm font-bold text-gray-900">梦想商店</h4>
            <p>奖品网格，余额不足置灰；点击可负担项弹窗确认后扣减。</p>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <h4 className="text-sm font-bold text-gray-900">能量账单</h4>
            <p>当前成员交易表格（日期、说明、数值正负色）。</p>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1 md:col-span-2">
            <h4 className="text-sm font-bold text-gray-900">系统配置（管理员）</h4>
            <p>Tab 分区：成员管理（新增/改名/删除）、任务配置、商店配置、云同步/打印；任务/奖品实时写入 Supabase，奖品可上传图片。</p>
          </div>
        </div>
      </Section>

      <Section title="操作流程">
        <ul className="space-y-1 list-decimal list-inside">
          <li>录入任务：进入“元气任务”点击行 → 确认弹窗 → 入账并写入 Supabase。</li>
          <li>兑换奖品：在“梦想商店”选择可负担的奖品 → 确认弹窗 → 扣减并写入 Supabase。</li>
          <li>新增规则：设置页点击“新增规则/上架新品” → 填表 → 保存（任务周期可选 每日/每次/每周/每月/每学期/每年）。</li>
          <li>手动同步：设置页“同步云端”会重新从 Supabase 拉取当前家庭数据并刷新状态。</li>
          <li>账户切换：侧栏入口选择成员，立即切换上下文与历史。</li>
        </ul>
      </Section>

      <Section title="数据与同步策略">
        <ul className="space-y-1 list-disc list-inside">
          <li>数据源：Supabase 数据库（families、profiles、tasks、rewards、transactions）。</li>
          <li>缓存策略：无本地持久化，每次拉取 Supabase 最新数据。</li>
          <li>启动：登录后按家庭 ID 读取 Supabase 数据。</li>
          <li>写入：记账、任务/奖品 CRUD、成员变更直接操作 Supabase 表，成功后刷新。</li>
          <li>手动同步：设置页按钮会重新 fetch Supabase，强制刷新状态。</li>
          <li>隔离：按 families.id 区分家庭空间；角色 admin/child 控制权限。</li>
        </ul>
      </Section>

      <Section title="权限">
        <ul className="space-y-1 list-disc list-inside">
          <li>管理员：访问设置页，增改删任务/奖品，新增/改名/删除成员（至少保留 1 位管理员），打印、同步。</li>
          <li>成员：执行任务、兑换、查看账单；不可见设置页。</li>
        </ul>
      </Section>

      <Section title="运行指引">
        <ul className="space-y-1 list-disc list-inside">
          <li>安装：<code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">yarn install</code></li>
          <li>启动：<code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">yarn dev</code> → 打开 <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">http://localhost:5173</code></li>
          <li>构建：<code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">yarn build</code></li>
        </ul>
      </Section>
    </div>
  );
}
