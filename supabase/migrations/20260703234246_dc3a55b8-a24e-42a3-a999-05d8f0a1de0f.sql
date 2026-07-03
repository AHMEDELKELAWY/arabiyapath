
CREATE TABLE public.membership_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('monthly','six_months','yearly')),
  paypal_plan_id text NOT NULL,
  paypal_subscription_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'APPROVAL_PENDING'
    CHECK (status IN ('APPROVAL_PENDING','ACTIVE','CANCELLED','SUSPENDED','EXPIRED')),
  started_at timestamptz,
  next_billing_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX membership_subscriptions_user_id_idx ON public.membership_subscriptions(user_id);
CREATE INDEX membership_subscriptions_status_idx ON public.membership_subscriptions(status);

GRANT SELECT ON public.membership_subscriptions TO authenticated;
GRANT ALL ON public.membership_subscriptions TO service_role;

ALTER TABLE public.membership_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own membership subscriptions"
  ON public.membership_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all membership subscriptions"
  ON public.membership_subscriptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER membership_subscriptions_updated_at
  BEFORE UPDATE ON public.membership_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.user_has_active_membership(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_subscriptions
    WHERE user_id = _uid
      AND (
        status = 'ACTIVE'
        OR (status = 'CANCELLED' AND expires_at IS NOT NULL AND expires_at > now())
      )
  );
$$;

ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS subscription_id uuid
  REFERENCES public.membership_subscriptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS affiliate_commissions_subscription_id_idx
  ON public.affiliate_commissions(subscription_id);
