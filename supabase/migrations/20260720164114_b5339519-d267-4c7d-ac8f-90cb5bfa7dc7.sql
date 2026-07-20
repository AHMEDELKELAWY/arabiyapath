
ALTER TABLE public.flashcard_unit_tests
  ADD COLUMN IF NOT EXISTS skills_tested         text[]      DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS lesson_concepts       text[]      DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS vocabulary_used       text[]      DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS grammar_concepts_used text[]      DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ai_version            text,
  ADD COLUMN IF NOT EXISTS generated_at          timestamptz;

DO $$
DECLARE _c text;
BEGIN
  FOR _c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.flashcard_unit_tests'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%question_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.flashcard_unit_tests DROP CONSTRAINT %I', _c);
  END LOOP;
END $$;

ALTER TABLE public.flashcard_unit_tests
  ADD CONSTRAINT flashcard_unit_tests_question_type_check
  CHECK (question_type IN (
    'multiple_choice','grammar_selection','conversation_completion',
    'vocab_in_context','fill_in_blank','fill_blank',
    'sentence_ordering','word_ordering',
    'matching','reading_comprehension','listening_comprehension','audio',
    'true_false','image_question','choose_correct_sentence','find_the_mistake',
    'grammar','vocabulary','listening'
  ));
