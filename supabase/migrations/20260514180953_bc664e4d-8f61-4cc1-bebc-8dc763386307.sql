alter table public.household_preferences
  add column if not exists calendar_setup_complete boolean not null default false,
  add column if not exists habits_setup_complete boolean not null default false;

update public.household_preferences
set
  calendar_setup_complete = true,
  updated_at = now()
where calendar_setup_complete = false
  and (
    coalesce((completed_module_setups ->> 'calendar_setup')::boolean, false) = true
    or work_schedule is not null
  );

update public.household_preferences
set
  habits_setup_complete = true,
  updated_at = now()
where habits_setup_complete = false
  and (
    coalesce((completed_module_setups ->> 'habits_setup')::boolean, false) = true
    or preferred_task_time is not null
  );