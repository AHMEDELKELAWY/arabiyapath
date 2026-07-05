
-- 1. Toggle on units
ALTER TABLE public.flashcard_units
  ADD COLUMN IF NOT EXISTS has_grammar boolean NOT NULL DEFAULT false;

-- 2. Grammar content table
CREATE TABLE IF NOT EXISTS public.flashcard_unit_grammar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL UNIQUE REFERENCES public.flashcard_units(id) ON DELETE CASCADE,
  title text,
  explanation text,
  examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Grants
GRANT SELECT ON public.flashcard_unit_grammar TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.flashcard_unit_grammar TO authenticated;
GRANT ALL ON public.flashcard_unit_grammar TO service_role;

-- 4. RLS
ALTER TABLE public.flashcard_unit_grammar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grammar readable when unit enabled and studyable"
  ON public.flashcard_unit_grammar
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.flashcard_units u
      WHERE u.id = flashcard_unit_grammar.unit_id
        AND u.has_grammar = true
        AND u.published = true
    )
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.fc_user_can_study_unit(auth.uid(), flashcard_unit_grammar.unit_id)
    )
  );

CREATE POLICY "Admins can insert grammar"
  ON public.flashcard_unit_grammar
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update grammar"
  ON public.flashcard_unit_grammar
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete grammar"
  ON public.flashcard_unit_grammar
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. updated_at trigger
DROP TRIGGER IF EXISTS trg_flashcard_unit_grammar_updated_at ON public.flashcard_unit_grammar;
CREATE TRIGGER trg_flashcard_unit_grammar_updated_at
BEFORE UPDATE ON public.flashcard_unit_grammar
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
