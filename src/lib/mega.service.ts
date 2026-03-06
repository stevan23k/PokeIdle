import { supabase } from "./supabase";

export interface MegaEvolution {
  id: number;
  base_pokemon_id: number;
  mega_pokemon_id: number;
  mega_name: string;
  base_name: string;
  required_item: string;
  type_override: string[];
}

let _cache: MegaEvolution[] | null = null;

export async function loadMegaEvolutions(): Promise<MegaEvolution[]> {
  if (_cache) return _cache;

  const { data, error } = await supabase
    .from("mega_evolutions")
    .select("*")
    .order("base_pokemon_id");

  if (error) {
    console.error(
      "[MegaService] Error loading mega_evolutions:",
      error.message,
    );
    return [];
  }

  _cache = (data as MegaEvolution[]) ?? [];
  return _cache;
}

export function invalidateMegaCache(): void {
  _cache = null;
}

export async function getMegasForPokemon(
  basePokemonId: number,
): Promise<MegaEvolution[]> {
  const all = await loadMegaEvolutions();
  return all.filter((m) => m.base_pokemon_id === basePokemonId);
}

export function getMegasForPokemonSync(basePokemonId: number): MegaEvolution[] {
  if (!_cache) return [];
  return _cache.filter((m) => m.base_pokemon_id === basePokemonId);
}

export function canMegaEvolveSync(
  basePokemonId: number,
  playerItems: Record<string, number>,
  hasMegaBracelet: boolean,
  usedThisBattle: boolean,
): MegaEvolution[] {
  if (!hasMegaBracelet || usedThisBattle) return [];
  return getMegasForPokemonSync(basePokemonId).filter(
    (m) => (playerItems[m.required_item] ?? 0) > 0,
  );
}
