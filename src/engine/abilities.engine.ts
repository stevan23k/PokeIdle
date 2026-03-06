import { calculateStats } from "./stats.engine";
import type {
  ActivePokemon,
  ActiveMove,
} from "../features/run/types/game.types";

/**
 * Handles "Stance Change" for Aegislash (IDs 681 and 10034).
 * Switches forms based on the move category or if King's Shield (ID 588) is used.
 */
export function handleStanceChange(
  pokemon: ActivePokemon,
  move: ActiveMove,
): { updatedPokemon: ActivePokemon; log?: string } {
  // Aegislash IDs: 681 (Shield), 10034 (Blade)
  const isAegislash = pokemon.pokemonId === 681 || pokemon.pokemonId === 10034;
  if (!isAegislash) return { updatedPokemon: pokemon };

  const isKingsShield = move.moveId === 588;
  const isAttack = move.category !== "status";

  let targetId = pokemon.pokemonId;
  let formSuffix = "";

  if (isKingsShield && pokemon.pokemonId !== 681) {
    targetId = 681;
    formSuffix = "Escudo";
  } else if (isAttack && pokemon.pokemonId !== 10034) {
    targetId = 10034;
    formSuffix = "Filo";
  }

  // If no change needed, return original
  if (targetId === pokemon.pokemonId) return { updatedPokemon: pokemon };

  // Stance Change base stats (Gen 6-8)
  const shieldBase = {
    hp: 60,
    attack: 50,
    defense: 140,
    spAtk: 50,
    spDef: 140,
    speed: 60,
  };
  const bladeBase = {
    hp: 60,
    attack: 140,
    defense: 50,
    spAtk: 140,
    spDef: 50,
    speed: 60,
  };

  const newBaseStats = targetId === 681 ? shieldBase : bladeBase;

  // Recalculate stats with current IVs/EVs/Nature
  const newStats = calculateStats(
    newBaseStats,
    pokemon.ivs,
    pokemon.evs,
    pokemon.level,
    pokemon.nature,
  );

  const updated: ActivePokemon = {
    ...pokemon,
    pokemonId: targetId,
    baseStats: newBaseStats,
    stats: newStats,
    // Note: HP is the same in both forms (60 base), so currentHP is safe to keep as is.
  };

  return {
    updatedPokemon: updated,
    log: `¡${pokemon.name} cambió a Forma ${formSuffix}!`,
  };
}
