
export type Category = 'learning' | 'chores' | 'discipline' | 'penalty' | 'reward';
export type UserRole = 'admin' | 'child';

export interface Task {
  id: string;
  category: Category;
  title: string;
  description: string;
  points: number;
  frequency: string;
}

export interface Reward {
  id: string;
  title: string;
  points: number;
  type: '实物奖品' | '特权奖励';
  imageUrl?: string;
}

export interface Transaction {
  id: string;
  title: string;
  points: number;
  timestamp: number;
  type: 'earn' | 'penalty' | 'redeem';
}

export interface Profile {
  id: string;
  name: string;
  balance: number;
  history: Transaction[];
  avatarColor: string;
  avatarUrl?: string | null;
  role: UserRole;
}

export interface FamilyState {
  currentProfileId: string;
  profiles: Profile[];
  tasks: Task[];
  rewards: Reward[];
  syncId?: string;
  lastSyncedAt?: number;
}
