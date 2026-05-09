
-- Add EVs and friendship to cards (training progress)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS evs jsonb NOT NULL DEFAULT '{"hp":0,"attack":0,"defense":0,"sp_atk":0,"sp_def":0,"speed":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS friendship integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS training_count integer NOT NULL DEFAULT 0;

-- Training sessions log
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id uuid NOT NULL,
  focus text NOT NULL,
  xp_gained integer NOT NULL DEFAULT 0,
  ev_gained integer NOT NULL DEFAULT 0,
  coins_spent integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own training" ON public.training_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user inserts own training" ON public.training_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add a couple of consumable items to catalog
INSERT INTO public.items_catalog (key, name, description, price, icon) VALUES
  ('potion', 'Potion', 'Restore 50% HP of active fighter (in-battle, single use)', 80, '🧪'),
  ('super_potion', 'Super Potion', 'Fully heal active fighter (in-battle, single use)', 200, '💊'),
  ('revive', 'Revive', 'Revive a fainted ally to 50% HP (in-battle, single use)', 250, '✨'),
  ('xp_candy', 'XP Candy', 'Train: instant +40 XP to one card', 60, '🍬')
ON CONFLICT (key) DO NOTHING;
