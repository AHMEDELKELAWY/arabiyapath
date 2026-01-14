-- Create pending_orders table to store order data temporarily (PayPal custom_id has 127 char limit)
CREATE TABLE public.pending_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_type text,
  product_name text,
  amount numeric NOT NULL,
  coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  affiliate_id uuid REFERENCES affiliates(id) ON DELETE SET NULL,
  dialect_id text,
  level_id uuid,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Index for cleanup of expired orders
CREATE INDEX idx_pending_orders_expires ON pending_orders(expires_at);
CREATE INDEX idx_pending_orders_user ON pending_orders(user_id);

-- Enable RLS
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending orders
CREATE POLICY "Users can view own pending orders" ON pending_orders
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own pending orders
CREATE POLICY "Users can insert own pending orders" ON pending_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role handles all operations (for edge functions)
CREATE POLICY "Service role full access" ON pending_orders
  FOR ALL USING (true) WITH CHECK (true);