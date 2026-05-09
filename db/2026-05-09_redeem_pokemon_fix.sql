-- Ensures pokemon_id column exists and PostgREST picks it up.
-- Run this in your Supabase SQL editor.

ALTER TABLE public.redeem_codes
  ADD COLUMN IF NOT EXISTS pokemon_id integer;

ALTER TABLE public.redeem_codes
  ALTER COLUMN coins SET DEFAULT 0;

ALTER TABLE public.redeem_codes ALTER COLUMN coins DROP NOT NULL;
ALTER TABLE public.redeem_codes ALTER COLUMN coins SET NOT NULL;

-- Make sure inserts are still allowed for any authenticated user (admin uses a normal session).
DROP POLICY IF EXISTS "auth inserts codes" ON public.redeem_codes;
DROP POLICY IF EXISTS "auth inserts codes (admin)" ON public.redeem_codes;
CREATE POLICY "auth inserts codes"
  ON public.redeem_codes
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Tell PostgREST to reload its schema cache so pokemon_id is recognized immediately.
NOTIFY pgrst, 'reload schema';
