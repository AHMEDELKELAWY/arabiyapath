
-- ====================================================================
-- Security hardening: address scanner findings
-- ====================================================================

-- 1) payment_providers: remove public SELECT access. `config` JSONB may
--    contain provider credentials. Only admins read; edge functions use
--    the service role which bypasses RLS.
DROP POLICY IF EXISTS "providers public read active" ON public.payment_providers;
REVOKE SELECT ON public.payment_providers FROM anon;

-- 2) coupon_redemptions: clients must not insert their own redemptions.
--    Only the PayPal capture/webhook edge functions (service role) may
--    insert, after a real purchase. SELECT for own rows is preserved.
DROP POLICY IF EXISTS "Users can insert their own coupon redemptions"
  ON public.coupon_redemptions;
REVOKE INSERT ON public.coupon_redemptions FROM authenticated, anon;

-- 3) funnel_subscribers: block direct INSERTs from clients. Subscriptions
--    must go through the `funnel-subscribe` edge function which validates
--    the email server-side.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.funnel_subscribers'::regclass
      AND polcmd IN ('a','*') -- INSERT or ALL
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.funnel_subscribers', r.polname);
  END LOOP;
END $$;
REVOKE INSERT, UPDATE, DELETE ON public.funnel_subscribers FROM anon, authenticated;

-- 4) Lock down SECURITY DEFINER functions: they must not be callable
--    directly by anonymous (or arbitrary authenticated) users via the
--    PostgREST API. Triggers and RLS still work because the database
--    invokes them internally.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) FROM PUBLIC, anon, authenticated;

-- lookup_coupon: keep callable by signed-in users only (checkout flows).
REVOKE EXECUTE ON FUNCTION public.lookup_coupon(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_coupon(text) TO authenticated;

-- Flashcard SECURITY DEFINER functions: authenticated-only.
REVOKE EXECUTE ON FUNCTION public.fc_user_can_study_unit(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fc_user_has_pack_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fc_apply_review(uuid, public.flashcard_rating) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fc_dashboard_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fc_apply_review(uuid, public.flashcard_rating) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fc_dashboard_summary() TO authenticated;
