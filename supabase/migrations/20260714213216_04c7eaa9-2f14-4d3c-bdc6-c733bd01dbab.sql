GRANT SELECT ON public.email_send_log TO authenticated;
DO $$ BEGIN
  CREATE POLICY "Admins can read email send log"
    ON public.email_send_log FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS email_send_log_created_at_idx ON public.email_send_log (created_at DESC);
CREATE INDEX IF NOT EXISTS email_send_log_message_id_idx ON public.email_send_log (message_id, created_at DESC);