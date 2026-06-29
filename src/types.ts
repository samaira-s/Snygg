export interface IntelPacket {
  searchQuery: string;
  approach: string;
  microTip: string;
}

export interface Task {
  id: string;
  name: string;
  deadline: string; // YYYY-MM-DD
  hoursNeeded: number;
  hoursLeft: number;
  progress: number; // 0-100
  riskScore: number; // 0-100
  riskLevel: 'red' | 'amber' | 'green';
  scheduledTime?: string; // e.g., "09:00"
  durationMinutes: number;
  isHard: boolean;
  completed: boolean;
  isCalendarSynced?: boolean;
  intel?: IntelPacket;
  draftEmail?: {
    to: string;
    subject: string;
    body: string;
    approved: boolean;
    sent: boolean;
  };
}

export interface MoodEntry {
  id: string;
  timestamp: string; // ISO string
  text: string;
  detectedMood: 'stressed' | 'tired' | 'motivated' | 'anxious';
  response: string;
  recommendation?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string; // lucide icon identifier
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  goal: number;
  xpReward: number;
  completed: boolean;
}

export interface FriendRank {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  isMe?: boolean;
}

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  tasksCompleted: number;
  focusScore: number; // 0-100 focus efficiency rating
  lastActiveDate?: string; // YYYY-MM-DD for streak counting
}

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
