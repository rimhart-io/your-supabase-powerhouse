import type { PokemonCard, BattleMove, Ability, EVs } from "./pokemon";

export interface CardRow {
  id: string;
  owner_id: string;
  pokemon_id: number;
  name: string;
  types: string[];
  hp: number;
  attack: number;
  defense: number;
  sp_atk: number;
  sp_def: number;
  speed: number;
  rarity: string;
  image_url: string;
  moves: unknown;
  ability: string;
  held_item: string | null;
  level: number;
  xp: number;
  evs?: unknown;
  friendship?: number;
  training_count?: number;
}

export function rowToCard(r: CardRow): PokemonCard & { id: string } {
  return {
    id: r.id,
    pokemon_id: r.pokemon_id,
    name: r.name,
    types: r.types,
    hp: r.hp,
    attack: r.attack,
    defense: r.defense,
    sp_atk: r.sp_atk,
    sp_def: r.sp_def,
    speed: r.speed,
    rarity: r.rarity as PokemonCard["rarity"],
    image_url: r.image_url,
    moves: (r.moves as BattleMove[]) ?? [],
    ability: r.ability as Ability,
    held_item: r.held_item,
    level: r.level,
    xp: r.xp,
    evs: (r.evs as EVs | undefined) ?? { hp: 0, attack: 0, defense: 0, sp_atk: 0, sp_def: 0, speed: 0 },
    friendship: r.friendship ?? 50,
    training_count: r.training_count ?? 0,
  };
}

export function cardToInsert(c: PokemonCard, ownerId: string) {
  return {
    owner_id: ownerId,
    pokemon_id: c.pokemon_id,
    name: c.name,
    types: c.types,
    hp: c.hp,
    attack: c.attack,
    defense: c.defense,
    sp_atk: c.sp_atk,
    sp_def: c.sp_def,
    speed: c.speed,
    rarity: c.rarity,
    image_url: c.image_url,
    moves: c.moves as unknown as never,
    ability: c.ability,
    level: c.level ?? 5,
    xp: c.xp ?? 0,
    held_item: c.held_item ?? null,
  };
}
