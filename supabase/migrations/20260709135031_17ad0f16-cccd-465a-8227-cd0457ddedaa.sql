
-- 1) admin_notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  body text,
  related_user_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_notifications_created_idx ON public.admin_notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_notifications_unread_idx ON public.admin_notifications (read_at) WHERE read_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read notifications" ON public.admin_notifications;
CREATE POLICY "Admins can read notifications" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;
CREATE POLICY "Admins can update notifications" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete notifications" ON public.admin_notifications;
CREATE POLICY "Admins can delete notifications" ON public.admin_notifications
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Update handle_new_user trigger to also create a notification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _first text := NEW.raw_user_meta_data ->> 'first_name';
  _last  text := NEW.raw_user_meta_data ->> 'last_name';
  _country text := COALESCE(NEW.raw_user_meta_data ->> 'country', NEW.raw_user_meta_data ->> 'country_code');
  _source  text := COALESCE(NEW.raw_user_meta_data ->> 'source', NEW.raw_user_meta_data ->> 'utm_source', NEW.raw_user_meta_data ->> 'referrer');
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (NEW.id, _first, _last, NEW.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  INSERT INTO public.admin_notifications (type, title, body, related_user_id, meta)
  VALUES (
    'user_signup',
    'New user registered',
    COALESCE(NULLIF(TRIM(CONCAT_WS(' ', _first, _last)), ''), NEW.email),
    NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'first_name', _first,
      'last_name', _last,
      'country', _country,
      'source', _source,
      'registered_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$$;

-- 3) helpers
CREATE OR REPLACE FUNCTION public.admin_unread_notifications_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      (SELECT COUNT(*)::int FROM public.admin_notifications WHERE read_at IS NULL)
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _n int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.admin_notifications SET read_at = now() WHERE read_at IS NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;
