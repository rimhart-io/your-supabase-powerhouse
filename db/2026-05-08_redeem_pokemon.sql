-- Run this in your Supabase SQL editor.
-- Adds optional pokemon_id to redeem codes + restores admin insert policy.

ALTER TABLE public.redeem_codes
  ADD COLUMN IF NOT EXISTS pokemon_id integer;

ALTER TABLE public.redeem_codes
  ALTER COLUMN coins SET DEFAULT 0;

DROP POLICY IF EXISTS "auth inserts codes" ON public.redeem_codes;
CREATE POLICY "auth inserts codes"
  ON public.redeem_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

ALTER TABLE public.redeem_codes DROP CONSTRAINT IF EXISTS redeem_codes_coins_check;
ALTER TABLE public.redeem_codes ADD CONSTRAINT redeem_codes_coins_check CHECK (coins >= 0);
