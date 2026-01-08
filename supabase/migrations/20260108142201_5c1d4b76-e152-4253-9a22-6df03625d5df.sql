-- Add PayPal-related columns to purchases table
ALTER TABLE public.purchases 
ADD COLUMN IF NOT EXISTS product_type text,
ADD COLUMN IF NOT EXISTS product_name text,
ADD COLUMN IF NOT EXISTS amount numeric(10,2),
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS paypal_order_id text,
ADD COLUMN IF NOT EXISTS paypal_capture_id text,
ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id),
ADD COLUMN IF NOT EXISTS dialect_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchases_paypal_capture_id ON public.purchases(paypal_capture_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);

-- Create function to increment coupon usage
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET current_uses = COALESCE(current_uses, 0) + 1
  WHERE id = coupon_id;
END;
$$;

-- Add current_uses column to coupons if it doesn't exist
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS current_uses integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percent integer,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;