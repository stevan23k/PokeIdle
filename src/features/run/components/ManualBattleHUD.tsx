import React from "react";
import { useGame } from "../../../context/GameContext";
import { ITEMS } from "../../../lib/items";
import type { ActiveMove } from "../types/game.types";

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
        <span className="font-display text-[0.6rem] text-muted tracking-widest uppercase animate-pulse">
          Esperando Combate...
        </span>
      </div>
    );
  }

  const hasQueuedAction = !!battle.manualActionQueue;

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
        <span className="font-display text-[0.55rem] text-accent-blue tracking-widest uppercase drop-shadow-sm">
          {hasQueuedAction
            ? "ACCION EN COLA..."
            : "¿QUÉ DEBE HACER " + battle.playerPokemon.name + "?"}
        </span>
      </div>

      <div className="flex-1 p-3 grid grid-cols-2 gap-2 overflow-y-auto">
        {battle.playerPokemon.moves.map((move: ActiveMove) => (
          <button
            key={move.moveId}
            disabled={hasQueuedAction || move.currentPP === 0}
            onClick={() => handleMoveSelect(String(move.moveId))}
            className="bg-surface-alt border-2 border-border p-2 hover:border-brand-dark hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:border-border text-left relative group aspect-[3/1]"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-display text-[0.55rem] uppercase text-foreground">
                {move.moveName}
              </span>
              <span className="font-body text-[0.55rem] text-muted">
                {move.currentPP}/{move.maxPP}
              </span>
            </div>
            <div className="flex gap-1 items-center">
              <span className="text-[0.45rem] bg-surface-dark px-1.5 py-0.5 border border-border/50 uppercase font-body text-muted group-hover:text-foreground transition-colors">
                {move.type}
              </span>
            </div>
            {hasQueuedAction &&
              battle.manualActionQueue?.id === String(move.moveId) && (
                <div className="absolute inset-0 border-2 border-brand pointer-events-none"></div>
              )}
          </button>
        ))}
      </div>
    </div>
  );
}
