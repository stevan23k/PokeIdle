import type {
  ActivePokemon,
  BattleState,
  BattleLogEntry,
} from "../../run/types/game.types";

export interface TrainingState {
  isActive: boolean;
  pokemonUid: string; // which team-member is training
  pokemon: ActivePokemon; // live copy of the Pokémon being trained
  currentBattle: BattleState | null;
  battleLog: BattleLogEntry[];
  totalBattlesWon: number;
  pendingLootSelection: string[] | null;
  items: Record<string, number>; // items collected in CURRENT session
  __checkMoveLearnQueue?: {
    pokemonUid: string;
    level: number;
    fromLevel?: number;
    _specificMoveId?: number;
  }[];
  __checkEvolutionQueue?: {
    pokemonUid: string;
    level: number;
    pokemonId: number;
  }[];
}
