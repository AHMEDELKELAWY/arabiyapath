CREATE OR REPLACE FUNCTION public.fc_user_can_study_unit(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
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
  ) OR (
    NOT EXISTS (SELECT 1 FROM public.flashcard_pack_units)
    AND EXISTS (
      SELECT 1
      FROM public.flashcard_units u
      WHERE u.id = _unit_id
        AND u.published = true
    )
    AND EXISTS (
      SELECT 1
      FROM public.flashcard_packs fp
      WHERE fp.published = true
        AND public.fc_user_has_pack_access(_user_id, fp.id)
    )
  );
$function$;

GRANT EXECUTE ON FUNCTION public.fc_user_can_study_unit(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fc_user_can_study_unit(uuid, uuid) TO service_role;