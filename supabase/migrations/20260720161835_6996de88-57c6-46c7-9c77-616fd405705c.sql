-- Relax question_type constraint to allow the full set of types the AI generator and runner support.
ALTER TABLE public.flashcard_unit_tests DROP CONSTRAINT IF EXISTS flashcard_unit_tests_question_type_check;
ALTER TABLE public.flashcard_unit_tests ADD CONSTRAINT flashcard_unit_tests_question_type_check
  CHECK (question_type = ANY (ARRAY[
    'multiple_choice','grammar_selection','conversation_completion','vocab_in_context',
    'fill_in_blank','sentence_ordering','matching','reading_comprehension','audio',
    'listening','vocabulary','grammar','fill_blank'
  ]));

-- Add optional points column for future scoring.
ALTER TABLE public.flashcard_unit_tests ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 1;
ALTER TABLE public.flashcard_unit_tests ADD COLUMN IF NOT EXISTS difficulty text;
ALTER TABLE public.flashcard_unit_tests ADD COLUMN IF NOT EXISTS image_url text;