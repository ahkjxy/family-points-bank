-- ============================================
-- 测试 SQL - 验证所有函数是否正确创建
-- ============================================

-- 1. 检查所有表是否存在
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('badges', 'task_reminders', 'transfer_logs', 'wishlist_reviews', 'badge_definitions') 
    THEN '✅ 存在' 
    ELSE '❌ 缺失' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('badges', 'task_reminders', 'transfer_logs', 'wishlist_reviews', 'badge_definitions')
ORDER BY table_name;

-- 2. 检查所有函数是否存在
SELECT 
  routine_name,
  '✅ 存在' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'check_and_grant_badges', 
  'get_difficulty_multiplier', 
  'get_available_badges', 
  'grant_eligible_badges', 
  'get_family_leaderboard',
  'predict_points_trend'
)
ORDER BY routine_name;

-- 3. 检查徽章定义数量
SELECT 
  COUNT(*) as badge_definition_count,
  CASE 
    WHEN COUNT(*) >= 13 THEN '✅ 正常'
    ELSE '⚠️ 数量不足'
  END as status
FROM badge_definitions;

-- 4. 检查 transactions 表的 type 约束
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'transactions_type_check';

-- 5. 测试 get_difficulty_multiplier 函数
SELECT 
  'easy' as difficulty,
  get_difficulty_multiplier('easy') as multiplier
UNION ALL
SELECT 'medium', get_difficulty_multiplier('medium')
UNION ALL
SELECT 'hard', get_difficulty_multiplier('hard')
UNION ALL
SELECT 'expert', get_difficulty_multiplier('expert');

-- 6. 列出所有 profiles（用于后续测试）
SELECT 
  id,
  name,
  balance,
  role
FROM profiles
LIMIT 5;

-- ============================================
-- 使用说明
-- ============================================
-- 1. 在 Supabase SQL Editor 中执行此文件
-- 2. 检查所有查询结果是否正常
-- 3. 如果有 profile，可以用其 ID 测试其他函数：
--    SELECT * FROM get_available_badges('your-profile-uuid-here');
--    SELECT * FROM predict_points_trend('your-profile-uuid-here', 7);
-- ============================================
