-- ============================================================
-- PokéClash: Card selling + Profile cosmetics
-- Run this in your Supabase SQL editor.
-- ============================================================

-- 1. Profile cosmetics columns -------------------------------
alter table public.profiles
  add column if not exists equipped_badge text,
  add column if not exists equipped_frame text;

-- 2. Cosmetics catalog ---------------------------------------
create table if not exists public.cosmetics_catalog (
  key         text primary key,
  type        text not null check (type in ('badge','frame')),
  name        text not null,
  description text not null default '',
  price       integer not null check (price >= 0),
  -- For badges: an emoji. For frames: a CSS gradient string.
  value       text not null
);

alter table public.cosmetics_catalog enable row level security;

drop policy if exists "cosmetics_catalog readable" on public.cosmetics_catalog;
create policy "cosmetics_catalog readable"
  on public.cosmetics_catalog for select
  to authenticated, anon
  using (true);

-- 3. User-owned cosmetics ------------------------------------
create table if not exists public.user_cosmetics (
  user_id       uuid not null references auth.users(id) on delete cascade,
  cosmetic_key  text not null references public.cosmetics_catalog(key) on delete cascade,
  acquired_at   timestamptz not null default now(),
  primary key (user_id, cosmetic_key)
);

alter table public.user_cosmetics enable row level security;

drop policy if exists "user_cosmetics own select" on public.user_cosmetics;
create policy "user_cosmetics own select"
  on public.user_cosmetics for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_cosmetics own insert" on public.user_cosmetics;
create policy "user_cosmetics own insert"
  on public.user_cosmetics for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_cosmetics own delete" on public.user_cosmetics;
create policy "user_cosmetics own delete"
  on public.user_cosmetics for delete
  to authenticated
  using (auth.uid() = user_id);

-- 4. Seed catalog --------------------------------------------
insert into public.cosmetics_catalog (key, type, name, description, price, value) values
  ('badge_star',     'badge', 'Rising Star',    'A shiny star to mark new trainers.',    1500,  '⭐'),
  ('badge_fire',     'badge', 'Blazing Spirit', 'For trainers who battle relentlessly.', 2500,  '🔥'),
  ('badge_crown',    'badge', 'Champion Crown', 'Wear the crown of a champion.',         5000,  '👑'),
  ('badge_diamond',  'badge', 'Diamond Elite',  'Premium badge for top trainers.',       8000,  '💎'),
  ('badge_dragon',   'badge', 'Dragon Master',  'Legendary mark of the dragon tamer.',   12000, '🐉'),
  ('frame_bronze',   'frame', 'Bronze Frame',   'A solid bronze frame.',                 3000,  'linear-gradient(135deg,#a97142,#5e3a1a)'),
  ('frame_silver',   'frame', 'Silver Frame',   'A polished silver frame.',              6000,  'linear-gradient(135deg,#e6e6e6,#8a8a8a)'),
  ('frame_gold',     'frame', 'Gold Frame',     'A luxurious gold frame.',              10000,  'linear-gradient(135deg,#ffe27a,#c8861d)'),
  ('frame_neon',     'frame', 'Neon Frame',     'Cyberpunk-glow neon edges.',           15000,  'linear-gradient(135deg,#00f0ff,#ff00e0,#00f0ff)'),
  ('frame_legend',   'frame', 'Legendary Holo', 'Holographic frame for elites.',         25000, 'conic-gradient(from 0deg,#ff4d4d,#ffd24d,#4dff88,#4dd2ff,#a64dff,#ff4d4d)')
on conflict (key) do nothing;
