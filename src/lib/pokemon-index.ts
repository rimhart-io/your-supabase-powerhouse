// Lightweight index of Gen 1–3 Pokémon (id + name) for the admin browser.
export interface PokemonIndexEntry {
  id: number;
  name: string;
  sprite: string;
}

const TOTAL = 386;

let cache: PokemonIndexEntry[] | null = null;
let inflight: Promise<PokemonIndexEntry[]> | null = null;

export async function getPokemonIndex(): Promise<PokemonIndexEntry[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${TOTAL}`);
    if (!res.ok) throw new Error("Failed to load Pokémon index");
    const json = (await res.json()) as { results: { name: string; url: string }[] };
    const list: PokemonIndexEntry[] = json.results.map((r, i) => {
      const id = i + 1;
      return {
        id,
        name: r.name.replace(/-/g, " "),
        sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
      };
    });
    cache = list;
    return list;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
