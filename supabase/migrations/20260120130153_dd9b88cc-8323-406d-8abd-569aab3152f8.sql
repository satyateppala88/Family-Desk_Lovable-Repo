-- Create enums for Taskmaster
CREATE TYPE project_type AS ENUM ('home', 'work', 'personal', 'other');
CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'blocked', 'done');
CREATE TYPE task_category AS ENUM ('home', 'work', 'kid', 'other');
CREATE TYPE task_status AS ENUM ('backlog', 'today', 'in_progress', 'blocked', 'done');

-- Create Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type project_type NOT NULL DEFAULT 'other',
  status project_status NOT NULL DEFAULT 'planning',
  target_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Members can view household projects"
  ON public.projects FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = projects.household_id
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can create household projects"
  ON public.projects FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = projects.household_id
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can update household projects"
  ON public.projects FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = projects.household_id
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete household projects"
  ON public.projects FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = projects.household_id
    AND household_members.user_id = auth.uid()
  ));

-- Create trigger for updated_at on projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Modify existing tasks table - add new columns
ALTER TABLE public.tasks 
  ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN task_category task_category DEFAULT 'other',
  ADD COLUMN task_status task_status DEFAULT 'backlog',
  ADD COLUMN started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN priority_level INTEGER DEFAULT 3 CHECK (priority_level >= 1 AND priority_level <= 4);

-- Create TaskAssignees table (many-to-many)
CREATE TABLE public.task_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Enable RLS on task_assignees
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_assignees
CREATE POLICY "Members can view task assignees"
  ON public.task_assignees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t
    JOIN household_members hm ON hm.household_id = t.household_id
    WHERE t.id = task_assignees.task_id
    AND hm.user_id = auth.uid()
  ));

CREATE POLICY "Members can manage task assignees"
  ON public.task_assignees FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t
    JOIN household_members hm ON hm.household_id = t.household_id
    WHERE t.id = task_assignees.task_id
    AND hm.user_id = auth.uid()
  ));

CREATE POLICY "Members can update task assignees"
  ON public.task_assignees FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tasks t
    JOIN household_members hm ON hm.household_id = t.household_id
    WHERE t.id = task_assignees.task_id
    AND hm.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete task assignees"
  ON public.task_assignees FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks t
    JOIN household_members hm ON hm.household_id = t.household_id
    WHERE t.id = task_assignees.task_id
    AND hm.user_id = auth.uid()
  ));

-- Create DailyPlan table
CREATE TABLE public.daily_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, household_id, date)
);

-- Enable RLS on daily_plans
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_plans
CREATE POLICY "Users can view their own daily plans"
  ON public.daily_plans FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own daily plans"
  ON public.daily_plans FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own daily plans"
  ON public.daily_plans FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own daily plans"
  ON public.daily_plans FOR DELETE
  USING (user_id = auth.uid());

-- Create DailyPlanItems table
CREATE TABLE public.daily_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_plan_id UUID NOT NULL REFERENCES public.daily_plans(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on daily_plan_items
ALTER TABLE public.daily_plan_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_plan_items
CREATE POLICY "Users can view their daily plan items"
  ON public.daily_plan_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM daily_plans dp
    WHERE dp.id = daily_plan_items.daily_plan_id
    AND dp.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their daily plan items"
  ON public.daily_plan_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM daily_plans dp
    WHERE dp.id = daily_plan_items.daily_plan_id
    AND dp.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their daily plan items"
  ON public.daily_plan_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM daily_plans dp
    WHERE dp.id = daily_plan_items.daily_plan_id
    AND dp.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their daily plan items"
  ON public.daily_plan_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM daily_plans dp
    WHERE dp.id = daily_plan_items.daily_plan_id
    AND dp.user_id = auth.uid()
  ));