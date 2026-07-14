
-- 1. Membership products (idempotent)
INSERT INTO public.products (id, name, scope, price)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'ArabiyaPath Membership — Monthly', 'membership', 30.00),
  ('11111111-1111-1111-1111-111111111102', 'ArabiyaPath Membership — 6 Months', 'membership', 150.00),
  ('11111111-1111-1111-1111-111111111103', 'ArabiyaPath Membership — Yearly', 'membership', 270.00)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, scope = EXCLUDED.scope, price = EXCLUDED.price;

-- 2. Link purchases to subscriptions
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.membership_subscriptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS purchases_subscription_id_idx ON public.purchases(subscription_id);

-- 3. Idempotency: one purchase per PayPal capture id
CREATE UNIQUE INDEX IF NOT EXISTS purchases_paypal_capture_id_uniq
  ON public.purchases(paypal_capture_id)
  WHERE paypal_capture_id IS NOT NULL;

-- 4. Atomic function: records a purchase row for a membership sale.
--    Safe to call repeatedly; unique index on paypal_capture_id prevents duplicates.
CREATE OR REPLACE FUNCTION public.record_membership_purchase(
  _subscription_paypal_id text,
  _sale_id text,
  _amount numeric,
  _currency text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub public.membership_subscriptions%ROWTYPE;
  _product_id uuid;
  _product_name text;
  _purchase_id uuid;
BEGIN
  SELECT * INTO _sub FROM public.membership_subscriptions
    WHERE paypal_subscription_id = _subscription_paypal_id;
  IF NOT FOUND THEN
    RAISE NOTICE 'record_membership_purchase: subscription % not found', _subscription_paypal_id;
    RETURN NULL;
  END IF;

  _product_id := CASE _sub.plan
    WHEN 'monthly'    THEN '11111111-1111-1111-1111-111111111101'::uuid
    WHEN 'six_months' THEN '11111111-1111-1111-1111-111111111102'::uuid
    WHEN 'yearly'     THEN '11111111-1111-1111-1111-111111111103'::uuid
    ELSE '11111111-1111-1111-1111-111111111101'::uuid
  END;

  SELECT name INTO _product_name FROM public.products WHERE id = _product_id;

  -- Idempotent insert via unique index on paypal_capture_id
  INSERT INTO public.purchases (
    user_id, product_id, product_type, product_name,
    amount, currency, status, payment_method,
    paypal_order_id, paypal_capture_id,
    coupon_id, affiliate_id, subscription_id
  ) VALUES (
    _sub.user_id, _product_id, 'membership', _product_name,
    COALESCE(_amount, 0), COALESCE(_currency, 'USD'), 'active', 'paypal',
    _subscription_paypal_id, _sale_id,
    _sub.coupon_id, _sub.affiliate_id, _sub.id
  )
  ON CONFLICT (paypal_capture_id) WHERE paypal_capture_id IS NOT NULL
  DO UPDATE SET status = 'active', subscription_id = EXCLUDED.subscription_id
  RETURNING id INTO _purchase_id;

  RETURN _purchase_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_membership_purchase(text, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_membership_purchase(text, text, numeric, text) TO service_role;

-- 5. Backfill: create a purchase for every historical membership missing one.
--    Uses a synthetic capture id per subscription so it's idempotent.
DO $$
DECLARE
  _plan_price numeric;
  _r RECORD;
  _product_id uuid;
BEGIN
  FOR _r IN
    SELECT ms.*
    FROM public.membership_subscriptions ms
    WHERE ms.status IN ('ACTIVE','CANCELLED','SUSPENDED','EXPIRED')
      AND NOT EXISTS (
        SELECT 1 FROM public.purchases p WHERE p.subscription_id = ms.id
      )
  LOOP
    _product_id := CASE _r.plan
      WHEN 'monthly'    THEN '11111111-1111-1111-1111-111111111101'::uuid
      WHEN 'six_months' THEN '11111111-1111-1111-1111-111111111102'::uuid
      WHEN 'yearly'     THEN '11111111-1111-1111-1111-111111111103'::uuid
      ELSE '11111111-1111-1111-1111-111111111101'::uuid
    END;

    SELECT price INTO _plan_price FROM public.products WHERE id = _product_id;

    INSERT INTO public.purchases (
      user_id, product_id, product_type, product_name,
      amount, currency, status, payment_method,
      paypal_order_id, paypal_capture_id,
      coupon_id, affiliate_id, subscription_id, created_at
    )
    SELECT
      _r.user_id, _product_id, 'membership',
      (SELECT name FROM public.products WHERE id = _product_id),
      COALESCE(_plan_price, 0), 'USD',
      CASE WHEN _r.status = 'ACTIVE' OR (_r.status = 'CANCELLED' AND _r.expires_at > now()) THEN 'active' ELSE 'completed' END,
      'paypal',
      _r.paypal_subscription_id,
      'SUB-BACKFILL-' || _r.paypal_subscription_id,
      _r.coupon_id, _r.affiliate_id, _r.id,
      COALESCE(_r.started_at, _r.created_at)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.purchases p
      WHERE p.paypal_capture_id = 'SUB-BACKFILL-' || _r.paypal_subscription_id
    );
  END LOOP;
END $$;
