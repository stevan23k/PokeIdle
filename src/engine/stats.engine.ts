import type { PokemonStats } from "../features/run/types/game.types";

export interface Nature {
  name: string;
  increasedStat: keyof PokemonStats | null;
  decreasedStat: keyof PokemonStats | null;
}

// Based on Generation 3+ Natures
export const NATURES: Record<string, Nature> = {
  hardy: { name: "Fuerte", increasedStat: null, decreasedStat: null },
  lonely: { name: "Huraña", increasedStat: "attack", decreasedStat: "defense" },
  brave: { name: "Audaz", increasedStat: "attack", decreasedStat: "speed" },
  adamant: { name: "Firme", increasedStat: "attack", decreasedStat: "spAtk" },
  naughty: { name: "Pícara", increasedStat: "attack", decreasedStat: "spDef" },
  bold: { name: "Osada", increasedStat: "defense", decreasedStat: "attack" },
  docile: { name: "Dócil", increasedStat: null, decreasedStat: null },
  relaxed: { name: "Plácida", increasedStat: "defense", decreasedStat: "speed" },
  impish: { name: "Agitada", increasedStat: "defense", decreasedStat: "spAtk" },
  lax: { name: "Floja", increasedStat: "defense", decreasedStat: "spDef" },
  timid: { name: "Miedosa", increasedStat: "speed", decreasedStat: "attack" },
  hasty: { name: "Activa", increasedStat: "speed", decreasedStat: "defense" },
  serious: { name: "Seria", increasedStat: null, decreasedStat: null },
  jolly: { name: "Alegre", increasedStat: "speed", decreasedStat: "spAtk" },
  naive: { name: "Ingenua", increasedStat: "speed", decreasedStat: "spDef" },
  modest: { name: "Modesta", increasedStat: "spAtk", decreasedStat: "attack" },
  mild: { name: "Afable", increasedStat: "spAtk", decreasedStat: "defense" },
  quiet: { name: "Mansa", increasedStat: "spAtk", decreasedStat: "speed" },
  bashful: { name: "Tímida", increasedStat: null, decreasedStat: null },
  rash: { name: "Alocada", increasedStat: "spAtk", decreasedStat: "spDef" },
  calm: { name: "Serena", increasedStat: "spDef", decreasedStat: "attack" },
  gentle: { name: "Amable", increasedStat: "spDef", decreasedStat: "defense" },
  sassy: { name: "Grosera", increasedStat: "spDef", decreasedStat: "speed" },
  careful: { name: "Cauta", increasedStat: "spDef", decreasedStat: "spAtk" },
  quirky: { name: "Rara", increasedStat: null, decreasedStat: null },
};

export const NATURE_KEYS = Object.keys(NATURES);

export function getRandomNature(): string {
  return NATURE_KEYS[Math.floor(Math.random() * NATURE_KEYS.length)];
}

export function generateRandomIVs(): PokemonStats {
  return {
    hp: Math.floor(Math.random() * 32),
    attack: Math.floor(Math.random() * 32),
    defense: Math.floor(Math.random() * 32),
    spAtk: Math.floor(Math.random() * 32),
    spDef: Math.floor(Math.random() * 32),
    speed: Math.floor(Math.random() * 32),
  };
}

export function getZeroEVs(): PokemonStats {
  return { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 };
}

// Official Pokemon stat formula
export function calculateStats(base: PokemonStats, ivs: PokemonStats, evs: PokemonStats, level: number, natureKey: string): PokemonStats {
  const nature = NATURES[natureKey] || NATURES["hardy"];
  
  const calcOtherStat = (statName: keyof PokemonStats) => {
    const core = Math.floor(0.01 * (2 * base[statName] + ivs[statName] + Math.floor(0.25 * evs[statName])) * level) + 5;
    let modifier = 1.0;
    if (nature.increasedStat === statName) modifier = 1.1;
    if (nature.decreasedStat === statName) modifier = 0.9;
    return Math.floor(core * modifier);
  };

  return {
    hp: Math.floor(0.01 * (2 * base.hp + ivs.hp + Math.floor(0.25 * evs.hp)) * level) + level + 10,
    attack: calcOtherStat("attack"),
    defense: calcOtherStat("defense"),
    spAtk: calcOtherStat("spAtk"),
    spDef: calcOtherStat("spDef"),
    speed: calcOtherStat("speed"),
  };
}
