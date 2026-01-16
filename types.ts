
export type Category = 'learning' | 'chores' | 'discipline' | 'penalty' | 'reward';
export type UserRole = 'admin' | 'child';
export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type BadgeType = 'streak' | 'milestone' | 'achievement' | 'special';

export interface Task {
  id: string;
  category: Category;
  title: string;
  description: string;
  points: number;
  frequency: string;
  difficulty?: TaskDifficulty;
  reminderEnabled?: boolean;
  reminderTime?: string; // HH:mm format
}

export interface Reward {
  id: string;
  title: string;
  points: number;
  type: '实物奖品' | '特权奖励';
  imageUrl?: string;
  status?: 'active' | 'pending' | 'rejected';
  requestedBy?: string; // profile id
  requestedAt?: number;
}

export interface Transaction {
  id: string;
  title: string;
  points: number;
  timestamp: number;
  type: 'earn' | 'penalty' | 'redeem' | 'transfer';
  fromProfileId?: string; // for transfers
  toProfileId?: string; // for transfers
}

export interface Badge {
  id: string;
  type: BadgeType;
  title: string;
  description: string;
  icon: string;
  earnedAt: number;
  condition: string; // e.g., "streak_7", "total_100"
}

export interface Profile {
  id: string;
  name: string;
  balance: number;
  history: Transaction[];
  avatarColor: string;
  avatarUrl?: string | null;
  role: UserRole;
  badges?: Badge[];
  level?: number;
  experience?: number;
}

export interface FamilyState {
  currentProfileId: string;
  profiles: Profile[];
  tasks: Task[];
  rewards: Reward[];
  syncId?: string;
  lastSyncedAt?: number;
}
