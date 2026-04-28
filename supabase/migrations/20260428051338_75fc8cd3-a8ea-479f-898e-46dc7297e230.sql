
-- 1. Create avatars storage bucket (public read, controlled write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Add avatar_url to households
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 3. household_family_members table for non-account members
CREATE TABLE IF NOT EXISTS public.household_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  name text NOT NULL,
  relationship text,
  avatar_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.household_family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view family members"
  ON public.household_family_members FOR SELECT
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert family members"
  ON public.household_family_members FOR INSERT
  WITH CHECK (public.is_household_member(auth.uid(), household_id) AND created_by = auth.uid());

CREATE POLICY "Members can update family members"
  ON public.household_family_members FOR UPDATE
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete family members"
  ON public.household_family_members FOR DELETE
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_household_family_members_updated_at
  BEFORE UPDATE ON public.household_family_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Storage policies for avatars bucket
-- Public read (bucket is public, but explicit policy for clarity)
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Path convention: {user_id}/...  OR  household/{household_id}/...  OR  family/{household_id}/...
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('household', 'family')
        AND public.is_household_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
      )
    )
  );

CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('household', 'family')
        AND public.is_household_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
      )
    )
  );

CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('household', 'family')
        AND public.is_household_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
      )
    )
  );
