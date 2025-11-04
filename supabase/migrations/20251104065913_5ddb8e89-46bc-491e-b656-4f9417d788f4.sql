-- Step 1: Create all tables first (no policies yet)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);

CREATE TYPE public.app_role AS ENUM ('household_admin', 'member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, household_id, role)
);

CREATE TABLE public.task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#808080',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Create functions
CREATE OR REPLACE FUNCTION public.has_household_role(_user_id UUID, _household_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND household_id = _household_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Step 3: Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Step 4: Create all RLS policies (now all tables exist)
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Members can view their households" ON public.households FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = households.id AND user_id = auth.uid())
);
CREATE POLICY "Users can create households" ON public.households FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Household admins can update households" ON public.households FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = households.id AND user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Members can view household members" ON public.household_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.household_members hm WHERE hm.household_id = household_members.household_id AND hm.user_id = auth.uid())
);
CREATE POLICY "Users can join households" ON public.household_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage members" ON public.household_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = household_members.household_id AND user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Members can view household categories" ON public.task_categories FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = task_categories.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can create categories" ON public.task_categories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = task_categories.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can update categories" ON public.task_categories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = task_categories.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can delete categories" ON public.task_categories FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = task_categories.household_id AND user_id = auth.uid())
);

CREATE POLICY "Members can view household tasks" ON public.tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = tasks.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can create tasks" ON public.tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = tasks.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can update tasks" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = tasks.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can delete tasks" ON public.tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = tasks.household_id AND user_id = auth.uid())
);

CREATE POLICY "Members can view task comments" ON public.task_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t JOIN public.household_members hm ON hm.household_id = t.household_id WHERE t.id = task_comments.task_id AND hm.user_id = auth.uid())
);
CREATE POLICY "Members can create comments" ON public.task_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tasks t JOIN public.household_members hm ON hm.household_id = t.household_id WHERE t.id = task_comments.task_id AND hm.user_id = auth.uid())
);
CREATE POLICY "Users can delete their comments" ON public.task_comments FOR DELETE USING (auth.uid() = user_id);

-- Step 5: Create triggers
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 6: Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;

-- Step 7: Create indexes
CREATE INDEX idx_tasks_household_id ON public.tasks(household_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_task_categories_household_id ON public.task_categories(household_id);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);