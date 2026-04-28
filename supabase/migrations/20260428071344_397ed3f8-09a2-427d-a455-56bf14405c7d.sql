-- Document type enum
DO $$ BEGIN
  CREATE TYPE public.policy_doc_type AS ENUM ('privacy', 'terms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.policy_change_type AS ENUM ('major', 'minor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type public.policy_doc_type NOT NULL,
  version text NOT NULL,
  effective_date date NOT NULL,
  change_type public.policy_change_type NOT NULL,
  title text NOT NULL,
  changes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(doc_type, version)
);

CREATE INDEX IF NOT EXISTS idx_policy_versions_doc_date
  ON public.policy_versions (doc_type, effective_date DESC);

ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;

-- Public read (anyone can view current/past policies)
DROP POLICY IF EXISTS "Anyone can view policy versions" ON public.policy_versions;
CREATE POLICY "Anyone can view policy versions"
  ON public.policy_versions
  FOR SELECT
  USING (true);

-- Only platform admins can write
DROP POLICY IF EXISTS "Platform admins can insert policy versions" ON public.policy_versions;
CREATE POLICY "Platform admins can insert policy versions"
  ON public.policy_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "Platform admins can update policy versions" ON public.policy_versions;
CREATE POLICY "Platform admins can update policy versions"
  ON public.policy_versions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "Platform admins can delete policy versions" ON public.policy_versions;
CREATE POLICY "Platform admins can delete policy versions"
  ON public.policy_versions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE TRIGGER update_policy_versions_updated_at
  BEFORE UPDATE ON public.policy_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing changelog data
INSERT INTO public.policy_versions (doc_type, version, effective_date, change_type, title, changes)
VALUES
  ('privacy', '1.1', '2026-04-28', 'minor', 'Device permissions, voice and photo handling', ARRAY[
    'New ''Device Permissions & Sensitive Data'' section covering microphone, camera, photo library and notifications.',
    'Clarifies that voice input is transcribed on-device by the operating system and audio is never recorded or uploaded.',
    'Adds ''Photos and avatars'' to user content categories with storage, retention and deletion details.',
    'Documents the in-app permission priming flow and the right to revoke any permission via OS settings at any time.',
    'Aligns disclosures with Apple App Store Privacy Nutrition Labels and Google Play Data Safety requirements.'
  ]),
  ('privacy', '1.0', '2026-04-27', 'major', 'Initial Privacy Policy', ARRAY[
    'Defines categories of data collected (account, household content, device, support).',
    'Documents use of Lovable Cloud, Lovable AI Gateway and Google Calendar APIs.',
    'Adds explicit coverage for WhatsApp OTP, phone verification and PWA storage.',
    'DPDP Act (India) and IT Act 2000 compliance disclosures.',
    'Lists user rights (access, correction, deletion, export) and contact path.',
    'Security safeguards: RLS, JWT validation, rate limiting, encrypted transit.'
  ]),
  ('terms', '1.0', '2026-04-27', 'major', 'Initial Terms of Service', ARRAY[
    'Acceptance, eligibility and account responsibility clauses.',
    'User responsibilities including no privilege escalation and no API abuse.',
    'Coverage of AI features: meal plans, task parsing, calendar extraction, finance chat.',
    'Finance module disclosures: no bank connections, informational insights only.',
    'Credit-card recommender disclaimer and pre-built catalog notice.',
    'Google Calendar OAuth scope and disconnection rights.',
    'Household sharing, intellectual property, termination and Indian governing law.'
  ])
ON CONFLICT (doc_type, version) DO NOTHING;