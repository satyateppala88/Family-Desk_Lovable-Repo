CREATE OR REPLACE FUNCTION public.log_household_habit(
  _habit_id uuid,
  _completed boolean,
  _actual_value numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _household_id uuid;
  _assignment text;
  _today date := CURRENT_DATE;
  _yesterday date := CURRENT_DATE - 1;
  _member record;
  _existing_log record;
  _existing_streak record;
  _new_streak int;
  _streak_bonus int;
  _delta_daily int;
  _delta_bonus int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT household_id, assignment_type
    INTO _household_id, _assignment
  FROM public.habits
  WHERE id = _habit_id;

  IF _household_id IS NULL THEN
    RAISE EXCEPTION 'Habit not found';
  END IF;

  IF _assignment <> 'household' THEN
    RAISE EXCEPTION 'Habit is not a household-level habit';
  END IF;

  IF NOT public.is_household_member(auth.uid(), _household_id) THEN
    RAISE EXCEPTION 'Not a member of this household';
  END IF;

  FOR _member IN
    SELECT user_id FROM public.household_members WHERE household_id = _household_id
  LOOP
    -- Existing log for today (if any)
    SELECT * INTO _existing_log
    FROM public.habit_logs
    WHERE habit_id = _habit_id AND user_id = _member.user_id AND log_date = _today;

    -- Upsert log
    INSERT INTO public.habit_logs (habit_id, user_id, log_date, completed, actual_value, logged_at)
    VALUES (_habit_id, _member.user_id, _today, _completed, _actual_value, now())
    ON CONFLICT (habit_id, log_date, user_id) DO UPDATE
      SET completed = EXCLUDED.completed,
          actual_value = COALESCE(EXCLUDED.actual_value, public.habit_logs.actual_value),
          logged_at = now();

    -- Streak handling: only advance on a false->true (or new->true) transition.
    IF _completed THEN
      IF _existing_log.id IS NULL OR _existing_log.completed = false THEN
        SELECT * INTO _existing_streak
        FROM public.habit_streaks
        WHERE habit_id = _habit_id AND user_id = _member.user_id;

        IF _existing_streak.id IS NULL THEN
          _new_streak := 1;
          INSERT INTO public.habit_streaks (habit_id, user_id, current_streak, longest_streak, last_completed_date)
          VALUES (_habit_id, _member.user_id, 1, 1, _today);
        ELSE
          IF _existing_streak.last_completed_date = _yesterday THEN
            _new_streak := _existing_streak.current_streak + 1;
          ELSIF _existing_streak.last_completed_date = _today THEN
            _new_streak := _existing_streak.current_streak;
          ELSE
            _new_streak := 1;
          END IF;
          UPDATE public.habit_streaks
            SET current_streak = _new_streak,
                longest_streak = GREATEST(_new_streak, _existing_streak.longest_streak),
                last_completed_date = _today,
                updated_at = now()
            WHERE id = _existing_streak.id;
        END IF;

        -- Score delta: +10 plus tier bonus.
        _streak_bonus := CASE
          WHEN _new_streak >= 30 THEN 50
          WHEN _new_streak >= 7  THEN 15
          WHEN _new_streak >= 3  THEN 5
          ELSE 0
        END;
        _delta_daily := 10;
        _delta_bonus := _streak_bonus;

        INSERT INTO public.habit_scores (household_id, user_id, score_date, daily_score, streak_bonus, total_score)
        VALUES (_household_id, _member.user_id, _today, _delta_daily, _delta_bonus, _delta_daily + _delta_bonus)
        ON CONFLICT (household_id, user_id, score_date) DO UPDATE
          SET daily_score = public.habit_scores.daily_score + EXCLUDED.daily_score,
              streak_bonus = public.habit_scores.streak_bonus + EXCLUDED.streak_bonus,
              total_score = public.habit_scores.total_score + EXCLUDED.total_score,
              updated_at = now();
      END IF;
    ELSE
      -- Reversing: if previously completed today, subtract today's points
      IF _existing_log.id IS NOT NULL AND _existing_log.completed = true THEN
        SELECT * INTO _existing_streak
        FROM public.habit_streaks
        WHERE habit_id = _habit_id AND user_id = _member.user_id;

        _streak_bonus := CASE
          WHEN COALESCE(_existing_streak.current_streak, 0) >= 30 THEN 50
          WHEN COALESCE(_existing_streak.current_streak, 0) >= 7  THEN 15
          WHEN COALESCE(_existing_streak.current_streak, 0) >= 3  THEN 5
          ELSE 0
        END;

        UPDATE public.habit_scores
          SET daily_score = GREATEST(0, daily_score - 10),
              streak_bonus = GREATEST(0, streak_bonus - _streak_bonus),
              total_score = GREATEST(0, total_score - (10 + _streak_bonus)),
              updated_at = now()
          WHERE household_id = _household_id
            AND user_id = _member.user_id
            AND score_date = _today;
      END IF;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.log_household_habit(uuid, boolean, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.log_household_habit(uuid, boolean, numeric) TO authenticated;