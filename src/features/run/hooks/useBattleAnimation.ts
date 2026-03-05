import { useEffect, useState, useRef, useCallback } from "react";
import type { BattleState } from "../types/game.types";

export interface BattleAnimationState {
  isPlayerAttacking: boolean;
  isEnemyAttacking: boolean;
  isPlayerDefending: boolean;
  isEnemyDefending: boolean;
  isPlayerFainting: boolean;
  isEnemyFainting: boolean;
  activePlayerOverlay: string | null;
  activeEnemyOverlay: string | null;
  isScreenShaking: boolean;
  isPlayerFlashingRed: boolean;
  isPlayerFlashingBlue: boolean;
  isEnemyFlashingRed: boolean;
  isEnemyFlashingBlue: boolean;
}

export function useBattleAnimation(
  currentBattle: BattleState | null,
  onResolveAnimation: () => void,
) {
  const [animState, setAnimState] = useState<BattleAnimationState>({
    isPlayerAttacking: false,
    isEnemyAttacking: false,
    isPlayerDefending: false,
    isEnemyDefending: false,
    isPlayerFainting: false,
    isEnemyFainting: false,
    activePlayerOverlay: null,
    activeEnemyOverlay: null,
    isScreenShaking: false,
    isPlayerFlashingRed: false,
    isPlayerFlashingBlue: false,
    isEnemyFlashingRed: false,
    isEnemyFlashingBlue: false,
  });

  const playerRef = useRef<HTMLDivElement>(null);
  const enemyRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnimIdRef = useRef<string | null>(null);

  const resolve = useCallback(() => {
    setAnimState({
      isPlayerAttacking: false,
      isEnemyAttacking: false,
      isPlayerDefending: false,
      isEnemyDefending: false,
      isPlayerFainting: false,
      isEnemyFainting: false,
      activePlayerOverlay: null,
      activeEnemyOverlay: null,
      isScreenShaking: false,
      isPlayerFlashingRed: false,
      isPlayerFlashingBlue: false,
      isEnemyFlashingRed: false,
      isEnemyFlashingBlue: false,
    });
    onResolveAnimation();
  }, [onResolveAnimation]);

  useEffect(() => {

    if (!currentBattle || currentBattle.turnState !== "animating" || !currentBattle.pendingAnimation) {
      return;
    }

    const anim = currentBattle.pendingAnimation;
    const animId = `${anim.actor}-${anim.moveType}-${anim.damage}-${currentBattle.turnCount}`;

    if (lastAnimIdRef.current === animId) {
      return;
    }
    lastAnimIdRef.current = animId;

    const isPlayerAttacking = anim.actor === "p";
    const isEnemyAttacking = anim.actor === "e";
    const isPlayerDefending = anim.target === "p";
    const isEnemyDefending = anim.target === "e";

    const newState: BattleAnimationState = {
      isPlayerAttacking,
      isEnemyAttacking,
      isPlayerDefending: isPlayerDefending && anim.damage > 0,
      isEnemyDefending: isEnemyDefending && anim.damage > 0,
      isPlayerFainting: false,
      isEnemyFainting: false,
      activePlayerOverlay: isPlayerDefending && anim.damage > 0 ? getOverlayGif(anim.moveType) : null,
      activeEnemyOverlay: isEnemyDefending && anim.damage > 0 ? getOverlayGif(anim.moveType) : null,
      isScreenShaking: anim.isCrit,
      isPlayerFlashingRed: false,
      isPlayerFlashingBlue: false,
      isEnemyFlashingRed: false,
      isEnemyFlashingBlue: false,
    };

    setAnimState(newState);

    let duration = 400;
    if (newState.isScreenShaking) duration = Math.max(duration, 500);
    if (newState.activePlayerOverlay || newState.activeEnemyOverlay) duration = Math.max(duration, 900);


    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      lastAnimIdRef.current = null;
      resolve();
    }, duration);

  }, [
    currentBattle?.turnState,
    currentBattle?.turnCount,
    currentBattle?.pendingAnimation,
    resolve,
  ]);

  return { animState, playerRef, enemyRef };
}

function getOverlayGif(type: string): string | null {
  const normalized = type.toLowerCase();
  switch (normalized) {
    case "fire": return "https://play.pokemonshowdown.com/sprites/animations/ember.gif";
    case "water": return "https://play.pokemonshowdown.com/sprites/animations/watergun.gif";
    case "electric": return "https://play.pokemonshowdown.com/sprites/animations/thundershock.gif";
    case "grass": return "https://play.pokemonshowdown.com/sprites/animations/razorleaf.gif";
    case "ice": return "https://play.pokemonshowdown.com/sprites/animations/iceshard.gif";
    case "fighting": return "https://play.pokemonshowdown.com/sprites/animations/machpunch.gif";
    case "poison": return "https://play.pokemonshowdown.com/sprites/animations/sludge.gif";
    case "ground": return "https://play.pokemonshowdown.com/sprites/animations/mudshot.gif";
    case "flying": return "https://play.pokemonshowdown.com/sprites/animations/gust.gif";
    case "psychic": return "https://play.pokemonshowdown.com/sprites/animations/confusion.gif";
    case "bug": return "https://play.pokemonshowdown.com/sprites/animations/stringshot.gif";
    case "rock": return "https://play.pokemonshowdown.com/sprites/animations/rockthrow.gif";
    case "ghost": return "https://play.pokemonshowdown.com/sprites/animations/lick.gif";
    case "dragon": return "https://play.pokemonshowdown.com/sprites/animations/dragonrage.gif";
    case "dark": return "https://play.pokemonshowdown.com/sprites/animations/bite.gif";
    case "steel": return "https://play.pokemonshowdown.com/sprites/animations/metalclaw.gif";
    case "fairy": return "https://play.pokemonshowdown.com/sprites/animations/fairywind.gif";
    case "normal":
    default: return "https://play.pokemonshowdown.com/sprites/animations/tackle.gif";
  }
}