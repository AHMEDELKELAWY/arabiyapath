
INSERT INTO public.flashcard_purchases (user_id, pack_id, provider_code, status, amount_cents, currency, purchased_at)
SELECT
  pu.user_id,
  fp.id,
  'paypal',
  'active',
  COALESCE(fp.price_cents, 0),
  COALESCE(fp.currency, 'USD'),
  pu.created_at
FROM public.purchases pu
JOIN public.flashcard_packs fp ON fp.product_id = pu.product_id
WHERE pu.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.flashcard_purchases existing
    WHERE existing.user_id = pu.user_id
      AND existing.pack_id = fp.id
      AND existing.status = 'active'
  );
