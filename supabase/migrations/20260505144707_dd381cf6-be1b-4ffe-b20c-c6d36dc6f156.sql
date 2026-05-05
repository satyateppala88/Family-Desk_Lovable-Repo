DO $$
DECLARE
  src uuid := 'f75725b0-6886-4add-b2f4-656b106fddfa'; -- Teppalas (drop)
  tgt uuid := '854163c0-09ae-4cb8-a05c-573ab6372e54'; -- Teppala House (keep)
BEGIN
  -- For uniquely-keyed tables, drop source rows so target's richer data wins.
  DELETE FROM public.household_preferences      WHERE household_id = src;
  DELETE FROM public.dietary_preferences        WHERE household_id = src;
  DELETE FROM public.calendar_settings          WHERE household_id = src;
  DELETE FROM public.household_enabled_products WHERE household_id = src;

  -- Add Rajashree as admin of surviving household (skip if already a member).
  INSERT INTO public.household_members (household_id, user_id, role)
  SELECT tgt, hm.user_id, 'admin'
  FROM public.household_members hm
  WHERE hm.household_id = src
  ON CONFLICT (household_id, user_id) DO NOTHING;

  -- Mirror role rows in user_roles, if any.
  INSERT INTO public.user_roles (user_id, household_id, role)
  SELECT ur.user_id, tgt, ur.role
  FROM public.user_roles ur
  WHERE ur.household_id = src
  ON CONFLICT DO NOTHING;
  DELETE FROM public.user_roles WHERE household_id = src;

  -- Drop source household_members so the household can be deleted cleanly.
  DELETE FROM public.household_members WHERE household_id = src;

  -- Re-point all remaining tables.
  UPDATE public.ai_conversations            SET household_id = tgt WHERE household_id = src;
  UPDATE public.ai_suggestions              SET household_id = tgt WHERE household_id = src;
  UPDATE public.calendar_connections        SET household_id = tgt WHERE household_id = src;
  UPDATE public.daily_plans                 SET household_id = tgt WHERE household_id = src;
  UPDATE public.finance_accounts            SET household_id = tgt WHERE household_id = src;
  UPDATE public.finance_budgets             SET household_id = tgt WHERE household_id = src;
  UPDATE public.finance_chat_sessions       SET household_id = tgt WHERE household_id = src;
  UPDATE public.finance_custom_cards        SET household_id = tgt WHERE household_id = src;
  UPDATE public.finance_custom_categories   SET household_id = tgt WHERE household_id = src;
  UPDATE public.finance_monthly_snapshots   SET household_id = tgt WHERE household_id = src;
  UPDATE public.finance_savings_goals       SET household_id = tgt WHERE household_id = src;
  UPDATE public.finance_subscriptions       SET household_id = tgt WHERE household_id = src;
  UPDATE public.finance_transactions        SET household_id = tgt WHERE household_id = src;
  UPDATE public.finance_user_cards          SET household_id = tgt WHERE household_id = src;
  UPDATE public.habit_coach_recommendations SET household_id = tgt WHERE household_id = src;
  UPDATE public.habit_scores                SET household_id = tgt WHERE household_id = src;
  UPDATE public.habits                      SET household_id = tgt WHERE household_id = src;
  UPDATE public.household_family_members    SET household_id = tgt WHERE household_id = src;
  UPDATE public.household_habit_goals       SET household_id = tgt WHERE household_id = src;
  UPDATE public.household_invitations       SET household_id = tgt WHERE household_id = src;
  UPDATE public.meal_plans                  SET household_id = tgt WHERE household_id = src;
  UPDATE public.pantry_categories           SET household_id = tgt WHERE household_id = src;
  UPDATE public.pantry_items                SET household_id = tgt WHERE household_id = src;
  UPDATE public.projects                    SET household_id = tgt WHERE household_id = src;
  UPDATE public.recipes                     SET household_id = tgt WHERE household_id = src;
  UPDATE public.shopping_lists              SET household_id = tgt WHERE household_id = src;
  UPDATE public.task_categories             SET household_id = tgt WHERE household_id = src;
  UPDATE public.tasks                       SET household_id = tgt WHERE household_id = src;

  -- Finally, delete the empty source household.
  DELETE FROM public.households WHERE id = src;
END $$;