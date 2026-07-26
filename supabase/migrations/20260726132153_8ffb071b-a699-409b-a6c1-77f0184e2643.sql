UPDATE public.email_campaigns
SET status = 'partial',
    completed_at = now(),
    lock_token = NULL,
    locked_at = NULL,
    error_message = COALESCE(error_message, 'Worker stopped before progress could be saved; per-recipient counts are unavailable for this campaign.')
WHERE status = 'sending'
  AND started_at < now() - interval '10 minutes';