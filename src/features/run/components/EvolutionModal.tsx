import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../../../context/GameContext";
import { getPokemonData } from "../services/pokeapi.service";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { generateUid } from "../../../utils/random";

type Phase = "idle" | "animating" | "done";

export function EvolutionModal() {
  const { run, setRun } = useGame();
  const [phase, setPhase] = useState<Phase>("idle");

  const pending = run.pendingEvolution;

  useEffect(() => {
    if (!pending) {
      setPhase("idle");
      return;
    }
    setPhase("animating");
    // After animation, auto-confirm after 4s if not interacted
  }, [pending]);

  if (!pending) return null;

  const handleConfirm = async () => {
    setPhase("done");
    try {
      const pokemon = run.team.find(p => p.uid === pending.pokemonUid);
      if (!pokemon) return;

      const evolved = await getPokemonData(pending.toId, pokemon.level, pokemon.isShiny);

      setRun(prev => {
        const p = prev.team.find(t => t.uid === pending.pokemonUid);
        if (!p) return { ...prev, pendingEvolution: null };

        const evolvedPokemon = {
          ...evolved,
          uid: p.uid,
          nickname: p.nickname,
          currentHP: Math.max(1, Math.floor((p.currentHP / p.maxHP) * evolved.maxHP)),
          xp: p.xp,
          xpToNext: p.xpToNext,
          evs: p.evs,
          ivs: p.ivs,
          nature: p.nature,
          heldItem: p.heldItem,
          caughtAt: p.caughtAt,
          caughtLevel: p.caughtLevel,
          moves: p.moves, // Keep current moves
        };

        return {
          ...prev,
          pendingEvolution: null,
          team: prev.team.map(t => t.uid === pending.pokemonUid ? evolvedPokemon : t),
          currentBattle: prev.currentBattle?.playerPokemon?.uid === pending.pokemonUid
            ? { ...prev.currentBattle, playerPokemon: evolvedPokemon }
            : prev.currentBattle,
          battleLog: [...prev.battleLog, {
            id: generateUid(),
            text: `¡Enhorabuena! ¡Tu ${pending.fromName} ha evolucionado en ${pending.toName}!`,
            type: "evolution" as const,
          }].slice(-40),
        };
      });
    } catch (e) {
      console.error("Evolution failed", e);
      setRun(prev => ({ ...prev, pendingEvolution: null }));
    }
  };

  const handleCancel = () => {
    setRun(prev => ({
      ...prev,
      pendingEvolution: null,
      battleLog: [...prev.battleLog, {
        id: generateUid(),
        text: `${pending.fromName} detuvo su evolución.`,
        type: "normal" as const,
      }].slice(-40),
    }));
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-surface-dark border-2 border-brand crt-screen shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-brand to-transparent" />

        <div className="p-6 flex flex-col items-center gap-4">
          <h2 className="font-display text-brand text-lg uppercase tracking-widest text-center">
            ¡Qué? ¡{pending.fromName} está evolucionando!
          </h2>

          {/* Sprites side by side */}
          <div className="flex items-center justify-center gap-6 py-4">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-24 h-24 flex items-center justify-center"
                style={{
                  animation: phase === "animating" ? "evolve-flash 0.6s ease-in-out 3" : "none",
                }}
              >
                <PixelSprite
                  pokemonId={run.team.find(p => p.uid === pending.pokemonUid)?.pokemonId || 0}
                  variant="front"
                  shiny={run.team.find(p => p.uid === pending.pokemonUid)?.isShiny}
                  size={96}
                  showScanlines={false}
                  alt={pending.fromName}
                  className={phase === "animating" ? "opacity-70" : ""}
                />
              </div>
              <span className="font-display text-[0.55rem] text-muted uppercase">{pending.fromName}</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="font-display text-brand text-xl">→</span>
              <span className="font-body text-[0.45rem] text-muted mt-1">{pending.reason}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div
                className="w-24 h-24 flex items-center justify-center"
                style={{
                  animation: phase === "animating" ? "evolve-appear 1.5s ease-in-out forwards" : "none",
                }}
              >
                <PixelSprite
                  pokemonId={pending.toId}
                  variant="front"
                  shiny={run.team.find(p => p.uid === pending.pokemonUid)?.isShiny}
                  size={96}
                  showScanlines={false}
                  alt={pending.toName}
                />
              </div>
              <span className="font-display text-[0.55rem] text-accent uppercase">{pending.toName}</span>
            </div>
          </div>

          <p className="font-body text-[0.65rem] text-foreground text-center leading-relaxed">
            ¿Dejarás que{" "}
            <span className="text-brand font-bold">{pending.fromName}</span>{" "}
            evolucione en{" "}
            <span className="text-accent font-bold">{pending.toName}</span>?
          </p>

          <div className="flex gap-3 w-full">
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 bg-brand/10 border-2 border-brand text-brand hover:bg-brand hover:text-surface font-display text-[0.6rem] uppercase tracking-widest transition-all"
            >
              ¡Evolucionar!
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 py-3 bg-surface border-2 border-border text-muted hover:border-danger hover:text-danger font-display text-[0.6rem] uppercase tracking-widest transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>

        <style>{`
          @keyframes evolve-flash {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(3) saturate(0); }
          }
          @keyframes evolve-appear {
            0% { filter: brightness(0) saturate(0); transform: scale(0.8); }
            60% { filter: brightness(3) saturate(0); transform: scale(1.1); }
            100% { filter: brightness(1) saturate(1); transform: scale(1); }
          }
        `}</style>
      </div>
    </div>,
    document.body,
  );
}