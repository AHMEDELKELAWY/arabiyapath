CREATE TABLE public.unit_learning_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.flashcard_units(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('video_progress','video_ended','continue_click','step_completed')),
  step TEXT CHECK (step IN ('listening','learn','grammar','test')),
  watched_pct INTEGER CHECK (watched_pct BETWEEN 0 AND 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX unit_learning_events_user_unit_idx ON public.unit_learning_events (user_id, unit_id, created_at DESC);
CREATE INDEX unit_learning_events_unit_type_idx ON public.unit_learning_events (unit_id, event_type, created_at DESC);

GRANT SELECT, INSERT ON public.unit_learning_events TO authenticated;
GRANT ALL ON public.unit_learning_events TO service_role;

ALTER TABLE public.unit_learning_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own events"
  ON public.unit_learning_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own events"
  ON public.unit_learning_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all events"
  ON public.unit_learning_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Aggregated funnel view for admin reporting.
CREATE OR REPLACE FUNCTION public.admin_unit_funnel(_unit_id UUID)
RETURNS TABLE(
  step TEXT,
  reached BIGINT,
  completed BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH steps AS (
    SELECT unnest(ARRAY['listening','learn','grammar','test']) AS step
  )
  SELECT
    s.step,
    (
      SELECT COUNT(DISTINCT e.user_id)
      FROM public.unit_learning_events e
      WHERE e.unit_id = _unit_id AND e.step = s.step
    ) AS reached,
    (
      SELECT COUNT(DISTINCT e.user_id)
      FROM public.unit_learning_events e
      WHERE e.unit_id = _unit_id
        AND e.step = s.step
        AND e.event_type = 'step_completed'
    ) AS completed
  FROM steps s
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role);
$$;