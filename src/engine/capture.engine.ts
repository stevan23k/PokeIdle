import type {
  ActivePokemon,
  StatusCondition,
} from "../features/run/types/game.types";
import type { Item } from "../lib/items";

export interface CaptureAttempt {
  success: boolean;
  ballUsed: string;
  shakesBeforeBreak: number; // 0-3
  log: string;
}

export function calculateCaptureChance(
  pokemon: ActivePokemon,
  ball: Item,
  statusCondition: StatusCondition | null,
  baseCaptureRate: number = 255, // API base capture rate
  isBoss: boolean = false,
  caughtCount: number = 0, // Used for Grass modifier H
  isDarkGrass: boolean = false, // Area property
  oPowerMultiplier: number = 1.0, // Rotom Power (P)
): CaptureAttempt {
  if (ball.effect.type !== "catch") {
    return {
      success: false,
      ballUsed: ball.id,
      shakesBeforeBreak: 0,
      log: "No es una Poké Ball.",
    };
  }

  // 1. Status modifier (E)
  let E = 1;
  if (statusCondition === "SLP" || statusCondition === "FRZ") E = 2.5;
  else if (
    statusCondition === "PAR" ||
    statusCondition === "PSN" ||
    statusCondition === "BRN"
  )
    E = 1.5;

  // 2. Grass modifier (H)
  let H = 1.0;
  if (isDarkGrass) {
    if (caughtCount <= 30) H = 0.3;
    else if (caughtCount <= 150) H = 0.5;
    else if (caughtCount <= 300) H = 0.7;
    else if (caughtCount <= 450) H = 0.8;
    else if (caughtCount <= 600) H = 0.9;
    else H = 1.0;
  }

  // 3. Ball bonus (B)
  let B = ball.effect.catchMultiplier;
  // Special cases for Net Ball, etc. could go here

  // 4. Capture Rate (R)
  let R = baseCaptureRate;
  
  // Boss Handling: 
  // User wants "1 HP = 7 balls" difficulty.
  // Standard Gen 5 a formula: a = ((3*max - 2*curr) * catchRate * ball * status) / (3*max)
  // At 1 HP, first term is approx 3.
  // so a approx catchRate * ball * status.
  // If catchRate is 255, a is huge. Bosses need a penalty.
  if (isBoss) {
    // We override R to be much lower for bosses to match the requested difficulty.
    // If we want 1 HP (with PokeBall, no status) to take ~7 balls:
    // P(success) = 1/7 approx 0.14
    // Since success is (a/255)^0.75, we need (a/255) approx 0.07
    // So a approx 18.
    // Since a = (3 * PSmax - 2 * 1) * R / (3 * PSmax) approx R.
    // R should be ~18 for a generic boss to meet the "7 balls" feel.
    R = 15; 
  }

  // 5. Final Capture Ratio (X)
  // X = ((PSmax * 3 - PSactual * 2) * H * R * B) / (PSmax * 3) * E * P
  const X = Math.floor(
    (((3 * pokemon.maxHP - 2 * pokemon.currentHP) * H * R * B) / (3 * pokemon.maxHP)) *
      E *
      oPowerMultiplier,
  );

  // If X >= 255, it's a guaranteed catch
  if (X >= 255 || ball.id === "master-ball") {
    return {
      success: true,
      ballUsed: ball.id,
      shakesBeforeBreak: 4,
      log: `¡Atrapado con éxito con ${ball.name}!`,
    };
  }

  // 6. Shake probability (Y)
  // Y = 65536 / (255/X)^(3/16)
  // Which is equivalent to 65536 * (X / 255)^0.1875
  const Y = Math.floor(65536 * Math.pow(X / 255, 0.1875));

  let shakesBeforeBreak = 0;
  for (let i = 0; i < 4; i++) {
    const randomCheck = Math.floor(Math.random() * 65536);
    if (randomCheck >= Y) {
      return {
        success: false,
        ballUsed: ball.id,
        shakesBeforeBreak,
        log: `¡Oh no! ¡El Pokémon se ha liberado!`,
      };
    }
    shakesBeforeBreak++;
  }

  return {
    success: true,
    ballUsed: ball.id,
    shakesBeforeBreak: 4,
    log: `¡Atrapado con éxito con ${ball.name}!`,
  };
}
