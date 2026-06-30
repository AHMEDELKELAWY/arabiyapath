
CREATE OR REPLACE FUNCTION public.admin_pending_applications_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      (SELECT COUNT(*)::int FROM public.affiliate_applications WHERE status = 'pending')
    ELSE 0
  END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_pending_applications_count() TO authenticated;

CREATE OR REPLACE FUNCTION public.affiliate_my_referrals()
RETURNS TABLE (
  purchase_id uuid,
  created_at timestamptz,
  product_name text,
  amount numeric,
  student_user_id uuid,
  student_first_name text,
  student_last_name text,
  student_email text,
  coupon_code text,
  coupon_percent_off integer,
  commission_amount numeric,
  commission_status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pu.id AS purchase_id,
    pu.created_at,
    COALESCE(pu.product_name, pr.name) AS product_name,
    pu.amount,
    pu.user_id AS student_user_id,
    pf.first_name AS student_first_name,
    pf.last_name AS student_last_name,
    pf.email AS student_email,
    c.code AS coupon_code,
    c.percent_off AS coupon_percent_off,
    ac.commission_amount,
    ac.status AS commission_status
  FROM public.purchases pu
  JOIN public.affiliates a ON a.id = pu.affiliate_id
  LEFT JOIN public.products pr ON pr.id = pu.product_id
  LEFT JOIN public.profiles pf ON pf.user_id = pu.user_id
  LEFT JOIN public.coupons c ON c.id = pu.coupon_id
  LEFT JOIN public.affiliate_commissions ac ON ac.purchase_id = pu.id
  WHERE a.user_id = auth.uid()
  ORDER BY pu.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.affiliate_my_referrals() TO authenticated;
