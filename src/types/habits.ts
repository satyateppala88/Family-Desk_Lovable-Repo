export type HabitAssignmentType = 'personal' | 'multiple' | 'household';
export type HabitFrequencyType = 'daily' | 'weekly' | 'specific_days';

export interface Habit {
  id: string;
  household_id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  frequency_type: HabitFrequencyType;
  frequency_days: number[];
  reminder_time: string | null;
  target_value: number | null;
  target_unit: string | null;
  is_active: boolean;
  assignment_type: HabitAssignmentType;
  created_at: string;
  updated_at: string;
}

export interface HabitAssignee {
  id: string;
  habit_id: string;
  user_id: string;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  completed: boolean;
  actual_value: number | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
  is_freeze?: boolean;
}

export interface HabitStreak {
  id: string;
  habit_id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  updated_at: string;
}

export interface HabitScore {
  id: string;
  household_id: string;
  user_id: string;
  score_date: string;
  daily_score: number;
  streak_bonus: number;
  total_score: number;
  created_at: string;
  updated_at: string;
}

export interface HouseholdHabitGoal {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  metric_type: 'total_completions' | 'total_value' | 'streak_days' | 'completion_rate';
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'archived';
  created_by: string;
  created_at: string;
}

export interface HabitCoachRecommendation {
  id: string;
  household_id: string;
  user_id: string | null;
  recommendation_type: 'personal' | 'household';
  content: string;
  context: Record<string, any> | null;
  dismissed: boolean;
  generated_at: string;
  created_at: string;
}

export interface HabitBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria_type: 'streak' | 'total_completions' | 'weekly_rate' | 'first_habit';
  criteria_value: number;
  created_at: string;
}

export interface UserHabitBadge {
  id: string;
  user_id: string;
  badge_id: string;
  habit_id: string | null;
  earned_at: string;
  created_at: string;
  badge?: HabitBadge;
}

export interface HabitWithStreak extends Habit {
  streak?: HabitStreak;
  todayLog?: HabitLog;
  assignees?: HabitAssignee[];
}

export interface HouseholdHabitStats {
  totalHabits: number;
  completedToday: number;
  plannedToday: number;
  completionRate: number;
  longestStreak: number;
  memberStats: MemberHabitStats[];
}

export interface MemberHabitStats {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  completedToday: number;
  plannedToday: number;
  currentStreak: number;
  weeklyRate: number;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  weeklyScore: number;
  monthlyScore: number;
  rank: number;
  previousRank: number | null;
  streakBonus: number;
}

export interface Challenge {
  id: string;
  household_id: string;
  template_id: string;
  name: string;
  emoji: string;
  description: string | null;
  duration_days: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'abandoned';
  started_by: string;
  created_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
}

export interface ChallengeLog {
  id: string;
  challenge_id: string;
  user_id: string;
  log_date: string;
  completed: boolean;
  created_at: string;
}

export interface ChallengeWithDetails extends Challenge {
  participants: ChallengeParticipant[];
  todayLogs: ChallengeLog[];
}
