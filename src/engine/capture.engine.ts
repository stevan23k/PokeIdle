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
  baseCaptureRate: number = 255, // API base capture rate if available, defaulting to 255
  isBoss: boolean = false,
): CaptureAttempt {
  if (ball.effect.type !== "catch") {
    return {
      success: false,
      ballUsed: ball.id,
      shakesBeforeBreak: 0,
      log: "No es una Poké Ball.",
    };
  }

  // Status bonus
  let statusBonus = 1;
  if (statusCondition === "SLP" || statusCondition === "FRZ") statusBonus = 2.5;
  else if (
    statusCondition === "PAR" ||
    statusCondition === "PSN" ||
    statusCondition === "BRN"
  )
    statusBonus = 1.5;

  // Gen 6 formula
  // a = ((3 * maxHP - 2 * currentHP) * catchRate * ballMultiplier * statusBonus) / (3 * maxHP)
  const bossMultiplier = isBoss ? 0.5 : 1.0;
  const a = Math.floor(
    ((3 * pokemon.maxHP - 2 * pokemon.currentHP) *
      baseCaptureRate *
      ball.effect.catchMultiplier *
      statusBonus *
      bossMultiplier) /
      (3 * pokemon.maxHP),
  );

  // If a >= 255, it's a guaranteed catch
  if (a >= 255) {
    return {
      success: true,
      ballUsed: ball.id,
      shakesBeforeBreak: 4,
      log: `¡Atrapado con éxito con ${ball.name}!`,
    };
  }

  // b = 65536 / (255/a)^0.1875
  const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / a))); // Approximation for efficiency

  let shakesBeforeBreak = 0;
  for (let i = 0; i < 4; i++) {
    const randomCheck = Math.floor(Math.random() * 65536);
    if (randomCheck >= b) {
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
