-- Make household_id nullable for platform-level roles (e.g., platform_admin)
ALTER TABLE public.user_roles ALTER COLUMN household_id DROP NOT NULL;

-- Add RLS policy so users can read their own roles (already exists for SELECT, 
-- but let's ensure the INSERT policy allows self-assignment with null household_id)
-- The existing "Users can assign roles to themselves" policy already covers this.