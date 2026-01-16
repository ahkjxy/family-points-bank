-- 创建函数：计算成员的积分趋势和预测
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
  -- 获取当前余额
  SELECT balance INTO v_current_balance FROM profiles WHERE id = p_profile_id;
  
  -- 计算过去30天的日均收入和支出
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
  
  -- 计算趋势斜率（简单线性回归）
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
  
  -- 生成预测数据
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

-- 创建函数：获取成员的详细统计分析
CREATE OR REPLACE FUNCTION get_profile_analytics(p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_family_id UUID;
BEGIN
  SELECT family_id INTO v_family_id FROM profiles WHERE id = p_profile_id;
  
  WITH stats AS (
    SELECT 
      -- 基础统计
      COUNT(*) as total_transactions,
      COUNT(CASE WHEN type = 'earn' THEN 1 END) as earn_count,
      COUNT(CASE WHEN type = 'redeem' THEN 1 END) as redeem_count,
      COUNT(CASE WHEN type = 'penalty' THEN 1 END) as penalty_count,
      COUNT(CASE WHEN type = 'transfer' THEN 1 END) as transfer_count,
      
      -- 积分统计
      COALESCE(SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END), 0) as total_earned,
      COALESCE(SUM(CASE WHEN type = 'redeem' THEN ABS(points) ELSE 0 END), 0) as total_spent,
      COALESCE(SUM(CASE WHEN type = 'penalty' THEN points ELSE 0 END), 0) as total_penalty,
      
      -- 平均值
      COALESCE(AVG(CASE WHEN type = 'earn' THEN points END), 0) as avg_earn,
      COALESCE(AVG(CASE WHEN type = 'redeem' THEN ABS(points) END), 0) as avg_spend,
      
      -- 最近7天
      COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' AND type = 'earn' THEN 1 END) as earn_7d,
      COALESCE(SUM(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' AND type = 'earn' THEN points ELSE 0 END), 0) as points_7d,
      
      -- 最近30天
      COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' AND type = 'earn' THEN 1 END) as earn_30d,
      COALESCE(SUM(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' AND type = 'earn' THEN points ELSE 0 END), 0) as points_30d,
      
      -- 最高单日
      MAX(daily_points) as max_daily_points
    FROM transactions t
    LEFT JOIN (
      SELECT 
        profile_id,
        DATE(timestamp) as day,
        SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END) as daily_points
      FROM transactions
      WHERE profile_id = p_profile_id
      GROUP BY profile_id, DATE(timestamp)
    ) daily ON daily.profile_id = t.profile_id
    WHERE t.profile_id = p_profile_id
  ),
  badges_info AS (
    SELECT 
      COUNT(*) as badge_count,
      json_agg(json_build_object(
        'type', type,
        'title', title,
        'icon', icon,
        'earnedAt', earned_at
      ) ORDER BY earned_at DESC) as badges
    FROM badges
    WHERE profile_id = p_profile_id
  ),
  streak_info AS (
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
    SELECT 
      COUNT(*) as current_streak,
      MIN(task_date) as streak_start
    FROM streak
    WHERE grp = (SELECT grp FROM streak ORDER BY task_date DESC LIMIT 1)
  ),
  category_stats AS (
    SELECT 
      json_object_agg(
        category,
        json_build_object(
          'count', count,
          'points', points
        )
      ) as by_category
    FROM (
      SELECT 
        COALESCE(
          CASE 
            WHEN title LIKE '%学习%' OR title LIKE '%作业%' OR title LIKE '%阅读%' THEN 'learning'
            WHEN title LIKE '%家务%' OR title LIKE '%扫地%' OR title LIKE '%洗碗%' THEN 'chores'
            WHEN title LIKE '%自律%' OR title LIKE '%运动%' THEN 'discipline'
            ELSE 'other'
          END,
          'other'
        ) as category,
        COUNT(*) as count,
        SUM(points) as points
      FROM transactions
      WHERE profile_id = p_profile_id AND type = 'earn'
      GROUP BY category
    ) cat
  )
  SELECT json_build_object(
    'profileId', p_profile_id,
    'familyId', v_family_id,
    'transactions', json_build_object(
      'total', total_transactions,
      'earn', earn_count,
      'redeem', redeem_count,
      'penalty', penalty_count,
      'transfer', transfer_count
    ),
    'points', json_build_object(
      'totalEarned', total_earned,
      'totalSpent', total_spent,
      'totalPenalty', total_penalty,
      'avgEarn', ROUND(avg_earn, 2),
      'avgSpend', ROUND(avg_spend, 2),
      'maxDaily', max_daily_points
    ),
    'recent', json_build_object(
      'last7Days', json_build_object('count', earn_7d, 'points', points_7d),
      'last30Days', json_build_object('count', earn_30d, 'points', points_30d)
    ),
    'streak', json_build_object(
      'current', COALESCE((SELECT current_streak FROM streak_info), 0),
      'startDate', (SELECT streak_start FROM streak_info)
    ),
    'badges', json_build_object(
      'count', COALESCE((SELECT badge_count FROM badges_info), 0),
      'list', COALESCE((SELECT badges FROM badges_info), '[]'::json)
    ),
    'byCategory', COALESCE((SELECT by_category FROM category_stats), '{}'::json)
  ) INTO v_result
  FROM stats;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：获取家庭整体趋势分析
CREATE OR REPLACE FUNCTION get_family_trends(p_family_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH daily_summary AS (
    SELECT 
      DATE(timestamp) as day,
      COUNT(CASE WHEN type = 'earn' THEN 1 END) as tasks_completed,
      SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END) as points_earned,
      SUM(CASE WHEN type = 'redeem' THEN ABS(points) ELSE 0 END) as points_spent,
      COUNT(CASE WHEN type = 'penalty' THEN 1 END) as penalties,
      COUNT(DISTINCT profile_id) as active_members
    FROM transactions
    WHERE family_id = p_family_id
      AND timestamp >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(timestamp)
    ORDER BY day
  ),
  aggregated AS (
    SELECT 
      json_agg(json_build_object(
        'date', day,
        'tasksCompleted', tasks_completed,
        'pointsEarned', points_earned,
        'pointsSpent', points_spent,
        'penalties', penalties,
        'activeMembers', active_members
      ) ORDER BY day) as daily_data,
      AVG(tasks_completed) as avg_daily_tasks,
      AVG(points_earned) as avg_daily_points,
      SUM(tasks_completed) as total_tasks,
      SUM(points_earned) as total_points
    FROM daily_summary
  )
  SELECT json_build_object(
    'period', p_days,
    'dailyData', daily_data,
    'summary', json_build_object(
      'avgDailyTasks', ROUND(avg_daily_tasks, 2),
      'avgDailyPoints', ROUND(avg_daily_points, 2),
      'totalTasks', total_tasks,
      'totalPoints', total_points
    )
  ) INTO v_result
  FROM aggregated;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 创建视图：任务完成率统计
CREATE OR REPLACE VIEW task_completion_stats AS
WITH task_attempts AS (
  SELECT 
    t.id as task_id,
    t.title,
    t.category,
    t.difficulty,
    t.family_id,
    COUNT(tr.id) as completion_count,
    COUNT(DISTINCT tr.profile_id) as unique_completers,
    AVG(tr.points) as avg_points,
    MAX(tr.timestamp) as last_completed
  FROM tasks t
  LEFT JOIN transactions tr ON tr.title = t.title AND tr.family_id = t.family_id AND tr.type = 'earn'
  GROUP BY t.id, t.title, t.category, t.difficulty, t.family_id
)
SELECT 
  task_id,
  title,
  category,
  difficulty,
  family_id,
  completion_count,
  unique_completers,
  ROUND(avg_points, 2) as avg_points,
  last_completed,
  CASE 
    WHEN completion_count >= 50 THEN 'popular'
    WHEN completion_count >= 20 THEN 'common'
    WHEN completion_count >= 5 THEN 'occasional'
    ELSE 'rare'
  END as popularity
FROM task_attempts;

-- 添加注释
COMMENT ON FUNCTION predict_points_trend IS '预测成员未来N天的积分趋势';
COMMENT ON FUNCTION get_profile_analytics IS '获取成员的详细统计分析数据';
COMMENT ON FUNCTION get_family_trends IS '获取家庭整体趋势分析';
COMMENT ON VIEW task_completion_stats IS '任务完成率统计视图';
