export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  household_id: string;
  role: 'household_admin' | 'member';
}

export interface TaskCategory {
  id: string;
  household_id: string;
  name: string;
  color: string;
  icon: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  assigned_to: string | null;
  created_by: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string | null;
  completed_at: string | null;
  recurring: boolean;
  recurring_pattern: any;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}
