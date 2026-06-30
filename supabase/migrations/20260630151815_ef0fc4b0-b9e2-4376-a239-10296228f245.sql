
-- 1) is_free flag on units; free access now requires the flag
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;

UPDATE public.units u
SET is_free = true
WHERE u.id IN (
  SELECT u2.id
  FROM public.units u2
  JOIN public.levels l ON l.id = u2.level_id
  WHERE u2.order_index = 1 AND l.order_index = 1
);

CREATE OR REPLACE FUNCTION public.user_can_access_unit(_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    -- Admins always
    public.has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Free trial: unit is explicitly marked free
    EXISTS (
      SELECT 1 FROM public.units u
      WHERE u.id = _unit_id AND u.is_free = true
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
$function$;

-- 2) Remove the bootstrap bypass in fc_user_can_study_unit
CREATE OR REPLACE FUNCTION public.fc_user_can_study_unit(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.flashcard_units u
    WHERE u.id = _unit_id
      AND u.is_free = true
      AND u.published = true
  ) OR EXISTS (
    SELECT 1
    FROM public.flashcard_pack_units fpu
    JOIN public.flashcard_purchases fcp ON fcp.pack_id = fpu.pack_id
    WHERE fpu.unit_id = _unit_id
      AND fcp.user_id = _user_id
      AND fcp.status = 'active'
  ) OR EXISTS (
    SELECT 1
    FROM public.flashcard_pack_units fpu
    JOIN public.flashcard_packs fp ON fp.id = fpu.pack_id
    JOIN public.purchases pu ON pu.product_id = fp.product_id
    WHERE fpu.unit_id = _unit_id
      AND pu.user_id = _user_id
      AND pu.status IN ('active','completed')
  );
$function$;

-- 3) Allow anonymous funnel sign-ups (public lead-capture form)
CREATE POLICY "Anyone can subscribe to funnel"
  ON public.funnel_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

GRANT INSERT ON public.funnel_subscribers TO anon;

-- 4) Forbid secret-looking keys in payment_providers.config
ALTER TABLE public.payment_providers
  ADD CONSTRAINT payment_providers_config_no_secrets
  CHECK (
    NOT (
      config ? 'secret'
      OR config ? 'api_key'
      OR config ? 'apiKey'
      OR config ? 'private_key'
      OR config ? 'privateKey'
      OR config ? 'client_secret'
      OR config ? 'clientSecret'
      OR config ? 'password'
      OR config ? 'token'
    )
  );

COMMENT ON COLUMN public.payment_providers.config IS
  'Non-sensitive display/configuration metadata only. Secrets (API keys, client secrets, tokens) must live in environment variables / Vault — never here.';
