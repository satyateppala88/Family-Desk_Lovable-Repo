DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'habit-morning') THEN
    PERFORM cron.unschedule('habit-morning');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'habit-evening') THEN
    PERFORM cron.unschedule('habit-evening');
  END IF;
END $$;

SELECT cron.schedule(
  'habit-morning',
  '30 1 * * *',
  $$
    SELECT public.dispatch_push(
      ARRAY(
        SELECT np.user_id
        FROM public.notification_preferences np
        LEFT JOIN public.habit_logs hl
          ON hl.user_id = np.user_id
         AND hl.log_date = (now() AT TIME ZONE 'Asia/Kolkata')::date
         AND hl.completed = true
        WHERE np.habits = true
        GROUP BY np.user_id
        HAVING COUNT(hl.id) = 0
      ),
      'habits',
      'Morning check-in 🌅',
      'Your habits are waiting. Start strong today.',
      '/habits',
      'habit-morning',
      '{"type":"habit_morning"}'::jsonb
    );
  $$
);

SELECT cron.schedule(
  'habit-evening',
  '30 15 * * *',
  $$
    SELECT public.dispatch_push(
      ARRAY(
        SELECT np.user_id
        FROM public.notification_preferences np
        LEFT JOIN public.habit_logs hl
          ON hl.user_id = np.user_id
         AND hl.log_date = (now() AT TIME ZONE 'Asia/Kolkata')::date
         AND hl.completed = true
        WHERE np.habits = true
        GROUP BY np.user_id
        HAVING COUNT(hl.id) = 0
      ),
      'habits',
      'Almost done for today 🌙',
      'Any habits left to check off before bed?',
      '/habits',
      'habit-evening',
      '{"type":"habit_evening"}'::jsonb
    );
  $$
);