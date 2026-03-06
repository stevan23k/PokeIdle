import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../../../context/GameContext";
import { generateUid } from "../../../utils/random";
import type { ActiveMove } from "../types/game.types";
import { MoveCategoryBadge } from "../../../components/ui/MoveCategoryBadge";

export function MoveLearningModal() {
  const { run, setRun } = useGame();
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const pending = run.pendingMoveLearn;
  if (!pending) return null;

  const pokemon = run.team.find((p) => p.uid === pending.pokemonUid);
  if (!pokemon) {
    // Pokémon no encontrado, limpiamos el estado pendiente para no bloquear
    setRun((prev) => ({ ...prev, pendingMoveLearn: null }));
    return null;
  }

  const handleSelectToReplace = (index: number) => {
    setReplacingIndex(index);
    setShowConfirm(true);
  };

  const handleSkip = () => {
    setReplacingIndex(-1); // -1 significa no aprender
    setShowConfirm(true);
  };

  const confirmAction = () => {
    setRun((prev) => {
      const nextState = { ...prev, pendingMoveLearn: null };
      const pIndex = nextState.team.findIndex(
        (p) => p.uid === pending.pokemonUid,
      );
      if (pIndex === -1) return nextState;

      const p = { ...nextState.team[pIndex] };
      const logs = [...nextState.battleLog];

      if (replacingIndex === -1) {
        logs.push({
          id: generateUid(),
          text: `${p.name} no aprendió ${pending.newMove.moveName}.`,
          type: "normal" as any,
        });
      } else {
        const oldMove = p.moves[replacingIndex!];
        const newMoves = [...p.moves];
        newMoves[replacingIndex!] = pending.newMove;
        p.moves = newMoves;
        logs.push({
          id: generateUid(),
          text: `¡1, 2 y... puf! ${p.name} ha olvidado ${oldMove.moveName} y ha aprendido ${pending.newMove.moveName}.`,
          type: "level" as any,
        });
      }

      nextState.team[pIndex] = p;
      
      // Sync with battle if it's the active pokemon
      if (nextState.currentBattle?.playerPokemon?.uid === pending.pokemonUid) {
        nextState.currentBattle = {
          ...nextState.currentBattle,
          playerPokemon: p
        };
      }

      nextState.battleLog = logs.slice(-40);
      return nextState;
    });

    // Reset local state
    setShowConfirm(false);
    setReplacingIndex(null);
  };

  const cancelConfirm = () => {
    setShowConfirm(false);
    setReplacingIndex(null);
  };

  const newMove = pending.newMove;

  return createPortal(
    <div className="fixed inset-0 z-10000 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-dark border-2 border-border p-6 crt-screen shadow-2xl relative overflow-hidden">
        {/* Header Decor */}
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-brand to-transparent"></div>

        {!showConfirm ? (
          <>
            <div className="text-center mb-6">
              <h2 className="font-display text-lg text-brand mb-2 uppercase tracking-widest">
                ¡NUEVO MOVIMIENTO!
              </h2>
              <p className="font-body text-[0.7rem] text-foreground leading-relaxed">
                <span className="text-accent-blue font-bold">
                  {pending.pokemonName}
                </span>{" "}
                quiere aprender{" "}
                <span className="text-accent underline uppercase">
                  {newMove.moveName}
                </span>
                .
                <br />
                Pero ya conoce 4 movimientos. ¿Quieres sustituir uno?
              </p>
            </div>

            {/* Nueva Habilidad Info */}
            <div className="bg-surface border-2 border-accent/30 p-3 mb-6 relative group">
              <div className="absolute -top-2 left-4 bg-surface px-2 text-[0.5rem] text-accent font-display uppercase">
                Nueva Habilidad
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-display text-[0.65rem] text-accent uppercase tracking-wider">
                  {newMove.moveName}
                </span>
                <span className="font-body text-[0.55rem] text-muted">
                  PW: {newMove.power || "--"} | PP: {newMove.maxPP}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-[0.45rem] bg-surface-dark px-1.5 py-0.5 border border-border uppercase font-body text-muted">
                  {newMove.type}
                </span>
                <MoveCategoryBadge category={newMove.category} size="xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {pokemon.moves.map((move, idx) => (
                <button
                  key={`${move.moveId}-${idx}`}
                  onClick={() => handleSelectToReplace(idx)}
                  className="bg-surface-alt border-2 border-border p-3 text-left hover:border-brand-dark hover:translate-y-[-2px] transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-display text-[0.6rem] text-foreground uppercase group-hover:text-brand transition-colors">
                      {move.moveName}
                    </span>
                    <span className="font-body text-[0.5rem] text-muted">
                      {move.currentPP}/{move.maxPP}
                    </span>
                  </div>
                  <div className="flex gap-1 items-center overflow-hidden">
                    <span className="text-[0.45rem] bg-surface-dark/50 px-1 border border-border/50 uppercase font-body text-muted shrink-0">
                      {move.type}
                    </span>
                    <MoveCategoryBadge
                      category={move.category}
                      size="xs"
                      className="shrink-0"
                    />
                    <span className="text-[0.4rem] text-muted/60 font-body items-center flex shrink-0">
                      PW: {move.power || "--"}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleSkip}
              className="w-full py-2 bg-surface-dark border-2 border-border/50 text-muted hover:text-danger hover:border-danger hover:bg-danger/5 font-display text-[0.6rem] uppercase tracking-widest transition-all"
            >
              No aprender {newMove.moveName}
            </button>
          </>
        ) : (
          <div className="text-center py-4 flex flex-col items-center">
            <div className="w-12 h-12 border-2 border-brand mb-4 flex items-center justify-center animate-bounce">
              <span className="text-brand font-display">?</span>
            </div>
            <h3 className="font-display text-sm text-foreground mb-4 uppercase tracking-wider leading-relaxed">
              {replacingIndex === -1 ? (
                <>
                  ¿Seguro que no quieres aprender{" "}
                  <span className="text-accent">{newMove.moveName}</span>?
                </>
              ) : (
                <>
                  ¿Sustituir{" "}
                  <span className="text-danger">
                    {pokemon.moves[replacingIndex!].moveName}
                  </span>{" "}
                  por <span className="text-accent">{newMove.moveName}</span>?
                </>
              )}
            </h3>

            <div className="flex gap-4 w-full">
              <button
                onClick={confirmAction}
                className="flex-1 py-3 bg-brand/10 border-2 border-brand text-brand hover:bg-brand hover:text-surface font-display text-[0.6rem] uppercase tracking-widest transition-all"
              >
                Confirmar
              </button>
              <button
                onClick={cancelConfirm}
                className="flex-1 py-3 bg-surface border-2 border-border text-foreground hover:bg-surface-alt font-display text-[0.6rem] uppercase tracking-widest transition-all"
              >
                Atrás
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
