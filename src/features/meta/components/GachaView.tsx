import React, { useState } from "react";
import { useGame } from "../../../context/GameContext";
import {
  getFrontSprite,
  getPokemonData,
  fetchEggMoves,
  isStarterMaterial,
} from "../../run/services/pokeapi.service";
import {
  generateRandomIVs,
  getRandomNature,
} from "../../../engine/stats.engine";
import { Coins, Sparkles, Wand2, X, Star, Zap } from "lucide-react";

// ── TYPES ────────────────────────────────────────────────────────────────────
interface Banner {
  id: string;
  name: string;
  featuredId: number; // 0 = no legendary (shiny banner)
  color: string;
  isShinyBanner?: boolean;
}

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const BANNERS: Banner[] = [
  { id: "sea", name: "Guardianes del Mar", featuredId: 249, color: "#4A90E2" },
  { id: "sky", name: "Soberanos del Cielo", featuredId: 384, color: "#50E3C2" },
  {
    id: "origin",
    name: "Distorsión de Origen",
    featuredId: 487,
    color: "#9013FE",
  },
  {
    id: "shiny",
    name: "Brillo Estelar",
    featuredId: 0,
    color: "#FFD700",
    isShinyBanner: true,
  },
];

// Legendaries from all generations
const PERMANENT_LEGENDARIES = [
  150, 243, 244, 245, 249, 250, 377, 378, 379, 380, 381, 382, 383, 384, 483,
  484, 487, 643, 644, 646, 716, 717, 791, 792, 888, 889, 1007, 1008,
];

const GACHA_COST = 0;
const FEATURED_RATE = 0.01; // 1.0% for the featured legendary
const PERMANENT_RATE = 0.006; // 0.6% for a permanent pool legendary
const PITY_THRESHOLD = 100;
const SHINY_RATE_NORMAL = 0.01; // 1%
const SHINY_RATE_BOOSTED = 0.05; // 5%
const EGG_MOVE_RATE = 0.2;

interface Props {
  onBack: () => void;
}

interface PullResultData {
  pokemonId: number;
  name: string;
  nature: string;
  isShiny: boolean;
  isNew: boolean;
  eggMove?: number;
  isLegendary: boolean;
  isFeatured: boolean;
}

// ── Internal pull result (before we know isNew) ──
interface RawPullResult {
  pokemonId: number;
  name: string;
  nature: string;
  isShiny: boolean;
  eggMove?: number;
  isLegendary: boolean;
  isFeatured: boolean;
  ivs: any;
  generatedNature: string;
}

// ── COMPONENTS ───────────────────────────────────────────────────────────────

/**
 * Renders a Pokemon sprite with multi-stage fallback:
 * 1. Showdown GIF (animated)
 * 2. Static PNG (high quality Gen 8+)
 * 3. Official Artwork (ultimate fallback)
 */
function GachaSprite({
  pokemonId,
  shiny,
  size = 128,
  className = "",
}: {
  pokemonId: number;
  shiny?: boolean;
  size?: number;
  className?: string;
}) {
  const [stage, setStage] = useState(0); // 0: GIF, 1: Static, 2: Artwork
  const [hasFailed, setHasFailed] = useState(false);

  const getUrl = () => {
    const suffix = shiny ? "shiny/" : "";
    if (stage === 0)
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${suffix}${pokemonId}.gif`;
    if (stage === 1)
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${suffix}${pokemonId}.png`;
    if (stage === 2)
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
    return "";
  };

  const handleError = () => {
    if (stage < 2) setStage(stage + 1);
    else setHasFailed(true);
  };

  if (hasFailed || pokemonId <= 0) {
    return (
      <div
        className={`bg-surface-light/20 flex items-center justify-center border-2 border-dashed border-border ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-muted text-xs font-display">?</span>
      </div>
    );
  }

  return (
    <img
      src={getUrl()}
      alt="Pokemon"
      onError={handleError}
      className={`pixelated object-contain transition-opacity duration-300 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function GachaView({ onBack }: Props) {
  const { meta, setMeta, notify } = useGame();
  const [selectedBanner, setSelectedBanner] = useState<Banner>(BANNERS[0]);
  const [isPulling, setIsPulling] = useState(false);
  const [pullResults, setPullResults] = useState<PullResultData[]>([]);

  const currentPity = meta.gachaPity?.[selectedBanner.id] || 0;
  const pullsUntilPity = PITY_THRESHOLD - currentPity;
  const costX10 = GACHA_COST * 9;

  const handlePull = async (count: number) => {
    const totalCost = count === 10 ? costX10 : GACHA_COST * count;
    if (meta.pokeCoins < totalCost || isPulling) return;

    setIsPulling(true);
    setPullResults([]);

    try {
      const banner = selectedBanner;
      const isShinyBanner = !!banner.isShinyBanner;
      const shinyRate = isShinyBanner ? SHINY_RATE_BOOSTED : SHINY_RATE_NORMAL;

      let pity = meta.gachaPity?.[banner.id] || 0;
      const rawResults: RawPullResult[] = [];

      for (let i = 0; i < count; i++) {
        let pulledId = -1;
        let isLegendary = false;
        let isFeatured = false;

        pity += 1;

        if (!isShinyBanner) {
          // ── Pity check first ──
          if (pity >= PITY_THRESHOLD) {
            isLegendary = true;
            pity = 0;
            // Pity gives featured
            if (banner.featuredId > 0) {
              pulledId = banner.featuredId;
              isFeatured = true;
            } else {
              const pool = PERMANENT_LEGENDARIES;
              pulledId = pool[Math.floor(Math.random() * pool.length)];
            }
          } else {
            // ── Featured roll: 1.0% ──
            if (Math.random() < FEATURED_RATE && banner.featuredId > 0) {
              pulledId = banner.featuredId;
              isLegendary = true;
              isFeatured = true;
              pity = 0;
            }
            // ── Permanent pool roll: 0.6% ──
            else if (Math.random() < PERMANENT_RATE) {
              const pool = PERMANENT_LEGENDARIES.filter(
                (id) => id !== banner.featuredId,
              );
              pulledId = pool[Math.floor(Math.random() * pool.length)];
              isLegendary = true;
              pity = 0;
            }
          }
        }

        // ── Normal Pokémon roll ──
        if (pulledId === -1) {
          let attempts = 0;
          while (pulledId === -1 && attempts < 15) {
            const candidateId = Math.floor(Math.random() * 1025) + 1;
            if (await isStarterMaterial(candidateId)) {
              pulledId = candidateId;
            }
            attempts++;
          }
          if (pulledId === -1) pulledId = Math.floor(Math.random() * 151) + 1;
        }

        // ── Shiny roll ──
        const isShiny = Math.random() < shinyRate;

        // ── Fetch data ──
        const pokemonData = await getPokemonData(pulledId, 5, isShiny);

        // ── Egg move roll ──
        let unlockedEggMove: number | undefined = undefined;
        if (Math.random() < EGG_MOVE_RATE) {
          const eggMoves = await fetchEggMoves(pulledId);
          if (eggMoves.length > 0) {
            unlockedEggMove =
              eggMoves[Math.floor(Math.random() * eggMoves.length)];
          }
        }

        const newIVs = generateRandomIVs();
        const nature = getRandomNature();

        rawResults.push({
          pokemonId: pulledId,
          name: pokemonData.name,
          nature: pokemonData.nature || nature,
          isShiny,
          eggMove: unlockedEggMove,
          isLegendary,
          isFeatured,
          ivs: newIVs,
          generatedNature: nature,
        });
      }

      // ── Single setMeta call with all accumulated changes ──
      const finalPity = pity;

      setMeta((prev) => {
        const newStarters = [...prev.unlockedStarters];

        for (const raw of rawResults) {
          const existingIdx = newStarters.findIndex(
            (s) => s.id === raw.pokemonId,
          );

          if (existingIdx >= 0) {
            const existing = newStarters[existingIdx];
            newStarters[existingIdx] = {
              ...existing,
              maxIvs: {
                hp: Math.max(existing.maxIvs.hp, raw.ivs.hp),
                attack: Math.max(existing.maxIvs.attack, raw.ivs.attack),
                defense: Math.max(existing.maxIvs.defense, raw.ivs.defense),
                spAtk: Math.max(existing.maxIvs.spAtk, raw.ivs.spAtk),
                spDef: Math.max(existing.maxIvs.spDef, raw.ivs.spDef),
                speed: Math.max(existing.maxIvs.speed, raw.ivs.speed),
              },
              unlockedNatures: Array.from(
                new Set([...existing.unlockedNatures, raw.generatedNature]),
              ),
              eggMoves: Array.from(
                new Set([
                  ...(existing.eggMoves || []),
                  ...(raw.eggMove ? [raw.eggMove] : []),
                ]),
              ),
              isShiny: existing.isShiny || raw.isShiny,
            };
          } else {
            newStarters.push({
              id: raw.pokemonId,
              name: raw.name,
              maxIvs: raw.ivs,
              maxEvs: {
                hp: 0,
                attack: 0,
                defense: 0,
                spAtk: 0,
                spDef: 0,
                speed: 0,
              },
              unlockedNatures: [raw.generatedNature],
              eggMoves: raw.eggMove ? [raw.eggMove] : [],
              isShiny: raw.isShiny,
            });
          }
        }

        return {
          ...prev,
          pokeCoins: prev.pokeCoins - totalCost,
          unlockedStarters: newStarters,
          gachaPity: { ...prev.gachaPity, [banner.id]: finalPity },
        };
      });

      // ── Build display results ──
      const existingIds = new Set(meta.unlockedStarters.map((s) => s.id));
      const seenInThisPull = new Set<number>();

      const displayResults: PullResultData[] = rawResults.map((raw) => {
        const isNew =
          !existingIds.has(raw.pokemonId) && !seenInThisPull.has(raw.pokemonId);
        seenInThisPull.add(raw.pokemonId);
        return {
          pokemonId: raw.pokemonId,
          name: raw.name,
          nature: raw.nature,
          isShiny: raw.isShiny,
          isNew,
          eggMove: raw.eggMove,
          isLegendary: raw.isLegendary,
          isFeatured: raw.isFeatured,
        };
      });

      setPullResults(displayResults);
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

  const canAfford1 = meta.pokeCoins >= GACHA_COST;
  const canAfford10 = meta.pokeCoins >= costX10;

  return (
    <div className="fixed inset-0 z-60 bg-color-surface flex flex-col crt-screen overflow-hidden">
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
        <div className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
              <div className="relative p-4 flex flex-col items-center gap-3">
                {banner.isShinyBanner ? (
                  <div className="w-24 h-24 flex items-center justify-center font-display text-accent">
                    <Sparkles
                      size={48}
                      className="drop-shadow-xl group-hover:animate-bounce"
                    />
                  </div>
                ) : (
                  <GachaSprite
                    pokemonId={banner.featuredId}
                    size={96}
                    className="drop-shadow-xl group-hover:animate-bounce"
                  />
                )}
                <div className="flex flex-col items-center">
                  <span className="font-display text-[0.45rem] text-accent tracking-[0.15em] mb-0.5">
                    {banner.isShinyBanner ? "BANNER SHINY" : "BANNER DESTACADO"}
                  </span>
                  <span className="font-display text-[0.6rem] text-center leading-tight">
                    {banner.name.toUpperCase()}
                  </span>
                </div>
                {selectedBanner.id === banner.id && (
                  <div className="absolute top-1 right-1">
                    <Sparkles size={10} className="text-accent animate-pulse" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Pity Counter */}
        {!selectedBanner.isShinyBanner && (
          <div className="flex items-center gap-2 mb-4 bg-surface-dark border-2 border-border px-4 py-2">
            <Zap size={14} className="text-accent" />
            <span className="font-display text-[0.6rem] text-muted">
              GARANTÍA EN <span className="text-accent">{pullsUntilPity}</span>{" "}
              TIRADAS
            </span>
            <div className="ml-2 w-24 h-2 bg-surface border border-border overflow-hidden">
              <div
                className="h-full bg-brand transition-all"
                style={{
                  width: `${(currentPity / PITY_THRESHOLD) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Pull Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-auto mb-6">
          <button
            onClick={() => handlePull(1)}
            disabled={isPulling || !canAfford1}
            className={`relative py-5 px-10 border-4 font-display text-sm tracking-[0.2em] transition-all ${
              canAfford1 && !isPulling
                ? "bg-brand border-brand-dark text-white hover:scale-105 active:scale-95 shadow-pixel"
                : "bg-surface-dark border-border text-muted cursor-not-allowed"
            }`}
          >
            {isPulling ? "INVOCANDO..." : `INVOCAR ×1 (${GACHA_COST} 💰)`}
          </button>

          <button
            onClick={() => handlePull(10)}
            disabled={isPulling || !canAfford10}
            className={`relative py-5 px-10 border-4 font-display text-sm tracking-[0.2em] transition-all ${
              canAfford10 && !isPulling
                ? "bg-linear-to-r from-brand to-purple-600 border-brand-dark text-white hover:scale-105 active:scale-95 shadow-pixel"
                : "bg-surface-dark border-border text-muted cursor-not-allowed"
            }`}
          >
            <div className="flex flex-col items-center">
              <span>
                {isPulling ? "INVOCANDO..." : `INVOCAR ×10 (${costX10} 💰)`}
              </span>
              {!isPulling && (
                <span className="text-[0.45rem] text-accent mt-0.5">
                  ¡1 GRATIS!
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Rate Info */}
        <div className="text-[0.5rem] font-display text-muted italic text-center max-w-md leading-relaxed mb-4">
          {selectedBanner.isShinyBanner ? (
            <>
              * Sin Legendarios en este banner. <br />*{" "}
              <span className="text-accent">5%</span> de prob. variocolor
              (Shiny). <br />* 20% de prob. de movimiento huevo.
            </>
          ) : (
            <>
              * <span className="text-accent">1.0%</span> de prob. legendario
              destacado. <br />* <span className="text-accent">0.6%</span> de
              prob. legendario permanente. <br />
              * Garantizado a las 100 tiradas (pity). <br />
              * 1% de prob. variocolor (Shiny). <br />* 20% de prob. de
              movimiento huevo.
            </>
          )}
        </div>
      </div>

      {/* ── PULL RESULT OVERLAY ── */}
      {(isPulling || pullResults.length > 0) && (
        <div className="fixed inset-0 z-70 bg-black/95 flex flex-col items-center justify-center p-4 overflow-y-auto">
          {isPulling ? (
            <div className="flex flex-col items-center gap-8">
              <div className="w-32 h-32 border-8 border-brand border-t-accent rounded-full animate-spin shadow-[0_0_50px_rgba(255,215,0,0.3)]" />
              <h3 className="font-display text-2xl animate-pulse tracking-widest text-brand">
                CANALIZANDO ENERGÍA...
              </h3>
            </div>
          ) : pullResults.length === 1 ? (
            <SinglePullCard
              result={pullResults[0]}
              onConfirm={() => setPullResults([])}
            />
          ) : (
            <div className="w-full max-w-4xl flex flex-col items-center gap-6 animate-in zoom-in-90 duration-300 py-10">
              <h3 className="font-display text-xl tracking-widest text-brand">
                RESULTADOS ×{pullResults.length}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full">
                {pullResults.map((r, i) => (
                  <div
                    key={i}
                    className={`bg-surface-dark border-2 p-3 flex flex-col items-center gap-2 transition-all ${
                      r.isLegendary
                        ? "border-accent shadow-[0_0_15px_rgba(255,215,0,0.4)]"
                        : r.isShiny
                          ? "border-brand shadow-[0_0_10px_rgba(204,0,0,0.3)]"
                          : "border-border"
                    }`}
                  >
                    <div className="relative">
                      <GachaSprite
                        pokemonId={r.pokemonId}
                        shiny={r.isShiny}
                        size={64}
                      />
                      {r.isShiny && (
                        <Sparkles
                          size={10}
                          className="absolute top-0 right-0 text-accent animate-ping"
                        />
                      )}
                      {r.isLegendary && (
                        <Star
                          size={10}
                          className="absolute top-0 left-0 text-accent"
                        />
                      )}
                    </div>
                    <span className="font-display text-[0.55rem] text-center capitalize truncate w-full">
                      {r.name}
                    </span>
                    <div className="flex gap-1 flex-wrap justify-center">
                      {r.isNew && (
                        <span className="bg-accent text-black font-display text-[0.35rem] px-1">
                          NUEVO
                        </span>
                      )}
                      {r.isLegendary && (
                        <span className="bg-purple-600 text-white font-display text-[0.35rem] px-1">
                          {r.isFeatured ? "DEST." : "LEGEN."}
                        </span>
                      )}
                      {r.isShiny && (
                        <span className="bg-brand text-white font-display text-[0.35rem] px-1">
                          SHINY
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPullResults([])}
                className="w-full max-w-xs py-3 bg-brand text-white font-display text-xs tracking-widest hover:bg-brand-dark transition-all mt-2"
              >
                CONFIRMAR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Single Result Card ── */
function SinglePullCard({
  result,
  onConfirm,
}: {
  result: PullResultData;
  onConfirm: () => void;
}) {
  return (
    <div
      className={`w-full max-w-md border-4 p-8 flex flex-col items-center gap-6 animate-in zoom-in-90 duration-300 ${
        result.isLegendary
          ? "bg-surface-dark border-accent shadow-[0_0_100px_rgba(255,215,0,0.4)]"
          : "bg-surface-dark border-brand shadow-[0_0_100px_rgba(255,215,0,0.2)]"
      }`}
    >
      <div className="relative">
        <div
          className={`absolute inset-0 blur-2xl animate-pulse rounded-full ${result.isLegendary ? "bg-accent/30" : "bg-brand/20"}`}
        />
        <GachaSprite
          pokemonId={result.pokemonId}
          shiny={result.isShiny}
          size={192}
          className="relative drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
        />
        {result.isShiny && (
          <Sparkles className="absolute top-0 right-0 text-accent animate-ping" />
        )}
        {result.isLegendary && (
          <Star
            className="absolute top-0 left-0 text-accent animate-bounce"
            size={24}
          />
        )}
      </div>

      <div className="flex flex-col items-center">
        {result.isLegendary && (
          <span className="bg-purple-600 text-white font-display text-[0.5rem] px-3 py-0.5 mb-2 tracking-widest">
            {result.isFeatured ? "★ LEGENDARIO DESTACADO ★" : "LEGENDARIO"}
          </span>
        )}
        {result.isNew && (
          <span className="bg-accent text-black font-display text-[0.4rem] px-2 py-0.5 rounded-sm mb-2 animate-bounce">
            ¡NUEVO!
          </span>
        )}
        <h4
          className={`font-display text-3xl tracking-widest ${result.isShiny ? "text-accent" : "text-white"}`}
        >
          {result.name.toUpperCase()}
        </h4>
        <span className="font-display text-[0.5rem] text-muted tracking-[0.2em] mt-1">
          NATURALEZA: {result.nature}
        </span>
      </div>

      {result.eggMove && (
        <div className="flex flex-col items-center gap-1 border-t border-border w-full pt-4">
          <span className="font-display text-[0.45rem] text-accent flex items-center gap-1">
            <Wand2 size={8} /> MOVIMIENTO HUEVO DESBLOQUEADO
          </span>
          <span className="font-display text-xs text-muted italic uppercase">
            ID: {result.eggMove}
          </span>
        </div>
      )}

      <button
        onClick={onConfirm}
        className="w-full py-3 bg-brand text-white font-display text-xs tracking-widest hover:bg-brand-dark transition-all mt-4"
      >
        CONFIRMAR
      </button>
    </div>
  );
}
