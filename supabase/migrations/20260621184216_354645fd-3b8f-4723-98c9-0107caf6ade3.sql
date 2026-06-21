
-- Security definer access function: gates unit content by purchase / free trial / admin
CREATE OR REPLACE FUNCTION public.user_can_access_unit(_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admins always
    public.has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Free trial: first unit of the first level
    EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.levels l ON l.id = u.level_id
      WHERE u.id = _unit_id
        AND u.order_index = 1
        AND l.order_index = 1
    )
    OR
    -- Authenticated user has a matching purchase
    EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.levels l ON l.id = u.level_id
      JOIN public.purchases pu ON pu.user_id = auth.uid()
      JOIN public.products pr ON pr.id = pu.product_id
      WHERE u.id = _unit_id
        AND pu.status IN ('active','completed')
        AND (
          pr.scope = 'all'
          OR (pr.scope = 'bundle' AND pr.dialect_id = l.dialect_id)
          OR (pr.scope = 'level'  AND pr.level_id  = l.id)
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_unit(uuid) TO anon, authenticated;

-- LESSONS: gate SELECT
DROP POLICY IF EXISTS "Anyone can view lessons" ON public.lessons;
CREATE POLICY "View lessons with access"
ON public.lessons
FOR SELECT
USING (public.user_can_access_unit(unit_id));

-- QUIZZES: gate SELECT
DROP POLICY IF EXISTS "Anyone can view quizzes" ON public.quizzes;
CREATE POLICY "View quizzes with access"
ON public.quizzes
FOR SELECT
USING (public.user_can_access_unit(unit_id));

-- QUIZ QUESTIONS: gate SELECT via parent quiz
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
CREATE POLICY "View quiz questions with access"
ON public.quiz_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.quizzes q
    WHERE q.id = quiz_questions.quiz_id
      AND public.user_can_access_unit(q.unit_id)
  )
);
