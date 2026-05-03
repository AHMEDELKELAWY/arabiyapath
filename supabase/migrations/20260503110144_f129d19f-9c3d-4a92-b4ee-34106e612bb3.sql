-- Restrict pending_orders "Service role full access" policy to service_role only
DROP POLICY IF EXISTS "Service role full access" ON public.pending_orders;

CREATE POLICY "Service role full access"
  ON public.pending_orders
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);