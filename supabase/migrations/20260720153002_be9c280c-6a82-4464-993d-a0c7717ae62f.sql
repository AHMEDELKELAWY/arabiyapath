
CREATE TABLE public.image_gen_debug_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  card_id UUID,
  user_id UUID,
  kind TEXT NOT NULL,
  vocabulary TEXT,
  status INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  reason TEXT,
  issues JSONB,
  image_prompt TEXT,
  validator_prompt TEXT,
  attempts INTEGER
);
GRANT SELECT ON public.image_gen_debug_log TO authenticated;
GRANT ALL ON public.image_gen_debug_log TO service_role;
ALTER TABLE public.image_gen_debug_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read image gen debug log"
ON public.image_gen_debug_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_image_gen_debug_log_created ON public.image_gen_debug_log (created_at DESC);
