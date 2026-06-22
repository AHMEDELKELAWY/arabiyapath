CREATE TYPE public.flashcard_kind AS ENUM ('learn','speaking');

ALTER TABLE public.flashcards
  ADD COLUMN kind public.flashcard_kind NOT NULL DEFAULT 'speaking';

CREATE INDEX flashcards_unit_kind_order_idx
  ON public.flashcards (unit_id, kind, order_index);