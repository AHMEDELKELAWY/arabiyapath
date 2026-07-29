CREATE TABLE IF NOT EXISTS public.purchase_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  purchase_id uuid,
  provider_order_id text,
  provider_capture_id text,
  step text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.purchase_events TO authenticated;
GRANT ALL ON public.purchase_events TO service_role;

ALTER TABLE public.purchase_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view purchase events" ON public.purchase_events;
CREATE POLICY "Admins can view purchase events"
ON public.purchase_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS purchase_events_order_idx ON public.purchase_events (provider_order_id);
CREATE INDEX IF NOT EXISTS purchase_events_created_idx ON public.purchase_events (created_at DESC);

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
    'entitled', (
      public.user_has_active_membership(_user)
      OR EXISTS (SELECT 1 FROM public.flashcard_purchases fcp WHERE fcp.user_id = _user AND fcp.status = 'active')
      OR EXISTS (
        SELECT 1 FROM public.purchases pu
        JOIN public.flashcard_packs fp ON fp.product_id = pu.product_id
        WHERE pu.user_id = _user AND pu.status IN ('active','completed')
      )
    ),
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
        'is_free', u.is_free,
        'total', (SELECT COUNT(*) FROM public.flashcards c WHERE c.unit_id = u.id AND c.published),
        'mastered', (
          SELECT COUNT(*) FROM public.flashcard_progress fp
          JOIN public.flashcards c ON c.id = fp.flashcard_id
          WHERE c.unit_id = u.id AND fp.user_id = _user AND fp.status = 'mastered'
        ),
        'reviewed', (
          SELECT COUNT(*) FROM public.flashcard_progress fp
          JOIN public.flashcards c ON c.id = fp.flashcard_id
          WHERE c.unit_id = u.id AND fp.user_id = _user AND c.published
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