ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS content_mode text NOT NULL DEFAULT 'visual',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS skipped_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.email_sends
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.email_sends
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS error_message text;

CREATE INDEX IF NOT EXISTS email_sends_campaign_id_idx ON public.email_sends (campaign_id);