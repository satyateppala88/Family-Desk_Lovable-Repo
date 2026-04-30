-- Add AI reasoning column to daily plan items for smart planning explanations
ALTER TABLE daily_plan_items ADD COLUMN ai_reasoning text;