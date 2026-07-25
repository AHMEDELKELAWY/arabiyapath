ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all_users',
  ADD COLUMN IF NOT EXISTS exclude_purchasers boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_emails text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sent_success integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_failed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_emails text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sent_by uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;