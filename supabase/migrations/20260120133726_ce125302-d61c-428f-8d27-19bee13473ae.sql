-- Calendar connections table for storing OAuth tokens
CREATE TABLE calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  google_account_email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  display_name text NOT NULL,
  color text NOT NULL DEFAULT '#4786ff',
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Calendar settings per household
CREATE TABLE calendar_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE UNIQUE,
  default_view text DEFAULT 'month',
  week_starts_on integer DEFAULT 0,
  show_weekends boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own calendar connections
CREATE POLICY "Users can manage own calendar connections" 
ON calendar_connections FOR ALL 
USING (user_id = auth.uid());

-- Household members can view all household calendars
CREATE POLICY "Household members can view calendars" 
ON calendar_connections FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM household_members 
  WHERE household_members.household_id = calendar_connections.household_id 
  AND household_members.user_id = auth.uid()
));

-- Household members can manage calendar settings
CREATE POLICY "Household members can manage settings" 
ON calendar_settings FOR ALL 
USING (EXISTS (
  SELECT 1 FROM household_members 
  WHERE household_members.household_id = calendar_settings.household_id 
  AND household_members.user_id = auth.uid()
));

-- Update trigger for calendar_connections
CREATE TRIGGER update_calendar_connections_updated_at
BEFORE UPDATE ON calendar_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();