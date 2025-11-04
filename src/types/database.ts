export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed?: boolean;
  terms_accepted_at?: string;
  preferred_language?: string;
  region?: string;
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

export interface DietaryPreference {
  id: string;
  household_id: string;
  preferences: any;
  cuisine_preferences: string[];
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine_type: string | null;
  ingredients: any[];
  instructions: any[];
  nutritional_info: any;
  tags: string[];
  source: string;
  created_by: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealPlan {
  id: string;
  household_id: string;
  week_start_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MealPlanItem {
  id: string;
  meal_plan_id: string;
  recipe_id: string | null;
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  notes: string | null;
  created_at: string;
}

export interface PantryItem {
  id: string;
  household_id: string;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  location: string | null;
  added_by: string;
  created_at: string;
  updated_at: string;
}
