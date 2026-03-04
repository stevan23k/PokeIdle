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
 * Distributes XP to all team members based on the amount of exp-shares in inventory
 */
export function distributeTeamXP(
  team: ActivePokemon[],
  activePokemonUid: string,
  totalXPGained: number,
  expShareCount: number,
): { updatedTeam: ActivePokemon[]; sharedXP: number } {
  if (expShareCount <= 0) return { updatedTeam: team, sharedXP: 0 };

  const validExpShareCount = Math.min(expShareCount, 5); // Max 5 items (100%)
  const sharePercentage = 0.2 * validExpShareCount;
  const sharedXP = Math.floor(totalXPGained * sharePercentage);

  if (sharedXP <= 0) return { updatedTeam: team, sharedXP: 0 };

  const updatedTeam = team.map((p) => {
    if (p.uid === activePokemonUid || p.currentHP <= 0) return p;
    return { ...p, xp: p.xp + sharedXP };
  });

  return { updatedTeam, sharedXP };
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
