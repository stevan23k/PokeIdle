import type { ActivePokemon, ActiveMove } from "../features/run/types/game.types";
import { calculateDamage } from "./combat.engine";

export function selectEnemyMove(enemy: ActivePokemon, player: ActivePokemon): ActiveMove {
  const availableMoves = enemy.moves.filter(m => m.enabled && m.power > 0);
  if (availableMoves.length === 0) {
    // Return struggle if nothing else
    return { moveId: 165, moveName: "Forcejeo", type: "normal", category: "physical", power: 40, accuracy: 100, currentPP: 1, maxPP: 1, enabled: true, priority: 0 };
  }

  // AI logic: 70% highest power, 20% super effective, 10% random
  const rand = Math.random();

  if (rand < 0.1) {
    // Random move
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  // Calculate true potential damage for all available moves
  const moveScores = availableMoves.map(move => {
    const res = calculateDamage(enemy, player, move);
    return { move, score: res.damage, effectiveness: res.effectiveness };
  });

  if (rand < 0.3) {
    // 20% favor Super effective if there are any that do good damage
    const superEffectiveMoves = moveScores.filter(m => m.effectiveness > 1);
    if (superEffectiveMoves.length > 0) {
      superEffectiveMoves.sort((a, b) => b.score - a.score);
      return superEffectiveMoves[0].move;
    }
  }

  // 70% Highest actual damage move
  moveScores.sort((a, b) => b.score - a.score);
  return moveScores[0].move;
}
