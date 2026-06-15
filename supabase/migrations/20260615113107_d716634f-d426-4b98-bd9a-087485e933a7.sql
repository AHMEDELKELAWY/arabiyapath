
-- 1) Admin-only SELECT on funnel_subscribers (RLS denied by default before; make explicit)
DROP POLICY IF EXISTS "Admins can view funnel subscribers" ON public.funnel_subscribers;
CREATE POLICY "Admins can view funnel subscribers"
  ON public.funnel_subscribers
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Lesson-images storage: restrict writes to admins only
DROP POLICY IF EXISTS "Service role can upload lesson images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update lesson images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete lesson images" ON storage.objects;

CREATE POLICY "Admins can upload lesson images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lesson-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update lesson images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'lesson-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete lesson images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'lesson-images' AND public.has_role(auth.uid(), 'admin'));

-- 3) Recreate certificates_public view as SECURITY INVOKER
DROP VIEW IF EXISTS public.certificates_public;
CREATE VIEW public.certificates_public
WITH (security_invoker = on) AS
SELECT c.id,
       c.cert_code,
       c.issued_at,
       c.level_id,
       c.dialect_id,
       c.public_url,
       p.first_name,
       p.last_name
FROM public.certificates c
JOIN public.profiles p ON p.user_id = c.user_id;

GRANT SELECT ON public.certificates_public TO anon, authenticated;

-- 4) Revoke EXECUTE on SECURITY DEFINER helpers from anon/public
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) TO authenticated, service_role;
