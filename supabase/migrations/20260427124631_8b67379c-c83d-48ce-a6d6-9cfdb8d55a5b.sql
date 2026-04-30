-- Lock down SECURITY DEFINER functions: only the database/triggers can call them.
REVOKE ALL ON FUNCTION public.dispatch_push(uuid[], text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_task_completed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_ai_suggestion_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_savings_goal_milestone() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_invitation_accepted() FROM PUBLIC, anon, authenticated;

-- Fix task-completion trigger: tasks has no completed_by column.
-- We notify the creator whenever the task moves to completed,
-- skipping if the creator is the same as auth.uid() (best-effort actor).
CREATE OR REPLACE FUNCTION public.notify_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_id uuid;
  actor_id uuid;
  completer_name text;
  task_title text;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    creator_id := NEW.created_by;
    actor_id := auth.uid();
    task_title := COALESCE(NEW.title, 'A task');

    IF creator_id IS NOT NULL AND creator_id IS DISTINCT FROM actor_id THEN
      IF actor_id IS NOT NULL THEN
        SELECT display_name INTO completer_name FROM public.profiles WHERE id = actor_id;
      END IF;
      PERFORM public.dispatch_push(
        ARRAY[creator_id],
        'tasks',
        '✅ Task completed',
        COALESCE(completer_name, 'Someone') || ' finished: ' || task_title,
        '/taskmaster',
        'task-completed-' || NEW.id::text,
        jsonb_build_object('type', 'task_completed', 'task_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_task_completed() FROM PUBLIC, anon, authenticated;

-- Add service-role-only RLS policy on push_dispatch_config (for clarity).
DROP POLICY IF EXISTS "Service role only" ON public.push_dispatch_config;
CREATE POLICY "Service role only"
  ON public.push_dispatch_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);