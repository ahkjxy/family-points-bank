# Supabase 数据库迁移文件

## 📋 迁移文件列表

### 001_create_messages_table.sql
- 创建聊天消息表
- 已存在的基础表结构

### 002_add_new_features.sql ⭐ 新增
**主要功能：**
- ✅ 任务难度等级（easy, medium, hard, expert）
- ✅ 任务提醒功能（reminder_enabled, reminder_time）
- ✅ 愿望清单系统（rewards 表增加 status, requested_by, requested_at）
- ✅ 积分转赠功能（transactions 增加 transfer 类型和 from/to 字段）
- ✅ 成员等级系统（profiles 增加 level, experience）
- ✅ 徽章系统（badges 表）
- ✅ 任务提醒记录（task_reminders 表）
- ✅ 转赠日志（transfer_logs 表）
- ✅ 愿望审核日志（wishlist_reviews 表）
- ✅ 自动徽章授予触发器
- ✅ 难度系数计算函数
- ✅ 成员统计视图

### 003_seed_badge_conditions.sql ⭐ 新增
**主要功能：**
- ✅ 徽章定义表（badge_definitions）
- ✅ 预设 28 种徽章类型
  - 连续完成徽章（3天、7天、14天、30天、100天）
  - 积分里程碑（50、100、200、500、1000）
  - 任务完成数量（10、50、100、200、500）
  - 分类任务成就（学习、家务）
  - 特殊成就（完美一周、早起鸟、零违规等）
- ✅ 获取可用徽章函数（get_available_badges）
- ✅ 批量授予徽章函数（grant_eligible_badges）
- ✅ 家庭排行榜函数（get_family_leaderboard）

### 004_points_prediction.sql ⭐ 新增
**主要功能：**
- ✅ 积分趋势预测函数（predict_points_trend）
- ✅ 成员详细分析函数（get_profile_analytics）
- ✅ 家庭趋势分析函数（get_family_trends）
- ✅ 任务完成率统计视图（task_completion_stats）

## 🚀 使用方法

### 方法一：Supabase Dashboard（推荐）

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **SQL Editor**
4. 按顺序执行以下文件：
   ```
   002_add_new_features.sql
   003_seed_badge_conditions.sql
   004_points_prediction.sql
   ```
5. 点击 **Run** 执行每个文件

### 方法二：Supabase CLI

```bash
# 确保已安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接到你的项目
supabase link --project-ref your-project-ref

# 应用迁移
supabase db push

# 或者单独执行每个文件
supabase db execute -f supabase/migrations/002_add_new_features.sql
supabase db execute -f supabase/migrations/003_seed_badge_conditions.sql
supabase db execute -f supabase/migrations/004_points_prediction.sql
```

### 方法三：直接复制粘贴

1. 打开 Supabase Dashboard 的 SQL Editor
2. 复制 `002_add_new_features.sql` 的全部内容
3. 粘贴并执行
4. 重复步骤 2-3 执行其他文件

## 📊 新增数据表结构

### badges（徽章表）
```sql
- id: UUID (主键)
- profile_id: UUID (成员ID)
- family_id: UUID (家庭ID)
- type: TEXT (徽章类型: streak/milestone/achievement/special)
- title: TEXT (徽章标题)
- description: TEXT (徽章描述)
- icon: TEXT (徽章图标 emoji)
- condition: TEXT (获得条件，如 "streak_7")
- earned_at: TIMESTAMPTZ (获得时间)
```

### task_reminders（任务提醒表）
```sql
- id: UUID (主键)
- task_id: UUID (任务ID)
- profile_id: UUID (成员ID)
- family_id: UUID (家庭ID)
- reminder_date: DATE (提醒日期)
- completed: BOOLEAN (是否已完成)
```

### transfer_logs（转赠日志表）
```sql
- id: UUID (主键)
- family_id: UUID (家庭ID)
- from_profile_id: UUID (转出成员)
- to_profile_id: UUID (转入成员)
- points: INTEGER (转赠积分)
- message: TEXT (留言)
- created_at: TIMESTAMPTZ (创建时间)
```

### wishlist_reviews（愿望审核表）
```sql
- id: UUID (主键)
- reward_id: UUID (奖励ID)
- family_id: UUID (家庭ID)
- reviewer_id: UUID (审核人ID)
- action: TEXT (审核动作: approved/rejected)
- comment: TEXT (审核意见)
- created_at: TIMESTAMPTZ (审核时间)
```

### badge_definitions（徽章定义表）
```sql
- id: UUID (主键)
- condition: TEXT (条件标识，唯一)
- type: TEXT (徽章类型)
- title: TEXT (徽章标题)
- description: TEXT (徽章描述)
- icon: TEXT (徽章图标)
- requirement_value: INTEGER (要求数值)
- requirement_type: TEXT (要求类型: days/points/tasks/custom)
```

## 🔧 新增字段

### tasks 表
- `difficulty`: TEXT - 任务难度（easy/medium/hard/expert）
- `reminder_enabled`: BOOLEAN - 是否启用提醒
- `reminder_time`: TEXT - 提醒时间（HH:mm 格式）

### rewards 表
- `status`: TEXT - 状态（active/pending/rejected）
- `requested_by`: UUID - 请求者ID
- `requested_at`: TIMESTAMPTZ - 请求时间

### transactions 表
- `type`: 新增 'transfer' 类型
- `from_profile_id`: UUID - 转出成员ID
- `to_profile_id`: UUID - 转入成员ID

### profiles 表
- `level`: INTEGER - 成员等级
- `experience`: INTEGER - 经验值

## 🎯 核心功能函数

### 1. 徽章相关
```sql
-- 获取可获得的徽章
SELECT * FROM get_available_badges('profile_id');

-- 批量授予徽章
SELECT grant_eligible_badges('profile_id');

-- 查看家庭排行榜
SELECT * FROM get_family_leaderboard('family_id', 'week'); -- week/month/all
```

### 2. 数据分析
```sql
-- 获取成员详细分析
SELECT get_profile_analytics('profile_id');

-- 获取家庭趋势
SELECT get_family_trends('family_id', 30); -- 最近30天

-- 预测积分趋势
SELECT * FROM predict_points_trend('profile_id', 7); -- 预测未来7天
```

### 3. 任务统计
```sql
-- 查看任务完成率
SELECT * FROM task_completion_stats WHERE family_id = 'your_family_id';

-- 查看成员统计
SELECT * FROM profile_stats WHERE family_id = 'your_family_id';
```

## ⚠️ 注意事项

1. **执行顺序**：必须按照文件编号顺序执行（002 → 003 → 004）
2. **数据备份**：执行前建议备份数据库
3. **权限检查**：确保有足够的数据库权限
4. **RLS 策略**：所有新表都已启用行级安全策略
5. **索引优化**：已为常用查询字段创建索引

## 🔍 验证迁移

执行以下 SQL 验证迁移是否成功：

```sql
-- 检查新表是否创建
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('badges', 'task_reminders', 'transfer_logs', 'wishlist_reviews', 'badge_definitions');

-- 检查新字段是否添加
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('difficulty', 'reminder_enabled', 'reminder_time');

-- 检查函数是否创建
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_available_badges', 'predict_points_trend', 'get_profile_analytics');

-- 检查触发器是否创建
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_check_badges';
```

## 📝 回滚方案

如需回滚，执行以下 SQL：

```sql
-- 删除新表
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS task_reminders CASCADE;
DROP TABLE IF EXISTS transfer_logs CASCADE;
DROP TABLE IF EXISTS wishlist_reviews CASCADE;
DROP TABLE IF EXISTS badge_definitions CASCADE;

-- 删除新字段
ALTER TABLE tasks DROP COLUMN IF EXISTS difficulty;
ALTER TABLE tasks DROP COLUMN IF EXISTS reminder_enabled;
ALTER TABLE tasks DROP COLUMN IF EXISTS reminder_time;

ALTER TABLE rewards DROP COLUMN IF EXISTS status;
ALTER TABLE rewards DROP COLUMN IF EXISTS requested_by;
ALTER TABLE rewards DROP COLUMN IF EXISTS requested_at;

ALTER TABLE transactions DROP COLUMN IF EXISTS from_profile_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS to_profile_id;

ALTER TABLE profiles DROP COLUMN IF EXISTS level;
ALTER TABLE profiles DROP COLUMN IF EXISTS experience;

-- 删除函数
DROP FUNCTION IF EXISTS check_and_grant_badges CASCADE;
DROP FUNCTION IF EXISTS get_difficulty_multiplier CASCADE;
DROP FUNCTION IF EXISTS get_available_badges CASCADE;
DROP FUNCTION IF EXISTS grant_eligible_badges CASCADE;
DROP FUNCTION IF EXISTS get_family_leaderboard CASCADE;
DROP FUNCTION IF EXISTS predict_points_trend CASCADE;
DROP FUNCTION IF EXISTS get_profile_analytics CASCADE;
DROP FUNCTION IF EXISTS get_family_trends CASCADE;

-- 删除视图
DROP VIEW IF EXISTS profile_stats CASCADE;
DROP VIEW IF EXISTS task_completion_stats CASCADE;
```

## 🆘 常见问题

### Q: 执行时报错 "relation already exists"
A: 某些表或字段可能已存在，可以忽略或使用 `IF NOT EXISTS` / `IF EXISTS` 语句

### Q: RLS 策略导致无法访问数据
A: 检查 `family_members` 表是否正确关联了用户和家庭

### Q: 触发器没有自动授予徽章
A: 手动调用 `SELECT grant_eligible_badges('profile_id')` 批量授予

### Q: 预测函数返回空结果
A: 确保有足够的历史数据（至少10天的交易记录）

## 📞 技术支持

如遇到问题，请检查：
1. Supabase 项目日志
2. PostgreSQL 错误日志
3. RLS 策略配置
4. 数据表关联关系

---

**最后更新**: 2026-01-16
**版本**: 1.0.0
