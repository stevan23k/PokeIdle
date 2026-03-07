import { getCached, setCached } from "../../../utils/cache";
import type {
  ActiveMove,
  ActivePokemon,
  PokemonStats,
} from "../types/game.types";
import { generateUid } from "../../../utils/random";
import {
  generateRandomIVs,
  getZeroEVs,
  getRandomNature,
  calculateStats,
} from "../../../engine/stats.engine";

import {
  isLegendaryOrMythical,
  canAppearInWild,
  getLegendaryCategory,
} from "../../../lib/legendaries";
import { supabase } from "../../../lib/supabase";

const API_BASE = "https://pokeapi.co/api/v2";

const COMMON_SELF_BOOSTS: Record<number, { stat: string; stages: number }> = {
  14: { stat: "spe", stages: 2 }, // Agilidad
  56: { stat: "atk", stages: 2 }, // Danza Espada
  87: { stat: "def", stages: 1 }, // Fortaleza (Harden)
  116: { stat: "def", stages: 2 }, // Defensa Férrea (Iron Defense)
  156: { stat: "spa", stages: 1 }, // Carga
  164: { stat: "crit", stages: 2 }, // Foco de Energía (Focus Energy - usually +2 crit ratio)
  207: { stat: "spe", stages: 1 }, // Subir velocidad (varios)
  239: { stat: "atk", stages: 1 }, // Dragon Dance (atk) - Note: officially also speed
  349: { stat: "atk", stages: 1 }, // Agudeza
};

function mapAilment(
  ailmentName: string,
): import("../types/game.types").StatusCondition | null {
  switch (ailmentName) {
    case "paralysis":
      return "PAR";
    case "burn":
      return "BRN";
    case "poison":
      return "PSN";
    case "toxic":
      return "TOX";
    case "sleep":
      return "SLP";
    case "freeze":
      return "FRZ";
    default:
      return null;
  }
}

export async function fetchJson(url: string, signal?: AbortSignal) {
  const cached = getCached(url);
  if (cached) return cached;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const data = await res.json();
  setCached(url, data);
  return data;
}

export function getFrontSprite(id: number, shiny: boolean = false): string {
  const suffix = shiny ? "shiny/" : "";
  // Showdown gifs are nice, but if they fail we'll fallback in UI
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${suffix}${id}.gif`;
}

export function getStaticSprite(id: number, shiny: boolean = false): string {
  const suffix = shiny ? "shiny/" : "";
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${suffix}${id}.png`;
}

const statNameMap: Record<string, keyof ActivePokemon["stats"]> = {
  hp: "hp",
  attack: "attack",
  defense: "defense",
  "special-attack": "spAtk",
  "special-defense": "spDef",
  speed: "speed",
};

export async function getPokemonData(
  id: number,
  level: number,
  shiny: boolean = false,
  forcedIVs?: PokemonStats,
  forcedNature?: string,
): Promise<ActivePokemon> {
  // 1. Try Supabase cache first
  try {
    const { data: cachedPokemon } = await supabase
      .from("pokemon_cache")
      .select("*")
      .eq("pokemon_id", id)
      .maybeSingle();

    if (cachedPokemon) {
      // Filter level-up moves from cache
      const eligibleMoves = (
        cachedPokemon.level_up_moves as { moveId: number; level: number }[]
      )
        .filter((m) => m.level <= level)
        .sort((a, b) => b.level - a.level)
        .slice(0, 8);

      const moveIds = eligibleMoves.map((m) => m.moveId);
      const { data: cachedMoves } = await supabase
        .from("move_cache")
        .select("*")
        .in("move_id", moveIds);

      const activeMoves: ActiveMove[] = [];
      for (const m of eligibleMoves) {
        if (activeMoves.length >= 4) break;
        const md = cachedMoves?.find((c) => c.move_id === m.moveId);
        if (!md) continue;
        if ((!md.power || md.power === 0) && activeMoves.length >= 2) continue;

        activeMoves.push({
          moveId: md.move_id,
          moveName: md.name_es,
          type: md.type,
          category: md.category,
          power: md.power,
          accuracy: md.accuracy ?? 100,
          currentPP: md.pp,
          maxPP: md.pp,
          priority: md.priority ?? 0,
          enabled: true,
          statusEffect: md.ailment
            ? {
                condition: md.ailment as any,
                chance: md.ailment_chance ?? 100,
              }
            : undefined,
          selfBoost: COMMON_SELF_BOOSTS[md.move_id] as any,
        });
      }

      // Fallback move
      if (activeMoves.length === 0) {
        activeMoves.push({
          moveId: 33,
          moveName: "Placaje",
          type: "normal",
          category: "physical",
          power: 40,
          accuracy: 100,
          currentPP: 35,
          maxPP: 35,
          priority: 0,
          enabled: true,
        });
      }

      const ivs = forcedIVs || generateRandomIVs();
      const evs = getZeroEVs();
      const nature = forcedNature || getRandomNature();
      const stats = calculateStats(
        cachedPokemon.base_stats,
        ivs,
        evs,
        level,
        nature,
      );
      const maxHP = stats.hp;

      return {
        uid: generateUid(),
        pokemonId: id,
        name:
          cachedPokemon.name.charAt(0).toUpperCase() +
          cachedPokemon.name.slice(1),
        nickname: null,
        level,
        xp: Math.pow(level, 3),
        xpToNext: Math.pow(level + 1, 3),
        currentHP: maxHP,
        maxHP,
        baseStats: cachedPokemon.base_stats,
        ivs,
        evs,
        nature,
        stats,
        types: cachedPokemon.types,
        moves: activeMoves,
        status: null,
        statModifiers: {
          atk: 0,
          def: 0,
          spa: 0,
          spd: 0,
          spe: 0,
          acc: 0,
          eva: 0,
          crit: 0,
        },
        heldItem: null,
        isShiny: shiny,
        caughtAt: "Zona desconocida",
        caughtLevel: level,
      };
    }
  } catch (e) {
    console.error("Supabase cache fetch failed, falling back to PokeAPI", e);
  }

  // 2. Fallback to PokeAPI
  const data = await fetchJson(`${API_BASE}/pokemon/${id}`);

  const baseStats: any = {};
  data.stats.forEach((s: any) => {
    const key = statNameMap[s.stat.name];
    if (key) {
      baseStats[key] = s.base_stat;
    }
  });

  const types = data.types.map((t: any) => t.type.name);

  // Extract level-up moves
  const movesToCheck = data.moves.filter((m: any) => {
    return m.version_group_details.some(
      (v: any) =>
        v.move_learn_method.name === "level-up" && v.level_learned_at <= level,
    );
  });

  // Get top 10 most recent moves by level learned
  const moveLevels = movesToCheck
    .map((m: any) => {
      const vg = m.version_group_details
        .filter(
          (v: any) =>
            v.move_learn_method.name === "level-up" &&
            v.level_learned_at <= level,
        )
        .sort((a: any, b: any) => b.level_learned_at - a.level_learned_at)[0];
      return { url: m.move.url, learnedAt: vg.level_learned_at };
    })
    .sort((a: any, b: any) => b.learnedAt - a.learnedAt)
    .slice(0, 8); // top 8 moves

  const activeMoves: ActiveMove[] = [];
  for (const mw of moveLevels) {
    if (activeMoves.length >= 4) break;

    try {
      const md = await fetchJson(mw.url);
      // Simplify logic: use damaging moves mostly, or status if we want
      if (md.power && md.power > 0) {
        const spanText =
          md.names.find((n: any) => n.language.name === "es")?.name || md.name;

        let statusEffect = undefined;
        if (md.meta && md.meta.ailment && md.meta.ailment.name !== "none") {
          const condition = mapAilment(md.meta.ailment.name);
          if (condition) {
            statusEffect = {
              condition,
              chance: md.meta.ailment_chance || 100,
            };
          }
        }

        activeMoves.push({
          moveId: md.id,
          moveName: spanText,
          type: md.type.name,
          category: md.damage_class.name,
          power: md.power,
          accuracy: md.accuracy || 100,
          currentPP: md.pp || 10,
          maxPP: md.pp || 10,
          priority: md.priority || 0,
          enabled: true,
          statusEffect,
          selfBoost: COMMON_SELF_BOOSTS[md.id] as any,
        });
      }
    } catch (e) {
      console.error("Error fetching move", e);
    }
  }

  // Fallback move
  if (activeMoves.length === 0) {
    activeMoves.push({
      moveId: 33,
      moveName: "Placaje",
      type: "normal",
      category: "physical",
      power: 40,
      accuracy: 100,
      currentPP: 35,
      maxPP: 35,
      priority: 0,
      enabled: true,
    });
  }

  const ivs = forcedIVs || generateRandomIVs();
  const evs = getZeroEVs();
  const nature = forcedNature || getRandomNature();
  const stats = calculateStats(baseStats, ivs, evs, level, nature);
  const maxHP = stats.hp;

  return {
    uid: generateUid(),
    pokemonId: id,
    name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
    nickname: null,
    level,
    xp: Math.pow(level, 3),
    xpToNext: Math.pow(level + 1, 3),
    currentHP: maxHP,
    maxHP,
    baseStats,
    ivs,
    evs,
    nature,
    stats,
    types,
    moves: activeMoves,
    status: null,
    statModifiers: {
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0,
      acc: 0,
      eva: 0,
      crit: 0,
    },
    heldItem: null,
    isShiny: shiny,
    caughtAt: "Zona desconocida",
    caughtLevel: level,
  };
}

export async function getPokemonSpecies(id: number) {
  try {
    const { data: cached } = await supabase
      .from("species_cache")
      .select("*")
      .eq("pokemon_id", id)
      .maybeSingle();

    if (cached) {
      return {
        name: cached.name.toLowerCase(),
        is_legendary: cached.is_legendary,
        is_mythical: cached.is_mythical,
        evolves_from_species: cached.evolves_from_id
          ? {
              url: `https://pokeapi.co/api/v2/pokemon-species/${cached.evolves_from_id}/`,
            }
          : null,
        evolution_chain: cached.evolution_chain_url
          ? { url: cached.evolution_chain_url }
          : null,
      };
    }
  } catch (e) {
    console.error("species_cache fetch failed, falling back to PokeAPI", e);
  }
  return await fetchJson(`${API_BASE}/pokemon-species/${id}`);
}

export async function getEvolutionChain(url: string) {
  return await fetchJson(url);
}

/**
 * Checks if a Pokémon is a "starter" (base form or legendary/mythical).
 * Uses local legendaries.ts as a fast path before hitting PokeAPI.
 */
export async function isStarterMaterial(id: number): Promise<boolean> {
  // Fast path: known legendaries/mythicals from local registry
  if (isLegendaryOrMythical(id)) return true;
  try {
    const species = await getPokemonSpecies(id);
    return (
      species.evolves_from_species === null ||
      species.is_legendary ||
      species.is_mythical
    );
  } catch {
    return false;
  }
}

/**
 * Returns true if this Pokémon can appear as a wild encounter.
 * Legendaries and mythicals are blocked; UBs and Paradox can appear in late zones.
 * Uses local registry first, falls back to PokeAPI for unknown IDs.
 */
export async function isWildEncounterAllowed(id: number): Promise<boolean> {
  if (!canAppearInWild(id)) return false;
  try {
    const species = await getPokemonSpecies(id);
    if (species.is_legendary || species.is_mythical) return false;
    return true;
  } catch {
    return canAppearInWild(id);
  }
}

/**
 * Sync (no API) version — use when async is not possible.
 * Based purely on local legendaries registry.
 */
export function isWildEncounterAllowedSync(id: number): boolean {
  return canAppearInWild(id);
}

export async function fetchEggMoves(id: number): Promise<number[]> {
  const data = await fetchJson(`${API_BASE}/pokemon/${id}`);
  return data.moves
    .filter((m: any) =>
      m.version_group_details.some(
        (v: any) => v.move_learn_method.name === "egg",
      ),
    )
    .map((m: any) => {
      const parts = m.move.url.split("/");
      return parseInt(parts[parts.length - 2]);
    });
}

/**
 * Fetches any new moves the Pokémon can learn exactly at `newLevel`
 * and merges them into its current moveset (max 4 moves, drop oldest).
 * Returns null if no changes were made.
 */
export async function learnMovesOnLevelUp(
  pokemon: import("../types/game.types").ActivePokemon,
  newLevel: number,
  fromLevel?: number, // if passed, checks all moves in the range (fromLevel, newLevel]
): Promise<import("../types/game.types").ActiveMove | null> {
  try {
    // Fast path: usar pokemon_cache para encontrar el movimiento del nivel
    const { data: cachedPokemon } = await supabase
      .from("pokemon_cache")
      .select("level_up_moves")
      .eq("pokemon_id", pokemon.pokemonId)
      .maybeSingle();

    if (cachedPokemon) {
      const minLevel = fromLevel != null ? fromLevel + 1 : newLevel;

      // Filter all levels in the range, sorted by level descending
      const matches = (
        cachedPokemon.level_up_moves as { moveId: number; level: number }[]
      )
        .filter((m) => m.level >= minLevel && m.level <= newLevel)
        .sort((a, b) => b.level - a.level);

      // Return the first one the Pokemon doesn't know yet
      for (const match of matches) {
        if (pokemon.moves.some((m) => m.moveId === match.moveId)) continue;

        const { data: md } = await supabase
          .from("move_cache")
          .select("*")
          .eq("move_id", match.moveId)
          .maybeSingle();

        if (!md) continue;

        return {
          moveId: md.move_id,
          moveName: md.name_es,
          type: md.type,
          category: md.category,
          power: md.power,
          accuracy: md.accuracy ?? 100,
          currentPP: md.pp,
          maxPP: md.pp,
          priority: md.priority ?? 0,
          enabled: true,
          statusEffect: md.ailment
            ? { condition: md.ailment as any, chance: md.ailment_chance ?? 100 }
            : undefined,
          selfBoost: COMMON_SELF_BOOSTS[md.move_id] as any,
        };
      }
      return null;
    }

    // Fallback to PokeAPI
    const data = await fetchJson(`${API_BASE}/pokemon/${pokemon.pokemonId}`);

    // Find moves learned exactly at this new level
    const newMoveCandidates = data.moves.filter((m: any) =>
      m.version_group_details.some(
        (v: any) =>
          v.move_learn_method.name === "level-up" &&
          v.level_learned_at === newLevel,
      ),
    );

    if (newMoveCandidates.length === 0) return null;

    // Only take the first new move to avoid too many API calls
    const candidate = newMoveCandidates[0];
    const md = await fetchJson(candidate.move.url);

    // Check if we already have this move
    if (pokemon.moves.some((m) => m.moveId === md.id)) return null;

    const moveName =
      md.names.find((n: any) => n.language.name === "es")?.name ?? md.name;

    let statusEffect = undefined;
    if (md.meta && md.meta.ailment && md.meta.ailment.name !== "none") {
      const condition = mapAilment(md.meta.ailment.name);
      if (condition) {
        statusEffect = {
          condition,
          chance: md.meta.ailment_chance || 100,
        };
      }
    }

    const newMove: import("../types/game.types").ActiveMove = {
      moveId: md.id,
      moveName,
      type: md.type.name,
      category: md.damage_class.name,
      power: md.power,
      accuracy: md.accuracy || 100,
      currentPP: md.pp || 10,
      maxPP: md.pp || 10,
      priority: md.priority || 0,
      enabled: true,
      statusEffect,
      selfBoost: COMMON_SELF_BOOSTS[md.id] as any,
    };

    return newMove;
  } catch {
    return null;
  }
}

/**
 * Retorna todos los movimientos que el Pokémon debería saber hasta su nivel actual
 * pero que NO están en su moveset. Ordenados de más reciente a más antiguo.
 * Usado por el Recordador de Movimientos.
 */
export async function getMissingMoves(
  pokemon: import("../types/game.types").ActivePokemon,
): Promise<import("../types/game.types").ActiveMove[]> {
  try {
    const { data: cachedPokemon } = await supabase
      .from("pokemon_cache")
      .select("level_up_moves")
      .eq("pokemon_id", pokemon.pokemonId)
      .maybeSingle();

    if (!cachedPokemon) return [];

    const allLevelMoves = (
      cachedPokemon.level_up_moves as { moveId: number; level: number }[]
    )
      .filter((m) => m.level <= pokemon.level)
      .sort((a, b) => b.level - a.level); // más reciente primero

    // Filtrar los que ya sabe
    const knownIds = new Set(pokemon.moves.map((m) => m.moveId));
    const missing = allLevelMoves.filter((m) => !knownIds.has(m.moveId));

    if (missing.length === 0) return [];

    // Fetch move data para los primeros 12 faltantes (evitar demasiadas queries)
    const moveIds = missing.slice(0, 12).map((m) => m.moveId);
    const { data: movesData } = await supabase
      .from("move_cache")
      .select("*")
      .in("move_id", moveIds);

    if (!movesData) return [];

    const result: import("../types/game.types").ActiveMove[] = [];
    for (const m of missing.slice(0, 12)) {
      const md = movesData.find((d) => d.move_id === m.moveId);
      if (!md) continue;
      result.push({
        moveId: md.move_id,
        moveName: md.name_es,
        type: md.type,
        category: md.category,
        power: md.power ?? 0,
        accuracy: md.accuracy ?? 100,
        currentPP: md.pp,
        maxPP: md.pp,
        priority: md.priority ?? 0,
        enabled: true,
        statusEffect: md.ailment
          ? { condition: md.ailment as any, chance: md.ailment_chance ?? 100 }
          : undefined,
      });
    }

    return result;
  } catch (e) {
    console.error("[getMissingMoves] Error:", e);
    return [];
  }
}

export async function fetchAllPokemonList(): Promise<
  { id: number; name: string }[]
> {
  const url = `${API_BASE}/pokemon?limit=1025`;
  const data = await fetchJson(url);
  return data.results.map((r: any) => {
    const parts = r.url.split("/");
    return {
      id: parseInt(parts[parts.length - 2]),
      name: r.name,
    };
  });
}
