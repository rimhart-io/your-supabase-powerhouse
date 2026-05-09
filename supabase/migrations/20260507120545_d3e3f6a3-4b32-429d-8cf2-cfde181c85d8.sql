
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_id int default 25,
  coins int not null default 200,
  starter_claimed boolean not null default false,
  wins int not null default 0,
  losses int not null default 0,
  campaign_progress int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable by all auth" on public.profiles for select to authenticated using (true);
create policy "user updates own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "user inserts own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Cards
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pokemon_id int not null,
  name text not null,
  types text[] not null,
  hp int not null,
  attack int not null,
  defense int not null,
  sp_atk int not null default 50,
  sp_def int not null default 50,
  speed int not null,
  rarity text not null,
  image_url text not null,
  moves jsonb not null,
  ability text not null default 'none',
  held_item text,
  level int not null default 5,
  xp int not null default 0,
  obtained_at timestamptz not null default now()
);
alter table public.cards enable row level security;
create policy "user reads own cards" on public.cards for select to authenticated using (auth.uid() = owner_id);
create policy "user inserts own cards" on public.cards for insert to authenticated with check (auth.uid() = owner_id);
create policy "user updates own cards" on public.cards for update to authenticated using (auth.uid() = owner_id);
create policy "user deletes own cards" on public.cards for delete to authenticated using (auth.uid() = owner_id);
create index cards_owner_idx on public.cards(owner_id);

-- Loadouts
create table public.loadouts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  card_ids uuid[] not null,
  updated_at timestamptz not null default now()
);
alter table public.loadouts enable row level security;
create policy "user reads own loadout" on public.loadouts for select to authenticated using (auth.uid() = user_id);
create policy "user upserts own loadout" on public.loadouts for insert to authenticated with check (auth.uid() = user_id);
create policy "user updates own loadout" on public.loadouts for update to authenticated using (auth.uid() = user_id);

-- Battles
create table public.battles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  result text not null,
  coins_earned int not null default 0,
  xp_earned int not null default 0,
  opponent_name text,
  player_team jsonb,
  opponent_team jsonb,
  created_at timestamptz not null default now()
);
alter table public.battles enable row level security;
create policy "user reads own battles" on public.battles for select to authenticated using (auth.uid() = user_id);
create policy "user inserts own battles" on public.battles for insert to authenticated with check (auth.uid() = user_id);

-- Redeem codes
create table public.redeem_codes (
  code text primary key,
  coins int not null,
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.redeem_codes enable row level security;
create policy "auth reads codes" on public.redeem_codes for select to authenticated using (true);
create policy "auth claims code" on public.redeem_codes for update to authenticated using (used_by is null) with check (auth.uid() = used_by);
create policy "auth inserts codes (admin)" on public.redeem_codes for insert to authenticated with check (true);

-- Items catalog
create table public.items_catalog (
  key text primary key,
  name text not null,
  description text not null,
  price int not null,
  icon text default '🎒'
);
alter table public.items_catalog enable row level security;
create policy "anyone reads items" on public.items_catalog for select to authenticated using (true);

insert into public.items_catalog (key, name, description, price, icon) values
  ('leftovers', 'Leftovers', 'Holder restores 1/16 max HP each turn.', 300, '🍱'),
  ('life_orb', 'Life Orb', 'Boosts move damage by 30% but holder loses 10% HP per attack.', 400, '🔮'),
  ('choice_band', 'Choice Band', 'Boosts physical attack by 50% but locks into first move.', 350, '🎗️'),
  ('choice_specs', 'Choice Specs', 'Boosts special attack by 50% but locks into first move.', 350, '👓'),
  ('choice_scarf', 'Choice Scarf', 'Boosts speed by 50% but locks into first move.', 350, '🧣'),
  ('sitrus_berry', 'Sitrus Berry', 'Restores 25% HP once when holder drops below half HP.', 200, '🍒'),
  ('focus_sash', 'Focus Sash', 'Endures one OHKO at full HP (one-time).', 450, '🎽');

-- Inventory
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null references public.items_catalog(key),
  qty int not null default 1,
  unique(user_id, item_key)
);
alter table public.inventory enable row level security;
create policy "user reads own inv" on public.inventory for select to authenticated using (auth.uid() = user_id);
create policy "user inserts own inv" on public.inventory for insert to authenticated with check (auth.uid() = user_id);
create policy "user updates own inv" on public.inventory for update to authenticated using (auth.uid() = user_id);
create policy "user deletes own inv" on public.inventory for delete to authenticated using (auth.uid() = user_id);
