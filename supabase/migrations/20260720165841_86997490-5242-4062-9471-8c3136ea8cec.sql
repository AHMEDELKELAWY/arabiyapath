
ALTER TABLE public.flashcard_unit_tests
  ADD COLUMN IF NOT EXISTS learning_objective text,
  ADD COLUMN IF NOT EXISTS cognitive_level smallint,
  ADD COLUMN IF NOT EXISTS estimated_time_seconds smallint,
  ADD COLUMN IF NOT EXISTS quality_score smallint,
  ADD COLUMN IF NOT EXISTS teaching_explanation text;
