import type { RegionId, PokemonStats } from "../../run/types/game.types";

export interface RunSummary {
  runId: string;
  startedAt: number;
  endedAt: number;
  starterId: number;
  badges: number;
  zoneReached: string;
  totalCaptured: number;
  totalBattlesWon: number;
  totalFainted: number;
  moneyEarned: number;
  maxLevel: number;
  duration: number; // ms
  reasonEnded: "defeat" | "victory" | "abandoned";
}

export interface UnlockedStarter {
  id: number;
  name: string;
  maxIvs: PokemonStats;
  maxEvs: PokemonStats;
  unlockedNatures: string[];
  eggMoves?: number[];
  isShiny?: boolean;
}

export interface MetaState {
  totalRuns: number;
  bestRun: { badges: number; runId: string } | null;
  unlockedStarters: UnlockedStarter[];
  unlockedRegions: RegionId[];
  runHistory: RunSummary[];
  pokeCoins: number;

  // Global Records & Stats
  totalTimePlayed: number;
  highestLevelReached: number;
  mostCapturedPokemonId: number | null;
  fastestGym1Time: number | null; // ms
  maxWinStreakEver: number;
  firstShiny: { id: number; runId: string; timestamp: number } | null;
  lastShiny: { id: number; runId: string; timestamp: number } | null;
  capturedUniqueIds: number[];
  totalItemsUsed: Record<string, number>; // category -> count
}
