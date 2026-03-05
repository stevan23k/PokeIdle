import React, { useState, useEffect } from "react";
import { useGame } from "../../../context/GameContext";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { getPokemonTier } from "../../../engine/evolution.engine";
import {
  getPokemonData,
  isStarterMaterial,
} from "../../run/services/pokeapi.service";
import { clsx } from "clsx";
import { Sword, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function TrainingSelector() {
  const { setTraining, meta } = useGame();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [filteredStarters, setFilteredStarters] = useState<
    import("../../../features/meta/types/meta.types").UnlockedStarter[]
  >([]);

  useEffect(() => {
    let isCancelled = false;
    const filter = async () => {
      const results = await Promise.all(
        meta.unlockedStarters.map(async (s) => ({
          starter: s,
          valid: await isStarterMaterial(s.id),
        })),
      );
      if (!isCancelled) {
        setFilteredStarters(
          results.filter((r) => r.valid).map((r) => r.starter),
        );
      }
    };
    filter();
    return () => {
      isCancelled = true;
    };
  }, [meta.unlockedStarters]);

  const allStarters = filteredStarters;
  const selectedStarter = allStarters.find((s) => s.id === selectedId);

  const handleStartTraining = async () => {
    if (!selectedStarter || isInitializing) return;

    setIsInitializing(true);
    try {
      // Generate a fresh instance for training
      // Tier 3 (Legendaries) start at level 30, others at level 5
      const startingLevel = getPokemonTier(selectedStarter.id) === 3 ? 30 : 5;
      const pokemonInstance = await getPokemonData(
        selectedStarter.id,
        startingLevel,
      );

      setTraining({
        isActive: true,
        pokemonUid: pokemonInstance.uid,
        pokemon: pokemonInstance,
        currentBattle: null,
        battleLog: [],
        totalBattlesWon: 0,
        pendingLootSelection: null,
        items: {},
      });
    } catch (error) {
      console.error("Failed to initialize training:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-dark/95 crt-screen p-4 md:p-8 animate-in fade-in zoom-in duration-300">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        <header className="text-center border-b-4 border-border pb-6 flex flex-col gap-2">
          <h1 className="font-display text-2xl text-brand drop-shadow-[0_0_8px_rgba(204,0,0,0.5)] tracking-widest">
            ENTRENAMIENTO INFINITO
          </h1>
          <p className="font-body text-[0.6rem] text-muted tracking-widest uppercase">
            Selecciona un Pokémon desbloqueado para entrenar
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Scrollable list of unlocked starters */}
          <div className="lg:col-span-2 bg-surface border-4 border-border p-4 pixel-shadow h-[400px] overflow-y-auto custom-scrollbar">
            {allStarters.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                <p className="font-display text-xs text-muted mb-2">
                  NO HAY POKÉMON DESBLOQUEADOS
                </p>
                <p className="font-body text-[0.5rem] text-muted uppercase">
                  Juega runs normales para desbloquear nuevos iniciales
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {allStarters.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={clsx(
                      "flex flex-col items-center p-3 border-4 transition-all group relative",
                      selectedId === s.id
                        ? "border-brand bg-brand/10 -translate-y-1 shadow-pixel"
                        : "border-border hover:border-brand/50 bg-surface-dark",
                    )}
                  >
                    <PixelSprite
                      pokemonId={s.id}
                      variant="front"
                      size={48}
                      shiny={false}
                      alt={s.name}
                      className={clsx(
                        "mb-2 transition-transform",
                        selectedId === s.id && "scale-110",
                      )}
                    />
                    <span className="font-display text-[0.55rem] text-white truncate w-full text-center">
                      {s.name}
                    </span>
                    <span className="font-display text-[0.45rem] text-muted uppercase tracking-tighter">
                      Tier {getPokemonTier(s.id)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details & Start Side */}
          <div className="flex flex-col gap-4">
            {selectedStarter ? (
              <div className="bg-surface border-4 border-border p-6 pixel-shadow flex flex-col gap-6 animate-in slide-in-from-right duration-200">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-surface-dark border-4 border-border mb-4 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-brand/5 animate-pulse" />
                    <PixelSprite
                      pokemonId={selectedStarter.id}
                      variant="front"
                      size={80}
                      shiny={false}
                    />
                  </div>
                  <h2 className="font-display text-lg text-white mb-1">
                    {selectedStarter.name}
                  </h2>
                  <div className="px-3 py-1 bg-brand text-white font-display text-[0.5rem] tracking-widest mb-4">
                    TIER {getPokemonTier(selectedStarter.id)}
                  </div>

                  <div className="w-full space-y-2">
                    <p className="font-body text-[0.5rem] text-muted uppercase border-b border-border pb-1">
                      Potencial Máximo
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedStarter.maxIvs).map(
                        ([key, val]) => (
                          <div
                            key={key}
                            className="flex justify-between items-center bg-surface-dark/50 px-2 py-1 border border-border/30"
                          >
                            <span className="font-display text-[0.4rem] text-muted uppercase">
                              {key.substring(0, 3)}
                            </span>
                            <span className="font-display text-[0.5rem] text-brand">
                              {val}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartTraining}
                  disabled={isInitializing}
                  className="w-full flex items-center justify-center gap-3 mt-4"
                >
                  {isInitializing ? (
                    <>
                      INICIALIZANDO{" "}
                      <Loader2 size={16} className="animate-spin" />
                    </>
                  ) : (
                    <>
                      EMPEZAR <Sword size={16} fill="currentColor" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="bg-surface/50 border-4 border-border border-dashed p-12 flex flex-col items-center justify-center opacity-60 text-center">
                <span className="font-display text-[0.6rem] text-muted tracking-widest">
                  SELECCIONA UN <br /> POKÉMON PARA <br /> ENTRENAR
                </span>
                <div className="w-12 h-12 border-4 border-border/30 mt-4 rotate-45" />
              </div>
            )}

            <div className="bg-surface-dark border-4 border-border p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-display text-[0.55rem] text-muted">
                  MIS POKÉCOINS
                </span>
                <span className="font-display text-xs text-brand">
                  💰 {meta.pokeCoins}
                </span>
              </div>
              <p className="font-body text-[0.45rem] text-muted text-center leading-relaxed">
                Entrena a tus Pokémon favoritos para ganar monedas y desbloquear
                recompensas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
