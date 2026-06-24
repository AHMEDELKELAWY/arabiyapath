ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS image_width integer,
  ADD COLUMN IF NOT EXISTS image_height integer,
  ADD COLUMN IF NOT EXISTS image_size_kb integer;