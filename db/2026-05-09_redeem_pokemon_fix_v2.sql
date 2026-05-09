-- Run this in your Supabase SQL editor to make Pokémon redeem codes work.
-- Safe to run multiple times.

-- 1. Add the column if it's missing
ALTER TABLE public.redeem_codes
  ADD COLUMN IF NOT EXISTS pokemon_id integer;

-- 2. Make coins optional (Pokémon codes use coins = 0)
ALTER TABLE public.redeem_codes
  ALTER COLUMN coins SET DEFAULT 0;

-- 3. At least one of (coins>0, pokemon_id) must be set
ALTER TABLE public.redeem_codes
  DROP CONSTRAINT IF EXISTS redeem_codes_reward_check;
ALTER TABLE public.redeem_codes
  ADD CONSTRAINT redeem_codes_reward_check
  CHECK (coins > 0 OR pokemon_id IS NOT NULL);

-- 4. Allow any authenticated user to insert (admin uses a normal session)
DROP POLICY IF EXISTS "auth inserts codes" ON public.redeem_codes;
CREATE POLICY "auth inserts codes"
  ON public.redeem_codes
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 5. CRUCIAL: tell PostgREST to reload its schema cache so the new
--    pokemon_id column is exposed to the JS client immediately.
NOTIFY pgrst, 'reload schema';
