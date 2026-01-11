-- Add level_id column to purchases table for level-based access tracking
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS level_id uuid REFERENCES public.levels(id);