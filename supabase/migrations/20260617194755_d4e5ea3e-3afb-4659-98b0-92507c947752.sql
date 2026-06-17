
DROP POLICY IF EXISTS "cards public read published" ON public.flashcards;

CREATE POLICY "cards read with access"
ON public.flashcards
FOR SELECT
USING (
  published = true
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.flashcard_units u
      WHERE u.id = flashcards.unit_id
        AND u.is_free = true
        AND u.published = true
    )
    OR (
      auth.uid() IS NOT NULL
      AND public.fc_user_can_study_unit(auth.uid(), flashcards.unit_id)
    )
  )
);
