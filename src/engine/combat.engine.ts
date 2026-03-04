import type {
  ActivePokemon,
  ActiveMove,
  StatusCondition,
} from "../features/run/types/game.types";
import { getEffectiveness } from "../lib/typeChart";
import { ITEMS } from "../lib/items";

export interface TurnAction {
  type: "move" | "switch" | "item" | "flee";
  moveName?: string;
  moveType?: string;
  damage?: number;
  isCrit?: boolean;
  effectiveness?: number;
  missed?: boolean;
}

function getStatMultiplier(stage: number): number {
  if (stage >= 0) {
    return (2 + stage) / 2;
  } else {
    return 2 / (2 - Math.abs(stage));
  }
}

export function calculateDamage(
  attacker: ActivePokemon,
  defender: ActivePokemon,
  move: ActiveMove,
): { damage: number; isCrit: boolean; effectiveness: number; isStab: boolean } {
  // Simplified Gen 6+ formula
  // Base power
  const power = move.power;
  if (power === 0)
    return { damage: 0, isCrit: false, effectiveness: 1, isStab: false }; // Status moves deal no direct dmg

  // Stats
  let atk = 1;
  let def = 1;

  // Held Item Multipliers (Attacker)
  let atkMult = 1;
  let spaMult = 1;
  if (attacker.heldItem) {
    const item = ITEMS[attacker.heldItem];
    if (item?.effect.type === "stat_boost") {
      if (item.effect.stat === "attack") atkMult = item.effect.amount;
      if (item.effect.stat === "spAtk") spaMult = item.effect.amount;
    }
  }

  // Held Item Multipliers (Defender)
  let defMult = 1;
  let spdMult = 1;
  if (defender.heldItem) {
    const item = ITEMS[defender.heldItem];
    if (item?.effect.type === "stat_boost") {
      if (item.effect.stat === "defense") defMult = item.effect.amount;
      if (item.effect.stat === "spDef") spdMult = item.effect.amount;
    }
  }

  if (move.category === "physical") {
    atk =
      attacker.stats.attack *
      getStatMultiplier(attacker.statModifiers.atk) *
      atkMult;
    def =
      defender.stats.defense *
      getStatMultiplier(defender.statModifiers.def) *
      defMult;
  } else if (move.category === "special") {
    atk =
      attacker.stats.spAtk *
      getStatMultiplier(attacker.statModifiers.spa) *
      spaMult;
    def =
      defender.stats.spDef *
      getStatMultiplier(defender.statModifiers.spd) *
      spdMult;
  }

  // Level factor
  const levelFactor = (2 * attacker.level) / 5 + 2;

  // Base damage
  let damage = Math.floor((levelFactor * power * (atk / def)) / 50) + 2;

  // STAB (Same Type Attack Bonus)
  const isStab = attacker.types.some(
    (t) => t.toLowerCase() === move.type.toLowerCase(),
  );
  if (isStab) {
    damage = Math.floor(damage * 1.5);
  }

  // Effectiveness
  const effectiveness = getEffectiveness(move.type, defender.types);
  damage = Math.floor(damage * effectiveness);

  // Critical hit (1/24 chance ~ 4.17%)
  const isCrit = Math.random() < 1 / 24;
  if (isCrit) {
    damage = Math.floor(damage * 1.5);
  }

  // Random factor (0.85 to 1.0)
  const randomFactor = 0.85 + Math.random() * 0.15;
  damage = Math.floor(damage * randomFactor);

  if (damage === 0 && effectiveness > 0) {
    damage = 1; // At least 1 damage if not immune
  }

  return { damage, isCrit, effectiveness, isStab };
}

export function applyDamage(
  defender: ActivePokemon,
  damage: number,
): { nextHP: number; focusBandTriggered: boolean } {
  let nextHP = Math.max(0, defender.currentHP - damage);
  let focusBandTriggered = false;

  if (
    nextHP === 0 &&
    defender.currentHP > 0 &&
    defender.heldItem === "focus-band"
  ) {
    // Focus Band has a 10% chance to trigger in official games
    // Let's make it 20% for better player feel in this idle-ish game
    if (Math.random() < 0.2) {
      nextHP = 1;
      focusBandTriggered = true;
    }
  }

  return { nextHP, focusBandTriggered };
}

export function chooseBestMove(
  pokemon: ActivePokemon,
  opponent: ActivePokemon,
): ActiveMove | null {
  const allowedMoves = pokemon.moves.filter(
    (m) => m.enabled && m.currentPP > 0 && m.power > 0,
  );
  if (allowedMoves.length === 0) return null; // Needs struggle

  // Calculate projected damage for each move and pick the highest
  let bestMove = allowedMoves[0];
  let maxDmg = -1;

  for (const move of allowedMoves) {
    // calculateDamage already factors in power, stats, level, STAB, effectiveness and random rolls.
    // We'll call it to get a baseline projection.
    const res = calculateDamage(pokemon, opponent, move);
    if (res.damage > maxDmg) {
      maxDmg = res.damage;
      bestMove = move;
    }
  }

  return bestMove;
}

export function determineAttackOrder(
  pPokemon: ActivePokemon,
  pMove: ActiveMove | null | undefined,
  ePokemon: ActivePokemon,
  eMove: ActiveMove | null | undefined,
): "player-first" | "enemy-first" {
  // 1. Move Priority (Switching/Items have priority 6 usually)
  const pPriority = pMove ? pMove.priority : 6;
  const ePriority = eMove ? eMove.priority : 6;

  if (pPriority > ePriority) return "player-first";
  if (ePriority > pPriority) return "enemy-first";

  // 2. Speed Stat
  const pSpeed =
    pPokemon.stats.speed * getStatMultiplier(pPokemon.statModifiers.spe);
  const eSpeed =
    ePokemon.stats.speed * getStatMultiplier(ePokemon.statModifiers.spe);

  if (pSpeed > eSpeed) return "player-first";
  if (eSpeed > pSpeed) return "enemy-first";

  // 3. Random Tie-breaker (50/50)
  return Math.random() < 0.5 ? "player-first" : "enemy-first";
}
