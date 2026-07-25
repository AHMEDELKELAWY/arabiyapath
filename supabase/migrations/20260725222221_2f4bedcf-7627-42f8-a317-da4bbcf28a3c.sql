ALTER TABLE public.flashcard_unit_tests
  ADD COLUMN IF NOT EXISTS source_metadata jsonb;

COMMENT ON COLUMN public.flashcard_unit_tests.source_metadata IS 'Internal-only generation traceability: {source_type, source_id, source_snippet}. Never shown to students.';