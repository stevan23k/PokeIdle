import type { ActivePokemon } from "../features/run/types/game.types";

export function optimizeTeam(
  currentTeam: ActivePokemon[],
  pc: ActivePokemon[],
  newPokemon: ActivePokemon
): { newTeam: ActivePokemon[]; newPC: ActivePokemon[] } {
  if (currentTeam.length < 6) {
    return {
      newTeam: [...currentTeam, newPokemon],
      newPC: pc
    };
  }

  // Find the weakest member of the team
  let weakestIndex = 0;
  let minLevel = currentTeam[0].level;
  
  for (let i = 1; i < currentTeam.length; i++) {
    const p = currentTeam[i];
    if (p.level < minLevel) {
      minLevel = p.level;
      weakestIndex = i;
    } else if (p.level === minLevel) {
      const bstCurrent = p.stats.hp + p.stats.attack + p.stats.defense + p.stats.spAtk + p.stats.spDef + p.stats.speed;
      const weakestMember = currentTeam[weakestIndex];
      const bstWeakest = weakestMember.stats.hp + weakestMember.stats.attack + weakestMember.stats.defense + weakestMember.stats.spAtk + weakestMember.stats.spDef + weakestMember.stats.speed;
      if (bstCurrent < bstWeakest) {
        weakestIndex = i;
      }
    }
  }

  const weakest = currentTeam[weakestIndex];

  // Compare newPokemon to weakest
  const newBST = newPokemon.stats.hp + newPokemon.stats.attack + newPokemon.stats.defense + newPokemon.stats.spAtk + newPokemon.stats.spDef + newPokemon.stats.speed;
  const weakestBST = weakest.stats.hp + weakest.stats.attack + weakest.stats.defense + weakest.stats.spAtk + weakest.stats.spDef + weakest.stats.speed;

  if (newPokemon.level > weakest.level || (newPokemon.level === weakest.level && newBST > weakestBST)) {
    // Swap
    const nextTeam = [...currentTeam];
    nextTeam[weakestIndex] = newPokemon;
    return {
      newTeam: nextTeam,
      newPC: [...pc, weakest]
    };
  }

  // Keep current team, new Pokemon goes to PC
  return {
    newTeam: currentTeam,
    newPC: [...pc, newPokemon]
  };
}

export function getNextActivePokemon(team: ActivePokemon[], preventId?: string): ActivePokemon | null {
  const validTeam = team.filter(p => p.currentHP > 0 && p.uid !== preventId);
  if (validTeam.length === 0) return null;
  // Return the highest level healthy pokemon
  return validTeam.sort((a, b) => b.level - a.level)[0];
}
