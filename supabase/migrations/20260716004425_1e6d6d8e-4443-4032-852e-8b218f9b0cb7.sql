
-- 1. Per-user Intermediate unit tab completion tracking
CREATE TABLE IF NOT EXISTS public.flashcard_intermediate_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.flashcard_units(id) ON DELETE CASCADE,
  listening_completed_at timestamptz,
  learn_completed_at timestamptz,
  grammar_completed_at timestamptz,
  test_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, unit_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_intermediate_progress TO authenticated;
GRANT ALL ON public.flashcard_intermediate_progress TO service_role;

ALTER TABLE public.flashcard_intermediate_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own intermediate progress select"
  ON public.flashcard_intermediate_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "own intermediate progress insert"
  ON public.flashcard_intermediate_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own intermediate progress update"
  ON public.flashcard_intermediate_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read all intermediate progress"
  ON public.flashcard_intermediate_progress FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_intermediate_progress_updated
  BEFORE UPDATE ON public.flashcard_intermediate_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Intermediate test attempt analytics
CREATE TABLE IF NOT EXISTS public.flashcard_intermediate_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.flashcard_units(id) ON DELETE CASCADE,
  score int NOT NULL,
  total int NOT NULL,
  percentage numeric(5,2) NOT NULL,
  passed boolean NOT NULL,
  started_at timestamptz,
  finished_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_int_test_attempts_user_unit
  ON public.flashcard_intermediate_test_attempts (user_id, unit_id, finished_at DESC);

GRANT SELECT, INSERT ON public.flashcard_intermediate_test_attempts TO authenticated;
GRANT ALL ON public.flashcard_intermediate_test_attempts TO service_role;

ALTER TABLE public.flashcard_intermediate_test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own test attempts select"
  ON public.flashcard_intermediate_test_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "own test attempts insert"
  ON public.flashcard_intermediate_test_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read all test attempts"
  ON public.flashcard_intermediate_test_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
