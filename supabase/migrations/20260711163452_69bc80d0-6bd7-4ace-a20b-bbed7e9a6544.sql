
CREATE TABLE public.user_learning_position (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug TEXT NOT NULL DEFAULT 'spoken-arabic',
  level_slug TEXT NOT NULL DEFAULT 'beginner',
  unit_slug TEXT NOT NULL,
  tab TEXT NOT NULL DEFAULT 'learn',
  card_index INT,
  question_index INT,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_learning_position TO authenticated;
GRANT ALL ON public.user_learning_position TO service_role;

ALTER TABLE public.user_learning_position ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own learning position"
  ON public.user_learning_position
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_learning_position_updated_at
  BEFORE UPDATE ON public.user_learning_position
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_learning_position_user ON public.user_learning_position(user_id, updated_at DESC);
