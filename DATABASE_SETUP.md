# 🗄️ 数据库设置指南

## ⚠️ 当前问题

错误信息：
```
Could not find the function public.grant_eligible_badges(p_profile_id) in the schema cache
```

**原因**: 数据库迁移还没有执行，函数还不存在。

## 🚀 解决方案

### 步骤 1: 登录 Supabase Dashboard

1. 访问 [https://app.supabase.com](https://app.supabase.com)
2. 选择你的项目
3. 点击左侧菜单的 **SQL Editor**

### 步骤 2: 执行迁移 SQL

#### 方法 A: 一键执行（推荐）

1. 打开文件 `supabase/migrations/run_all_migrations.sql`
2. 复制**全部内容**
3. 在 SQL Editor 中粘贴
4. 点击右下角的 **Run** 按钮
5. 等待执行完成（应该显示 "Success"）

#### 方法 B: 分步执行

如果方法 A 失败，可以分别执行每个文件：

**1. 执行基础表结构**
```sql
-- 复制 supabase/migrations/002_add_new_features.sql 的内容
-- 粘贴到 SQL Editor
-- 点击 Run
```

**2. 执行徽章定义**
```sql
-- 复制 supabase/migrations/003_seed_badge_conditions.sql 的内容
-- 粘贴到 SQL Editor
-- 点击 Run
```

**3. 执行预测函数**
```sql
-- 复制 supabase/migrations/004_points_prediction.sql 的内容
-- 粘贴到 SQL Editor
-- 点击 Run
```

### 步骤 3: 验证迁移

在 SQL Editor 中执行以下验证 SQL：

```sql
-- 1. 检查新表（应返回 5 行）
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('badges', 'task_reminders', 'transfer_logs', 'wishlist_reviews', 'badge_definitions');

-- 2. 检查函数（应返回 1 行）
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'grant_eligible_badges';

-- 3. 检查徽章定义（应返回 13 行）
SELECT COUNT(*) as badge_count FROM badge_definitions;

-- 4. 检查触发器（应返回 1 行）
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_check_badges';
```

### 步骤 4: 刷新 Schema Cache

执行迁移后，Supabase 可能需要刷新 schema cache：

1. 在 Supabase Dashboard 中
2. 进入 **Settings** → **API**
3. 点击 **Reload schema cache** 按钮

或者等待几分钟让 Supabase 自动刷新。

## 📋 完整的迁移 SQL（快速复制）

如果你想快速执行，这里是完整的 SQL（已合并）：

<details>
<summary>点击展开完整 SQL</summary>

```sql
-- ============================================
-- 家庭积分银行 - 完整数据库迁移脚本
-- ============================================

BEGIN;

-- 添加任务难度和提醒功能
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_time TEXT;

-- 添加奖励状态和愿望清单功能
ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;

-- 添加交易类型支持转赠
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check,
ADD CONSTRAINT transactions_type_check CHECK (type IN ('earn', 'penalty', 'redeem', 'transfer'));

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS from_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS to_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 添加成员等级和经验值
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;

-- 创建徽章表
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('streak', 'milestone', 'achievement', 'special')),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  condition TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, condition)
);

-- 创建任务提醒表
CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, profile_id, reminder_date)
);

-- 创建积分转赠记录表
CREATE TABLE IF NOT EXISTS transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  from_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建愿望清单审核日志表
CREATE TABLE IF NOT EXISTS wishlist_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建徽章定义表
CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('streak', 'milestone', 'achievement', 'special')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_value INTEGER,
  requirement_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_badges_profile_id ON badges(profile_id);
CREATE INDEX IF NOT EXISTS idx_badges_family_id ON badges(family_id);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_family_id ON transfer_logs(family_id);

-- 启用 RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_reviews ENABLE ROW LEVEL SECURITY;

-- RLS 策略
DROP POLICY IF EXISTS "Users can view badges in their family" ON badges;
CREATE POLICY "Users can view badges in their family"
  ON badges FOR SELECT
  USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "System can insert badges" ON badges;
CREATE POLICY "System can insert badges"
  ON badges FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

-- 创建函数：批量授予徽章
CREATE OR REPLACE FUNCTION grant_eligible_badges(p_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_family_id UUID;
  v_count INTEGER := 0;
  v_total_earned INTEGER;
  v_task_count INTEGER;
BEGIN
  SELECT family_id INTO v_family_id FROM profiles WHERE id = p_profile_id;
  
  -- 计算统计
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END), 0),
    COUNT(CASE WHEN type = 'earn' THEN 1 END)
  INTO v_total_earned, v_task_count
  FROM transactions WHERE profile_id = p_profile_id;
  
  -- 授予积分里程碑徽章
  IF v_total_earned >= 100 THEN
    INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
    VALUES (p_profile_id, v_family_id, 'milestone', '百分成就', '累计获得100元气值', '💯', 'total_100')
    ON CONFLICT (profile_id, condition) DO NOTHING;
    v_count := v_count + 1;
  END IF;
  
  IF v_total_earned >= 500 THEN
    INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
    VALUES (p_profile_id, v_family_id, 'milestone', '元气大师', '累计获得500元气值', '⭐', 'total_500')
    ON CONFLICT (profile_id, condition) DO NOTHING;
    v_count := v_count + 1;
  END IF;
  
  -- 授予任务成就徽章
  IF v_task_count >= 50 THEN
    INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
    VALUES (p_profile_id, v_family_id, 'achievement', '勤奋之星', '完成50个任务', '🌟', 'tasks_50')
    ON CONFLICT (profile_id, condition) DO NOTHING;
    v_count := v_count + 1;
  END IF;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 插入预设徽章定义
INSERT INTO badge_definitions (condition, type, title, description, icon, requirement_value, requirement_type) VALUES
  ('streak_7', 'streak', '七日坚持', '连续7天完成任务', '🔥', 7, 'days'),
  ('total_50', 'milestone', '初露锋芒', '累计获得50元气值', '⭐', 50, 'points'),
  ('total_100', 'milestone', '百分成就', '累计获得100元气值', '💯', 100, 'points'),
  ('total_500', 'milestone', '元气大师', '累计获得500元气值', '⭐', 500, 'points'),
  ('total_1000', 'milestone', '元气传奇', '累计获得1000元气值', '👑', 1000, 'points'),
  ('tasks_10', 'achievement', '初出茅庐', '完成10个任务', '🎯', 10, 'tasks'),
  ('tasks_50', 'achievement', '勤奋之星', '完成50个任务', '🌟', 50, 'tasks'),
  ('tasks_100', 'achievement', '任务达人', '完成100个任务', '💪', 100, 'tasks'),
  ('generous', 'special', '慷慨之心', '转赠积分给他人10次', '💝', 10, 'custom'),
  ('first_redeem', 'special', '首次兑换', '完成第一次奖励兑换', '🎁', 1, 'custom')
ON CONFLICT (condition) DO NOTHING;

COMMIT;

-- 验证
DO $$
DECLARE
  table_count INTEGER;
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('badges', 'task_reminders', 'transfer_logs', 'wishlist_reviews', 'badge_definitions');
  
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name = 'grant_eligible_badges';
  
  RAISE NOTICE '✅ 迁移完成！';
  RAISE NOTICE '📊 新增表数量: %', table_count;
  RAISE NOTICE '🔧 新增函数数量: %', function_count;
  
  IF table_count = 5 AND function_count = 1 THEN
    RAISE NOTICE '🎉 所有功能已成功部署！';
  ELSE
    RAISE WARNING '⚠️ 部分功能可能未完全部署，请检查日志';
  END IF;
END $$;
```

</details>

## ✅ 执行后的验证

执行完成后，你应该看到：

```
✅ 迁移完成！
📊 新增表数量: 5
🔧 新增函数数量: 1
🎉 所有功能已成功部署！
```

## 🔄 刷新应用

迁移完成后：

1. **刷新浏览器页面** (Ctrl + Shift + R)
2. **重新测试功能**
   - 点击"成就中心"
   - 点击"领取徽章"按钮
   - 应该能正常工作

## 🆘 如果仍然失败

### 检查 1: 确认函数存在

```sql
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'grant_eligible_badges';
```

应该返回 1 行。

### 检查 2: 手动创建函数

如果函数不存在，单独执行：

```sql
CREATE OR REPLACE FUNCTION grant_eligible_badges(p_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_family_id UUID;
  v_count INTEGER := 0;
  v_total_earned INTEGER;
  v_task_count INTEGER;
BEGIN
  SELECT family_id INTO v_family_id FROM profiles WHERE id = p_profile_id;
  
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END), 0),
    COUNT(CASE WHEN type = 'earn' THEN 1 END)
  INTO v_total_earned, v_task_count
  FROM transactions WHERE profile_id = p_profile_id;
  
  IF v_total_earned >= 100 THEN
    INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
    VALUES (p_profile_id, v_family_id, 'milestone', '百分成就', '累计获得100元气值', '💯', 'total_100')
    ON CONFLICT (profile_id, condition) DO NOTHING;
    v_count := v_count + 1;
  END IF;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

### 检查 3: 权限问题

确保你的数据库用户有创建函数的权限。

## 📞 需要帮助？

如果执行过程中遇到具体错误，请：
1. 复制完整的错误信息
2. 检查是否有权限问题
3. 确认所有依赖表都已创建

---

**重要**: 必须先执行数据库迁移，应用才能正常使用新功能！
