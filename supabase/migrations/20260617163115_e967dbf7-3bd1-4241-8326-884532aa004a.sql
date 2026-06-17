-- Backfill missing flashcard_purchases rows for historical flashcard-pack purchases
-- (including 100% coupon purchases that only created a public.purchases row).
INSERT INTO public.flashcard_purchases (
  user_id, pack_id, provider_code, provider_order_id,
  amount_cents, discount_cents, currency, coupon_id,
  status, purchased_at
)
SELECT
  pu.user_id,
  fp.id,
  'paypal',
  CASE
    WHEN pu.payment_method = 'free_coupon' THEN 'free_coupon:' || pu.id::text
    WHEN pu.paypal_order_id IS NOT NULL THEN pu.paypal_order_id
    ELSE 'legacy:' || pu.id::text
  END,
  COALESCE(ROUND(pu.amount * 100)::int, 0),
  CASE WHEN COALESCE(pu.amount,0) = 0 THEN COALESCE(fp.price_cents, 0) ELSE 0 END,
  COALESCE(pu.currency, fp.currency, 'USD'),
  pu.coupon_id,
  'active',
  COALESCE(pu.created_at, now())
FROM public.purchases pu
JOIN public.flashcard_packs fp ON fp.product_id = pu.product_id
WHERE pu.status IN ('active','completed')
  AND NOT EXISTS (
    SELECT 1 FROM public.flashcard_purchases existing
    WHERE existing.user_id = pu.user_id
      AND existing.pack_id = fp.id
      AND existing.status = 'active'
  );

-- Ensure pack-access checks accept both 'active' and 'completed' purchases,
-- regardless of amount or payment method. Makes 100% coupon ownership first-class.
CREATE OR REPLACE FUNCTION public.fc_user_has_pack_access(_user_id uuid, _pack_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.flashcard_purchases fcp
    WHERE fcp.user_id = _user_id
      AND fcp.pack_id = _pack_id
      AND fcp.status = 'active'
  ) OR EXISTS (
    SELECT 1
    FROM public.purchases pu
    JOIN public.flashcard_packs fp ON fp.product_id = pu.product_id
    WHERE pu.user_id = _user_id
      AND fp.id = _pack_id
      AND pu.status IN ('active','completed')
  );
$function$;

CREATE OR REPLACE FUNCTION public.fc_user_can_study_unit(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.flashcard_units u
    WHERE u.id = _unit_id
      AND u.is_free = true
      AND u.published = true
  ) OR EXISTS (
    SELECT 1
    FROM public.flashcard_pack_units fpu
    JOIN public.flashcard_purchases fcp ON fcp.pack_id = fpu.pack_id
    WHERE fpu.unit_id = _unit_id
      AND fcp.user_id = _user_id
      AND fcp.status = 'active'
  ) OR EXISTS (
    SELECT 1
    FROM public.flashcard_pack_units fpu
    JOIN public.flashcard_packs fp ON fp.id = fpu.pack_id
    JOIN public.purchases pu ON pu.product_id = fp.product_id
    WHERE fpu.unit_id = _unit_id
      AND pu.user_id = _user_id
      AND pu.status IN ('active','completed')
  );
$function$;

-- Update dashboard summary to count both 'active' and 'completed' canonical purchases
-- when mirroring into the purchases array.
CREATE OR REPLACE FUNCTION public.fc_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _user IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT jsonb_build_object(
    'streak', (SELECT row_to_json(s) FROM public.flashcard_streaks s WHERE s.user_id = _user),
    'due_today', (
      SELECT COUNT(*) FROM public.flashcard_progress
      WHERE user_id = _user AND due_at <= now()
    ),
    'total_mastered', (
      SELECT COUNT(*) FROM public.flashcard_progress
      WHERE user_id = _user AND status = 'mastered'
    ),
    'units', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'unit_id', u.id, 'slug', u.slug, 'title', u.title_en,
        'total', (SELECT COUNT(*) FROM public.flashcards c WHERE c.unit_id = u.id AND c.published),
        'mastered', (
          SELECT COUNT(*) FROM public.flashcard_progress fp
          JOIN public.flashcards c ON c.id = fp.flashcard_id
          WHERE c.unit_id = u.id AND fp.user_id = _user AND fp.status = 'mastered'
        ),
        'has_access', public.fc_user_can_study_unit(_user, u.id)
      ) ORDER BY u.order_index), '[]'::jsonb)
      FROM public.flashcard_units u WHERE u.published
    ),
    'purchases', (
      SELECT COALESCE(jsonb_agg(row_to_json(purchases_union)), '[]'::jsonb)
      FROM (
        SELECT
          fcp.id,
          fcp.pack_id,
          fcp.status::text AS status,
          fcp.amount_cents,
          fcp.currency,
          fcp.purchased_at
        FROM public.flashcard_purchases fcp
        WHERE fcp.user_id = _user

        UNION ALL

        SELECT
          pu.id,
          fp.id AS pack_id,
          pu.status::text AS status,
          COALESCE(ROUND(pu.amount * 100)::int, fp.price_cents, 0) AS amount_cents,
          COALESCE(pu.currency, fp.currency, 'USD') AS currency,
          pu.created_at AS purchased_at
        FROM public.purchases pu
        JOIN public.flashcard_packs fp ON fp.product_id = pu.product_id
        WHERE pu.user_id = _user
          AND pu.status IN ('active','completed')
          AND NOT EXISTS (
            SELECT 1
            FROM public.flashcard_purchases fcp_existing
            WHERE fcp_existing.user_id = pu.user_id
              AND fcp_existing.pack_id = fp.id
              AND fcp_existing.status = 'active'
          )
      ) purchases_union
    )
  ) INTO _result;

  RETURN _result;
END;
$function$;