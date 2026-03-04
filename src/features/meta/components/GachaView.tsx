import React, { useState, useEffect } from "react";
import { useGame } from "../../../context/GameContext";
import {
  fetchJson,
  getFrontSprite,
  getPokemonData,
  fetchEggMoves,
  isStarterMaterial,
} from "../../run/services/pokeapi.service";
import {
  generateRandomIVs,
  getRandomNature,
} from "../../../engine/stats.engine";
import { Coins, Sparkles, Wand2, X } from "lucide-react";

interface Banner {
  id: string;
  name: string;
  featuredId: number;
  color: string;
}

const BANNERS: Banner[] = [
  { id: "sea", name: "Guardianes del Mar", featuredId: 249, color: "#4A90E2" }, // Lugia
  { id: "sky", name: "Soberanos del Cielo", featuredId: 384, color: "#50E3C2" }, // Rayquaza
  {
    id: "origin",
    name: "Distorsión de Origen",
    featuredId: 487,
    color: "#9013FE",
  }, // Giratina
];

const GACHA_COST = 0;

interface Props {
  onBack: () => void;
}

export function GachaView({ onBack }: Props) {
  const { meta, setMeta, notify } = useGame();
  const [selectedBanner, setSelectedBanner] = useState<Banner>(BANNERS[0]);
  const [isPulling, setIsPulling] = useState(false);
  const [pullResult, setPullResult] = useState<any>(null);

  const handlePull = async () => {
    if (meta.pokeCoins < GACHA_COST || isPulling) return;

    setIsPulling(true);
    setPullResult(null);

    try {
      // 1. Determine Target ID
      let pulledId = -1;
      const isFeatured = Math.random() < 0.05; // 5% chance

      if (isFeatured) {
        pulledId = selectedBanner.featuredId;
      } else {
        // Roll until we find a base form or legendary
        let attempts = 0;
        while (pulledId === -1 && attempts < 10) {
          const candidateId = Math.floor(Math.random() * 1025) + 1;
          if (await isStarterMaterial(candidateId)) {
            pulledId = candidateId;
          }
          attempts++;
        }
        // Fallback to something safe if we fail 10 times (shouldn't happen)
        if (pulledId === -1) pulledId = 1;
      }

      // 2. Shiny Roll
      const isShiny = Math.random() < 0.01; // 1/100

      // 3. Fetch Data
      const pokemonData = await getPokemonData(pulledId, 5, isShiny);

      // 4. Egg Move Roll
      let unlockedEggMove: number | undefined = undefined;
      const eggMoveRoll = Math.random() < 0.2; // 20%
      if (eggMoveRoll) {
        const eggMoves = await fetchEggMoves(pulledId);
        if (eggMoves.length > 0) {
          unlockedEggMove =
            eggMoves[Math.floor(Math.random() * eggMoves.length)];
        }
      }

      // 5. Update Meta State
      setMeta((prev) => {
        const existingIdx = prev.unlockedStarters.findIndex(
          (s) => s.id === pulledId,
        );
        const newStarters = [...prev.unlockedStarters];

        const newIVs = generateRandomIVs();
        const nature = getRandomNature();

        if (existingIdx >= 0) {
          // Update existing
          const existing = newStarters[existingIdx];
          newStarters[existingIdx] = {
            ...existing,
            maxIvs: {
              hp: Math.max(existing.maxIvs.hp, newIVs.hp),
              attack: Math.max(existing.maxIvs.attack, newIVs.attack),
              defense: Math.max(existing.maxIvs.defense, newIVs.defense),
              spAtk: Math.max(existing.maxIvs.spAtk, newIVs.spAtk),
              spDef: Math.max(existing.maxIvs.spDef, newIVs.spDef),
              speed: Math.max(existing.maxIvs.speed, newIVs.speed),
            },
            unlockedNatures: Array.from(
              new Set([...existing.unlockedNatures, nature]),
            ),
            eggMoves: Array.from(
              new Set([
                ...(existing.eggMoves || []),
                ...(unlockedEggMove ? [unlockedEggMove] : []),
              ]),
            ),
            isShiny: existing.isShiny || isShiny,
          };
        } else {
          // Add new
          newStarters.push({
            id: pulledId,
            name: pokemonData.name,
            maxIvs: newIVs,
            maxEvs: {
              hp: 0,
              attack: 0,
              defense: 0,
              spAtk: 0,
              spDef: 0,
              speed: 0,
            },
            unlockedNatures: [nature],
            eggMoves: unlockedEggMove ? [unlockedEggMove] : [],
            isShiny: isShiny,
          });
        }

        return {
          ...prev,
          pokeCoins: prev.pokeCoins - GACHA_COST,
          unlockedStarters: newStarters,
        };
      });

      setPullResult({
        ...pokemonData,
        isNew: !meta.unlockedStarters.some((s) => s.id === pulledId),
        eggMove: unlockedEggMove,
      });
    } catch (err) {
      console.error(err);
      notify({
        message: "Error al realizar la invocación.",
        type: "defeat",
        icon: "❌",
        duration: 3000,
      });
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-color-surface flex flex-col crt-screen overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 flex items-center justify-between border-b-2 border-border shadow-pixel">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-surface-light text-muted hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="font-display text-lg tracking-widest text-brand">
            INVOCACIÓN POKÉMON
          </h2>
        </div>
        <div className="flex items-center gap-2 bg-surface-dark border-2 border-border px-3 py-1">
          <Coins size={14} className="text-accent" />
          <span className="font-display text-sm">{meta.pokeCoins}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 overflow-y-auto custom-scrollbar">
        {/* Banner Selection */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {BANNERS.map((banner) => (
            <button
              key={banner.id}
              onClick={() => setSelectedBanner(banner)}
              className={`relative overflow-hidden group border-4 transition-all ${
                selectedBanner.id === banner.id
                  ? "border-brand scale-105 shadow-pixel"
                  : "border-border opacity-60 hover:opacity-100"
              }`}
            >
              <div
                className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                style={{ backgroundColor: banner.color }}
              />
              <div className="relative p-6 flex flex-col items-center gap-4">
                <img
                  src={getFrontSprite(banner.featuredId)}
                  alt={banner.name}
                  className="w-24 h-24 pixelated drop-shadow-xl group-hover:animate-bounce"
                />
                <div className="flex flex-col items-center">
                  <span className="font-display text-[0.5rem] text-accent tracking-[0.2em] mb-1">
                    BANNER DESTACADO
                  </span>
                  <span className="font-display text-xs text-center">
                    {banner.name.toUpperCase()}
                  </span>
                </div>
                {selectedBanner.id === banner.id && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Sparkles size={12} className="text-accent animate-pulse" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Pull Button Area */}
        <div className="flex flex-col items-center gap-6 mt-auto mb-8">
          <button
            onClick={handlePull}
            disabled={isPulling || meta.pokeCoins < GACHA_COST}
            className={`
              relative py-6 px-16 border-4 font-display text-lg tracking-[0.3em] transition-all
              ${
                meta.pokeCoins >= GACHA_COST && !isPulling
                  ? "bg-brand border-brand-dark text-white hover:scale-105 active:scale-95 shadow-pixel"
                  : "bg-surface-dark border-border text-muted cursor-not-allowed"
              }
            `}
          >
            {isPulling ? "INVOCANDO..." : `INVOCAR (${GACHA_COST} 💰)`}
            {!isPulling && meta.pokeCoins >= GACHA_COST && GACHA_COST > 0 && (
              <div className="absolute -top-2 -right-2 bg-accent text-black p-1 text-[0.4rem] animate-bounce">
                ESTRELLA DISPONIBLE
              </div>
            )}
          </button>
          <p className="text-[0.5rem] font-display text-muted italic text-center max-w-xs leading-relaxed">
            * 5% de prob. para el legendario destacado. <br />
            * 1% de prob. variocolor (Shiny). <br />* 20% de prob. de movimiento
            huevo.
          </p>
        </div>

        {/* Pull Animation/Result Overlay */}
        {(isPulling || pullResult) && (
          <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col items-center justify-center p-4">
            {isPulling ? (
              <div className="flex flex-col items-center gap-8">
                <div className="w-32 h-32 border-8 border-brand border-t-accent rounded-full animate-spin shadow-[0_0_50px_rgba(255,215,0,0.3)]" />
                <h3 className="font-display text-2xl animate-pulse tracking-widest text-brand">
                  CANALIZANDO ENERGÍA...
                </h3>
              </div>
            ) : (
              <div className="w-full max-w-md bg-surface-dark border-4 border-brand p-8 flex flex-col items-center gap-6 shadow-[0_0_100px_rgba(255,215,0,0.2)] animate-in zoom-in-90 duration-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand/20 blur-2xl animate-pulse rounded-full" />
                  <img
                    src={getFrontSprite(
                      pullResult.pokemonId,
                      pullResult.isShiny,
                    )}
                    alt={pullResult.name}
                    className="w-48 h-48 pixelated relative drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                  />
                  {pullResult.isShiny && (
                    <Sparkles className="absolute top-0 right-0 text-accent animate-ping" />
                  )}
                </div>

                <div className="flex flex-col items-center">
                  {pullResult.isNew && (
                    <span className="bg-accent text-black font-display text-[0.4rem] px-2 py-0.5 rounded-sm mb-2 animate-bounce">
                      ¡NUEVO!
                    </span>
                  )}
                  <h4
                    className={`font-display text-3xl tracking-widest ${pullResult.isShiny ? "text-accent" : "text-white"}`}
                  >
                    {pullResult.name.toUpperCase()}
                  </h4>
                  <span className="font-display text-[0.5rem] text-muted tracking-[0.2em] mt-1">
                    NATURALEZA: {pullResult.nature}
                  </span>
                </div>

                {pullResult.eggMove && (
                  <div className="flex flex-col items-center gap-1 border-t border-border w-full pt-4">
                    <span className="font-display text-[0.45rem] text-accent flex items-center gap-1">
                      <Wand2 size={8} /> MOVIMIENTO HUEVO DESBLOQUEADO
                    </span>
                    <span className="font-display text-xs text-muted italic uppercase">
                      ID: {pullResult.eggMove}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => setPullResult(null)}
                  className="w-full py-3 bg-brand text-white font-display text-xs tracking-widest hover:bg-brand-dark transition-all mt-4"
                >
                  CONFIRMAR
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
