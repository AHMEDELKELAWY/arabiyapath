ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS media_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.lesson_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  lesson_title text,
  action text NOT NULL,
  changed_fields text[] NOT NULL DEFAULT '{}',
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_revisions_lesson_id_idx
  ON public.lesson_revisions (lesson_id, created_at DESC);

GRANT SELECT ON public.lesson_revisions TO authenticated;
GRANT ALL ON public.lesson_revisions TO service_role;

ALTER TABLE public.lesson_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view lesson revisions" ON public.lesson_revisions;
CREATE POLICY "Admins can view lesson revisions"
ON public.lesson_revisions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.log_lesson_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _fields text[] := '{}';
  _changes jsonb := '{}'::jsonb;
  _cols text[] := ARRAY['title','arabic_text','transliteration','image_url','audio_url','order_index','unit_id','media_settings'];
  _col text;
  _old jsonb;
  _new jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lesson_revisions (lesson_id, lesson_title, action, changed_fields, changes, changed_by)
    VALUES (NEW.id, NEW.title, 'created', _cols, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.lesson_revisions (lesson_id, lesson_title, action, changed_fields, changes, changed_by)
    VALUES (OLD.id, OLD.title, 'deleted', _cols, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;

  _old := to_jsonb(OLD);
  _new := to_jsonb(NEW);

  FOREACH _col IN ARRAY _cols LOOP
    IF (_old -> _col) IS DISTINCT FROM (_new -> _col) THEN
      _fields := array_append(_fields, _col);
      _changes := _changes || jsonb_build_object(
        _col, jsonb_build_object('old', _old -> _col, 'new', _new -> _col)
      );
    END IF;
  END LOOP;

  IF array_length(_fields, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.lesson_revisions (lesson_id, lesson_title, action, changed_fields, changes, changed_by)
  VALUES (NEW.id, NEW.title, 'updated', _fields, _changes, auth.uid());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lessons_revision_log ON public.lessons;
CREATE TRIGGER lessons_revision_log
AFTER INSERT OR UPDATE OR DELETE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.log_lesson_revision();