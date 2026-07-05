
-- Extend flashcard_kind enum with 'grammar' so grammar becomes a first-class card kind.
ALTER TYPE public.flashcard_kind ADD VALUE IF NOT EXISTS 'grammar';

-- Drop the legacy per-unit grammar lesson table; grammar is now stored as
-- individual cards in the flashcards table with kind='grammar'.
DROP TABLE IF EXISTS public.flashcard_unit_grammar CASCADE;

-- has_grammar is no longer needed; grammar tab visibility is derived from
-- whether the unit has any published grammar cards.
ALTER TABLE public.flashcard_units DROP COLUMN IF EXISTS has_grammar;
