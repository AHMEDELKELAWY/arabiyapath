
-- 1) New Intermediate authoring fields on flashcard_units
ALTER TABLE public.flashcard_units
  ADD COLUMN IF NOT EXISTS lesson_topic TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_storage_path TEXT;

-- 2) Test questions table for Intermediate AI-generated tests
CREATE TABLE IF NOT EXISTS public.flashcard_unit_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.flashcard_units(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  question_type TEXT NOT NULL CHECK (question_type IN (
    'listening','vocabulary','grammar','sentence_ordering','fill_blank','reading_comprehension'
  )),
  question TEXT NOT NULL,
  passage TEXT,
  options JSONB,
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  audio_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_unit_tests TO authenticated;
GRANT ALL ON public.flashcard_unit_tests TO service_role;

ALTER TABLE public.flashcard_unit_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage unit tests"
  ON public.flashcard_unit_tests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Learners read published unit tests they can access"
  ON public.flashcard_unit_tests FOR SELECT
  TO authenticated
  USING (
    published = true
    AND public.fc_user_can_study_unit(auth.uid(), unit_id)
  );

CREATE INDEX IF NOT EXISTS flashcard_unit_tests_unit_idx
  ON public.flashcard_unit_tests(unit_id, order_index);

CREATE TRIGGER flashcard_unit_tests_updated_at
  BEFORE UPDATE ON public.flashcard_unit_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
