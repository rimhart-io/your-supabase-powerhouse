-- Run this in your Supabase SQL editor.
-- Registers Evolution Stone in items_catalog so inventory FK accepts it.

INSERT INTO public.items_catalog (key, name, description, price, icon)
VALUES (
  'evolution_stone',
  'Evolution Stone',
  'Use in Training to instantly max a Pokémon''s EVs, level, and friendship.',
  40000,
  '💎'
)
ON CONFLICT (key) DO NOTHING;
