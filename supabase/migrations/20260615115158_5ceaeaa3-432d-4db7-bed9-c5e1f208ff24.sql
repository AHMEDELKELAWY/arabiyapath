
DROP VIEW IF EXISTS public.public_coupons;

CREATE OR REPLACE FUNCTION public.lookup_coupon(_code text)
RETURNS TABLE (
  code text,
  percent_off integer,
  discount_percent integer,
  expires_at timestamptz,
  active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.code, c.percent_off, c.discount_percent, c.expires_at, c.active
  FROM public.coupons c
  WHERE c.code = upper(_code)
    AND c.active = true
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND (c.max_redemptions IS NULL OR COALESCE(c.current_uses, 0) < c.max_redemptions)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_coupon(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_coupon(text) TO anon, authenticated;
