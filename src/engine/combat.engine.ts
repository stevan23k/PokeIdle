import type {
  ActivePokemon,
  ActiveMove,
  StatusCondition,
  GymMechanic,
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

function getStatMultiplier(stage: number, mechanic?: GymMechanic): number {
  const effectiveStage = mechanic === "inversion_stats" ? -stage : stage;
  if (effectiveStage >= 0) {
    return (2 + effectiveStage) / 2;
  } else {
    return 2 / (2 - Math.abs(effectiveStage));
  }
}

export function calculateDamage(
  attacker: ActivePokemon,
  defender: ActivePokemon,
  move: ActiveMove,
  mechanic?: GymMechanic,
): { damage: number; isCrit: boolean; effectiveness: number; isStab: boolean } {
  // Simplified Gen 6+ formula
  // Base power
  const power = move.power;
  if (power === 0 && mechanic !== "inversion_stats")
    // Need to pass to status later? actually status is unhandled here.
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
      getStatMultiplier(attacker.statModifiers.atk, mechanic) *
      atkMult;
    def =
      defender.stats.defense *
      getStatMultiplier(defender.statModifiers.def, mechanic) *
      defMult;
  } else if (move.category === "special") {
    atk =
      attacker.stats.spAtk *
      getStatMultiplier(attacker.statModifiers.spa, mechanic) *
      spaMult;
    def =
      defender.stats.spDef *
      getStatMultiplier(defender.statModifiers.spd, mechanic) *
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

  // Environmental Power Mods
  let envMod = 1;
  if (mechanic === "terreno_duro") {
    if (move.type === "water" || move.type === "grass") envMod = 1.25;
  } else if (mechanic === "lluvia_constante") {
    if (move.type === "water") envMod = 1.5;
    if (move.type === "fire") envMod = 0.5;
  } else if (mechanic === "campo_electrificado") {
    if (move.type === "ground") envMod = 1.5;
  }
  damage = Math.floor(damage * envMod);

  // Effectiveness
  let effectiveness = getEffectiveness(move.type, defender.types);

  if (mechanic === "gravedad_aumentada") {
    if (move.type === "ground") {
      // Ground moves hit flying types (override immunity)
      effectiveness = getEffectiveness(move.type, defender.types.filter(t => t.toLowerCase() !== "flying"));
      if (effectiveness === 0) effectiveness = 1; // Safeguard if somehow still 0
    }
  }

  damage = Math.floor(damage * effectiveness);

  // Critical hit scaling (Gen 6+)
  const critStage = attacker.statModifiers.crit || 0;
  const critProbabilities = [1 / 24, 1 / 8, 1 / 2, 1];
  const critChance = critProbabilities[Math.min(critStage, 3)];

  const isCrit = Math.random() < critChance;
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
  mechanic?: GymMechanic,
): ActiveMove | null {
  const allowedMoves = pokemon.moves.filter(
    (m) => m.enabled && m.currentPP > 0 && (m.power > 0 || m.selfBoost),
  );
  if (allowedMoves.length === 0) return null; // Needs struggle

  // Calculate projected damage for each move and pick the highest
  let bestMove = allowedMoves[0];
  let maxDmg = -1;

  for (const move of allowedMoves) {
    if (move.selfBoost && move.power === 0) {
      const currentStage =
        pokemon.statModifiers[
          move.selfBoost.stat as keyof typeof pokemon.statModifiers
        ] ?? 0;
      if (currentStage < 3) {
        // Solo usar buff si hay margen decoroso (+3)
        // Simulamos que el buff vale un 50% extra del daño máximo actual por cada stage
        const boostVal = 0.5 * move.selfBoost.stages;
        const projectedVal = 50 * (1 + boostVal); // Valor arbitrario para competir con daño
        if (projectedVal > maxDmg) {
          maxDmg = projectedVal;
          bestMove = move;
        }
      }
      continue;
    }

    // calculateDamage already factors in power, stats, level, STAB, effectiveness and random rolls.
    const res = calculateDamage(pokemon, opponent, move, mechanic);
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
  mechanic?: GymMechanic,
): "player-first" | "enemy-first" {
  // 1. Move Priority (Switching/Items have priority 6 usually)
  let pPriority = pMove ? pMove.priority : 6;
  let ePriority = eMove ? eMove.priority : 6;

  if (mechanic === "gravedad_aumentada") {
    if (pPriority > 0 && pPriority < 6) pPriority = 0;
    if (ePriority > 0 && ePriority < 6) ePriority = 0;
  }

  if (pPriority > ePriority) return "player-first";
  if (ePriority > pPriority) return "enemy-first";

  // 2. Speed Stat
  let pSpeed =
    pPokemon.stats.speed *
    getStatMultiplier(pPokemon.statModifiers.spe, mechanic);
  let eSpeed =
    ePokemon.stats.speed *
    getStatMultiplier(ePokemon.statModifiers.spe, mechanic);

  if (mechanic === "gravedad_aumentada") {
    pSpeed *= 0.5;
    eSpeed *= 0.5;
  }

  if (pSpeed > eSpeed) return "player-first";
  if (eSpeed > pSpeed) return "enemy-first";

  // 3. Random Tie-breaker (50/50)
  return Math.random() < 0.5 ? "player-first" : "enemy-first";
}
