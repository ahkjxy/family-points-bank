-- ============================================
-- 家庭积分银行 - 完整数据库迁移脚本
-- 版本: 1.0.2 (修复 type 列冲突)
-- 日期: 2026-01-16
-- 说明: 一次性执行所有新功能的数据库迁移
-- ============================================

-- 开始事务
BEGIN;

-- ============================================
-- 第零部分：清理旧函数（如果存在）
-- ============================================

-- 先删除触发器
DROP TRIGGER IF EXISTS trigger_check_badges ON transactions;

-- 再删除函数
DROP FUNCTION IF EXISTS get_available_badges(UUID);
DROP FUNCTION IF EXISTS grant_eligible_badges(UUID);
DROP FUNCTION IF EXISTS predict_points_trend(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_family_leaderboard(UUID, TEXT);
DROP FUNCTION IF EXISTS check_and_grant_badges();
DROP FUNCTION IF EXISTS get_difficulty_multiplier(TEXT);

-- ============================================
-- 第一部分：基础表结构扩展
-- ============================================

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

-- ============================================
-- 第二部分：新增功能表
-- ============================================

-- 徽章表
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

-- 任务提醒表
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

-- 积分转赠记录表
CREATE TABLE IF NOT EXISTS transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  from_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 愿望清单审核日志表
CREATE TABLE IF NOT EXISTS wishlist_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 徽章定义表
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

-- ============================================
-- 第三部分：索引创建
-- ============================================

CREATE INDEX IF NOT EXISTS idx_badges_profile_id ON badges(profile_id);
CREATE INDEX IF NOT EXISTS idx_badges_family_id ON badges(family_id);
CREATE INDEX IF NOT EXISTS idx_badges_earned_at ON badges(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_reminders_profile_id ON task_reminders(profile_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_reminder_date ON task_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_task_reminders_completed ON task_reminders(completed);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_family_id ON transfer_logs(family_id);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_from_profile ON transfer_logs(from_profile_id);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_to_profile ON transfer_logs(to_profile_id);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_created_at ON transfer_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_reviews_reward_id ON wishlist_reviews(reward_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_reviews_family_id ON wishlist_reviews(family_id);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON rewards(status);
CREATE INDEX IF NOT EXISTS idx_rewards_requested_by ON rewards(requested_by);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_from_profile ON transactions(from_profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_profile ON transactions(to_profile_id);

-- ============================================
-- 第四部分：RLS 策略
-- ============================================

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view badges in their family" ON badges;
CREATE POLICY "Users can view badges in their family"
  ON badges FOR SELECT
  USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "System can insert badges" ON badges;
CREATE POLICY "System can insert badges"
  ON badges FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view their own reminders" ON task_reminders;
CREATE POLICY "Users can view their own reminders"
  ON task_reminders FOR SELECT
  USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own reminders" ON task_reminders;
CREATE POLICY "Users can manage their own reminders"
  ON task_reminders FOR ALL
  USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view transfer logs in their family" ON transfer_logs;
CREATE POLICY "Users can view transfer logs in their family"
  ON transfer_logs FOR SELECT
  USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create transfer logs" ON transfer_logs;
CREATE POLICY "Users can create transfer logs"
  ON transfer_logs FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view wishlist reviews in their family" ON wishlist_reviews;
CREATE POLICY "Users can view wishlist reviews in their family"
  ON wishlist_reviews FOR SELECT
  USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

-- ============================================
-- 第五部分：函数和触发器
-- ============================================

-- 函数1：难度系数函数
CREATE OR REPLACE FUNCTION get_difficulty_multiplier(difficulty TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE difficulty
    WHEN 'easy' THEN 1.0
    WHEN 'medium' THEN 1.5
    WHEN 'hard' THEN 2.0
    WHEN 'expert' THEN 3.0
    ELSE 1.0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 函数2：获取成员可获得但未获得的徽章
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

-- 函数3：批量授予符合条件的徽章
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

-- 函数4：获取家庭排行榜
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

-- 函数5：自动检查并授予徽章（触发器函数）
CREATE OR REPLACE FUNCTION check_and_grant_badges()
RETURNS TRIGGER AS $$
DECLARE
  profile_record RECORD;
  streak_count INTEGER;
  total_points INTEGER;
  task_count INTEGER;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = NEW.profile_id;
  
  IF NEW.type = 'earn' THEN
    SELECT COUNT(DISTINCT DATE(timestamp)) INTO streak_count
    FROM transactions
    WHERE profile_id = NEW.profile_id AND type = 'earn' AND timestamp >= NOW() - INTERVAL '7 days';
    
    IF streak_count >= 7 THEN
      INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
      VALUES (NEW.profile_id, NEW.family_id, 'streak', '七日坚持', '连续7天完成任务', '🔥', 'streak_7')
      ON CONFLICT (profile_id, condition) DO NOTHING;
    END IF;
  END IF;
  
  SELECT COALESCE(SUM(points), 0) INTO total_points
  FROM transactions WHERE profile_id = NEW.profile_id AND type = 'earn';
  
  IF total_points >= 100 THEN
    INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
    VALUES (NEW.profile_id, NEW.family_id, 'milestone', '百分成就', '累计获得100元气值', '💯', 'total_100')
    ON CONFLICT (profile_id, condition) DO NOTHING;
  END IF;
  
  IF total_points >= 500 THEN
    INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
    VALUES (NEW.profile_id, NEW.family_id, 'milestone', '元气大师', '累计获得500元气值', '⭐', 'total_500')
    ON CONFLICT (profile_id, condition) DO NOTHING;
  END IF;
  
  SELECT COUNT(*) INTO task_count FROM transactions WHERE profile_id = NEW.profile_id AND type = 'earn';
  
  IF task_count >= 50 THEN
    INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
    VALUES (NEW.profile_id, NEW.family_id, 'achievement', '勤奋之星', '完成50个任务', '🌟', 'tasks_50')
    ON CONFLICT (profile_id, condition) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_badges ON transactions;
CREATE TRIGGER trigger_check_badges
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_and_grant_badges();

-- 函数6：预测成员未来积分趋势
CREATE OR REPLACE FUNCTION predict_points_trend(
  p_profile_id UUID,
  p_days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
  date DATE,
  predicted_points NUMERIC,
  confidence TEXT
) AS $$
DECLARE
  v_avg_daily_earn NUMERIC;
  v_avg_daily_spend NUMERIC;
  v_trend_slope NUMERIC;
  v_current_balance INTEGER;
  v_days_count INTEGER;
  i INTEGER;
BEGIN
  SELECT balance INTO v_current_balance FROM profiles WHERE id = p_profile_id;
  
  WITH daily_stats AS (
    SELECT 
      DATE(timestamp) as day,
      SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as daily_earn,
      SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as daily_spend
    FROM transactions
    WHERE profile_id = p_profile_id
      AND timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(timestamp)
  )
  SELECT 
    COALESCE(AVG(daily_earn), 0),
    COALESCE(AVG(daily_spend), 0),
    COUNT(*)
  INTO v_avg_daily_earn, v_avg_daily_spend, v_days_count
  FROM daily_stats;
  
  WITH numbered_days AS (
    SELECT 
      DATE(timestamp) as day,
      SUM(points) as net_points,
      ROW_NUMBER() OVER (ORDER BY DATE(timestamp)) as day_num
    FROM transactions
    WHERE profile_id = p_profile_id
      AND timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(timestamp)
  ),
  regression AS (
    SELECT 
      COUNT(*) as n,
      SUM(day_num) as sum_x,
      SUM(net_points) as sum_y,
      SUM(day_num * net_points) as sum_xy,
      SUM(day_num * day_num) as sum_xx
    FROM numbered_days
  )
  SELECT 
    CASE 
      WHEN n > 1 AND (n * sum_xx - sum_x * sum_x) != 0 
      THEN (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x)
      ELSE 0
    END
  INTO v_trend_slope
  FROM regression;
  
  FOR i IN 1..p_days_ahead LOOP
    RETURN QUERY
    SELECT 
      (CURRENT_DATE + i)::DATE,
      (v_current_balance + (v_avg_daily_earn - v_avg_daily_spend) * i + v_trend_slope * i)::NUMERIC,
      CASE 
        WHEN v_days_count >= 20 THEN '高'
        WHEN v_days_count >= 10 THEN '中'
        ELSE '低'
      END::TEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 第六部分：预设徽章数据
-- ============================================

INSERT INTO badge_definitions (condition, type, title, description, icon, requirement_value, requirement_type) VALUES
  ('streak_3', 'streak', '三日坚持', '连续3天完成任务', '🔥', 3, 'days'),
  ('streak_7', 'streak', '七日坚持', '连续7天完成任务', '🔥', 7, 'days'),
  ('streak_14', 'streak', '两周坚持', '连续14天完成任务', '🔥', 14, 'days'),
  ('streak_30', 'streak', '月度坚持', '连续30天完成任务', '🔥', 30, 'days'),
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

-- 提交事务
COMMIT;

-- ============================================
-- 验证迁移
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
  function_count INTEGER;
  badge_def_count INTEGER;
BEGIN
  -- 检查表
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('badges', 'task_reminders', 'transfer_logs', 'wishlist_reviews', 'badge_definitions');
  
  -- 检查函数
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('check_and_grant_badges', 'get_difficulty_multiplier', 'get_available_badges', 'grant_eligible_badges', 'get_family_leaderboard', 'predict_points_trend');
  
  -- 检查徽章定义
  SELECT COUNT(*) INTO badge_def_count FROM badge_definitions;
  
  RAISE NOTICE '✅ 迁移完成！';
  RAISE NOTICE '📊 新增表数量: % / 5', table_count;
  RAISE NOTICE '🔧 新增函数数量: % / 6', function_count;
  RAISE NOTICE '🏅 徽章定义数量: %', badge_def_count;
  
  IF table_count = 5 AND function_count = 6 THEN
    RAISE NOTICE '🎉 所有功能已成功部署！';
  ELSE
    RAISE WARNING '⚠️ 部分功能可能未完全部署，请检查日志';
  END IF;
END $$;
