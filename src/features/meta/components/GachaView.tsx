import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../../../context/GameContext";
import {
  getFrontSprite,
  getPokemonData,
  fetchEggMoves,
  isStarterMaterial,
  fetchBasePokemonPool,
  fetchGachaPools,
} from "../../run/services/pokeapi.service";
import {
  generateRandomIVs,
  getRandomNature,
} from "../../../engine/stats.engine";
import {
  Coins,
  Sparkles,
  Wand2,
  X,
  Star,
  Zap,
  ChevronLeft,
} from "lucide-react";
import {
  isLegendaryOrMythical,
  getLegendaryCategory,
  GACHA_LEGENDARY_POOL,
  MYTHICAL_IDS,
  PARADOX_IDS,
} from "../../../lib/legendaries";
import { getDailyLegendaries } from "../../../lib/gacha.utils";

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
  {
    id: "daily-1",
    name: "Carga Legendaria",
    featuredId: 0,
    color: "from-blue-600 to-cyan-400",
  },
  {
    id: "daily-2",
    name: "Carga Legendaria",
    featuredId: 0,
    color: "from-emerald-600 to-lime-400",
  },
  {
    id: "daily-3",
    name: "Carga Legendaria",
    featuredId: 0,
    color: "from-purple-700 to-slate-900",
  },
  {
    id: "shiny",
    name: "Festival Variocolor",
    featuredId: 0,
    color: "from-amber-400 via-yellow-200 to-amber-400",
    isShinyBanner: true,
  },
];

/**
 * Selects a background based on the Pokémon ID or banner type.
 */
function getGachaBackground(banner: Banner): string {
  if (banner.isShinyBanner) return "/gacha-bg/shiny_festival.png";

  const id = banner.featuredId;

  // Specific Pokemon backgrounds (Full Tier 6 Mapping)
  const pokemonBgs: Record<number, string> = {
    // Kanto & Johto
    150: "/gacha-bg/Mewtwo.png",
    144: "/gacha-bg/Articuno.png",
    145: "/gacha-bg/Zapdos.png",
    146: "/gacha-bg/Moltres.png",
    249: "/gacha-bg/Lugia.png",
    250: "/gacha-bg/Ho_Oh.png",
    243: "/gacha-bg/Raikou_Entei_Suicune.png",
    244: "/gacha-bg/Raikou_Entei_Suicune.png",
    245: "/gacha-bg/Raikou_Entei_Suicune.png",

    // Hoenn
    382: "/gacha-bg/Kyogre.png",
    383: "/gacha-bg/Groudon.png",
    384: "/gacha-bg/Rayquaza.png",
    380: "/gacha-bg/Latias_Latios.png",
    381: "/gacha-bg/Latias_Latios.png",
    377: "/gacha-bg/Regirock_Regice_Registeel.png",
    378: "/gacha-bg/Regirock_Regice_Registeel.png",
    379: "/gacha-bg/Regirock_Regice_Registeel.png",

    // Sinnoh & Unova
    483: "/gacha-bg/Dialga_Palkia.png",
    484: "/gacha-bg/Dialga_Palkia.png",
    487: "/gacha-bg/Giratina.png",
    643: "/gacha-bg/Reshiram.png",
    644: "/gacha-bg/Zekrom.png",
    646: "/gacha-bg/Kyurem.png",

    // Kalos, Alola & Galar
    716: "/gacha-bg/Xerneas.png",
    717: "/gacha-bg/Yveltal.png",
    718: "/gacha-bg/Zygarde.png",
    791: "/gacha-bg/Solgaleo.png",
    792: "/gacha-bg/Lunala.png",
    800: "/gacha-bg/Necrozma.png",
    888: "/gacha-bg/Zacian_Zamazenta.png",
    889: "/gacha-bg/Zacian_Zamazenta.png",
    890: "/gacha-bg/Eternatus.png",
    898: "/gacha-bg/Calyrex.png",

    // Paldea
    1007: "/gacha-bg/Koraidon.png",
    1008: "/gacha-bg/Miraidon.png",
  };

  if (pokemonBgs[id]) return pokemonBgs[id];

  // 🌌 COSMIC & SPACE (Fallbacks)
  const cosmicIds = [384, 150, 483, 484, 791, 890, 898];
  const nightIds = [792, 487, 717, 800, 892, 1008];

  // 🌋 FIRE & MAGMA
  const fireIds = [383, 250, 146, 244, 643];

  // 🌊 OCEAN & WATER
  const oceanIds = [382, 249, 144, 245, 380, 381];

  // 🏛️ ANCIENT RUINS & TEMPLE
  const templeIds = [377, 378, 379, 888, 889, 1007];

  if (cosmicIds.includes(id)) return "/gacha-bg/cosmic_green.png";
  if (nightIds.includes(id)) return "/gacha-bg/night_galaxy.png";
  if (fireIds.includes(id)) return "/gacha-bg/fire_red.png";
  if (oceanIds.includes(id)) return "/gacha-bg/ocean_blue.png";

  return "/gacha-bg/cosmic_green.png";
}

// Arknights style rates
const BASE_RATE_6 = 0.01; // 1.0%
const BASE_RATE_5 = 0.09; // 9.0%
const BASE_RATE_4 = 0.5; // 50.0%
const BASE_RATE_3 = 0.4; // 40.0%

const SOFT_PITY_START = 50;
const PITY_RATE_INCREASE = 0.02; // +2% per pull after 50

const GACHA_COST = 0;
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
  tier: number; // 3, 4, 5, 6
  isFeatured: boolean;
}

// ── Internal pull result (before we know isNew) ──
interface RawPullResult {
  pokemonId: number;
  name: string;
  nature: string;
  isShiny: boolean;
  eggMove?: number;
  tier: number;
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
  tier = 0,
  size = 128,
  className = "",
}: {
  pokemonId: number;
  shiny?: boolean;
  tier?: number;
  size?: number;
  className?: string;
}) {
  const [stage, setStage] = useState(0); // 0: GIF, 1: Home PNG, 2: Official Artwork
  const [hasFailed, setHasFailed] = useState(false);

  const getUrl = () => {
    const suffix = shiny ? "shiny/" : "";
    if (stage === 0)
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${suffix}${pokemonId}.gif`;
    if (stage === 1)
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${suffix}${pokemonId}.png`;
    if (stage === 2)
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
    return "";
  };

  const handleError = () => {
    if (stage < 2) setStage(stage + 1);
    else setHasFailed(true);
  };

  // Rarity-based glow filters
  const getGlowStyle = () => {
    if (tier === 6) return "drop-shadow(0 0 15px rgba(255, 215, 0, 0.6))";
    if (tier === 5) return "drop-shadow(0 0 12px rgba(249, 115, 22, 0.5))";
    if (tier === 4) return "drop-shadow(0 0 8px rgba(168, 85, 247, 0.4))";
    return "";
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
      style={{
        width: size,
        height: size,
        filter: getGlowStyle(),
      }}
    />
  );
}

/**
 * Cinematic Meteor Pull Animation - The Rift
 */
function MeteorPull({
  highestTier,
  onComplete,
}: {
  highestTier: number;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<"meteor" | "rift" | "shatter">("meteor");

  useEffect(() => {
    // Stage 1: Meteor falls (fast)
    const meteorTimer = setTimeout(() => {
      setPhase("rift");
      // Stage 2: The Rift expands
      const riftTimer = setTimeout(() => {
        setPhase("shatter");
        // Stage 3: Burst/Shatter
        const shatterTimer = setTimeout(() => {
          onComplete();
        }, 500);
        return () => clearTimeout(shatterTimer);
      }, 1100);
      return () => clearTimeout(riftTimer);
    }, 700);
    return () => clearTimeout(meteorTimer);
  }, [onComplete]);

  const getColor = () => {
    if (highestTier === 6)
      return "from-yellow-200 via-accent to-amber-500 shadow-[0_0_80px_rgba(255,215,0,1)]";
    if (highestTier === 5)
      return "from-orange-300 via-orange-500 to-red-600 shadow-[0_0_60px_rgba(249,115,22,0.9)]";
    return "from-blue-200 via-blue-500 to-indigo-700 shadow-[0_0_50px_rgba(59,130,246,0.8)]";
  };

  const getGlowColor = () => {
    if (highestTier === 6)
      return "bg-accent shadow-[0_0_30px_rgba(255,215,0,0.8)]";
    if (highestTier === 5)
      return "bg-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.6)]";
    return "bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]";
  };

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center overflow-hidden bg-black">
      {/* 🌠 Phase 1: The Meteor */}
      {phase === "meteor" && (
        <div className="absolute top-0 left-0 animate-star-fall w-[200vw] h-[200vh]">
          <div className="relative" style={{ left: "15%", top: "15%" }}>
            <div
              className={`w-96 h-3 bg-linear-to-r ${getColor()} transform rotate-45 blur-[1px] rounded-full`}
            />
            <div className="absolute top-0 right-0 w-12 h-12 rounded-full bg-white blur-sm scale-150 animate-pulse" />
          </div>
        </div>
      )}

      {/* ⚠️ Phase 2: The Rift/Crack */}
      {phase === "rift" && (
        <div className="w-1 h-full relative flex items-center justify-center">
          {/* Main Crack Line */}
          <div
            className={`w-full ${getGlowColor()} animate-crack-spread relative z-10`}
          />
          {/* Internal Glow Beam */}
          <div
            className={`absolute inset-0 w-4 h-full ${getGlowColor()} blur-2xl opacity-50 animate-pulse`}
          />
        </div>
      )}

      {/* 💥 Phase 3: Shatter/Flash */}
      {phase === "shatter" && (
        <div className="absolute inset-0 z-[101] flex items-center justify-center">
          <div
            className={`w-full h-full ${highestTier >= 6 ? "bg-accent" : highestTier === 5 ? "bg-orange-500" : "bg-blue-500"} animate-impact-flash rounded-full`}
          />
          <div className="fixed inset-0 bg-white animate-in fade-in duration-300 pointer-events-none opacity-40 shadow-[inset_0_0_100px_rgba(255,255,255,0.5)]" />
        </div>
      )}
    </div>,
    document.body,
  );
}

export function GachaView({ onBack }: Props) {
  const { meta, setMeta, notify } = useGame();
  const [activeBanner, setActiveBanner] = useState<Banner>(BANNERS[0]);
  const [pulling, setPulling] = useState(false);
  const [animatingMeteor, setAnimatingMeteor] = useState(false);
  const [highestTierRevealed, setHighestTierRevealed] = useState(0);
  const [results, setResults] = useState<PullResultData[]>([]);
  const [pools, setPools] = useState<Record<number, number[]>>({
    3: [],
    4: [],
    5: [],
    6: [],
  });
  const [dynamicBanners, setDynamicBanners] = useState<Banner[]>(BANNERS);
  const [isReady, setIsReady] = useState(false);

  // Setup Daily Banners and Pools
  useEffect(() => {
    const setup = async () => {
      // Fetch tiered pools from Supabase
      const fetchedPools = await fetchGachaPools();
      setPools(fetchedPools);

      const dailyIds = getDailyLegendaries(
        fetchedPools[6].length > 0 ? fetchedPools[6] : GACHA_LEGENDARY_POOL,
        3,
      );

      const updatedBanners = [...BANNERS];
      for (let i = 0; i < 3; i++) {
        const id = dailyIds[i] || 150;
        let pName = "Legendario";
        try {
          const pkmn = await getPokemonData(id, 1);
          pName = pkmn.name;
        } catch {}

        updatedBanners[i] = {
          ...updatedBanners[i],
          featuredId: id,
          name: `Poder de ${pName}`,
        };
      }

      setDynamicBanners(updatedBanners);

      // Initialize active banner correctly
      if (activeBanner.id.startsWith("daily-")) {
        const index = parseInt(activeBanner.id.split("-")[1]) - 1;
        setActiveBanner(updatedBanners[index]);
      }

      // Smooth Fade-in trigger
      setTimeout(() => setIsReady(true), 100);
    };

    setup();
  }, []);

  const currentPity = meta.gachaPity?.[activeBanner.id] || 0;

  // Calculate current 6* rate based on pity
  const getCurrent6StarRate = (pity: number) => {
    if (pity < SOFT_PITY_START) return BASE_RATE_6;
    const extraPulls = pity - SOFT_PITY_START;
    return BASE_RATE_6 + extraPulls * PITY_RATE_INCREASE;
  };

  const costX10 = GACHA_COST * 9;

  const handlePull = async (count: number) => {
    const totalCost = count === 10 ? costX10 : GACHA_COST * count;
    if (meta.pokeCoins < totalCost || pulling) return;

    setPulling(true);
    setResults([]);

    try {
      const banner = activeBanner;
      const isShinyBanner = !!banner.isShinyBanner;
      const baseShinyRate = isShinyBanner
        ? SHINY_RATE_BOOSTED
        : SHINY_RATE_NORMAL;

      let pity = meta.gachaPity?.[banner.id] || 0;
      const pullSpecs: {
        id: number;
        tier: number;
        isShiny: boolean;
        isFeatured: boolean;
        pityAtPull: number;
      }[] = [];

      // ── 1. Calculate Pull Results (Instant) ──
      for (let i = 0; i < count; i++) {
        pity += 1;
        const rate6 = getCurrent6StarRate(pity);
        const rng = Math.random();

        let pulledTier = 3;
        let pulledId = -1;
        let isFeatured = false;

        if (rng < rate6) {
          pulledTier = 6;
          pity = 0;
        } else if (rng < rate6 + BASE_RATE_5) {
          pulledTier = 5;
        } else if (rng < rate6 + BASE_RATE_5 + BASE_RATE_4) {
          pulledTier = 4;
        } else {
          pulledTier = 3;
        }

        const pool = pools[pulledTier] || [];
        if (pulledTier === 6 && banner.featuredId > 0 && Math.random() < 0.5) {
          pulledId = banner.featuredId;
          isFeatured = true;
        } else if (pool.length > 0) {
          pulledId = pool[Math.floor(Math.random() * pool.length)];
        } else {
          pulledId = pulledTier === 6 ? 150 : 1;
        }

        let isShiny = Math.random() < baseShinyRate;
        if (isShinyBanner && pulledTier >= 5) isShiny = true;

        pullSpecs.push({
          id: pulledId,
          tier: pulledTier,
          isShiny,
          isFeatured,
          pityAtPull: pity,
        });
      }

      // ── 2. Fetch Data in Parallel (Very Fast) ──
      const rawResults: RawPullResult[] = await Promise.all(
        pullSpecs.map(async (spec) => {
          const [pokemonData, eggMoves] = await Promise.all([
            getPokemonData(spec.id, 5, spec.isShiny),
            Math.random() < EGG_MOVE_RATE
              ? fetchEggMoves(spec.id)
              : Promise.resolve([]),
          ]);

          let unlockedEggMove: number | undefined = undefined;
          if (eggMoves.length > 0) {
            unlockedEggMove =
              eggMoves[Math.floor(Math.random() * eggMoves.length)];
          }

          const nature = getRandomNature();
          return {
            pokemonId: spec.id,
            name: pokemonData.name,
            nature: pokemonData.nature || nature,
            isShiny: spec.isShiny,
            eggMove: unlockedEggMove,
            tier: spec.tier,
            isFeatured: spec.isFeatured,
            ivs: generateRandomIVs(),
            generatedNature: nature,
          };
        }),
      );

      // ── Update Meta ──
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
          ...raw,
          isNew,
        };
      });

      const highestTier = Math.max(...displayResults.map((r) => r.tier || 0));
      setResults(displayResults);
      setHighestTierRevealed(highestTier);
      setPulling(false);
      setAnimatingMeteor(true); // Start the cinematic sequence
    } catch (err) {
      console.error(err);
      notify({
        message: "Error al realizar la invocación.",
        type: "defeat",
        icon: "❌",
        duration: 3000,
      });
      setPulling(false);
    }
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 6:
        return "border-accent shadow-[0_0_20px_rgba(255,215,0,0.6)]";
      case 5:
        return "border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]";
      case 4:
        return "border-purple-500";
      case 3:
        return "border-slate-500";
      default:
        return "border-border";
    }
  };

  const bgPath = getGachaBackground(activeBanner);

  const canAfford1 = meta.pokeCoins >= GACHA_COST;
  const canAfford10 = meta.pokeCoins >= costX10;

  return (
    <div
      className={`fixed inset-0 z-60 bg-color-surface flex w-screen h-screen crt-screen overflow-hidden transition-opacity duration-1000 ${isReady ? "opacity-100" : "opacity-0"}`}
    >
      {/* Immersive Background */}
      <div
        className="absolute inset-0 z-0 transition-all duration-1000 ease-in-out bg-cover bg-center w-full h-full"
        style={{
          backgroundImage: `url(${bgPath})`,
          filter: "brightness(0.35)",
        }}
      />
      <div className="absolute inset-0 z-0 bg-linear-to-b from-transparent via-transparent to-black" />

      {/* Sidebar Navigation */}
      <aside className="relative z-10 w-24 md:w-32 flex flex-none flex-col items-center py-8 bg-black/60 backdrop-blur-md border-r border-white/10">
        <button
          onClick={onBack}
          className="p-3 mb-12 hover:bg-white/10 text-muted hover:text-white transition-colors border-2 border-transparent hover:border-white/20"
        >
          <ChevronLeft size={32} />
        </button>

        <div className="flex flex-col gap-6 w-full px-2">
          {dynamicBanners.map((banner) => (
            <button
              key={banner.id}
              onClick={() => setActiveBanner(banner)}
              className={`relative py-4 flex flex-col items-center gap-2 transition-all group ${
                activeBanner.id === banner.id
                  ? "opacity-100"
                  : "opacity-40 hover:opacity-100"
              }`}
            >
              <div
                className={`w-16 h-16 md:w-20 md:h-20 flex items-center justify-center border-2 transition-all ${
                  activeBanner.id === banner.id
                    ? "bg-accent/20 border-accent shadow-pixel"
                    : "bg-black/40 border-white/10 group-hover:border-white/30"
                }`}
              >
                {banner.isShinyBanner ? (
                  <Sparkles
                    size={28}
                    className={
                      activeBanner.id === banner.id
                        ? "text-accent"
                        : "text-white"
                    }
                  />
                ) : (
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${banner.featuredId}.png`}
                    className="pixelated w-14 h-14"
                    alt=""
                  />
                )}
              </div>
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 bg-accent transition-all ${activeBanner.id === banner.id ? "opacity-100" : "opacity-0"}`}
              />
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1 bg-black/40 border border-white/10 p-3 rounded-sm shadow-xl">
            <Coins size={18} className="text-accent" />
            <span className="font-display text-[0.7rem] font-bold">
              {meta.pokeCoins}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
        {/* Featured Pokémon Display */}
        <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700">
          <div className="relative group mb-8">
            <div className="absolute inset-0 bg-accent/20 blur-[120px] rounded-full group-hover:bg-accent/30 transition-all duration-1000 animate-pulse" />
            <GachaSprite
              pokemonId={activeBanner.featuredId}
              size={window.innerWidth > 768 ? 420 : 280}
              tier={6}
              className="relative z-10 drop-shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-floating"
            />
            {activeBanner.isShinyBanner && (
              <Sparkles
                size={64}
                className="absolute -top-8 -right-8 text-accent animate-spin-slow opacity-80"
              />
            )}
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="font-display text-[0.75rem] text-accent tracking-[0.6em] mb-4 uppercase drop-shadow-md font-bold">
              INVOCACIÓN LIMITADA
            </span>
            <h1 className="font-display text-5xl md:text-7xl tracking-widest text-white drop-shadow-title uppercase leading-tight">
              {activeBanner.name}
            </h1>
            <div className="h-1.5 w-32 bg-accent mt-8 animate-scale-x" />
            <p className="mt-8 font-display text-[0.7rem] text-muted tracking-[0.3em] max-w-lg uppercase opacity-90 leading-relaxed drop-shadow-md">
              {activeBanner.isShinyBanner
                ? "Festival especial con probabilidad aumentada de formas Variocolor"
                : `Invocación destacada de Pokémon nivel 6★ (Major Legendary)`}
            </p>
          </div>
        </div>

        {/* Pity HUD (Bottom Left of Main) */}
        <div className="absolute left-10 bottom-10 flex flex-col gap-4">
          <div className="bg-black/80 backdrop-blur-xl border-l-[6px] border-accent p-6 flex flex-col gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-left duration-700">
            <span className="font-display text-[0.6rem] text-accent tracking-[0.2em] uppercase font-bold">
              PROGRESO DE GARANTÍA (6★)
            </span>
            <div className="flex items-center gap-8">
              <span className="font-display text-4xl text-white">
                {currentPity}
                <span className="text-[1rem] text-muted/60 ml-2 font-normal">
                  / 100
                </span>
              </span>
              <div className="w-56 h-3 bg-white/5 rounded-full overflow-hidden relative border border-white/10">
                <div
                  className={`h-full transition-all duration-1000 ease-out ${currentPity >= SOFT_PITY_START ? "bg-accent shadow-[0_0_15px_rgba(255,215,0,0.5)]" : "bg-brand"}`}
                  style={{
                    width: `${Math.min(100, (currentPity / 100) * 100)}%`,
                  }}
                />
                {currentPity >= SOFT_PITY_START && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-white/10 pt-3">
              <span className="font-display text-[0.55rem] text-muted tracking-[0.15em] uppercase">
                Probabilidad:{" "}
                <span className="text-white font-bold">
                  {(getCurrent6StarRate(currentPity) * 100).toFixed(1)}%
                </span>
              </span>
              <Sparkles
                size={12}
                className={
                  currentPity >= SOFT_PITY_START
                    ? "text-accent animate-pulse"
                    : "text-muted/20"
                }
              />
            </div>
          </div>
        </div>

        {/* Action Buttons (Bottom Right of Main) */}
        <div className="absolute right-10 bottom-10 flex items-end gap-8 animate-in slide-in-from-right duration-700">
          <button
            onClick={() => handlePull(1)}
            disabled={pulling || !canAfford1}
            className={`group flex flex-col items-center justify-center w-56 h-18 border-2 transition-all ${
              canAfford1 && !pulling
                ? "bg-black/60 border-white/10 hover:bg-white/10 hover:border-white/40 shadow-xl"
                : "bg-surface-dark/50 border-white/5 text-muted cursor-not-allowed"
            }`}
          >
            <span className="font-display text-[0.75rem] tracking-[0.4em] text-white">
              INVOCAR ×1
            </span>
            <div className="flex items-center gap-2 mt-2">
              <Coins
                size={14}
                className="text-muted group-hover:text-accent transition-colors"
              />
              <span className="font-display text-[0.65rem] text-muted">
                {GACHA_COST}
              </span>
            </div>
          </button>

          <button
            onClick={() => handlePull(10)}
            disabled={pulling || !canAfford10}
            className={`group relative overflow-hidden w-[340px] h-24 border-2 transition-all ${
              canAfford10 && !pulling
                ? "bg-brand border-brand-dark hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(204,0,0,0.4)]"
                : "bg-surface-dark/50 border-white/5 text-muted cursor-not-allowed"
            }`}
          >
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 shadow-inner" />
            <div className="relative flex flex-col items-center justify-center">
              <span className="font-display text-xl tracking-[0.5em] text-white italic font-black">
                MULTITIRADA ×10
              </span>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Coins size={16} className="text-accent" />
                  <span className="font-display text-[0.8rem] text-white font-bold">
                    {costX10}
                  </span>
                </div>
                <span className="text-[0.6rem] bg-accent text-black px-3 py-1 font-display font-black rounded-sm animate-pulse tracking-[0.2em] shadow-lg">
                  1 GRATIS
                </span>
              </div>
            </div>
          </button>
        </div>
      </main>

      {/* ── METEOR ANIMATION ── */}
      {animatingMeteor && (
        <MeteorPull
          highestTier={highestTierRevealed}
          onComplete={() => setAnimatingMeteor(false)}
        />
      )}

      {/* ── PULL RESULT OVERLAY ── */}
      {(pulling || (results.length > 0 && !animatingMeteor)) && (
        <div className="fixed inset-0 z-70 bg-black/98 flex flex-col items-center justify-center p-4 overflow-y-auto backdrop-blur-xl">
          {pulling ? (
            <div className="flex flex-col items-center gap-8">
              <h3 className="font-display text-2xl animate-pulse tracking-widest text-white/40">
                INVOCANDO...
              </h3>
            </div>
          ) : results.length === 1 ? (
            <SinglePullCard
              result={results[0]}
              onConfirm={() => setResults([])}
            />
          ) : (
            <div className="w-full max-w-4xl flex flex-col items-center gap-6 animate-in zoom-in-90 duration-300 py-10">
              <h3 className="font-display text-xl tracking-widest text-brand">
                RESULTADOS ×{results.length}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`bg-surface-dark border-2 p-3 flex flex-col items-center gap-2 transition-all ${getTierColor(r.tier)}`}
                  >
                    <div className="relative">
                      <GachaSprite
                        pokemonId={r.pokemonId}
                        shiny={r.isShiny}
                        tier={r.tier}
                        size={84}
                        className="animate-floating"
                      />
                      {r.isShiny && (
                        <Sparkles
                          size={12}
                          className="absolute top-0 right-0 text-accent animate-ping"
                        />
                      )}
                      {r.tier === 6 && (
                        <Star
                          size={12}
                          className="absolute top-0 right-0 text-accent animate-pulse"
                        />
                      )}
                    </div>
                    <span className="font-display text-[0.7rem] text-center capitalize truncate w-full">
                      {r.name}
                    </span>
                    <div className="flex gap-1 flex-wrap justify-center text-[0.5rem]">
                      {r.isNew && (
                        <span className="bg-accent text-black font-display px-1">
                          NUEVO
                        </span>
                      )}
                      {r.tier >= 4 && (
                        <span
                          className={`text-white font-display px-1 ${r.tier === 6 ? "bg-purple-600" : r.tier === 5 ? "bg-orange-600" : "bg-blue-600"}`}
                        >
                          {r.tier}★
                        </span>
                      )}
                      {r.isShiny && (
                        <span className="bg-brand text-white font-display text-[0.7rem] px-1">
                          SHINY
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setResults([])}
                className="w-full max-w-xs py-3 bg-brand text-white font-display text-[0.7rem] tracking-widest hover:bg-brand-dark transition-all mt-2"
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
      className={`relative w-full max-w-lg p-10 flex flex-col items-center gap-8 animate-in zoom-in-90 duration-500 bg-black/40 backdrop-blur-2xl border-2 ${
        result.tier === 6
          ? "border-accent shadow-[0_0_120px_rgba(255,215,0,0.3)]"
          : result.tier === 5
            ? "border-orange-500 shadow-[0_0_100px_rgba(249,115,22,0.2)]"
            : result.tier === 4
              ? "border-purple-500 shadow-[0_0_80px_rgba(168,85,247,0.1)]"
              : "border-white/10"
      }`}
    >
      <div className="absolute inset-x-0 -top-8 flex justify-center">
        <div className="px-6 py-1 font-display text-[0.55rem] tracking-[0.4em] text-white border-2 border-inherit bg-black uppercase shadow-2xl">
          {result.tier} Estrellas
        </div>
      </div>

      <div className="relative">
        <div
          className={`absolute inset-0 blur-[100px] animate-pulse rounded-full ${result.tier === 6 ? "bg-accent/40" : result.tier === 5 ? "bg-orange-500/30" : "bg-white/5"}`}
        />
        <GachaSprite
          pokemonId={result.pokemonId}
          shiny={result.isShiny}
          tier={result.tier}
          size={256}
          className="relative drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] animate-floating"
        />
        {result.isShiny && (
          <Sparkles
            className="absolute -top-4 -right-4 text-accent animate-ping"
            size={32}
          />
        )}
      </div>

      <div className="flex flex-col items-center text-center">
        {result.isNew && (
          <span className="bg-accent text-black font-display text-[0.5rem] px-4 py-1 rounded-full mb-4 animate-scale-in">
            ¡NUEVO REGISTRO!
          </span>
        )}
        <h4
          className={`font-display text-4xl tracking-[0.3em] ${result.isShiny ? "text-accent drop-shadow-accent" : "text-white"}`}
        >
          {result.name.toUpperCase()}
        </h4>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-px w-8 bg-white/20" />
          <span className="font-display text-[0.65rem] text-muted tracking-[0.3em] uppercase">
            {result.nature}
          </span>
          <div className="h-px w-8 bg-white/20" />
        </div>
      </div>

      {result.eggMove && (
        <div className="flex flex-col items-center gap-1.5 border-t border-white/10 w-full pt-6">
          <span className="font-display text-[0.5rem] text-accent flex items-center gap-2 tracking-[0.2em]">
            <Wand2 size={12} /> MOVIMIENTO HUEVO DESBLOQUEADO
          </span>
          <span className="font-display text-xs text-white/60 italic uppercase tracking-widest">
            ID: {result.eggMove}
          </span>
        </div>
      )}

      <button
        onClick={onConfirm}
        className="w-full h-16 bg-white/5 border border-white/20 text-white font-display text-xs tracking-[0.4em] hover:bg-white/10 hover:border-accent transition-all duration-300 mt-6"
      >
        CONFIRMAR
      </button>
    </div>
  );
}
