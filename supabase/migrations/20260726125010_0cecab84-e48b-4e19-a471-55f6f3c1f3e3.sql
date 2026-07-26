ALTER TABLE public.email_sends
  ADD COLUMN IF NOT EXISTS event_at timestamptz,
  ADD COLUMN IF NOT EXISTS event_detail text;

ALTER TABLE public.suppressed_emails
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'system';

CREATE INDEX IF NOT EXISTS suppressed_emails_email_idx ON public.suppressed_emails (lower(email));
CREATE INDEX IF NOT EXISTS email_sends_email_idx ON public.email_sends (lower(email));

CREATE OR REPLACE FUNCTION public.admin_campaign_deliverability(_from timestamptz DEFAULT (now() - interval '30 days'), _to timestamptz DEFAULT now())
RETURNS TABLE(
  campaign_id uuid,
  subject text,
  audience text,
  status text,
  sent_at timestamptz,
  recipients integer,
  sent integer,
  failed integer,
  skipped integer,
  bounced integer,
  complained integer,
  unsubscribed integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.id,
    c.subject,
    c.audience,
    c.status,
    c.sent_at,
    COALESCE(c.recipients_count, 0),
    COALESCE(c.sent_success, 0),
    COALESCE(c.sent_failed, 0),
    COALESCE(c.skipped_count, 0),
    (SELECT COUNT(*)::int FROM public.email_sends s WHERE s.campaign_id = c.id AND s.status = 'bounced'),
    (SELECT COUNT(*)::int FROM public.email_sends s WHERE s.campaign_id = c.id AND s.status = 'complained'),
    (SELECT COUNT(*)::int FROM public.email_sends s WHERE s.campaign_id = c.id AND s.status = 'unsubscribed')
  FROM public.email_campaigns c
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
    AND COALESCE(c.sent_at, c.created_at) >= _from
    AND COALESCE(c.sent_at, c.created_at) <= _to
  ORDER BY COALESCE(c.sent_at, c.created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_campaign_failure_reasons(_from timestamptz DEFAULT (now() - interval '30 days'), _to timestamptz DEFAULT now())
RETURNS TABLE(
  campaign_id uuid,
  subject text,
  reason text,
  occurrences integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.id,
    c.subject,
    LEFT(COALESCE(NULLIF(TRIM(COALESCE(s.error_message, s.event_detail)), ''), 'Unknown reason'), 160) AS reason,
    COUNT(*)::int
  FROM public.email_sends s
  JOIN public.email_campaigns c ON c.id = s.campaign_id
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
    AND s.status IN ('failed', 'bounced', 'complained')
    AND COALESCE(c.sent_at, c.created_at) >= _from
    AND COALESCE(c.sent_at, c.created_at) <= _to
  GROUP BY c.id, c.subject, reason
  ORDER BY COUNT(*) DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_campaign_deliverability(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_campaign_failure_reasons(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_campaign_deliverability(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_campaign_failure_reasons(timestamptz, timestamptz) TO authenticated, service_role;