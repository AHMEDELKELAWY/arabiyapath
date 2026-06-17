
-- Restrict pack-unit mappings to admins or users who own the pack
DROP POLICY IF EXISTS "pack_units public read" ON public.flashcard_pack_units;

CREATE POLICY "pack_units owner or admin read"
ON public.flashcard_pack_units
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.fc_user_has_pack_access(auth.uid(), pack_id)
);

-- Remove client-side INSERT on pending_orders; edge functions use service role
DROP POLICY IF EXISTS "Users can insert own pending orders" ON public.pending_orders;
