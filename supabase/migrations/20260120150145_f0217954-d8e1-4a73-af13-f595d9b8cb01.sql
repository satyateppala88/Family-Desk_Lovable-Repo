-- Add source_calendar_event_id column to track tasks imported from calendar events
ALTER TABLE tasks ADD COLUMN source_calendar_event_id TEXT DEFAULT NULL;

-- Add index for faster lookups when checking for duplicates
CREATE INDEX idx_tasks_source_calendar_event_id ON tasks(source_calendar_event_id) WHERE source_calendar_event_id IS NOT NULL;