import type { ActivePokemon } from "../features/run/types/game.types";
import { calculateStats } from "./stats.engine";

export function calculateXPGain(
  defeatedLevel: number,
  baseXP: number,
  isTrainer: boolean,
  globalMultiplier: number = 1.0,
): number {
  // Increased XP yield for an idle game pace
  const trainerBonus = isTrainer ? 1.5 : 1;
  const yield_ =
    Math.floor(((baseXP * defeatedLevel * trainerBonus) / 7) * 2.5) || 1;
  return Math.floor(yield_ * globalMultiplier);
}

/**
 * Distributes XP to all team members if XP Share is active
 */
export function distributeTeamXP(
  team: ActivePokemon[],
  activePokemonUid: string,
  totalXPGained: number,
  hasExpShare: boolean,
): ActivePokemon[] {
  if (!hasExpShare) return team;

  const sharedXP = Math.floor(totalXPGained * 0.2);
  if (sharedXP <= 0) return team;

  return team.map((p) => {
    if (p.uid === activePokemonUid || p.currentHP <= 0) return p;

    let leveledP = { ...p, xp: p.xp + sharedXP };
    // We don't handle multi-level up here for simplicity of return,
    // it will be caught in the next loop or tick if needed,
    // but the engine usually handles the active one.
    // For now, let's just add the XP.
    return leveledP;
  });
}

export function xpToNextLevel(level: number): number {
  // Medium Fast growth rate: n^3
  return Math.pow(level, 3);
}

export function levelUpPokemon(pokemon: ActivePokemon): ActivePokemon {
  const newLevel = pokemon.level + 1;

  // Calculate true stats for the new level using official formulas
  const newStats = calculateStats(
    pokemon.baseStats,
    pokemon.ivs,
    pokemon.evs,
    newLevel,
    pokemon.nature,
  );
  const newMaxHp = newStats.hp;

  // Restore PP for all moves on level-up
  const restoredMoves = pokemon.moves.map((move) => ({
    ...move,
    currentPP: move.maxPP,
  }));

  return {
    ...pokemon,
    level: newLevel,
    maxHP: newMaxHp,
    currentHP: newMaxHp, // Full heal on level up
    xpToNext: xpToNextLevel(newLevel + 1),
    stats: newStats,
    moves: restoredMoves,
  };
}
