-- Add rating and YouTube features to recipes table
ALTER TABLE public.recipes
ADD COLUMN rating numeric CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN rating_count integer DEFAULT 0 NOT NULL,
ADD COLUMN hidden boolean DEFAULT false NOT NULL,
ADD COLUMN youtube_url text;

-- Add scheduled_date to meal_plan_items for calendar display
ALTER TABLE public.meal_plan_items
ADD COLUMN scheduled_date date;

-- Add week_start_day preference to household_preferences
ALTER TABLE public.household_preferences
ADD COLUMN week_start_day character varying DEFAULT 'sunday' CHECK (week_start_day IN ('sunday', 'monday'));

-- Create index for better query performance
CREATE INDEX idx_recipes_hidden ON public.recipes(household_id, hidden);
CREATE INDEX idx_recipes_rating ON public.recipes(household_id, rating DESC);
CREATE INDEX idx_meal_plan_items_scheduled_date ON public.meal_plan_items(meal_plan_id, scheduled_date);