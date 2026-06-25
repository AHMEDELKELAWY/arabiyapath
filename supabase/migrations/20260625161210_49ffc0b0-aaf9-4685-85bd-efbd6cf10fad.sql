
REVOKE SELECT ON public.quiz_questions FROM anon, authenticated;

GRANT SELECT (id, quiz_id, type, prompt, options_json, audio_url, order_index, created_at)
  ON public.quiz_questions TO authenticated;

GRANT SELECT (id, quiz_id, type, prompt, options_json, audio_url, order_index, created_at)
  ON public.quiz_questions TO anon;

GRANT ALL ON public.quiz_questions TO service_role;

CREATE OR REPLACE FUNCTION public.admin_get_quiz_questions(_quiz_id uuid)
RETURNS SETOF public.quiz_questions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.quiz_questions
  WHERE quiz_id = _quiz_id
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  ORDER BY order_index;
$$;

REVOKE ALL ON FUNCTION public.admin_get_quiz_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_quiz_questions(uuid) TO authenticated;
