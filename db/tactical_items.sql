-- Run this once against your own Supabase (SQL editor) to add the new tactical battle items.
INSERT INTO public.items_catalog (key, name, description, price, icon) VALUES
  ('x_attack',      'X Attack',      'Sharply raises your active fighter''s Attack (+1 stage).',      120, '💪'),
  ('x_defense',     'X Defense',     'Sharply raises your active fighter''s Defense (+1 stage).',     120, '🛡️'),
  ('x_speed',       'X Speed',       'Sharply raises your active fighter''s Speed (+1 stage).',       120, '🥾'),
  ('smoke_bomb',    'Smoke Bomb',    'Throws smoke at the foe — drops their Accuracy by 2 stages.',   150, '💨'),
  ('poison_vial',   'Poison Vial',   'Hurl at the foe to inflict Poison (chip damage each turn).',    180, '☠️'),
  ('burn_flask',    'Burn Flask',    'Splash to Burn the foe — chip damage and halved physical Atk.',180, '🔥'),
  ('paralyze_spray','Paralyze Spray','Mist the foe with Paralysis — slowed and may miss turns.',     180, '⚡'),
  ('sleep_powder',  'Sleep Powder',  'Puts the foe to Sleep for a few turns. They cannot act.',       220, '💤'),
  ('ether',         'Ether',         'Restores 10 PP to every move of your active fighter.',          150, '🧫'),
  ('power_pill',    'Power Pill',    'Doubles the damage of your active fighter''s NEXT move.',       260, '💊'),
  ('focus_tonic',   'Focus Tonic',   'Your next attack is a guaranteed CRITICAL HIT.',                200, '🎯'),
  ('iron_barrier',  'Iron Barrier',  'A barrier halves incoming damage for the next 2 enemy turns.',  220, '🪨')
ON CONFLICT (key) DO NOTHING;
