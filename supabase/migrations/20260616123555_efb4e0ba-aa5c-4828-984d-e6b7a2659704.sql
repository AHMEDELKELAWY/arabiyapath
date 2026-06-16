
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.flashcard_status AS ENUM ('new','learning','review','mastered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.flashcard_rating AS ENUM ('again','hard','good','easy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.flashcard_purchase_status AS ENUM ('pending','active','refunded','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ payment_providers ============
CREATE TABLE IF NOT EXISTS public.payment_providers (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_providers TO anon, authenticated;
GRANT ALL ON public.payment_providers TO service_role;
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers public read active" ON public.payment_providers
  FOR SELECT USING (is_active = true);
CREATE POLICY "providers admin all" ON public.payment_providers
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.payment_providers (code, display_name, is_active, config)
VALUES ('paypal','PayPal',true,'{}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ============ flashcard_units ============
CREATE TABLE IF NOT EXISTS public.flashcard_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_en text NOT NULL,
  title_ar text,
  description text,
  order_index int NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  cover_image_url text,
  published boolean NOT NULL DEFAULT false,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flashcard_units TO anon, authenticated;
GRANT ALL ON public.flashcard_units TO service_role;
ALTER TABLE public.flashcard_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units public read published" ON public.flashcard_units
  FOR SELECT USING (published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "units admin all" ON public.flashcard_units
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ flashcards ============
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.flashcard_units(id) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 0,
  arabic_text text NOT NULL,
  english_translation text NOT NULL,
  transliteration text,
  example_arabic text,
  example_english text,
  image_url text,
  image_alt text,
  audio_url text,
  audio_example_url text,
  notes text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flashcards_unit_idx ON public.flashcards(unit_id, order_index);
GRANT SELECT ON public.flashcards TO anon, authenticated;
GRANT ALL ON public.flashcards TO service_role;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cards public read published" ON public.flashcards
  FOR SELECT USING (
    published = true OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "cards admin all" ON public.flashcards
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ flashcard_packs ============
CREATE TABLE IF NOT EXISTS public.flashcard_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  price_cents int NOT NULL DEFAULT 1900,
  currency text NOT NULL DEFAULT 'USD',
  access_type text NOT NULL DEFAULT 'lifetime',
  cover_image_url text,
  seo_title text,
  seo_description text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flashcard_packs TO anon, authenticated;
GRANT ALL ON public.flashcard_packs TO service_role;
ALTER TABLE public.flashcard_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packs public read published" ON public.flashcard_packs
  FOR SELECT USING (published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "packs admin all" ON public.flashcard_packs
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ flashcard_pack_units (M:N) ============
CREATE TABLE IF NOT EXISTS public.flashcard_pack_units (
  pack_id uuid NOT NULL REFERENCES public.flashcard_packs(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.flashcard_units(id) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 0,
  PRIMARY KEY (pack_id, unit_id)
);
GRANT SELECT ON public.flashcard_pack_units TO anon, authenticated;
GRANT ALL ON public.flashcard_pack_units TO service_role;
ALTER TABLE public.flashcard_pack_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pack_units public read" ON public.flashcard_pack_units
  FOR SELECT USING (true);
CREATE POLICY "pack_units admin all" ON public.flashcard_pack_units
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ flashcard_progress ============
CREATE TABLE IF NOT EXISTS public.flashcard_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  status public.flashcard_status NOT NULL DEFAULT 'new',
  ease_factor real NOT NULL DEFAULT 2.5,
  interval_days int NOT NULL DEFAULT 0,
  repetitions int NOT NULL DEFAULT 0,
  due_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  lapses int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  incorrect_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, flashcard_id)
);
CREATE INDEX IF NOT EXISTS fp_user_due_idx ON public.flashcard_progress(user_id, due_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_progress TO authenticated;
GRANT ALL ON public.flashcard_progress TO service_role;
ALTER TABLE public.flashcard_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress self select" ON public.flashcard_progress
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "progress self write" ON public.flashcard_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress self update" ON public.flashcard_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress self delete" ON public.flashcard_progress
  FOR DELETE USING (auth.uid() = user_id);

-- ============ flashcard_review_log ============
CREATE TABLE IF NOT EXISTS public.flashcard_review_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  rating public.flashcard_rating NOT NULL,
  prev_interval int,
  new_interval int,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS frl_user_idx ON public.flashcard_review_log(user_id, reviewed_at DESC);
GRANT SELECT, INSERT ON public.flashcard_review_log TO authenticated;
GRANT ALL ON public.flashcard_review_log TO service_role;
ALTER TABLE public.flashcard_review_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log self select" ON public.flashcard_review_log
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "log self insert" ON public.flashcard_review_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ flashcard_streaks ============
CREATE TABLE IF NOT EXISTS public.flashcard_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_active_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.flashcard_streaks TO authenticated;
GRANT ALL ON public.flashcard_streaks TO service_role;
ALTER TABLE public.flashcard_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streak self select" ON public.flashcard_streaks
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "streak self upsert" ON public.flashcard_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "streak self update" ON public.flashcard_streaks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ flashcard_purchases ============
CREATE TABLE IF NOT EXISTS public.flashcard_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id uuid NOT NULL REFERENCES public.flashcard_packs(id) ON DELETE RESTRICT,
  provider_code text NOT NULL REFERENCES public.payment_providers(code),
  provider_order_id text,
  provider_capture_id text,
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  coupon_id uuid,
  discount_cents int NOT NULL DEFAULT 0,
  status public.flashcard_purchase_status NOT NULL DEFAULT 'pending',
  purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fcp_user_idx ON public.flashcard_purchases(user_id, status);
GRANT SELECT ON public.flashcard_purchases TO authenticated;
GRANT ALL ON public.flashcard_purchases TO service_role;
ALTER TABLE public.flashcard_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases self select" ON public.flashcard_purchases
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "purchases admin all" ON public.flashcard_purchases
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ updated_at triggers ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'payment_providers','flashcard_units','flashcards','flashcard_packs',
    'flashcard_progress','flashcard_streaks','flashcard_purchases'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ============ Access function ============
CREATE OR REPLACE FUNCTION public.fc_user_has_pack_access(_user_id uuid, _pack_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flashcard_purchases
    WHERE user_id = _user_id AND pack_id = _pack_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.fc_user_can_study_unit(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flashcard_units u WHERE u.id = _unit_id AND u.is_free = true
  ) OR EXISTS (
    SELECT 1
    FROM public.flashcard_pack_units pu
    JOIN public.flashcard_purchases p ON p.pack_id = pu.pack_id
    WHERE pu.unit_id = _unit_id AND p.user_id = _user_id AND p.status = 'active'
  );
$$;

-- ============ SM-2 review function ============
CREATE OR REPLACE FUNCTION public.fc_apply_review(_card_id uuid, _rating public.flashcard_rating)
RETURNS public.flashcard_progress
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _unit uuid;
  _prev public.flashcard_progress%ROWTYPE;
  _ease real;
  _reps int;
  _interval int;
  _status public.flashcard_status;
  _prev_interval int;
  _today date := (now() AT TIME ZONE 'utc')::date;
  _result public.flashcard_progress%ROWTYPE;
  _streak public.flashcard_streaks%ROWTYPE;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT unit_id INTO _unit FROM public.flashcards WHERE id = _card_id;
  IF _unit IS NULL THEN RAISE EXCEPTION 'card not found'; END IF;
  IF NOT public.fc_user_can_study_unit(_user, _unit) THEN
    RAISE EXCEPTION 'no access to this unit';
  END IF;

  SELECT * INTO _prev FROM public.flashcard_progress
    WHERE user_id = _user AND flashcard_id = _card_id;

  _ease := COALESCE(_prev.ease_factor, 2.5);
  _reps := COALESCE(_prev.repetitions, 0);
  _prev_interval := COALESCE(_prev.interval_days, 0);

  -- SM-2
  IF _rating = 'again' THEN
    _reps := 0; _interval := 1;
    _ease := GREATEST(1.3, _ease - 0.2);
    _status := 'learning';
  ELSE
    _reps := _reps + 1;
    IF _reps = 1 THEN _interval := 1;
    ELSIF _reps = 2 THEN _interval := 6;
    ELSE _interval := GREATEST(1, ROUND(_prev_interval * _ease)::int);
    END IF;
    IF _rating = 'hard' THEN
      _ease := GREATEST(1.3, _ease - 0.15);
      _interval := GREATEST(1, ROUND(_interval * 0.8)::int);
      _status := 'review';
    ELSIF _rating = 'good' THEN
      _status := CASE WHEN _reps >= 4 THEN 'mastered'::public.flashcard_status ELSE 'review'::public.flashcard_status END;
    ELSE -- easy
      _ease := _ease + 0.15;
      _interval := ROUND(_interval * 1.3)::int;
      _status := CASE WHEN _reps >= 3 THEN 'mastered'::public.flashcard_status ELSE 'review'::public.flashcard_status END;
    END IF;
  END IF;

  INSERT INTO public.flashcard_progress AS p
    (user_id, flashcard_id, status, ease_factor, interval_days, repetitions, due_at, last_reviewed_at, lapses, correct_count, incorrect_count)
  VALUES (
    _user, _card_id, _status, _ease, _interval, _reps,
    now() + (_interval || ' days')::interval, now(),
    CASE WHEN _rating='again' THEN COALESCE(_prev.lapses,0)+1 ELSE COALESCE(_prev.lapses,0) END,
    CASE WHEN _rating='again' THEN COALESCE(_prev.correct_count,0) ELSE COALESCE(_prev.correct_count,0)+1 END,
    CASE WHEN _rating='again' THEN COALESCE(_prev.incorrect_count,0)+1 ELSE COALESCE(_prev.incorrect_count,0) END
  )
  ON CONFLICT (user_id, flashcard_id) DO UPDATE SET
    status = EXCLUDED.status,
    ease_factor = EXCLUDED.ease_factor,
    interval_days = EXCLUDED.interval_days,
    repetitions = EXCLUDED.repetitions,
    due_at = EXCLUDED.due_at,
    last_reviewed_at = EXCLUDED.last_reviewed_at,
    lapses = EXCLUDED.lapses,
    correct_count = EXCLUDED.correct_count,
    incorrect_count = EXCLUDED.incorrect_count,
    updated_at = now()
  RETURNING * INTO _result;

  INSERT INTO public.flashcard_review_log (user_id, flashcard_id, rating, prev_interval, new_interval)
  VALUES (_user, _card_id, _rating, _prev_interval, _interval);

  -- streak
  SELECT * INTO _streak FROM public.flashcard_streaks WHERE user_id = _user;
  IF NOT FOUND THEN
    INSERT INTO public.flashcard_streaks (user_id, current_streak, longest_streak, last_active_date)
    VALUES (_user, 1, 1, _today);
  ELSIF _streak.last_active_date = _today THEN
    NULL;
  ELSIF _streak.last_active_date = _today - 1 THEN
    UPDATE public.flashcard_streaks SET
      current_streak = _streak.current_streak + 1,
      longest_streak = GREATEST(_streak.longest_streak, _streak.current_streak + 1),
      last_active_date = _today,
      updated_at = now()
    WHERE user_id = _user;
  ELSE
    UPDATE public.flashcard_streaks SET
      current_streak = 1,
      longest_streak = GREATEST(_streak.longest_streak, 1),
      last_active_date = _today,
      updated_at = now()
    WHERE user_id = _user;
  END IF;

  RETURN _result;
END;
$$;

-- ============ Dashboard summary ============
CREATE OR REPLACE FUNCTION public.fc_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _user IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT jsonb_build_object(
    'streak', (SELECT row_to_json(s) FROM public.flashcard_streaks s WHERE s.user_id = _user),
    'due_today', (
      SELECT COUNT(*) FROM public.flashcard_progress
      WHERE user_id = _user AND due_at <= now()
    ),
    'total_mastered', (
      SELECT COUNT(*) FROM public.flashcard_progress
      WHERE user_id = _user AND status = 'mastered'
    ),
    'units', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'unit_id', u.id, 'slug', u.slug, 'title', u.title_en,
        'total', (SELECT COUNT(*) FROM public.flashcards c WHERE c.unit_id = u.id AND c.published),
        'mastered', (
          SELECT COUNT(*) FROM public.flashcard_progress fp
          JOIN public.flashcards c ON c.id = fp.flashcard_id
          WHERE c.unit_id = u.id AND fp.user_id = _user AND fp.status = 'mastered'
        )
      ) ORDER BY u.order_index), '[]'::jsonb)
      FROM public.flashcard_units u WHERE u.published
    ),
    'purchases', (
      SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb)
      FROM public.flashcard_purchases p WHERE p.user_id = _user
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fc_apply_review(uuid, public.flashcard_rating) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fc_user_has_pack_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fc_user_can_study_unit(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fc_dashboard_summary() TO authenticated;
