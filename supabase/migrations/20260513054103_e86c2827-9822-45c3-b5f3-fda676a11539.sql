ALTER TABLE public.meal_plan_items ADD COLUMN IF NOT EXISTS cooked_at timestamptz;

-- Backfill cooked_at from latest pantry_item_usage.used_at per meal_plan_item
UPDATE public.meal_plan_items mpi
SET cooked_at = sub.last_used
FROM (
  SELECT meal_plan_item_id, MAX(used_at) AS last_used
  FROM public.pantry_item_usage
  WHERE meal_plan_item_id IS NOT NULL
  GROUP BY meal_plan_item_id
) sub
WHERE mpi.id = sub.meal_plan_item_id AND mpi.cooked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_meal_plan_items_cooked_at ON public.meal_plan_items(cooked_at) WHERE cooked_at IS NOT NULL;