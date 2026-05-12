You picked 5 big features. Building all at once would be a mess (each touches DB schema + UI + game logic), so I'll ship them in 3 phases. You approve, I build Phase 1, then we move on.

## Phase 1 — Progression Layer (foundation everything else builds on)

### 1. Trainer Level + XP
- New columns on `profiles`: `trainer_xp`, `trainer_level`
- Earn XP from battles, training, opening packs, evolving
- Level-up rewards: coins, free packs at milestones (lv 5, 10, 20…)
- New header pill on dashboard: level + XP bar

### 2. Achievements
- New tables: `achievements_catalog` (key, name, desc, icon, tier, reward_coins) + `user_achievements` (user_id, key, unlocked_at)
- ~25 achievements: "Catch 'em (10/50/151)", "Win 10/100 battles", "Evolve your first Pokémon", "Open a Legendary pack", "Reach Trainer Lv 10", etc.
- New `/achievements` route with grid of cards (locked/unlocked)
- Toast notification when unlocked

### 3. Pokémon Evolution + Move Learning
- Evolution chain data baked into `src/lib/pokemon-evolutions.ts` (static map, 1st gen)
- "Evolve" button on card detail — requires level threshold (or stone for stone-evos, you already have stones)
- Replaces card with evolved form, keeps EVs/level, learns evolution-stage moves
- Level-up move learning: when a card hits levels 10/20/30/40, prompt to learn a new move (replace one of 4)

## Phase 2 — Game Modes

### 4. Tournament Mode (Bracket)
- New `/tournament` route, 8-trainer single-elimination
- Pre-built AI rosters of escalating power
- Win all 3 rounds → guaranteed Legendary pack + trophy
- One run per day (cooldown stored on profile)
- Bracket UI with your progress through the tree

### 5. Wild Encounters
- Random Pokémon appears on dashboard every X minutes
- Click to enter a quick "catch" mini-battle
- Throw Pokéballs (consume from inventory) — catch rate based on HP remaining + ball quality
- New ball items in shop: Poké/Great/Ultra/Master Ball
- Caught Pokémon goes to your collection

## Phase 3 — Social

### 6. Trading System
- New tables: `trade_offers` (from_user, to_user, offered_card_ids, requested_card_ids, status)
- Trade page: search trainers by username, browse their cards, propose a trade
- Accept/reject/cancel flow
- Locks cards while trade is pending

---

## Technical notes

- **Lovable Cloud**: needed for new tables (achievements, trade_offers, etc.) and new profile columns. Already enabled.
- **Migrations**: each phase = 1 schema migration.
- **Server functions**: trading + tournaments need server-side validation (can't trust client for "did you win", "do you own these cards").
- **No new image assets** for evolution (uses PokéAPI sprites already in use). Tournament + achievements get small UI icons only — no big PNGs, keeps file size lean.

## What I'll do right now (after you approve)

Build **Phase 1 end-to-end**: Trainer Level, Achievements, Evolution + Move Learning. That alone makes the game massively deeper and is ~3 migrations + 4–5 new files + edits to battle/training/pack-open/dashboard. Then I'll check in with you before Phase 2.

Sound good? Reply "go" or tell me to reorder / drop something.