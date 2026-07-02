
CREATE OR REPLACE FUNCTION public.user_can_access_unit(_unit_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR
    EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.levels l ON l.id = u.level_id
      WHERE u.id = _unit_id
        AND u.is_free = true
        AND u.order_index = 1
        AND l.order_index = 1
    )
    OR
    EXISTS (
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
