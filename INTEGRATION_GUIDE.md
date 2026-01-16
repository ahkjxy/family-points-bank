# 新功能集成指南

## 已创建的组件

1. **BadgeDisplay.tsx** - 徽章展示组件
2. **BadgeSection.tsx** - 徽章管理页面
3. **PointsPrediction.tsx** - 积分趋势预测组件
4. **TransferModal.tsx** - 积分转赠弹窗
5. **WishlistModal.tsx** - 愿望清单弹窗
6. **AchievementCenter.tsx** - 成就中心页面

## 需要在 App.tsx 中添加的内容

### 1. 导入新组件

在 App.tsx 顶部添加：

```typescript
import {
  // ... 现有导入
  TransferModal,
  WishlistModal,
  AchievementCenter,
} from "./components";
```

### 2. 添加状态管理

在 AppContent 函数中添加：

```typescript
const [showTransferModal, setShowTransferModal] = useState(false);
const [showWishlistModal, setShowWishlistModal] = useState(false);
```

### 3. 添加积分转赠处理函数

```typescript
const handleTransfer = async (toProfileId: string, points: number, message: string) => {
  const familyId = resolveFamilyId();
  if (!familyId) return;

  const txId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`;
  
  const loadingId = showToast({ type: "loading", title: "正在转赠...", duration: 0 });
  
  try {
    // 创建转赠交易记录
    const { error: txError } = await supabase.from("transactions").insert([
      {
        id: txId + "-from",
        family_id: familyId,
        profile_id: state.currentProfileId,
        title: `转赠给 ${state.profiles.find(p => p.id === toProfileId)?.name}`,
        points: -points,
        type: "transfer",
        from_profile_id: state.currentProfileId,
        to_profile_id: toProfileId,
        timestamp: new Date().toISOString(),
      },
      {
        id: txId + "-to",
        family_id: familyId,
        profile_id: toProfileId,
        title: `来自 ${currentProfile.name} 的转赠`,
        points: points,
        type: "transfer",
        from_profile_id: state.currentProfileId,
        to_profile_id: toProfileId,
        timestamp: new Date().toISOString(),
      },
    ]);

    if (txError) throw txError;

    // 更新余额
    await supabase
      .from("profiles")
      .update({ balance: currentProfile.balance - points })
      .eq("id", state.currentProfileId)
      .eq("family_id", familyId);

    const toProfile = state.profiles.find(p => p.id === toProfileId);
    if (toProfile) {
      await supabase
        .from("profiles")
        .update({ balance: toProfile.balance + points })
        .eq("id", toProfileId)
        .eq("family_id", familyId);
    }

    // 记录转赠日志
    await supabase.from("transfer_logs").insert({
      family_id: familyId,
      from_profile_id: state.currentProfileId,
      to_profile_id: toProfileId,
      points: points,
      message: message,
    });

    // 发送系统通知
    await sendSystemNotification(
      `${currentProfile.name} 向 ${toProfile?.name} 转赠了 ${points} 元气值`
    );

    await refreshFamily(familyId);
    showToast({ type: "success", title: "转赠成功" });
  } catch (error) {
    notifyError("转赠失败", error);
  } finally {
    if (loadingId) dismissToast(loadingId);
  }
};
```

### 4. 添加愿望清单处理函数

```typescript
const handleSubmitWishlist = async (
  title: string,
  points: number,
  type: "实物奖品" | "特权奖励",
  imageUrl?: string
) => {
  const familyId = resolveFamilyId();
  if (!familyId) return;

  const loadingId = showToast({ type: "loading", title: "正在提交愿望...", duration: 0 });

  try {
    const { error } = await supabase.from("rewards").insert({
      family_id: familyId,
      title: title,
      points: points,
      type: type,
      image_url: imageUrl,
      status: "pending",
      requested_by: state.currentProfileId,
      requested_at: new Date().toISOString(),
    });

    if (error) throw error;

    await sendSystemNotification(`${currentProfile.name} 提交了新愿望：${title}`);
    await refreshFamily(familyId);
    showToast({ type: "success", title: "愿望已提交", description: "等待管理员审核" });
  } catch (error) {
    notifyError("提交愿望失败", error);
    throw error;
  } finally {
    if (loadingId) dismissToast(loadingId);
  }
};
```

### 5. 添加路由

在 Routes 中添加成就中心路由：

```typescript
<Route
  path="/:syncId/achievements"
  element={
    <AchievementCenter
      currentProfile={currentProfile}
      familyId={resolvedFamilyId}
    />
  }
/>
```

### 6. 在 HeaderBar 中添加快捷按钮

修改 HeaderBar 组件，添加转赠和愿望按钮：

```typescript
<button
  onClick={() => setShowTransferModal(true)}
  className="px-4 py-2 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all flex items-center gap-2"
>
  <Icon name="plus" size={14} className="rotate-45" />
  转赠
</button>

<button
  onClick={() => setShowWishlistModal(true)}
  className="px-4 py-2 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
>
  <Icon name="reward" size={14} />
  许愿
</button>
```

### 7. 在 Sidebar 中添加成就中心入口

修改 Sidebar 组件，添加成就中心导航项：

```typescript
<button
  onClick={() => onChangeTab("achievements")}
  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
    activeTab === "achievements"
      ? "bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white shadow-lg"
      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
  }`}
>
  <Icon name="reward" size={20} />
  <span className="font-bold">成就中心</span>
</button>
```

### 8. 添加弹窗组件到 JSX

在 return 语句的末尾添加：

```typescript
<TransferModal
  open={showTransferModal}
  onClose={() => setShowTransferModal(false)}
  currentProfile={currentProfile}
  profiles={state.profiles}
  onTransfer={handleTransfer}
/>

<WishlistModal
  open={showWishlistModal}
  onClose={() => setShowWishlistModal(false)}
  onSubmit={handleSubmitWishlist}
/>
```

## 数据库迁移

确保已在 Supabase 中执行以下迁移文件：

1. `supabase/migrations/002_add_new_features.sql`
2. `supabase/migrations/003_seed_badge_conditions.sql`
3. `supabase/migrations/004_points_prediction.sql`

或者直接执行：
```bash
supabase/migrations/run_all_migrations.sql
```

## 功能测试清单

- [ ] 徽章系统：完成任务后自动获得徽章
- [ ] 积分转赠：成员之间可以转赠积分
- [ ] 愿望清单：成员可以提交愿望，管理员审核
- [ ] 趋势预测：查看未来积分预测
- [ ] 任务难度：设置任务难度等级
- [ ] 任务提醒：启用任务提醒功能

## 注意事项

1. 所有新功能都需要 Supabase 数据库支持
2. 确保 RLS 策略正确配置
3. 转赠功能会创建两条交易记录（转出和转入）
4. 徽章会通过触发器自动授予
5. 愿望清单需要管理员在设置页面审核

## 下一步

1. 在 RedeemSection 中显示待审核的愿望（管理员）
2. 在 SettingsSection 中添加愿望审核功能
3. 在 EditModal 中添加任务难度选择
4. 添加任务提醒设置界面
