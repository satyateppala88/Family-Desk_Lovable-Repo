-- Phase 4: expand notification_preferences with new channels
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS finance boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS calendar boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_suggestions boolean NOT NULL DEFAULT true;

-- =========================================================================
-- Phase 2: event-driven push dispatcher
--
-- Strategy: a single helper that asynchronously calls the send-push edge
-- function via pg_net. AFTER triggers on domain tables call this helper.
-- The helper is SECURITY DEFINER so triggers fire under any role.
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Settings table to hold the project base URL + service key for pg_net calls.
-- We can't use Supabase secrets directly from SQL; admin sets these once.
CREATE TABLE IF NOT EXISTS public.push_dispatch_config (
  id boolean PRIMARY KEY DEFAULT true,
  base_url text NOT NULL,
  service_role_key text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_dispatch_config_singleton CHECK (id)
);

ALTER TABLE public.push_dispatch_config ENABLE ROW LEVEL SECURITY;

-- No public RLS policies: only service role / SECURITY DEFINER funcs read it.

-- Dispatcher function: fire-and-forget HTTP POST to send-push.
CREATE OR REPLACE FUNCTION public.dispatch_push(
  _user_ids uuid[],
  _channel text,
  _title text,
  _body text,
  _url text DEFAULT '/',
  _tag text DEFAULT NULL,
  _data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
  payload jsonb;
BEGIN
  IF _user_ids IS NULL OR array_length(_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  SELECT base_url, service_role_key INTO cfg FROM public.push_dispatch_config WHERE id = true LIMIT 1;
  IF cfg IS NULL THEN
    RETURN;
  END IF;

  payload := jsonb_build_object(
    'user_ids', to_jsonb(_user_ids),
    'channel', _channel,
    'title', _title,
    'body', _body,
    'url', _url,
    'tag', _tag,
    'data', _data
  );

  PERFORM net.http_post(
    url := cfg.base_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cfg.service_role_key,
      'apikey', cfg.service_role_key
    ),
    body := payload,
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN OTHERS THEN
  -- Never let a push failure abort the originating transaction.
  RAISE NOTICE 'dispatch_push failed: %', SQLERRM;
END;
$$;

-- =========================================================================
-- Trigger 1: task completion -> notify creator (if different from completer)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.notify_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_id uuid;
  completer_name text;
  task_title text;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- task table varies; assume created_by + title columns
    creator_id := NEW.created_by;
    task_title := COALESCE(NEW.title, 'A task');

    IF creator_id IS NOT NULL AND creator_id <> COALESCE(NEW.completed_by, auth.uid()) THEN
      SELECT display_name INTO completer_name FROM public.profiles WHERE id = COALESCE(NEW.completed_by, auth.uid());
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

-- Only attach if tasks table has expected columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tasks' AND column_name='status'
  ) THEN
    DROP TRIGGER IF EXISTS trg_notify_task_completed ON public.tasks;
    CREATE TRIGGER trg_notify_task_completed
      AFTER UPDATE ON public.tasks
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_task_completed();
  END IF;
END $$;

-- =========================================================================
-- Trigger 2: AI suggestion created -> notify all household members
-- =========================================================================
CREATE OR REPLACE FUNCTION public.notify_ai_suggestion_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_ids uuid[];
  preview text;
BEGIN
  SELECT array_agg(user_id) INTO member_ids
  FROM public.household_members
  WHERE household_id = NEW.household_id;

  preview := substring(NEW.content from 1 for 120);

  PERFORM public.dispatch_push(
    member_ids,
    'ai_suggestions',
    '💡 New AI suggestion',
    preview,
    '/',
    'ai-suggestion-' || NEW.id::text,
    jsonb_build_object('type', 'ai_suggestion', 'id', NEW.id, 'suggestion_type', NEW.suggestion_type)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ai_suggestion ON public.ai_suggestions;
CREATE TRIGGER trg_notify_ai_suggestion
  AFTER INSERT ON public.ai_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ai_suggestion_created();

-- =========================================================================
-- Trigger 3: savings goal milestone (25/50/75/100%)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.notify_savings_goal_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_ids uuid[];
  old_pct int;
  new_pct int;
  milestone int;
BEGIN
  IF NEW.target_amount IS NULL OR NEW.target_amount = 0 THEN RETURN NEW; END IF;
  old_pct := floor((COALESCE(OLD.current_amount, 0) / NEW.target_amount) * 100);
  new_pct := floor((COALESCE(NEW.current_amount, 0) / NEW.target_amount) * 100);

  -- Find the highest milestone newly crossed
  milestone := NULL;
  IF old_pct < 100 AND new_pct >= 100 THEN milestone := 100;
  ELSIF old_pct < 75 AND new_pct >= 75 THEN milestone := 75;
  ELSIF old_pct < 50 AND new_pct >= 50 THEN milestone := 50;
  ELSIF old_pct < 25 AND new_pct >= 25 THEN milestone := 25;
  END IF;

  IF milestone IS NULL THEN RETURN NEW; END IF;

  SELECT array_agg(user_id) INTO member_ids
  FROM public.household_members
  WHERE household_id = NEW.household_id;

  PERFORM public.dispatch_push(
    member_ids,
    'finance',
    CASE WHEN milestone = 100 THEN '🎉 Goal reached!' ELSE '🎯 ' || milestone || '% to goal' END,
    NEW.name || ': ' || milestone || '% of target reached.',
    '/finance',
    'savings-' || NEW.id::text || '-' || milestone::text,
    jsonb_build_object('type', 'savings_milestone', 'goal_id', NEW.id, 'milestone', milestone)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_savings_milestone ON public.finance_savings_goals;
CREATE TRIGGER trg_notify_savings_milestone
  AFTER UPDATE OF current_amount ON public.finance_savings_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_savings_goal_milestone();

-- =========================================================================
-- Trigger 4: household invitation accepted -> notify inviter
-- =========================================================================
CREATE OR REPLACE FUNCTION public.notify_invitation_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitee_name text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.invited_by IS NOT NULL THEN
    SELECT display_name INTO invitee_name FROM public.profiles WHERE id = NEW.invitee_user_id;
    PERFORM public.dispatch_push(
      ARRAY[NEW.invited_by],
      'invites',
      '👋 Invitation accepted',
      COALESCE(invitee_name, COALESCE(NEW.invitee_name, NEW.invitee_email)) || ' joined your household.',
      '/settings/household',
      'invite-accepted-' || NEW.id::text,
      jsonb_build_object('type', 'invitation_accepted', 'invitation_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_invitation_accepted ON public.household_invitations;
CREATE TRIGGER trg_notify_invitation_accepted
  AFTER UPDATE ON public.household_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invitation_accepted();