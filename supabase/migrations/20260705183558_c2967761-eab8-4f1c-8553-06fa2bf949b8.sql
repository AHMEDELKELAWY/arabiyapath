
-- Fix Data API grants for flashcard_unit_grammar (missing entirely)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_unit_grammar TO authenticated;
GRANT ALL ON public.flashcard_unit_grammar TO service_role;

-- Allow admins to read grammar for any unit (existing SELECT policy is scoped to
-- has_grammar=true AND published=true, which blocks editing drafts).
DROP POLICY IF EXISTS "Admins can select grammar" ON public.flashcard_unit_grammar;
CREATE POLICY "Admins can select grammar"
ON public.flashcard_unit_grammar
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
