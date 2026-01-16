-- ============================================
-- 修复 "type is ambiguous" 错误
-- ============================================
-- 这个脚本会删除旧版本的函数并重新创建
-- 主要修改：将返回表的 type 列重命名为 badge_type
-- ============================================

BEGIN;

-- 1. 删除旧版本的函数
DROP FUNCTION IF EXISTS get_available_badges(UUID);
DROP FUNCTION IF EXISTS grant_eligible_badges(UUID);

-- 2. 重新创建 get_available_badges 函数（type → badge_type）
CREATE OR REPLACE FUNCTION get_available_badges(p_profile_id UUID)
RETURNS TABLE (
  condition TEXT,
  badge_type TEXT,
  title TEXT,
  description TEXT,
  icon TEXT,
  progress INTEGER,
  requirement INTEGER
) AS $$
DECLARE
  v_family_id UUID;
  v_total_earned INTEGER;
  v_task_count INTEGER;
  v_learning_count INTEGER;
  v_chores_count INTEGER;
  v_streak_days INTEGER;
  v_transfer_count INTEGER;
  v_redeem_count INTEGER;
BEGIN
  SELECT family_id INTO v_family_id FROM profiles WHERE id = p_profile_id;
  
  SELECT 
    COALESCE(SUM(CASE WHEN t.type = 'earn' THEN t.points ELSE 0 END), 0),
    COUNT(CASE WHEN t.type = 'earn' THEN 1 END),
    COUNT(CASE WHEN t.type = 'earn' AND t.title LIKE '%学习%' THEN 1 END),
    COUNT(CASE WHEN t.type = 'earn' AND t.title LIKE '%家务%' THEN 1 END),
    COUNT(CASE WHEN t.type = 'transfer' THEN 1 END),
    COUNT(CASE WHEN t.type = 'redeem' THEN 1 END)
  INTO v_total_earned, v_task_count, v_learning_count, v_chores_count, v_transfer_count, v_redeem_count
  FROM transactions t
  WHERE t.profile_id = p_profile_id;
  
  WITH daily_tasks AS (
    SELECT DISTINCT DATE(timestamp) as task_date
    FROM transactions
    WHERE profile_id = p_profile_id AND type = 'earn'
    ORDER BY task_date DESC
  ),
  streak AS (
    SELECT 
      task_date,
      task_date - (ROW_NUMBER() OVER (ORDER BY task_date))::INTEGER * INTERVAL '1 day' as grp
    FROM daily_tasks
  )
  SELECT COALESCE(COUNT(*), 0) INTO v_streak_days
  FROM streak
  WHERE grp = (SELECT grp FROM streak ORDER BY task_date DESC LIMIT 1);
  
  RETURN QUERY
  SELECT 
    bd.condition,
    bd.type,
    bd.title,
    bd.description,
    bd.icon,
    CASE bd.requirement_type
      WHEN 'points' THEN v_total_earned
      WHEN 'tasks' THEN v_task_count
      WHEN 'days' THEN v_streak_days
      ELSE 0
    END,
    bd.requirement_value
  FROM badge_definitions bd
  WHERE NOT EXISTS (
    SELECT 1 FROM badges b 
    WHERE b.profile_id = p_profile_id 
    AND b.condition = bd.condition
  )
  AND (
    (bd.requirement_type = 'points' AND v_total_earned >= bd.requirement_value) OR
    (bd.requirement_type = 'tasks' AND v_task_count >= bd.requirement_value) OR
    (bd.requirement_type = 'days' AND v_streak_days >= bd.requirement_value)
  );
END;
$$ LANGUAGE plpgsql;

-- 3. 重新创建 grant_eligible_badges 函数（使用 badge_type）
CREATE OR REPLACE FUNCTION grant_eligible_badges(p_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_family_id UUID;
  v_count INTEGER := 0;
  badge_record RECORD;
BEGIN
  SELECT family_id INTO v_family_id FROM profiles WHERE id = p_profile_id;
  
  FOR badge_record IN 
    SELECT * FROM get_available_badges(p_profile_id)
  LOOP
    INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
    VALUES (
      p_profile_id,
      v_family_id,
      badge_record.badge_type,
      badge_record.title,
      badge_record.description,
      badge_record.icon,
      badge_record.condition
    )
    ON CONFLICT (profile_id, condition) DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- 4. 验证
SELECT 
  routine_name,
  '✅ 已修复' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_available_badges', 'grant_eligible_badges');

-- 5. 测试（可选 - 需要有效的 profile_id）
-- SELECT * FROM get_available_badges('your-profile-uuid-here');
