// PokéAPI integration + card generation + battle types
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type MoveCategory = "physical" | "special" | "status";
export type StatusCondition = "burn" | "poison" | "paralysis" | "sleep" | "freeze" | null;
export type Weather = "sun" | "rain" | "sandstorm" | "hail" | null;
export type HazardKind = "stealth_rock" | "spikes" | "toxic_spikes";

export interface MoveEffect {
  kind: "status" | "stat" | "weather" | "hazard" | "heal" | "drain" | "flinch" | "priority";
  status?: StatusCondition;
  weather?: Weather;
  hazard?: HazardKind;
  stat?: "attack" | "defense" | "sp_atk" | "sp_def" | "speed";
  stages?: number; // -6 .. +6
  target?: "self" | "foe";
  chance?: number; // 0..1
}

export interface BattleMove {
  name: string;
  type: string;
  category: MoveCategory;
  power: number; // 0 for status
  accuracy: number; // 0..100
  pp: number;
  priority?: number;
  effect?: MoveEffect;
}

export type Ability =
  | "none"
  | "intimidate"
  | "levitate"
  | "sturdy"
  | "static"
  | "blaze"
  | "torrent"
  | "overgrow"
  | "swarm"
  | "drought"
  | "drizzle"
  | "sand_stream";

export interface EVs { hp: number; attack: number; defense: number; sp_atk: number; sp_def: number; speed: number }

export interface PokemonCard {
  pokemon_id: number;
  name: string;
  types: string[];
  hp: number;
  attack: number;
  defense: number;
  sp_atk: number;
  sp_def: number;
  speed: number;
  rarity: Rarity;
  image_url: string;
  moves: BattleMove[];
  ability: Ability;
  level?: number;
  xp?: number;
  held_item?: string | null;
  evs?: EVs;
  friendship?: number;
  training_count?: number;
}

const TOTAL_POKEMON = 386;

const LEGENDARY_IDS = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386];
const EPIC_IDS = [3, 6, 9, 18, 24, 36, 40, 51, 53, 59, 65, 68, 76, 78, 87, 94, 101, 105, 117, 119, 123, 130, 131, 134, 135, 136, 139, 141, 143, 149, 153, 156, 159, 169, 184, 196, 197, 212, 217, 229, 230, 232, 233, 248, 254, 257, 260, 269, 271, 274, 282, 289, 295, 306, 308, 310, 317, 319, 323, 330, 332, 340, 344, 346, 350, 354, 357, 359, 362, 365, 373, 376];
const RARE_IDS = [2, 5, 8, 12, 15, 17, 20, 22, 26, 28, 31, 34, 38, 42, 45, 47, 49, 55, 57, 62, 64, 67, 71, 73, 75, 80, 82, 85, 89, 91, 97, 99, 103, 108, 110, 112, 113, 115, 121, 124, 125, 126, 127, 128, 142, 169, 171, 178, 181, 184, 186, 192, 195, 199, 205, 208, 210, 213, 214, 224, 226, 230, 234, 237, 241, 242, 247, 253, 256, 259, 262, 264, 267, 272, 275, 278, 281, 284, 286, 288, 295, 297, 301, 303, 305, 312, 314, 321, 326, 329, 335, 337, 338, 340, 344, 348, 351, 358, 362, 365, 368, 369, 372, 375];

function classifyRarity(id: number): Rarity {
  if (LEGENDARY_IDS.includes(id)) return "legendary";
  if (EPIC_IDS.includes(id)) return "epic";
  if (RARE_IDS.includes(id)) return "rare";
  return "common";
}

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3,
};

function pickRarity(weights: Record<Rarity, number>): Rarity {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [rar, w] of Object.entries(weights) as [Rarity, number][]) {
    if (r < w) return rar;
    r -= w;
  }
  return "common";
}

function poolForRarity(rarity: Rarity): number[] {
  if (rarity === "legendary") return LEGENDARY_IDS;
  if (rarity === "epic") return EPIC_IDS;
  if (rarity === "rare") return RARE_IDS;
  const higher = new Set([...LEGENDARY_IDS, ...EPIC_IDS, ...RARE_IDS]);
  const out: number[] = [];
  for (let i = 1; i <= TOTAL_POKEMON; i++) if (!higher.has(i)) out.push(i);
  return out;
}

const cardCache = new Map<number, PokemonCard>();
const moveCache = new Map<string, BattleMove>();

function imageUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

const STATUS_EFFECT_MAP: Record<string, StatusCondition> = {
  burn: "burn",
  poison: "poison",
  "bad-poison": "poison",
  paralysis: "paralysis",
  sleep: "sleep",
  freeze: "freeze",
};

async function fetchMove(name: string): Promise<BattleMove> {
  if (moveCache.has(name)) return moveCache.get(name)!;
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/move/${name}`);
    if (!res.ok) throw new Error("move fetch fail");
    const d = await res.json();
    const cat = (d.damage_class?.name ?? "physical") as MoveCategory;
    const ailment = d.meta?.ailment?.name as string | undefined;
    const status: StatusCondition = ailment && STATUS_EFFECT_MAP[ailment] ? STATUS_EFFECT_MAP[ailment] : null;
    const chance = (d.meta?.ailment_chance ?? 0) / 100;
    let effect: MoveEffect | undefined;
    if (status && (cat === "status" || chance > 0)) {
      effect = { kind: "status", status, target: "foe", chance: cat === "status" ? 1 : chance || 0.3 };
    } else if (cat === "status" && d.stat_changes?.length) {
      const sc = d.stat_changes[0];
      const map: Record<string, MoveEffect["stat"]> = {
        attack: "attack",
        defense: "defense",
        "special-attack": "sp_atk",
        "special-defense": "sp_def",
        speed: "speed",
      };
      const stat = map[sc.stat?.name];
      if (stat) effect = { kind: "stat", stat, stages: sc.change, target: sc.change > 0 ? "self" : "foe", chance: 1 };
    }
    const move: BattleMove = {
      name: (d.name as string).replace(/-/g, " "),
      type: d.type?.name ?? "normal",
      category: cat,
      power: d.power ?? (cat === "status" ? 0 : 40),
      accuracy: d.accuracy ?? 100,
      pp: d.pp ?? 20,
      priority: d.priority ?? 0,
      effect,
    };
    moveCache.set(name, move);
    return move;
  } catch {
    const fallback: BattleMove = { name: name.replace(/-/g, " "), type: "normal", category: "physical", power: 40, accuracy: 100, pp: 20 };
    moveCache.set(name, fallback);
    return fallback;
  }
}

const ABILITY_BY_TYPE: Record<string, Ability[]> = {
  fire: ["blaze", "drought"],
  water: ["torrent", "drizzle"],
  grass: ["overgrow"],
  bug: ["swarm"],
  electric: ["static"],
  flying: ["levitate"],
  ground: ["sand_stream"],
  rock: ["sturdy", "sand_stream"],
  steel: ["sturdy"],
  normal: ["intimidate"],
};

function pickAbility(types: string[]): Ability {
  const candidates = types.flatMap(t => ABILITY_BY_TYPE[t] ?? []);
  if (!candidates.length) return "none";
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export async function fetchPokemonCard(id: number, forcedRarity?: Rarity): Promise<PokemonCard> {
  const cacheKey = id;
  if (cardCache.has(cacheKey) && !forcedRarity) return { ...cardCache.get(cacheKey)! };
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!res.ok) throw new Error("PokeAPI failed");
  const data = await res.json();
  const stats: Record<string, number> = {};
  for (const s of data.stats) stats[s.stat.name] = s.base_stat;
  const types: string[] = data.types.map((t: { type: { name: string } }) => t.type.name);

  // Pick 4 damage moves preferring level-up moves
  const moveNames = (data.moves as Array<{ move: { name: string } }>)
    .slice(0, 25)
    .map(m => m.move.name);
  // shuffle and pick 4
  const shuffled = [...moveNames].sort(() => Math.random() - 0.5).slice(0, 8);
  const fetched = await Promise.all(shuffled.map(fetchMove));
  // Prefer at least 3 damage moves + maybe 1 status
  const damage = fetched.filter(m => m.power > 0);
  const status = fetched.filter(m => m.power === 0);
  const moves: BattleMove[] = [];
  while (moves.length < 3 && damage.length) moves.push(damage.shift()!);
  if (status.length && moves.length < 4) moves.push(status[0]);
  while (moves.length < 4 && damage.length) moves.push(damage.shift()!);
  while (moves.length < 4) moves.push({ name: "tackle", type: "normal", category: "physical", power: 40, accuracy: 100, pp: 35 });

  const card: PokemonCard = {
    pokemon_id: id,
    name: (data.name as string).replace(/-/g, " "),
    types,
    hp: stats.hp ?? 50,
    attack: stats.attack ?? 50,
    defense: stats.defense ?? 50,
    sp_atk: stats["special-attack"] ?? 50,
    sp_def: stats["special-defense"] ?? 50,
    speed: stats.speed ?? 50,
    rarity: forcedRarity ?? classifyRarity(id),
    image_url: imageUrl(id),
    moves,
    ability: pickAbility(types),
    level: 5,
    xp: 0,
    held_item: null,
  };
  cardCache.set(cacheKey, card);
  return { ...card };
}

export async function generatePack(weights = RARITY_WEIGHTS, count = 3): Promise<PokemonCard[]> {
  const cards: PokemonCard[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    const rarity = pickRarity(weights);
    const pool = poolForRarity(rarity).filter(id => !used.has(id));
    const fallback = pool.length ? pool : poolForRarity(rarity);
    const id = fallback[Math.floor(Math.random() * fallback.length)];
    used.add(id);
    cards.push(await fetchPokemonCard(id, rarity));
  }
  return cards;
}

// ---- Type chart ----
const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

export function effectiveness(attackType: string, defenderTypes: string[]): number {
  let mult = 1;
  for (const dt of defenderTypes) mult *= TYPE_CHART[attackType]?.[dt] ?? 1;
  return mult;
}

export const TYPE_COLORS: Record<string, string> = {
  normal: "var(--type-normal)",
  fire: "var(--type-fire)",
  water: "var(--type-water)",
  electric: "var(--type-electric)",
  grass: "var(--type-grass)",
  ice: "var(--type-ice)",
  fighting: "var(--type-fighting)",
  poison: "var(--type-poison)",
  ground: "var(--type-ground)",
  flying: "var(--type-flying)",
  psychic: "var(--type-psychic)",
  bug: "var(--type-bug)",
  rock: "var(--type-rock)",
  ghost: "var(--type-ghost)",
  dragon: "var(--type-dragon)",
  dark: "var(--type-dark)",
  steel: "var(--type-steel)",
  fairy: "var(--type-fairy)",
};

// ---- Stats by level ----
// Level scaling: actual = floor((base*2 + 5) * level / 50) + 5  (HP gets +level)
export function statAt(base: number, level: number, isHp = false, ev = 0) {
  const evBonus = Math.floor(ev / 4);
  if (isHp) return Math.floor(((base * 2 + 31 + evBonus) * level) / 100) + level + 10;
  return Math.floor((((base * 2 + 5 + evBonus) * level) / 100) + 5);
}

export function levelToXp(level: number) {
  // simple cubic-ish curve
  return Math.floor(Math.pow(level, 2.4));
}
export function xpToNext(level: number) {
  return levelToXp(level + 1) - levelToXp(level);
}
