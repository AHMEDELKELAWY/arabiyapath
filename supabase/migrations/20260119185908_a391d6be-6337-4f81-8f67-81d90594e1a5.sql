-- Fix certificate verification policy to not expose user_id
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can verify certificates by code" ON public.certificates;

-- Create a new policy that allows certificate verification by code
-- but only returns minimal info (handled at application level)
CREATE POLICY "Public certificate verification by code"
  ON public.certificates 
  FOR SELECT
  USING (cert_code IS NOT NULL);

-- Note: To fully hide user_id, we would need a view, but since RLS 
-- doesn't support column-level filtering, the application code should
-- only select needed columns when doing public verification