-- Add affiliate role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';

-- Create affiliates table
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  affiliate_code text UNIQUE NOT NULL,
  commission_rate numeric DEFAULT 10.00,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  total_earnings numeric DEFAULT 0,
  paid_earnings numeric DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create affiliate_commissions table
CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  commission_amount numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add affiliate_id to coupons table
ALTER TABLE public.coupons 
ADD COLUMN affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL;

-- Add affiliate_id to purchases table
ALTER TABLE public.purchases 
ADD COLUMN affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliates table
CREATE POLICY "Affiliates can view own data" 
ON public.affiliates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Affiliates can update own data" 
ON public.affiliates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all affiliates" 
ON public.affiliates 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert affiliates" 
ON public.affiliates 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update affiliates" 
ON public.affiliates 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete affiliates" 
ON public.affiliates 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for affiliate_commissions table
CREATE POLICY "Affiliates can view own commissions" 
ON public.affiliate_commissions 
FOR SELECT 
USING (
  affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can view all commissions" 
ON public.affiliate_commissions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert commissions" 
ON public.affiliate_commissions 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update commissions" 
ON public.affiliate_commissions 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete commissions" 
ON public.affiliate_commissions 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at on affiliates
CREATE TRIGGER update_affiliates_updated_at
BEFORE UPDATE ON public.affiliates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();