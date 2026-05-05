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
  rating: number | null;
  rating_count: number;
  hidden: boolean;
  youtube_url: string | null;
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
  scheduled_date: string | null;
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

export interface HouseholdPreferences {
  id: string;
  household_id: string;
  family_size_adults: number;
  family_size_children: number;
  household_type: 'joint' | 'nuclear' | 'single' | null;
  diet_type: 'vegetarian' | 'non_vegetarian' | 'eggetarian' | 'vegan' | 'jain' | null;
  food_allergies: string[] | null;
  religious_restrictions: 'hindu' | 'muslim' | 'jain' | 'none' | null;
  spice_level: 'mild' | 'medium' | 'spicy' | 'very_spicy' | null;
  regional_cuisines: string[] | null;
  cooking_skill_level: 'beginner' | 'intermediate' | 'expert' | null;
  weekday_cooking_time: 'less_than_30' | '30_to_60' | 'more_than_60' | null;
  preferred_meal_types: string[] | null;
  pantry_size: 'small' | 'medium' | 'large' | null;
  shopping_frequency: 'daily' | '2_3_per_week' | 'weekly' | 'bi_weekly' | null;
  household_concerns: string[] | null;
  work_schedule: 'both_working' | 'one_working' | 'retired' | 'students' | null;
  preferred_task_time: 'morning' | 'afternoon' | 'evening' | 'flexible' | null;
  festival_importance: 'very_important' | 'somewhat' | 'not_important' | null;
  monthly_grocery_budget: 'under_5000' | '5000_to_10000' | '10000_to_20000' | 'above_20000' | null;
  shopping_locations: string[] | null;
  organic_preference: 'always' | 'sometimes' | 'rarely' | 'never' | null;
  budget_consciousness: 'very_conscious' | 'somewhat' | 'not_much' | null;
  week_start_day: 'sunday' | 'monday' | null;
  completed_module_setups?: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
}

export interface UserOnboardingProgress {
  id: string;
  user_id: string;
  current_step: number;
  completed_steps: string[];
  preferences_completed: boolean;
  started_at: string;
  completed_at: string | null;
}
