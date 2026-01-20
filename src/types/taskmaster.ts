// Taskmaster Types

export type ProjectType = 'home' | 'work' | 'personal' | 'other';
export type ProjectStatus = 'planning' | 'in_progress' | 'blocked' | 'done';
export type TaskCategory = 'home' | 'work' | 'kid' | 'other';
export type TaskStatus = 'backlog' | 'today' | 'in_progress' | 'blocked' | 'done';

export interface Project {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  type: ProjectType;
  status: ProjectStatus;
  target_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskmasterTask {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  task_category: TaskCategory;
  task_status: TaskStatus;
  priority_level: number; // 1-4, 1 is highest
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  project?: Project | null;
  assignees?: TaskAssignee[];
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  created_at: string;
  // Joined profile data
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface DailyPlan {
  id: string;
  user_id: string;
  household_id: string;
  date: string;
  accepted: boolean;
  generated_at: string;
  accepted_at: string | null;
}

export interface DailyPlanItem {
  id: string;
  daily_plan_id: string;
  task_id: string;
  score: number;
  position: number;
  created_at: string;
  // Joined task data
  task?: TaskmasterTask;
}

export interface DailyPlanWithItems extends DailyPlan {
  items: DailyPlanItem[];
}

// Dashboard metrics
export interface TaskmasterMetrics {
  totalTasks: number;
  openTasks: number;
  doneTasks: number;
  doneThisWeek: number;
  avgAgeOpenDays: number;
  tasksByPriority: Record<number, number>;
  tasksByCategory: Record<TaskCategory, number>;
  oldestOpenTasks: TaskmasterTask[];
  stuckTasks: TaskmasterTask[];
}
