import React, { useState } from "react";
import { createPortal } from "react-dom";
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

function MovePopover({ move }: { move: ActiveMove }) {
  const CATEGORY_LABEL: Record<string, string> = {
    physical: "Físico",
    special: "Especial",
    status: "Estado",
  };

  const CATEGORY_COLOR: Record<string, string> = {
    physical: "text-orange-400",
    special: "text-blue-400",
    status: "text-gray-400",
  };

  return (
    <div className="bg-surface-dark border-2 border-border shadow-[4px_4px_0_rgba(0,0,0,0.8)] p-3 w-56 flex flex-col gap-2 backdrop-blur-sm animate-in fade-in duration-150 relative">
      <div className="flex justify-between items-start gap-2">
        <span className="font-display text-[0.75rem] text-white tracking-widest uppercase truncate font-bold">
          {move.moveName}
        </span>
        <span className={clsx(
          "font-display text-[0.55rem] tracking-tight whitespace-nowrap",
          CATEGORY_COLOR[move.category] ?? "text-gray-400"
        )}>
          {CATEGORY_LABEL[move.category] ?? move.category}
        </span>
      </div>

      <div className="border-t border-border/40 pt-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <TypeBadge type={move.type} showLabel size="sm" />
          <div className="flex gap-2 items-center">
            <div className="flex flex-col items-end">
              <span className="text-[0.5rem] text-white/60 leading-none">POW</span>
              <span className="font-body text-[0.7rem] text-white font-bold">
                {move.power > 0 ? move.power : "—"}
              </span>
            </div>
            <div className="flex flex-col items-end border-l border-border/30 pl-2">
              <span className="text-[0.5rem] text-white/60 leading-none">ACC</span>
              <span className="font-body text-[0.7rem] text-white font-bold">
                {move.accuracy > 0 ? `${move.accuracy}%` : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-black/30 p-1.5 mt-0.5 rounded-sm">
          <span className="font-display text-[0.55rem] text-white/80 tracking-wider uppercase">Puntos de Poder</span>
          <span className={clsx(
            "font-body text-[0.7rem] font-bold",
            move.currentPP === 0 ? "text-danger" :
            move.currentPP <= move.maxPP / 4 ? "text-orange-400" :
            move.currentPP <= move.maxPP / 2 ? "text-yellow-400" :
            "text-hp"
          )}>
            {move.currentPP}/{move.maxPP}
          </span>
        </div>

        {move.description && (
          <div className="border-t border-border/40 pt-2 mt-0.5">
            <p className="font-body text-[0.65rem] text-white/90 leading-relaxed font-medium">
              {move.description}
            </p>
          </div>
        )}
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-border" />
    </div>
  );
}

export function ManualBattleHUD() {
  const { run, setRun, training, setTraining } = useGame();
  const [hoveredMove, setHoveredMove] = useState<{
    move: ActiveMove;
    x: number;
    y: number;
  } | null>(null);

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

      <div className="flex-1 p-3 grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar">
        {battle.playerPokemon.moves.map((move: ActiveMove) => (
          <div
            key={move.moveId}
            className="relative"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredMove({
                move,
                x: rect.left + rect.width / 2,
                y: rect.top,
              });
            }}
            onMouseLeave={() => setHoveredMove(null)}
          >
            <Button
              variant="secondary"
              disabled={!isPlayerTurn}
              onClick={() => {
                if (move.currentPP === 0) {
                  return;
                }
                handleMoveSelect(String(move.moveId));
              }}
              className={clsx(
                "group relative flex-col items-stretch! justify-start! p-2 gap-1 h-full w-full",
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
          </div>
        ))}
      </div>

      {hoveredMove && createPortal(
        <div
          className="fixed z-[99999] pointer-events-none"
          style={{
            left: hoveredMove.x,
            top: hoveredMove.y,
            transform: "translate(-50%, calc(-100% - 8px))",
          }}
        >
          <MovePopover move={hoveredMove.move} />
        </div>,
        document.body
      )}
    </div>
  );
}
