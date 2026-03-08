import { calculateStats } from "./stats.engine";
import type {
  ActivePokemon,
  ActiveMove,
  PokemonStats,
} from "../features/run/types/game.types";

/**
 * Handles "Stance Change" for Aegislash (IDs 681 and 10026).
 * Switches forms based on the move category or if King's Shield (ID 588) is used.
 */
export function handleStanceChange(
  pokemon: ActivePokemon,
  move: ActiveMove,
): { updatedPokemon: ActivePokemon; log?: string } {
  // Aegislash IDs: 681 (Shield), 10026 (Blade)
  const isAegislash = pokemon.pokemonId === 681 || pokemon.pokemonId === 10026;
  if (!isAegislash) return { updatedPokemon: pokemon };

  const isKingsShield = move.moveId === 588;
  const isAttack = move.category !== "status";

  let targetId = pokemon.pokemonId;
  let formSuffix = "";

  if (isKingsShield && pokemon.pokemonId !== 681) {
    targetId = 681;
    formSuffix = "Escudo";
  } else if (isAttack && pokemon.pokemonId !== 10026) {
    targetId = 10026;
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
    log: `¡${pokemon.nickname ?? pokemon.name} cambió a Forma ${formSuffix}!`, // Fixed nickname usage
  };
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface AbilityOnEntryResult {
  updatedAttacker?: Partial<ActivePokemon>;
  updatedDefender?: Partial<ActivePokemon>;
  log?: string;
  immune?: boolean;
}

export interface AbilityDamageModResult {
  multiplier: number;       // Modificador al daño final (1 = sin cambio)
  blocked: boolean;         // Si el daño es completamente bloqueado (inmunidades)
  healAmount?: number;      // HP a curar al defensor (absorción)
  forceHP?: number;         // Forzar HP específico (ej: Robustez a 1)
  log?: string;
}

export interface AbilityOnTurnResult {
  updatedPokemon: ActivePokemon;
  log?: string;
}

// ─── ON ENTRY ────────────────────────────────────────────────────────────────

/**
 * Se llama cuando un Pokémon entra al combate o swap-in.
 */
export function applyOnEntryAbility(
  pokemon: ActivePokemon,
  opponent: ActivePokemon,
): AbilityOnEntryResult {
  switch (pokemon.ability) {
    case "intimidate":
      return {
        updatedDefender: {
          statModifiers: {
            ...opponent.statModifiers,
            atk: Math.max(-6, opponent.statModifiers.atk - 1),
          },
        },
        log: `¡${pokemon.nickname ?? pokemon.name} intimidó a ${opponent.nickname ?? opponent.name}! Bajó su Ataque.`,
      };
    default:
      return {};
  }
}

// ─── DAMAGE MODIFIER ─────────────────────────────────────────────────────────

/**
 * Se llama antes de aplicar daño al defensor.
 */
export function applyAbilityDamageModifier(
  attacker: ActivePokemon,
  defender: ActivePokemon,
  moveType: string,
  damage: number,
): AbilityDamageModResult {
  const ability = defender.ability;

  switch (ability) {
    // Inmunidades con absorción de HP
    case "volt-absorb":
      if (moveType === "electric") {
        return {
          multiplier: 0,
          blocked: true,
          healAmount: Math.floor(defender.maxHP * 0.25),
          log: `¡${defender.name} absorbió el ataque eléctrico con Absorb. Elec!`,
        };
      }
      break;
    case "water-absorb":
      if (moveType === "water") {
        return {
          multiplier: 0,
          blocked: true,
          healAmount: Math.floor(defender.maxHP * 0.25),
          log: `¡${defender.name} absorbió el ataque de agua con Absorb. Agua!`,
        };
      }
      break;

    // Inmunidades simples
    case "levitate":
      if (moveType === "ground") {
        return {
          multiplier: 0,
          blocked: true,
          log: `¡${defender.name} evitó el ataque con Levitación!`,
        };
      }
      break;
    case "flash-fire":
      if (moveType === "fire") {
        return {
          multiplier: 0,
          blocked: true,
          log: `¡${defender.name} absorbió el fuego con Absorbe Fuego!`,
        };
      }
      break;

    // Robustez — sobrevive con 1 HP si estaba al máximo
    case "sturdy":
      if (defender.currentHP === defender.maxHP && damage >= defender.currentHP) {
        return {
          multiplier: 0,
          blocked: true,
          forceHP: 1,
          log: `¡${defender.name} aguantó el golpe con Robustez!`,
        };
      }
      break;
  }

  // ── Habilidades del ATACANTE que modifican el daño ──────────────────────

  const attackerAbility = attacker.ability;
  const hpRatio = attacker.currentHP / attacker.maxHP;
  const isLowHP = hpRatio <= 1 / 3;

  switch (attackerAbility) {
    case "overgrow":
      if (moveType === "grass" && isLowHP) {
        return { multiplier: 1.5, blocked: false };
      }
      break;
    case "blaze":
      if (moveType === "fire" && isLowHP) {
        return { multiplier: 1.5, blocked: false };
      }
      break;
    case "torrent":
      if (moveType === "water" && isLowHP) {
        return { multiplier: 1.5, blocked: false };
      }
      break;
    case "swarm":
      if (moveType === "bug" && isLowHP) {
        return { multiplier: 1.5, blocked: false };
      }
      break;
  }

  return { multiplier: 1, blocked: false };
}

// ─── ON TURN (cada turno) ────────────────────────────────────────────────────

/**
 * Se llama al inicio de cada turno.
 */
export function applyOnTurnAbility(
  pokemon: ActivePokemon,
): AbilityOnTurnResult {
  switch (pokemon.ability) {
    case "speed-boost": {
      const currentSpe = pokemon.statModifiers.spe ?? 0;
      if (currentSpe < 6) {
        return {
          updatedPokemon: {
            ...pokemon,
            statModifiers: {
              ...pokemon.statModifiers,
              spe: currentSpe + 1,
            },
          },
          log: `¡La velocidad de ${pokemon.name} aumentó con Impulso!`,
        };
      }
      break;
    }
  }
  return { updatedPokemon: pokemon };
}

// ─── STAT MODIFIER ──────────────────────────────────────────────────────────

/**
 * Retorna multiplicadores de stats aplicados por la habilidad.
 */
export function getAbilityStatMultipliers(
  ability: string | null,
): Partial<Record<keyof PokemonStats, number>> {
  switch (ability) {
    case "huge-power":
    case "pure-power":
      return { attack: 2 };
    default:
      return {};
  }
}
