
-- 1) Course units: allow active Membership to unlock all units.
CREATE OR REPLACE FUNCTION public.user_can_access_unit(_unit_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_has_active_membership(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.levels l ON l.id = u.level_id
      WHERE u.id = _unit_id
        AND u.is_free = true
        AND u.order_index = 1
        AND l.order_index = 1
    )
    OR EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.levels l ON l.id = u.level_id
      JOIN public.purchases pu ON pu.user_id = auth.uid()
      JOIN public.products pr ON pr.id = pu.product_id
      WHERE u.id = _unit_id
        AND pu.status IN ('active','completed')
        AND (
          pr.scope = 'all'
          OR (pr.scope = 'bundle' AND pr.dialect_id = l.dialect_id)
          OR (pr.scope = 'level'  AND pr.level_id  = l.id)
        )
    );
$function$;

-- 2) Flash Cards units: allow active Membership to study all units.
CREATE OR REPLACE FUNCTION public.fc_user_can_study_unit(_user_id uuid, _unit_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    public.user_has_active_membership(_user_id)
    OR EXISTS (
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

GRANT EXECUTE ON FUNCTION public.user_has_active_membership(uuid) TO authenticated, anon;
