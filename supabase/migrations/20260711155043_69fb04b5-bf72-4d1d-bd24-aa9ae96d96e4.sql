
-- 1) Courses
CREATE TABLE public.flashcard_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.flashcard_courses TO anon, authenticated;
GRANT ALL ON public.flashcard_courses TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.flashcard_courses TO authenticated;

ALTER TABLE public.flashcard_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published courses"
  ON public.flashcard_courses FOR SELECT
  USING (published = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage courses"
  ON public.flashcard_courses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_flashcard_courses_updated_at
  BEFORE UPDATE ON public.flashcard_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Levels
CREATE TABLE public.flashcard_course_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.flashcard_courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, slug)
);

GRANT SELECT ON public.flashcard_course_levels TO anon, authenticated;
GRANT ALL ON public.flashcard_course_levels TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.flashcard_course_levels TO authenticated;

ALTER TABLE public.flashcard_course_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published levels"
  ON public.flashcard_course_levels FOR SELECT
  USING (published = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage levels"
  ON public.flashcard_course_levels FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_flashcard_course_levels_updated_at
  BEFORE UPDATE ON public.flashcard_course_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Link units to a level (nullable — existing rows unaffected)
ALTER TABLE public.flashcard_units
  ADD COLUMN IF NOT EXISTS course_level_id UUID REFERENCES public.flashcard_course_levels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_flashcard_units_course_level_id ON public.flashcard_units(course_level_id);

-- 4) Seed: Spoken Arabic course with Beginner / Intermediate / Advanced
INSERT INTO public.flashcard_courses (slug, title_en, title_ar, description, order_index, published)
VALUES ('spoken-arabic', 'Spoken Arabic', 'العربية المحكية', 'Everyday spoken Arabic vocabulary and phrases.', 1, true)
ON CONFLICT (slug) DO NOTHING;

WITH c AS (SELECT id FROM public.flashcard_courses WHERE slug = 'spoken-arabic')
INSERT INTO public.flashcard_course_levels (course_id, slug, title_en, title_ar, order_index, published)
SELECT c.id, v.slug, v.title_en, v.title_ar, v.ord, true
FROM c, (VALUES
  ('beginner', 'Beginner', 'مبتدئ', 1),
  ('intermediate', 'Intermediate', 'متوسط', 2),
  ('advanced', 'Advanced', 'متقدم', 3)
) AS v(slug, title_en, title_ar, ord)
ON CONFLICT (course_id, slug) DO NOTHING;

-- 5) Backfill: assign all existing units to Beginner
UPDATE public.flashcard_units u
SET course_level_id = l.id
FROM public.flashcard_course_levels l
JOIN public.flashcard_courses c ON c.id = l.course_id
WHERE c.slug = 'spoken-arabic'
  AND l.slug = 'beginner'
  AND u.course_level_id IS NULL;
