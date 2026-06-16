
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'all';

ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_applies_to_check;

ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_applies_to_check
  CHECK (applies_to IN ('all','courses','flashcards'));

DROP VIEW IF EXISTS public.public_coupons;
CREATE VIEW public.public_coupons
WITH (security_invoker = true) AS
SELECT id, code, percent_off, discount_percent, expires_at, active,
       max_redemptions, current_uses, applies_to
FROM public.coupons
WHERE active = true;

GRANT SELECT ON public.public_coupons TO anon, authenticated;

DROP FUNCTION IF EXISTS public.lookup_coupon(text);

CREATE OR REPLACE FUNCTION public.lookup_coupon(_code text)
RETURNS TABLE(code text, percent_off integer, discount_percent integer, expires_at timestamp with time zone, active boolean, applies_to text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.code, c.percent_off, c.discount_percent, c.expires_at, c.active, c.applies_to
  FROM public.coupons c
  WHERE c.code = upper(_code)
    AND c.active = true
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND (c.max_redemptions IS NULL OR COALESCE(c.current_uses, 0) < c.max_redemptions)
  LIMIT 1;
$function$;
