import { supabase } from "./supabase";
import type { Zone, GymDefinition, EliteFourDefinition } from "./regions";

// Cache en memoria para no repetir queries durante la sesión
const zoneCache = new Map<string, Zone[]>();
const gymCache = new Map<string, GymDefinition[]>();
const eliteFourCache = new Map<string, EliteFourDefinition>();

export async function getZonesForRegion(regionId: string): Promise<Zone[]> {
  if (zoneCache.has(regionId)) return zoneCache.get(regionId)!;

  const { data, error } = await supabase
    .from("zones")
    .select("*")
    .eq("region", regionId)
    .order("zone_index", { ascending: true });

  if (error || !data || data.length === 0) {
    if (error) {
      console.error(
        "Failed to load zones from Supabase, falling back to regions.ts",
        error,
      );
    }
    // Fallback
    const { REGIONS } = await import("./regions");
    return (REGIONS as any)[regionId]?.zones ?? [];
  }

  // Mapear snake_case de Supabase a camelCase que espera el código
  const zones: Zone[] = data.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    encounterRate: row.encounter_rate,
    trainerCount: row.trainer_count,
    battleBgId: row.battle_bg_id,
    referenceBst: row.reference_bst,
    wildPokemon: row.wild_pokemon ?? [],
    itemDrops: row.item_drops ?? [],
    isGym: row.is_gym ?? false,
    gymId: row.gym_id ?? null,
  }));

  zoneCache.set(regionId, zones);
  return zones;
}

export async function getGymsForRegion(
  regionId: string,
): Promise<GymDefinition[]> {
  if (gymCache.has(regionId)) return gymCache.get(regionId)!;

  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("region", regionId)
    .order("id", { ascending: true });

  if (error || !data || data.length === 0) {
    if (error) {
      console.error(
        "Failed to load gyms from Supabase, falling back to regions.ts",
        error,
      );
    }
    const { REGIONS } = await import("./regions");
    return (REGIONS as any)[regionId]?.gyms ?? [];
  }

  const gyms: GymDefinition[] = data.map((row: any) => ({
    id: row.id,
    leaderName: row.leader_name,
    badgeName: row.badge_name,
    type: row.type,
    unlockLevel: row.unlock_level,
    referenceBst: row.reference_bst,
    mechanic: row.mechanic,
    pokemon: row.pokemon ?? [],
    rewardItems: row.reward_items ?? [],
  }));

  gymCache.set(regionId, gyms);
  return gyms;
}

export async function getEliteFourForRegion(
  regionId: string,
): Promise<EliteFourDefinition> {
  if (eliteFourCache.has(regionId)) return eliteFourCache.get(regionId)!;

  const { data, error } = await supabase
    .from("elite_four")
    .select("*")
    .eq("region", regionId)
    .order("slot", { ascending: true });

  if (error || !data || data.length === 0) {
    if (error) {
      console.error(
        "Failed to load elite four from Supabase, falling back to regions.ts",
        error,
      );
    }
    const { REGIONS } = await import("./regions");
    return (
      (REGIONS as any)[regionId]?.eliteFour ?? {
        trainers: [],
        champion: null as any,
      }
    );
  }

  const trainers = data
    .filter((r: any) => r.role === "elite_four")
    .map((r: any) => ({ name: r.name, type: r.type, pokemon: r.pokemon }));

  const championRow = data.find((r: any) => r.role === "champion");
  const champion = championRow
    ? {
        name: championRow.name,
        type: championRow.type,
        pokemon: championRow.pokemon,
      }
    : (null as any);

  const result: EliteFourDefinition = { trainers, champion };
  eliteFourCache.set(regionId, result);
  return result;
}

// Invalida el cache de una región (útil si se actualiza la BD en caliente)
export function invalidateRegionCache(regionId: string) {
  zoneCache.delete(regionId);
  gymCache.delete(regionId);
  eliteFourCache.delete(regionId);
}
