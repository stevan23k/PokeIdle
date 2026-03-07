import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../../../context/GameContext";
import { getPokemonData } from "../services/pokeapi.service";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { generateUid } from "../../../utils/random";
import { clsx } from "clsx";
import { Sparkles, ArrowRight, Star } from "lucide-react";

type Phase = "intro" | "evolving" | "reveal" | "done";

export function EvolutionModal() {
  const { run, setRun } = useGame();
  const [phase, setPhase] = useState<Phase>("intro");
  const [evolvedPoke, setEvolvedPoke] = useState<any>(null);

  const pending = run.pendingEvolution;

  useEffect(() => {
    if (!pending) {
      setPhase("intro");
      setEvolvedPoke(null);
      return;
    }

    // Auto-pre-fetch evolved data so it's ready for the reveal
    const prefetch = async () => {
      try {
        const pokemon = run.team.find((p) => p.uid === pending.pokemonUid);
        if (pokemon) {
          const data = await getPokemonData(
            pending.toId,
            pokemon.level,
            pokemon.isShiny,
          );
          setEvolvedPoke(data);
        }
      } catch (err) {
        console.error("Evolution prefetch failed", err);
      }
    };
    prefetch();

    // Start Intro -> Evolving -> Reveal sequence
    const t1 = setTimeout(() => setPhase("evolving"), 2500);
    const t2 = setTimeout(() => setPhase("reveal"), 5500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pending]);

  if (!pending) return null;

  const handleFinish = () => {
    if (!evolvedPoke) return;

    setRun((prev) => {
      const p = prev.team.find((t) => t.uid === pending.pokemonUid);
      if (!p) return { ...prev, pendingEvolution: null };

      const evolvedPokemon = {
        ...evolvedPoke,
        uid: p.uid,
        nickname: p.nickname,
        currentHP: Math.max(
          1,
          Math.floor((p.currentHP / p.maxHP) * evolvedPoke.maxHP),
        ),
        xp: p.xp,
        xpToNext: p.xpToNext,
        evs: p.evs,
        ivs: p.ivs,
        nature: p.nature,
        heldItem: p.heldItem,
        caughtAt: p.caughtAt,
        caughtLevel: p.caughtLevel,
        moves: p.moves,
      };

      const next = {
        ...prev,
        pendingEvolution: null,
        team: prev.team.map((t) =>
          t.uid === pending.pokemonUid ? evolvedPokemon : t,
        ),
        currentBattle:
          prev.currentBattle?.playerPokemon?.uid === pending.pokemonUid
            ? { ...prev.currentBattle, playerPokemon: evolvedPokemon }
            : prev.currentBattle,
        battleLog: [
          ...prev.battleLog,
          {
            id: generateUid(),
            text: `¡Enhorabuena! ¡Tu ${pending.fromName} ha evolucionado en ${pending.toName}!`,
            type: "evolution" as const,
          },
        ].slice(-40),
      };

      // Trigger move learning check for the newly evolved pokemon at its current level
      (next as any).__checkMoveLearnAt = {
        pokemonUid: pending.pokemonUid,
        level: evolvedPokemon.level,
        fromLevel: 1, // check all moves from level 1 to current level
      };

      return next;
    });
  };

  const handleCancel = () => {
    setRun((prev) => ({
      ...prev,
      pendingEvolution: null,
      battleLog: [
        ...prev.battleLog,
        {
          id: generateUid(),
          text: `${pending.fromName} detuvo su evolución.`,
          type: "normal" as const,
        },
      ].slice(-40),
    }));
  };

  const currentPokemon = run.team.find((p) => p.uid === pending.pokemonUid);

  return createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-lg bg-surface-dark border-4 border-brand crt-screen shadow-[0_0_50px_rgba(204,0,0,0.3)] relative overflow-hidden flex flex-col items-center">
        {/* Background Burst Effect for Reveal */}
        {phase === "reveal" && (
          <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none">
            <div className="w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_70%)] animate-pulse" />
            <div className="absolute w-[600px] h-2 bg-white/20 rotate-45 animate-reveal-beam" />
            <div className="absolute w-[600px] h-2 bg-white/20 -rotate-45 animate-reveal-beam-delayed" />
          </div>
        )}

        <div className="relative z-10 w-full p-8 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <h2
              className={clsx(
                "font-display text-lg uppercase tracking-[0.2em] transition-all duration-700 text-center",
                phase === "reveal"
                  ? "text-accent scale-110 drop-shadow-[0_0_8px_rgba(255,184,0,0.4)]"
                  : "text-brand",
              )}
            >
              {phase === "reveal" ? "¡EVOLUCIÓN COMPLETADA!" : "¡UN MOMENTO!"}
            </h2>
            <div className="h-1 w-24 bg-linear-to-r from-transparent via-brand to-transparent opacity-50" />
          </div>

          <div className="relative h-48 w-48 flex items-center justify-center">
            {/* Base Circle */}
            <div
              className={clsx(
                "absolute inset-0 border-4 border-dashed rounded-full border-brand/20 transition-all duration-1000",
                phase === "evolving"
                  ? "animate-spin-slow scale-110 opacity-60"
                  : "opacity-20 scale-100",
              )}
            />

            {/* Sprites with animations */}
            <div className="relative z-10 flex items-center justify-center">
              {phase !== "reveal" && (
                <div
                  className={clsx(
                    "transition-all duration-300",
                    phase === "evolving" ? "animate-evolution-flicker" : "",
                  )}
                >
                  <PixelSprite
                    pokemonId={currentPokemon?.pokemonId || 0}
                    variant="front"
                    size={160}
                    shiny={currentPokemon?.isShiny}
                    alt={pending.fromName}
                  />
                </div>
              )}

              {phase === "reveal" && (
                <div className="animate-evolution-reveal">
                  <PixelSprite
                    pokemonId={pending.toId}
                    variant="front"
                    size={160}
                    shiny={currentPokemon?.isShiny}
                    alt={pending.toName}
                  />
                </div>
              )}
            </div>

            {/* Sparkles during sequence */}
            {(phase === "evolving" || phase === "reveal") && (
              <>
                <Sparkles
                  className="absolute -top-4 -left-4 text-accent animate-pulse"
                  size={24}
                />
                <Sparkles
                  className="absolute -bottom-2 -right-6 text-brand animate-pulse delay-700"
                  size={20}
                />
              </>
            )}
          </div>

          <div className="text-center space-y-3">
            <p className="font-body text-xs text-foreground uppercase tracking-widest min-h-[40px] flex items-center justify-center">
              {phase === "intro" &&
                `¿Qué? ¡${pending.fromName} está evolucionando!`}
              {phase === "evolving" &&
                (pending.reason
                  ? `¡${pending.fromName} está reaccionando a ${pending.reason.toLowerCase().includes("piedra") ? "la " : ""}${pending.reason}!`
                  : `¡La energía de la evolución rodea a ${pending.fromName}!`)}
              {phase === "reveal" &&
                `¡Tu ${pending.fromName} ha evolucionado en ${pending.toName}!`}
            </p>

            {phase === "reveal" && evolvedPoke && (
              <div className="bg-surface/50 border-2 border-accent/20 p-3 grid grid-cols-2 gap-x-6 gap-y-1 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="col-span-2 border-b border-accent/10 pb-1 mb-1 flex justify-between">
                  <span className="font-display text-[0.45rem] text-muted uppercase">
                    ESTADÍSTICAS
                  </span>
                  <span className="font-display text-[0.45rem] text-accent uppercase">
                    MEJORA
                  </span>
                </div>
                {Object.entries(evolvedPoke.stats).map(([k, v]) => {
                  const oldV =
                    currentPokemon?.stats[
                      k as keyof typeof currentPokemon.stats
                    ] || 0;
                  const diff = (v as number) - oldV;
                  return (
                    <div
                      key={k}
                      className="flex justify-between items-center group"
                    >
                      <span className="font-display text-[0.4rem] text-muted uppercase tracking-tighter">
                        {k.substring(0, 3)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-display text-[0.55rem] text-white">
                          {v as number}
                        </span>
                        {diff > 0 && (
                          <span className="font-body text-[0.45rem] text-accent font-bold">
                            +{diff}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-4 w-full pt-4">
            {phase === "reveal" ? (
              <button
                onClick={handleFinish}
                className="w-full py-4 bg-accent/20 border-2 border-accent text-accent hover:bg-accent hover:text-black font-display text-[0.7rem] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group shadow-[0_0_15px_rgba(255,184,0,0.2)] hover:shadow-[0_0_25px_rgba(255,184,0,0.4)]"
              >
                CONTINUAR{" "}
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            ) : (
              <button
                onClick={handleCancel}
                className="w-full py-3 bg-surface border-2 border-border text-muted hover:border-danger hover:text-danger font-display text-[0.55rem] uppercase tracking-widest transition-all"
              >
                DETENER EVOLUCIÓN (B)
              </button>
            )}
          </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes evolution-flicker {
            0%, 100% { filter: brightness(1); transform: scale(1); }
            50% { filter: brightness(4) saturate(0); transform: scale(1.05); }
          }
          @keyframes evolution-reveal {
            0% { transform: scale(0) rotate(-10deg); filter: brightness(10) blur(10px); }
            50% { transform: scale(1.1) rotate(5deg); filter: brightness(2) blur(2px); }
            100% { transform: scale(1) rotate(0deg); filter: brightness(1) blur(0px); }
          }
          @keyframes reveal-beam {
            from { transform: translateX(-100%) rotate(45deg); opacity: 0; }
            50% { opacity: 1; }
            to { transform: translateX(100%) rotate(45deg); opacity: 0; }
          }
          .animate-spin-slow { animation: spin-slow 8s linear infinite; }
          .animate-evolution-flicker { animation: evolution-flicker 0.4s ease-in-out infinite; }
          .animate-evolution-reveal { animation: evolution-reveal 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
          .animate-reveal-beam { animation: reveal-beam 2s linear infinite; }
          .animate-reveal-beam-delayed { animation: reveal-beam 2.5s linear infinite reverse; }
        `}</style>
      </div>
    </div>,
    document.body,
  );
}
