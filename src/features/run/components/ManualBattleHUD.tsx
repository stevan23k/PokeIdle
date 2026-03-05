import React from "react";
import { useGame } from "../../../context/GameContext";
import { ITEMS } from "../../../lib/items";
import type { ActiveMove } from "../types/game.types";
import { clsx } from "clsx";
import { MoveCategoryBadge } from "../../../components/ui/MoveCategoryBadge";
import { Button } from "../../../components/ui/Button";
import { TypeBadge } from "../../../components/ui/TypeBadge";

const TYPE_COLORS: Record<string, string> = {
  normal: "#A8A878",
  fire: "#F08030",
  water: "#6890F0",
  electric: "#F8D030",
  grass: "#78C850",
  ice: "#98D8D8",
  fighting: "#C03028",
  poison: "#A040A0",
  ground: "#E0C068",
  flying: "#A890F0",
  psychic: "#F85888",
  bug: "#A8B820",
  rock: "#B8A038",
  ghost: "#705898",
  dragon: "#7038F8",
  dark: "#705848",
  steel: "#B8B8D0",
  fairy: "#EE99AC",
};

export function ManualBattleHUD() {
  const { run, setRun, training, setTraining } = useGame();

  const isTraining = training.isActive;
  const isActive = isTraining || (run.isActive && run.isManualBattle);

  if (!isActive) return null;

  const battle = isTraining ? training.currentBattle : run.currentBattle;
  const pokemon = isTraining ? training.pokemon : battle?.playerPokemon;

  if (!battle || !pokemon || battle.phase !== "active") {
    return (
      <div className="h-44 border-2 border-border bg-surface-dark crt-screen relative flex items-center justify-center p-3 overflow-hidden">
        <span className="font-display text-[0.6rem] text-white tracking-widest uppercase animate-pulse">
          Esperando Combate...
        </span>
      </div>
    );
  }

  const hasQueuedAction = !!battle.manualActionQueue;

  const isPlayerTurn = 
    battle.turnState === "idle" && 
    !hasQueuedAction &&
    (!battle.turnQueue || battle.turnQueue.length === 0);

  const handleMoveSelect = (moveId: string) => {
    if (isTraining) {
      setTraining((prev) => {
        if (!prev.currentBattle) return prev;
        return {
          ...prev,
          currentBattle: {
            ...prev.currentBattle,
            manualActionQueue: { type: "move", id: moveId },
          },
        };
      });
    } else {
      setRun((prev) => {
        if (!prev.currentBattle) return prev;
        return {
          ...prev,
          currentBattle: {
            ...prev.currentBattle,
            manualActionQueue: { type: "move", id: moveId },
          },
        };
      });
    }
  };

  return (
    <div className="h-44 border-2 border-border bg-surface-dark crt-screen relative flex flex-col overflow-hidden">
      <div className="bg-surface border-b border-border px-2 py-1.5 z-10 sticky top-0 flex items-center justify-between">
        <span className="font-display text-[0.55rem] text-white tracking-widest uppercase drop-shadow-sm">
          {!isPlayerTurn
            ? "ESPERANDO..."
            : "¿QUÉ DEBE HACER " + battle.playerPokemon.name + "?"}
        </span>
      </div>

      <div className="flex-1 p-3 grid grid-cols-2 gap-2 overflow-y-auto">
        {battle.playerPokemon.moves.map((move: ActiveMove) => (
          <Button
            key={move.moveId}
            variant="secondary"
            disabled={!isPlayerTurn}
            onClick={() => {
              if (move.currentPP === 0) {
                return;
              }
              handleMoveSelect(String(move.moveId));
            }}
            className={clsx(
              "group relative flex-col items-stretch! justify-start! p-2 gap-1 h-full",
              !isPlayerTurn && "opacity-40 cursor-not-allowed",
              move.currentPP === 0 && isPlayerTurn && "opacity-50 grayscale cursor-not-allowed hover:animate-[shake_0.4s_ease-in-out]"
            )}
            style={{
              backgroundColor:
                move.currentPP > 0
                  ? (TYPE_COLORS[move.type.toLowerCase()] || "#A8A878") + "40"
                  : undefined,
            }}
            isActive={hasQueuedAction && battle.manualActionQueue?.id === String(move.moveId)}
          >
            <div className="flex justify-between items-center w-full">
              <span className="font-display text-[0.65rem] uppercase text-foreground truncate max-w-[70%] text-left">
                {move.moveName}
              </span>
              <span className="font-body text-[0.55rem] text-white shrink-0">
                {move.currentPP}/{move.maxPP}
              </span>
            </div>
            <div className="flex gap-2 items-center w-full mt-auto">
              <TypeBadge type={move.type} showLabel={false} size="sm" />
              <MoveCategoryBadge category={move.category} size="xs" />
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
