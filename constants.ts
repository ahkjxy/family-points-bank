
import { Task, Reward, Profile } from './types';

export const SYNC_API_PREFIX = '/api/state/';
// 不再写死默认家庭 ID，访问时以 URL 参数为准
export const FIXED_SYNC_ID = '';

export const AUTH_REDIRECT = import.meta.env.VITE_AUTH_REDIRECT || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

export const INITIAL_PROFILES: Profile[] = [
  { id: 'p-dad', name: '王僚原', balance: 0, history: [], avatarColor: 'bg-blue-600', role: 'admin' },
  { id: 'p-sister1', name: '王可心', balance: 0, history: [], avatarColor: 'bg-pink-500', role: 'child' },
  { id: 'p-sister2', name: '王语汐', balance: 0, history: [], avatarColor: 'bg-purple-500', role: 'child' }
];

export const INITIAL_TASKS: Task[] = [
  // 学习好习惯 (精确匹配图片)
  { id: 'l1', category: 'learning', title: '完成作业', description: '每天9点前完成作业', points: 1, frequency: '每日' },
  { id: 'l2', category: 'learning', title: '完成课外练习', description: '主动完成课外练习', points: 1, frequency: '每日' },
  { id: 'l3', category: 'learning', title: '每日口算', description: '每日口算（>5题）', points: 1, frequency: '每日' },
  { id: 'l4', category: 'learning', title: '课外阅读', description: '阅读课外书≥15分钟', points: 1, frequency: '每日' },
  { id: 'l5', category: 'learning', title: '作业整洁', description: '作业整洁获“优”表扬', points: 2, frequency: '每次' },
  { id: 'l6', category: 'learning', title: '晨读', description: '英文、语文晨读', points: 2, frequency: '每日' },
  { id: 'l7', category: 'learning', title: '默写全对', description: '课堂默写/听写全对', points: 2, frequency: '每次' },
  { id: 'l8', category: 'learning', title: '自主默写', description: '自主默写语/英词汇', points: 2, frequency: '每次' },
  { id: 'l9', category: 'learning', title: '主动预习', description: '主动预习次日课程', points: 2, frequency: '每日' },
  { id: 'l10', category: 'learning', title: '主动复习', description: '主动复习当天课程', points: 2, frequency: '每日' },
  { id: 'l11', category: 'learning', title: '小作文/日记', description: '完成小作文/日记100字+', points: 3, frequency: '每周' },
  { id: 'l12', category: 'learning', title: '认真参加兴趣班', description: '认真参加各类兴趣课程', points: 3, frequency: '每次' },
  { id: 'l13', category: 'learning', title: '完成大作文', description: '完成大作文300字+', points: 5, frequency: '每周' },
  { id: 'l14', category: 'learning', title: '周计划', description: '制定并完成周计划', points: 5, frequency: '每周' },
  { id: 'l15', category: 'learning', title: '掌握错题', description: '主动默写错题并掌握', points: 5, frequency: '每次' },
  { id: 'l16', category: 'learning', title: '考试优异', description: '单科考试成绩达到95分以上', points: 20, frequency: '每次' },
  { id: 'l17', category: 'learning', title: '长期计划', description: '制定实施长期学习计划', points: 20, frequency: '每次' },

  // 家务小能手 (精确匹配图片)
  { id: 'c1', category: 'chores', title: '扫地或擦桌子', description: '扫地或擦桌子', points: 1, frequency: '每日' },
  { id: 'c2', category: 'chores', title: '收拾书桌', description: '收拾书桌保持整洁', points: 1, frequency: '每日' },
  { id: 'c3', category: 'chores', title: '摆收碗筷', description: '饭前摆/饭后收碗筷', points: 1, frequency: '每日' },
  { id: 'c4', category: 'chores', title: '洗碗', description: '洗碗（自己或协助）', points: 1, frequency: '每日' },
  { id: 'c5', category: 'chores', title: '清洗食材', description: '清洗水果/简单食材', points: 1, frequency: '每日' },
  { id: 'c6', category: 'chores', title: '扔垃圾', description: '扔垃圾', points: 1, frequency: '每日' },
  { id: 'c7', category: 'chores', title: '整理公共区', description: '主动整理公共区域玩具书籍', points: 2, frequency: '每日' },
  { id: 'c8', category: 'chores', title: '拖地', description: '拖地', points: 2, frequency: '每日' },
  { id: 'c9', category: 'chores', title: '叠衣服', description: '叠放全家衣物并分类', points: 2, frequency: '每日' },
  { id: 'c10', category: 'chores', title: '整理冰箱', description: '整理冰箱清理过期食品', points: 2, frequency: '每周' },

  // 违规处罚
  { id: 'p1', category: 'penalty', title: '发脾气', description: '顶嘴、不礼貌、情绪化', points: -3, frequency: '每次' },
  { id: 'p2', category: 'penalty', title: '超时使用电子产品', description: '未经允许或超时使用', points: -5, frequency: '每次' },
];

export const INITIAL_REWARDS: Reward[] = [
  { id: 'r1', title: '泡泡糖/橡皮/铅笔', points: 5, type: '实物奖品' },
  { id: 'r2', title: '免家务券', points: 10, type: '特权奖励' },
  { id: 'r3', title: '电视/平板 20分钟', points: 20, type: '特权奖励' },
  { id: 'r4', title: '周末游乐园', points: 100, type: '特权奖励' },
];
