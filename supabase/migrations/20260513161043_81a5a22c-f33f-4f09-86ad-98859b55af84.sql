-- Collapse any duplicate (household_id, week_start_date) rows before adding the unique constraint.
-- Keep the most recently updated meal_plans row per (household_id, week_start_date)
-- and reparent meal_plan_items from older rows onto the survivor.
WITH ranked AS (
  SELECT
    id,
    household_id,
    week_start_date,
    ROW_NUMBER() OVER (
      PARTITION BY household_id, week_start_date
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY household_id, week_start_date
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
    ) AS keeper_id
  FROM public.meal_plans
),
to_drop AS (
  SELECT id, keeper_id FROM ranked WHERE rn > 1
)
UPDATE public.meal_plan_items mpi
SET meal_plan_id = td.keeper_id
FROM to_drop td
WHERE mpi.meal_plan_id = td.id;

DELETE FROM public.meal_plans mp
USING (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY household_id, week_start_date
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
      ) AS rn
    FROM public.meal_plans
  ) r WHERE r.rn > 1
) dups
WHERE mp.id = dups.id;

ALTER TABLE public.meal_plans
ADD CONSTRAINT meal_plans_household_week_unique
UNIQUE (household_id, week_start_date);