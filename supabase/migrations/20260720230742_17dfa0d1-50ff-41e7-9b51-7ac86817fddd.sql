
-- 1. Extend quiz_questions with difficulty, question_type, metadata
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'multiple_choice',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Difficulty check (allow NULL = treated as medium at read time)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quiz_questions_difficulty_check'
  ) THEN
    ALTER TABLE public.quiz_questions
      ADD CONSTRAINT quiz_questions_difficulty_check
      CHECK (difficulty IS NULL OR difficulty IN ('easy','medium','hard'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS quiz_questions_quiz_difficulty_idx
  ON public.quiz_questions (quiz_id, difficulty);

-- 2. quiz_attempt_questions: per-question history per attempt
CREATE TABLE IF NOT EXISTS public.quiz_attempt_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  was_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

GRANT SELECT ON public.quiz_attempt_questions TO authenticated;
GRANT ALL ON public.quiz_attempt_questions TO service_role;

ALTER TABLE public.quiz_attempt_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own attempt questions" ON public.quiz_attempt_questions;
CREATE POLICY "Users can view their own attempt questions"
  ON public.quiz_attempt_questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = quiz_attempt_questions.attempt_id
        AND qa.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS quiz_attempt_questions_attempt_idx
  ON public.quiz_attempt_questions (attempt_id);
CREATE INDEX IF NOT EXISTS quiz_attempt_questions_question_idx
  ON public.quiz_attempt_questions (question_id);
