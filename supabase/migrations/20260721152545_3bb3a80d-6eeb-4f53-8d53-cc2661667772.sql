ALTER TABLE public.flashcard_unit_tests
  ADD COLUMN IF NOT EXISTS category text
  CHECK (category IN ('listening','vocabulary','grammar'));

CREATE INDEX IF NOT EXISTS flashcard_unit_tests_unit_category_idx
  ON public.flashcard_unit_tests (unit_id, category);

-- Backfill category for existing rows using question_type heuristic.
UPDATE public.flashcard_unit_tests
SET category = CASE
  WHEN question_type IN ('listening_comprehension') THEN 'listening'
  WHEN question_type IN ('grammar_selection','find_the_mistake','choose_correct_sentence') THEN 'grammar'
  ELSE 'vocabulary'
END
WHERE category IS NULL;