-- 1. Dedupe existing email_sends rows (keep latest per campaign+email)
DELETE FROM public.email_sends a
USING public.email_sends b
WHERE a.campaign_id = b.campaign_id
  AND lower(a.email) = lower(b.email)
  AND a.campaign_id IS NOT NULL
  AND a.email IS NOT NULL
  AND (a.sent_at, a.id) < (b.sent_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS email_sends_campaign_email_uniq
  ON public.email_sends (campaign_id, lower(email))
  WHERE campaign_id IS NOT NULL AND email IS NOT NULL;

-- 2. Worker lock columns on campaigns
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS lock_token uuid,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS worker_offset integer NOT NULL DEFAULT 0;

-- 3. Atomically claim a campaign for one worker.
CREATE OR REPLACE FUNCTION public.campaign_claim_worker(_campaign_id uuid, _token uuid, _stale_after interval DEFAULT '00:03:00')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _ok boolean;
BEGIN
  UPDATE public.email_campaigns
  SET lock_token = _token,
      locked_at = now(),
      status = 'sending'
  WHERE id = _campaign_id
    AND status NOT IN ('sent', 'partial', 'failed')
    AND (lock_token IS NULL OR lock_token = _token OR locked_at IS NULL OR locked_at < now() - _stale_after)
  RETURNING true INTO _ok;
  RETURN COALESCE(_ok, false);
END;
$$;

-- 4. Heartbeat so a long-running worker keeps its lock fresh.
CREATE OR REPLACE FUNCTION public.campaign_heartbeat(_campaign_id uuid, _token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _ok boolean;
BEGIN
  UPDATE public.email_campaigns
  SET locked_at = now()
  WHERE id = _campaign_id AND lock_token = _token
  RETURNING true INTO _ok;
  RETURN COALESCE(_ok, false);
END;
$$;

-- 5. Claim a single recipient. Returns false if already claimed/sent (idempotency).
CREATE OR REPLACE FUNCTION public.campaign_claim_recipient(_campaign_id uuid, _email text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.email_sends (campaign_id, user_id, email, status, sent_at)
  VALUES (_campaign_id, _user_id, lower(trim(_email)), 'pending', now())
  ON CONFLICT (campaign_id, lower(email)) DO NOTHING
  RETURNING id INTO _id;
  RETURN _id IS NOT NULL;
END;
$$;

-- 6. Record the outcome for one recipient and bump campaign counters live.
CREATE OR REPLACE FUNCTION public.campaign_record_result(_campaign_id uuid, _email text, _ok boolean, _error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _prev text;
BEGIN
  SELECT status INTO _prev
  FROM public.email_sends
  WHERE campaign_id = _campaign_id AND lower(email) = lower(trim(_email))
  FOR UPDATE;

  IF _prev IS DISTINCT FROM 'pending' THEN
    RETURN; -- already finalized; never double-count
  END IF;

  UPDATE public.email_sends
  SET status = CASE WHEN _ok THEN 'sent' ELSE 'failed' END,
      error_message = LEFT(_error, 500),
      sent_at = now()
  WHERE campaign_id = _campaign_id AND lower(email) = lower(trim(_email));

  UPDATE public.email_campaigns
  SET sent_success = sent_success + CASE WHEN _ok THEN 1 ELSE 0 END,
      sent_failed = sent_failed + CASE WHEN _ok THEN 0 ELSE 1 END,
      failed_emails = CASE WHEN _ok THEN failed_emails ELSE array_append(failed_emails, lower(trim(_email))) END,
      locked_at = now()
  WHERE id = _campaign_id;
END;
$$;

-- 7. Release a claim that was never actually attempted (e.g. worker ran out of time).
CREATE OR REPLACE FUNCTION public.campaign_release_pending(_campaign_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _n integer;
BEGIN
  DELETE FROM public.email_sends
  WHERE campaign_id = _campaign_id AND status = 'pending';
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.campaign_claim_worker(uuid, uuid, interval) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.campaign_heartbeat(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.campaign_claim_recipient(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.campaign_record_result(uuid, text, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.campaign_release_pending(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.campaign_claim_worker(uuid, uuid, interval) TO service_role;
GRANT EXECUTE ON FUNCTION public.campaign_heartbeat(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.campaign_claim_recipient(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.campaign_record_result(uuid, text, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.campaign_release_pending(uuid) TO service_role;