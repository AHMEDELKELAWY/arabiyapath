-- Create a public view for certificate verification that excludes user_id
CREATE VIEW public.certificates_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    cert_code,
    issued_at,
    level_id,
    dialect_id,
    public_url
  FROM public.certificates;
-- Note: user_id is intentionally excluded for privacy

-- Grant access to the view
GRANT SELECT ON public.certificates_public TO anon, authenticated;

-- Update the certificate policy to be more restrictive for the base table
-- Keep existing policies for authenticated users/admins, but make public verification go through the view
DROP POLICY IF EXISTS "Public certificate verification by code" ON public.certificates;