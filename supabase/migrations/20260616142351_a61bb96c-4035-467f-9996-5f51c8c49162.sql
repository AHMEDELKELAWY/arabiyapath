-- Restore EXECUTE on the role-check helper that RLS policies across the schema rely on.
-- Without this, every RLS policy that calls has_role() fails with 42501,
-- causing 403s on profiles, user_roles, purchases, certificates, etc., for
-- every signed-in user.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;