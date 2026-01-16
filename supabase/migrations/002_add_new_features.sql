-- 添加任务难度和提醒功能
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_time TEXT; -- HH:mm format

-- 添加奖励状态和愿望清单功能
ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;

-- 添加交易类型支持转赠
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check,
ADD CONSTRAINT transactions_type_check CHECK (type IN ('earn', 'penalty', 'redeem', 'transfer'));

-- 添加转赠相关字段
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
  condition TEXT NOT NULL, -- e.g., "streak_7", "total_100"
  earned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, condition) -- 防止重复获得同一徽章
);

-- 创建任务提醒表（用于跟踪提醒状态）
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

-- 创建积分转赠记录表（用于审计）
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

-- 创建索引以提高查询性能
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

-- 启用行级安全策略（RLS）
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_reviews ENABLE ROW LEVEL SECURITY;

-- 徽章表的 RLS 策略
CREATE POLICY "Users can view badges in their family"
  ON badges FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert badges"
  ON badges FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- 任务提醒表的 RLS 策略
CREATE POLICY "Users can view their own reminders"
  ON task_reminders FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own reminders"
  ON task_reminders FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- 转赠日志表的 RLS 策略
CREATE POLICY "Users can view transfer logs in their family"
  ON transfer_logs FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transfer logs"
  ON transfer_logs FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- 愿望清单审核日志的 RLS 策略
CREATE POLICY "Users can view wishlist reviews in their family"
  ON wishlist_reviews FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create wishlist reviews"
  ON wishlist_reviews FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm
      JOIN profiles p ON p.id = (
        SELECT id FROM profiles 
        WHERE family_id = fm.family_id 
        LIMIT 1
      )
      WHERE fm.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- 创建函数：自动检查并授予徽章
CREATE OR REPLACE FUNCTION check_and_grant_badges()
RETURNS TRIGGER AS $$
DECLARE
  profile_record RECORD;
  streak_count INTEGER;
  total_points INTEGER;
  task_count INTEGER;
BEGIN
  -- 获取成员信息
  SELECT * INTO profile_record FROM profiles WHERE id = NEW.profile_id;
  
  -- 检查连续完成任务徽章（7天连续）
  IF NEW.type = 'earn' THEN
    SELECT COUNT(DISTINCT DATE(timestamp)) INTO streak_count
    FROM transactions
    WHERE profile_id = NEW.profile_id
      AND type = 'earn'
      AND timestamp >= NOW() - INTERVAL '7 days';
    
    IF streak_count >= 7 THEN
      INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
      VALUES (
        NEW.profile_id,
        NEW.family_id,
        'streak',
        '七日坚持',
        '连续7天完成任务',
        '🔥',
        'streak_7'
      )
      ON CONFLICT (profile_id, condition) DO NOTHING;
    END IF;
  END IF;
  
  -- 检查总积分里程碑
  SELECT COALESCE(SUM(points), 0) INTO total_points
  FROM transactions
  WHERE profile_id = NEW.profile_id AND type = 'earn';
  
  IF total_points >= 100 THEN
    INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
    VALUES (
      NEW.profile_id,
      NEW.family_id,
      'milestone',
      '百分成就',
      '累计获得100元气值',
      '💯',
      'total_100'
    )
    ON CONFLICT (profile_id, condition) DO NOTHING;
  END IF;
  
  IF total_points >= 500 THEN
    INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
    VALUES (
      NEW.profile_id,
      NEW.family_id,
      'milestone',
      '元气大师',
      '累计获得500元气值',
      '⭐',
      'total_500'
    )
    ON CONFLICT (profile_id, condition) DO NOTHING;
  END IF;
  
  -- 检查任务完成数量
  SELECT COUNT(*) INTO task_count
  FROM transactions
  WHERE profile_id = NEW.profile_id AND type = 'earn';
  
  IF task_count >= 50 THEN
    INSERT INTO badges (profile_id, family_id, type, title, description, icon, condition)
    VALUES (
      NEW.profile_id,
      NEW.family_id,
      'achievement',
      '勤奋之星',
      '完成50个任务',
      '🌟',
      'tasks_50'
    )
    ON CONFLICT (profile_id, condition) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：交易后自动检查徽章
DROP TRIGGER IF EXISTS trigger_check_badges ON transactions;
CREATE TRIGGER trigger_check_badges
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_and_grant_badges();

-- 创建函数：计算任务难度系数
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

-- 创建视图：成员统计信息
CREATE OR REPLACE VIEW profile_stats AS
SELECT 
  p.id,
  p.name,
  p.family_id,
  p.balance,
  p.level,
  p.experience,
  COUNT(DISTINCT b.id) as badge_count,
  COUNT(DISTINCT CASE WHEN t.type = 'earn' THEN t.id END) as tasks_completed,
  COALESCE(SUM(CASE WHEN t.type = 'earn' THEN t.points ELSE 0 END), 0) as total_earned,
  COALESCE(SUM(CASE WHEN t.type = 'redeem' THEN ABS(t.points) ELSE 0 END), 0) as total_spent
FROM profiles p
LEFT JOIN badges b ON b.profile_id = p.id
LEFT JOIN transactions t ON t.profile_id = p.id
GROUP BY p.id, p.name, p.family_id, p.balance, p.level, p.experience;

-- 添加注释
COMMENT ON TABLE badges IS '成员徽章表，记录成员获得的各类成就徽章';
COMMENT ON TABLE task_reminders IS '任务提醒表，用于跟踪每日任务提醒状态';
COMMENT ON TABLE transfer_logs IS '积分转赠日志表，记录成员之间的积分转赠';
COMMENT ON TABLE wishlist_reviews IS '愿望清单审核日志，记录管理员对愿望的审核';

COMMENT ON COLUMN tasks.difficulty IS '任务难度：easy-简单, medium-中等, hard-困难, expert-专家';
COMMENT ON COLUMN tasks.reminder_enabled IS '是否启用任务提醒';
COMMENT ON COLUMN tasks.reminder_time IS '提醒时间，格式 HH:mm';

COMMENT ON COLUMN rewards.status IS '奖励状态：active-已上架, pending-待审核, rejected-已拒绝';
COMMENT ON COLUMN rewards.requested_by IS '愿望提交者的 profile_id';
COMMENT ON COLUMN rewards.requested_at IS '愿望提交时间';

COMMENT ON COLUMN transactions.from_profile_id IS '转赠来源成员ID（仅用于 transfer 类型）';
COMMENT ON COLUMN transactions.to_profile_id IS '转赠目标成员ID（仅用于 transfer 类型）';

COMMENT ON COLUMN profiles.level IS '成员等级';
COMMENT ON COLUMN profiles.experience IS '成员经验值';
