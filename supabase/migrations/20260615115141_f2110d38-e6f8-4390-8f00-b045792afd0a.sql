
-- Remove user self-insert on payments and purchases (service role bypasses RLS)
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.purchases;

-- Restrict full coupons table to admins only; expose safe fields via view
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Admins can view coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Safe public view (no affiliate_id / usage counters)
DROP VIEW IF EXISTS public.public_coupons;
CREATE VIEW public.public_coupons
WITH (security_invoker = off) AS
SELECT code, percent_off, discount_percent, expires_at, active
FROM public.coupons
WHERE active = true;

GRANT SELECT ON public.public_coupons TO anon, authenticated;
