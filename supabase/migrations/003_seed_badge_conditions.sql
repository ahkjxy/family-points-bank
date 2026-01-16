-- 创建徽章条件配置表（可选，用于管理可获得的徽章类型）
CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('streak', 'milestone', 'achievement', 'special')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_value INTEGER,
  requirement_type TEXT, -- 'days', 'points', 'tasks', 'custom'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 插入预设徽章定义
INSERT INTO badge_definitions (condition, type, title, description, icon, requirement_value, requirement_type) VALUES
  -- 连续完成徽章
  ('streak_3', 'streak', '三日坚持', '连续3天完成任务', '🔥', 3, 'days'),
  ('streak_7', 'streak', '七日坚持', '连续7天完成任务', '🔥', 7, 'days'),
  ('streak_14', 'streak', '两周坚持', '连续14天完成任务', '🔥', 14, 'days'),
  ('streak_30', 'streak', '月度坚持', '连续30天完成任务', '🔥', 30, 'days'),
  ('streak_100', 'streak', '百日坚持', '连续100天完成任务', '🏆', 100, 'days'),
  
  -- 积分里程碑
  ('total_50', 'milestone', '初露锋芒', '累计获得50元气值', '⭐', 50, 'points'),
  ('total_100', 'milestone', '百分成就', '累计获得100元气值', '💯', 100, 'points'),
  ('total_200', 'milestone', '元气新星', '累计获得200元气值', '🌟', 200, 'points'),
  ('total_500', 'milestone', '元气大师', '累计获得500元气值', '⭐', 500, 'points'),
  ('total_1000', 'milestone', '元气传奇', '累计获得1000元气值', '👑', 1000, 'points'),
  
  -- 任务完成数量
  ('tasks_10', 'achievement', '初出茅庐', '完成10个任务', '🎯', 10, 'tasks'),
  ('tasks_50', 'achievement', '勤奋之星', '完成50个任务', '🌟', 50, 'tasks'),
  ('tasks_100', 'achievement', '任务达人', '完成100个任务', '💪', 100, 'tasks'),
  ('tasks_200', 'achievement', '任务专家', '完成200个任务', '🏅', 200, 'tasks'),
  ('tasks_500', 'achievement', '任务大师', '完成500个任务', '🏆', 500, 'tasks'),
  
  -- 学习类任务
  ('learning_50', 'achievement', '学习标兵', '完成50个学习任务', '📚', 50, 'tasks'),
  ('learning_100', 'achievement', '学霸', '完成100个学习任务', '🎓', 100, 'tasks'),
  
  -- 家务类任务
  ('chores_50', 'achievement', '家务小能手', '完成50个家务任务', '🧹', 50, 'tasks'),
  ('chores_100', 'achievement', '家务达人', '完成100个家务任务', '✨', 100, 'tasks'),
  
  -- 特殊成就
  ('perfect_week', 'special', '完美一周', '一周内每天都完成任务', '💎', 7, 'custom'),
  ('early_bird', 'special', '早起鸟', '连续7天早上8点前完成任务', '🐦', 7, 'custom'),
  ('night_owl', 'special', '夜猫子', '连续7天晚上完成作业', '🦉', 7, 'custom'),
  ('zero_penalty', 'special', '零违规', '连续30天无违规记录', '😇', 30, 'custom'),
  ('generous', 'special', '慷慨之心', '转赠积分给他人10次', '💝', 10, 'custom'),
  ('saver', 'special', '储蓄达人', '余额达到100元气值', '💰', 100, 'custom'),
  ('first_redeem', 'special', '首次兑换', '完成第一次奖励兑换', '🎁', 1, 'custom'),
  ('wishlist_approved', 'special', '梦想成真', '愿望清单被批准', '✨', 1, 'custom')
ON CONFLICT (condition) DO NOTHING;

-- 创建函数：获取成员可获得但未获得的徽章
CREATE OR REPLACE FUNCTION get_available_badges(p_profile_id UUID)
RETURNS TABLE (
  condition TEXT,
  type TEXT,
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
  -- 获取家庭ID
  SELECT family_id INTO v_family_id FROM profiles WHERE id = p_profile_id;
  
  -- 计算各项统计
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
  
  -- 计算连续天数
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
  SELECT COUNT(*) INTO v_streak_days
  FROM streak
  WHERE grp = (SELECT grp FROM streak ORDER BY task_date DESC LIMIT 1);
  
  -- 返回可获得的徽章
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
    END as progress,
    bd.requirement_value as requirement
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

-- 创建函数：批量授予符合条件的徽章
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
      badge_record.type,
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

-- 创建函数：获取家庭排行榜
CREATE OR REPLACE FUNCTION get_family_leaderboard(p_family_id UUID, p_period TEXT DEFAULT 'all')
RETURNS TABLE (
  profile_id UUID,
  profile_name TEXT,
  avatar_color TEXT,
  avatar_url TEXT,
  total_points INTEGER,
  badge_count INTEGER,
  rank INTEGER
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
BEGIN
  -- 确定时间范围
  v_start_date := CASE p_period
    WHEN 'week' THEN NOW() - INTERVAL '7 days'
    WHEN 'month' THEN NOW() - INTERVAL '30 days'
    ELSE '1970-01-01'::TIMESTAMPTZ
  END;
  
  RETURN QUERY
  WITH points_summary AS (
    SELECT 
      p.id,
      p.name,
      p.avatar_color,
      p.avatar_url,
      COALESCE(SUM(CASE WHEN t.type = 'earn' THEN t.points ELSE 0 END), 0)::INTEGER as points,
      COUNT(DISTINCT b.id)::INTEGER as badges
    FROM profiles p
    LEFT JOIN transactions t ON t.profile_id = p.id AND t.timestamp >= v_start_date
    LEFT JOIN badges b ON b.profile_id = p.id
    WHERE p.family_id = p_family_id
    GROUP BY p.id, p.name, p.avatar_color, p.avatar_url
  )
  SELECT 
    id,
    name,
    avatar_color,
    avatar_url,
    points,
    badges,
    ROW_NUMBER() OVER (ORDER BY points DESC, badges DESC)::INTEGER as rank
  FROM points_summary
  ORDER BY rank;
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON TABLE badge_definitions IS '徽章定义表，存储所有可获得的徽章类型和条件';
COMMENT ON FUNCTION get_available_badges IS '获取成员可获得但未获得的徽章列表';
COMMENT ON FUNCTION grant_eligible_badges IS '批量授予成员符合条件的徽章';
COMMENT ON FUNCTION get_family_leaderboard IS '获取家庭排行榜';
