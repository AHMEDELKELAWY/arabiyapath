
-- 1) Partners table
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  landing_enabled boolean NOT NULL DEFAULT true,
  campaign_title text,
  hero_title text,
  hero_subtitle text,
  cta_text text,
  price_override numeric,
  old_price numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view enabled partners"
  ON public.partners FOR SELECT
  USING (landing_enabled = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage partners"
  ON public.partners FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Backfill: ensure every affiliate has a linked coupon
DO $$
DECLARE
  a record;
  new_code text;
  suffix int;
BEGIN
  FOR a IN
    SELECT af.id, af.affiliate_code
    FROM public.affiliates af
    WHERE NOT EXISTS (SELECT 1 FROM public.coupons c WHERE c.affiliate_id = af.id)
  LOOP
    new_code := upper(a.affiliate_code);
    suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.coupons WHERE code = new_code) LOOP
      suffix := suffix + 1;
      new_code := upper(a.affiliate_code) || suffix::text;
    END LOOP;

    INSERT INTO public.coupons (code, percent_off, active, applies_to, affiliate_id, max_per_user)
    VALUES (new_code, 20, true, 'all', a.id, 1);
  END LOOP;
END $$;

-- 3) Reactivate HOURIA50 coupon (Houria Shafik partner)
UPDATE public.coupons SET active = true WHERE code = 'HOURIA50';

-- 4) Seed the Houria partner landing page
INSERT INTO public.partners (
  slug, display_name, affiliate_id, coupon_id,
  landing_enabled, campaign_title, hero_title, hero_subtitle, cta_text,
  price_override, old_price
)
SELECT
  'houria',
  'Houria',
  c.affiliate_id,
  c.id,
  true,
  'Exclusive for Houria''s Students',
  'Exclusive Offer for Houria''s Students',
  'Continue improving your Arabic every day with the ArabiyaPath Flashcards Course.',
  'Unlock My Discount',
  14.99,
  29.99
FROM public.coupons c
WHERE c.code = 'HOURIA50'
ON CONFLICT (slug) DO NOTHING;
