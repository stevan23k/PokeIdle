export type RegionId =
  | "kanto"
  | "johto"
  | "hoenn"
  | "sinnoh"
  | "unova"
  | "kalos"
  | "alola"
  | "galar";

export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export interface InheritanceProgress {
  pokemonId: number;
  pokemonName: string;
  ivs: Record<string, [number, number]>; // [old, new]
  evs: Record<string, [number, number]>; // [old, new]
  newNatures: string[];
}

export type StatusCondition = "BRN" | "PAR" | "PSN" | "TOX" | "SLP" | "FRZ";

export type GymMechanic =
  | "terreno_duro" // Brock
  | "lluvia_constante" // Misty
  | "campo_electrificado" // Surge
  | "esporas_aire" // Erika
  | "niebla_toxica" // Koga
  | "inversion_stats" // Sabrina
  | "suelo_ardiente" // Blaine
  | "gravedad_aumentada"; // Giovanni

export interface ActiveMove {
  moveId: number;
  moveName: string;
  type: string;
  category: "physical" | "special" | "status";
  power: number;
  accuracy: number;
  currentPP: number;
  maxPP: number;
  priority: number;
  enabled: boolean;
  statusEffect?: {
    condition: StatusCondition;
    chance: number; // 0 to 100
  };
}

export interface ActivePokemon {
  uid: string;
  pokemonId: number;
  name: string;
  nickname: string | null;
  level: number;
  xp: number;
  xpToNext: number;
  currentHP: number;
  maxHP: number;
  baseStats: PokemonStats;
  ivs: PokemonStats;
  evs: PokemonStats;
  nature: string;
  stats: PokemonStats;
  types: string[];
  moves: ActiveMove[];
  status: StatusCondition | null;
  statModifiers: {
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
    acc: number;
    eva: number;
    crit: number;
  };
  heldItem: string | null;
  isShiny: boolean;
  caughtAt: string;
  caughtLevel: number;
}

export interface EnemyTrainer {
  name: string;
  class: string;
  icon: string;
  team: ActivePokemon[];
  defeatCount: number;
}

export interface BattleLogEntry {
  id: string; // unique
  text: string;
  type:
    | "attack"
    | "danger"
    | "crit"
    | "super"
    | "not-very"
    | "capture"
    | "level"
    | "evolution"
    | "faint"
    | "badge"
    | "normal";
}

export interface BattleState {
  type: "wild" | "trainer" | "gym" | "elite";
  phase: "intro" | "active" | "caught" | "victory" | "defeat";
  playerPokemon: ActivePokemon;
  enemyPokemon: ActivePokemon;
  enemyTrainer?: EnemyTrainer;
  turnCount: number;
  activeMechanic?: GymMechanic;
  manualActionQueue?: {
    type: "move" | "switch" | "item" | "equip";
    id: string;
    target?: string;
  } | null;

  turnState?: "idle" | "turn_start" | "animating" | "apply_damage";
  turnQueue?: ("p" | "e")[];
  pendingAnimation?: {
    actor: "p" | "e";
    target: "p" | "e";
    moveType: string;
    moveCategory: "physical" | "special" | "status";
    damage: number;
    isCrit: boolean;
    effectiveness: number;
    statusApplied: StatusCondition | null;
    statChanges: { stat: string; amount: number; target: "p" | "e" }[];
    hpTrigger: boolean; // Focus band or similar
  } | null;

  // Boss features
  isBossBattle?: boolean;
  bossMaxBars?: number; // default 1
  bossCurrentBar?: number; // 1-indexed

  pendingCaptureAnim?: { ballId: string; captured: boolean | null } | null;
  pendingManualSwitch?: boolean;
  playerCurrentMove?: ActiveMove | null;
  enemyCurrentMove?: ActiveMove | null;
  usedManualTurn?: boolean;
}

export interface MoveLearnData {
  pokemonUid: string;
  pokemonName: string;
  newMove: ActiveMove;
}

export interface RunState {
  runId: string;
  startedAt: number;
  isActive: boolean;

  starterId: number;
  starterName: string;

  team: ActivePokemon[];
  pc: ActivePokemon[];

  currentRegion: RegionId;
  currentZoneIndex: number;
  currentZoneProgress: number;
  zoneBattlesWon: number;
  gymsBadges: number[];
  eliteFourDefeated: boolean;

  items: Record<string, number>;
  expMultiplier: number; // Cumulative from "Cartas"
  hasMegaBracelet: boolean;

  speedMultiplier: 0 | 1 | 2 | 4 | "SKIP";
  autoCapture: boolean;
  autoItems: boolean;
  autoHealThreshold: number; // e.g. 0.3 defaults to 30%

  isPaused: boolean;
  isManualBattle: boolean;
  autoLoot: boolean;

  currentBattle: BattleState | null;
  battleLog: BattleLogEntry[];

  totalBattlesWon: number;
  totalCaptured: number;
  totalFainted: number;
  money: number;
  winStreak: number;
  maxWinStreak: number;
  itemUsage: Record<string, number>; // slug -> count

  pendingLootSelection: string[] | null;
  pendingMoveLearn: MoveLearnData | null;
  pendingZoneTransition: boolean;
  pinnedItems: string[]; // slug
  inheritanceProgress: Record<number, InheritanceProgress>;
}