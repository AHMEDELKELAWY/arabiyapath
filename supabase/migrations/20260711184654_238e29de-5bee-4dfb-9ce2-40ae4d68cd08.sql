CREATE OR REPLACE FUNCTION public.fc_mark_cards_reviewed(_card_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _count integer := 0;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  IF COALESCE(array_length(_card_ids, 1), 0) = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.flashcard_progress AS fp
    (user_id, flashcard_id, status, last_reviewed_at)
  SELECT DISTINCT
    _user,
    c.id,
    'review'::public.flashcard_status,
    now()
  FROM public.flashcards c
  WHERE c.id = ANY(_card_ids)
    AND c.published = true
    AND public.fc_user_can_study_unit(_user, c.unit_id)
  ON CONFLICT (user_id, flashcard_id) DO UPDATE SET
    status = CASE
      WHEN fp.status = 'mastered'::public.flashcard_status THEN fp.status
      ELSE 'review'::public.flashcard_status
    END,
    last_reviewed_at = EXCLUDED.last_reviewed_at,
    updated_at = now();

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.fc_mark_cards_reviewed(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fc_mark_cards_reviewed(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fc_mark_cards_reviewed(uuid[]) TO service_role;