import React, { useState, useEffect } from "react";
import { useGame } from "../../../context/GameContext";
import {
  getPokemonData,
  isStarterMaterial,
} from "../../run/services/pokeapi.service";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { calculateStats, NATURES } from "../../../engine/stats.engine";
import { clsx } from "clsx";
import { Play } from "lucide-react";

const STAT_LABELS = ["HP", "ATK", "DEF", "SPE", "SPD", "SPA"];
const RadarChart = ({
  stats,
  isIv = false,
}: {
  stats: any;
  isIv?: boolean;
}) => {
  const statArray = [
    stats.hp || 0,
    stats.attack || 0,
    stats.defense || 0,
    stats.speed || 0,
    stats.spDef || 0,
    stats.spAtk || 0,
  ];
  const max = isIv ? 31 : Math.max(10, ...statArray);
  const cx = 50;
  const cy = 50;
  const r = 35;

  const getPoint = (val: number, i: number) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const dist = (val / max) * r;
    return `${cx + dist * Math.cos(angle)},${cy + dist * Math.sin(angle)}`;
  };

  const points = statArray.map((v, i) => getPoint(v, i)).join(" ");
  const bgPolygon = [max, max, max, max, max, max]
    .map((v, i) => getPoint(v, i))
    .join(" ");
  const midPolygon = [max / 2, max / 2, max / 2, max / 2, max / 2, max / 2]
    .map((v, i) => getPoint(v, i))
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full max-w-[150px] aspect-square mx-auto overflow-visible mb-4 mt-2"
    >
      <polygon
        points={bgPolygon}
        fill="var(--color-surface-dark)"
        stroke="var(--color-border)"
        strokeWidth="1"
      />
      <polygon
        points={midPolygon}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="0.5"
        strokeDasharray="1,1"
      />
      <polygon
        points={points}
        fill="rgba(8, 145, 178, 0.5)"
        stroke="rgb(8, 145, 178)"
        strokeWidth="1.5"
      />
      {STAT_LABELS.map((lbl, i) => {
        const pt = getPoint(max + 10, i);
        const [x, y] = pt.split(",");
        return (
          <text
            key={lbl}
            x={x}
            y={y}
            fontSize="7"
            fill="var(--color-muted)"
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-display tracking-widest"
          >
            {lbl}
          </text>
        );
      })}
    </svg>
  );
};

const GENERATIONS = [
  { id: 1, name: "Gen 1", range: [1, 151] },
  { id: 2, name: "Gen 2", range: [152, 251] },
  { id: 3, name: "Gen 3", range: [252, 386] },
  { id: 4, name: "Gen 4", range: [387, 493] },
  { id: 5, name: "Gen 5", range: [494, 649] },
  { id: 6, name: "Gen 6", range: [650, 721] },
  { id: 7, name: "Gen 7", range: [722, 809] },
  { id: 8, name: "Gen 8", range: [810, 898] },
  { id: 9, name: "Gen 9", range: [899, 1025] },
];

export function StarterSelector() {
  const { meta, run, setRun } = useGame();
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedGen, setSelectedGen] = useState<number>(1);
  const [selectedStarterName, setSelectedStarterName] = useState("");
  const [selectedNature, setSelectedNature] = useState<string>("hardy");
  const [previewStats, setPreviewStats] = useState<any>(null);
  const [validIds, setValidIds] = useState<number[]>([]);

  // Filter valid IDs for the current generation
  useEffect(() => {
    const gen = GENERATIONS.find((g) => g.id === selectedGen);
    if (!gen) return;

    let isCancelled = false;
    const ids = Array.from(
      { length: gen.range[1] - gen.range[0] + 1 },
      (_, i) => gen.range[0] + i,
    );

    const checkIds = async () => {
      const results = await Promise.all(
        ids.map(async (id) => ({ id, valid: await isStarterMaterial(id) })),
      );
      if (!isCancelled) {
        setValidIds(results.filter((r) => r.valid).map((r) => r.id));
      }
    };

    checkIds();
    return () => {
      isCancelled = true;
    };
  }, [selectedGen]);

  useEffect(() => {
    if (!selectedId) {
      setPreviewStats(null);
      return;
    }
    let isCancelled = false;
    getPokemonData(selectedId, 5)
      .then((p) => {
        if (isCancelled) return;
        const unlockedData = meta.unlockedStarters.find(
          (s) => s.id === selectedId,
        );
        if (unlockedData) {
          const calculated = calculateStats(
            p.baseStats,
            unlockedData.maxIvs,
            unlockedData.maxEvs,
            5,
            selectedNature,
          );
          setPreviewStats(calculated);
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      isCancelled = true;
    };
  }, [selectedId, selectedNature, meta.unlockedStarters]);

  const handleStart = async (starterId: number) => {
    setLoading(true);
    try {
      const pokemon = await getPokemonData(starterId, 5);

      const unlockedData = meta.unlockedStarters.find(
        (s) => s.id === starterId,
      );
      if (unlockedData) {
        pokemon.ivs = unlockedData.maxIvs;
        pokemon.evs = unlockedData.maxEvs;
        pokemon.nature = selectedNature;
        pokemon.stats = calculateStats(
          pokemon.baseStats,
          pokemon.ivs,
          pokemon.evs,
          pokemon.level,
          pokemon.nature,
        );
        pokemon.maxHP = pokemon.stats.hp;
        pokemon.currentHP = pokemon.maxHP;
      }

      setRun({
        runId: Date.now().toString(),
        startedAt: Date.now(),
        isActive: true,
        starterId,
        starterName: pokemon.name,
        team: [pokemon],
        pc: [],
        currentRegion: "kanto",
        currentZoneIndex: 0,
        currentZoneProgress: 0,
        zoneBattlesWon: 0,
        gymsBadges: [],
        eliteFourDefeated: false,
        items: { "poke-ball": 10, potion: 5 },
        speedMultiplier: 1,
        autoCapture: true,
        autoItems: true,
        autoHealThreshold: 0.3,
        currentBattle: null,
        battleLog: [],
        totalCaptured: 1,
        totalBattlesWon: 0,
        totalFainted: 0,
        money: 0,
        winStreak: 0,
        maxWinStreak: 0,
        itemUsage: {},
        expMultiplier: 1.0,
        hasExpShare: false,
        hasMegaBracelet: false,
        isPaused: false,
        isManualBattle: false,
        pendingLootSelection: null,
      });
    } catch (e) {
      console.error("Error starting run:", e);
    } finally {
      setLoading(false);
    }
  };

  const selectedStarterData = selectedId
    ? meta.unlockedStarters.find((s) => s.id === selectedId)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-color-surface flex flex-col items-center justify-start overflow-y-auto p-4 sm:p-8 crt-screen"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <div className="w-full max-w-6xl z-10 flex flex-col lg:flex-row relative lg:gap-8 items-start justify-center pt-8">
        {/* Main Selection Panel */}
        <div className="w-full lg:w-3/4 flex flex-col">
          <h1 className="font-display text-2xl md:text-3xl text-center text-brand mb-2 drop-shadow-[4px_4px_0_rgba(0,0,0,0.8)]">
            PokéIdle
          </h1>
          <h2 className="font-display text-[0.6rem] md:text-xs text-center text-white mb-8 tracking-[0.3em] opacity-80">
            ROGUELIKE TRAINER
          </h2>

          <div className="bg-surface-alt border-4 border-border p-6 md:p-8 mb-8 pixel-shadow">
            <h3 className="font-display text-xs md:text-sm text-center text-accent mb-4 tracking-widest drop-shadow-[0_0_5px_rgba(255,215,0,0.3)]">
              ELIGE TU STARTER
            </h3>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              {GENERATIONS.map((gen) => (
                <button
                  key={gen.id}
                  onClick={() => setSelectedGen(gen.id)}
                  className={clsx(
                    "font-display text-[0.6rem] px-3 py-1.5 transition-colors border-2",
                    selectedGen === gen.id
                      ? "bg-brand border-brand text-white"
                      : "bg-surface border-border text-muted hover:text-white",
                  )}
                >
                  {gen.name}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-5 min-h-[120px]">
              {(() => {
                const gen = GENERATIONS.find((g) => g.id === selectedGen);
                if (!gen) return null;

                const pokemonIds = validIds;

                return (
                  <>
                    {pokemonIds.map((id: number) => {
                      const unlockedData = meta.unlockedStarters.find(
                        (s) => s.id === id,
                      );
                      const isUnlocked = !!unlockedData;
                      const isSelected = selectedId === id;
                      const pokemonName = unlockedData
                        ? unlockedData.name
                        : "???";

                      return (
                        <button
                          key={id}
                          disabled={loading || !isUnlocked}
                          onClick={() => {
                            if (isUnlocked) {
                              setSelectedId(id);
                              setSelectedStarterName(pokemonName);
                              setSelectedNature(
                                unlockedData.unlockedNatures[0] || "hardy",
                              );
                            }
                          }}
                          className={clsx(
                            "flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 border-4 transition-all duration-200 relative group bg-surface",
                            !isUnlocked
                              ? "border-border opacity-50 cursor-not-allowed bg-surface-dark"
                              : isSelected
                                ? "border-brand bg-brand/10 -translate-y-2 shadow-[0_4px_0_rgba(204,0,0,0.5)] border-b-2"
                                : "border-border hover:border-brand/50 hover:-translate-y-1 hover:shadow-pixel",
                          )}
                        >
                          <PixelSprite
                            pokemonId={id}
                            variant="front"
                            size={48}
                            showScanlines={false}
                            alt={pokemonName}
                            className={clsx(
                              "w-10 h-10 sm:w-12 sm:h-12 transition-transform",
                              isSelected && "scale-110",
                              !isUnlocked &&
                                "brightness-0 opacity-40 grayscale",
                            )}
                          />

                          <div className="absolute bottom-full mb-2 px-2 py-1 bg-black/95 border border-border opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap">
                            <span className="font-display text-[0.55rem] text-white text-center block tracking-widest capitalize">
                              {pokemonName}
                            </span>
                          </div>

                          {isSelected && isUnlocked && (
                            <div className="absolute -bottom-[8px] inset-x-0 flex justify-center animate-bounce">
                              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-8 border-b-brand rotate-180"></div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>

          {meta.runHistory.length > 0 && (
            <div className="bg-surface border-4 border-border p-5 md:p-6 mb-8 pixel-shadow">
              <h3 className="font-display text-xs text-muted mb-4 tracking-widest">
                HISTORIAL DE PARTIDAS
              </h3>
              <div className="flex flex-col gap-3">
                {meta.runHistory.slice(0, 3).map((hist, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 border-2 border-border bg-surface-alt"
                  >
                    <div className="flex items-center gap-3">
                      <PixelSprite
                        pokemonId={hist.starterId}
                        variant="front"
                        size={40}
                        showScanlines={false}
                        alt=""
                        className="grayscale opacity-70"
                      />
                      <div className="flex flex-col">
                        <span className="font-display text-[0.55rem] text-muted">
                          Medallas: {hist.badges}
                        </span>
                        <span className="font-body text-[0.55rem] text-muted">
                          Zona: {hist.zoneReached}
                        </span>
                      </div>
                    </div>
                    <div className="font-display text-[0.5rem] tracking-widest text-right">
                      {hist.reasonEnded === "victory" ? (
                        <span className="text-accent drop-shadow-[0_0_2px_rgba(255,215,0,0.5)]">
                          VICTORIA
                        </span>
                      ) : (
                        <span className="text-danger opacity-80">DERROTA</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {meta.bestRun && (
                <div className="mt-4 text-center font-display text-[0.6rem] text-accent drop-shadow-[0_0_5px_rgba(255,215,0,0.3)]">
                  MEJOR RUN: {meta.bestRun.badges} MEDALLAS
                </div>
              )}
            </div>
          )}
        </div>

        {/* Genetics Aside */}
        <aside className="w-full lg:w-1/4 flex flex-col mt-8 lg:mt-0">
          {selectedStarterData ? (
            <div className="bg-surface border-4 border-border p-5 pixel-shadow flex flex-col top-0 lg:top-24 sticky">
              <h3 className="font-display text-xs text-brand mb-4 tracking-widest text-center border-b-2 border-border pb-2">
                POTENCIAL GENÉTICO (NV. 5)
              </h3>

              <RadarChart
                stats={previewStats || selectedStarterData.maxIvs || {}}
                isIv={!previewStats}
              />

              <div className="flex flex-col gap-1 mb-4 mt-2">
                {previewStats && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 mb-2 p-2 bg-surface-dark border border-border">
                    {STAT_LABELS.map((lbl, i) => {
                      const keys = [
                        "hp",
                        "attack",
                        "defense",
                        "speed",
                        "spDef",
                        "spAtk",
                      ];
                      return (
                        <div
                          key={lbl}
                          className="flex justify-between font-display text-[0.55rem]"
                        >
                          <span className="text-muted">{lbl}</span>
                          <span className="text-white">
                            {previewStats[keys[i]]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex justify-between font-display text-[0.55rem]">
                  <span className="text-muted">IVs MÁXIMOS</span>
                  <span className="text-white">
                    {Object.values(selectedStarterData.maxIvs || {}).reduce(
                      (a, b) => a + b,
                      0,
                    )}
                    /186
                  </span>
                </div>
                <div className="flex justify-between font-display text-[0.55rem]">
                  <span className="text-muted">EVs ACUMULADOS</span>
                  <span className="text-white">
                    {Object.values(selectedStarterData.maxEvs || {}).reduce(
                      (a, b) => a + b,
                      0,
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-display text-[0.55rem] text-muted tracking-widest">
                  NATURALEZA
                </label>
                <select
                  className="bg-surface-dark border-2 border-border text-white text-xs font-display p-2 focus:border-brand focus:outline-none capitalize"
                  value={selectedNature}
                  onChange={(e) => setSelectedNature(e.target.value)}
                >
                  {(selectedStarterData.unlockedNatures?.length > 0
                    ? selectedStarterData.unlockedNatures
                    : ["hardy"]
                  ).map((n) => (
                    <option key={n} value={n}>
                      {NATURES[n]?.name || n}
                    </option>
                  ))}
                </select>
                {NATURES[selectedNature] && (
                  <div className="flex justify-between mt-1 px-1">
                    <span className="font-display text-[0.5rem] text-brand">
                      +{NATURES[selectedNature].increasedStat || "NADA"}
                    </span>
                    <span className="font-display text-[0.5rem] text-danger">
                      -{NATURES[selectedNature].decreasedStat || "NADA"}
                    </span>
                  </div>
                )}
              </div>

              {/* Start button — below the stat chart and nature selector */}
              {selectedId && (
                <button
                  onClick={() => handleStart(selectedId)}
                  disabled={loading}
                  className="mt-4 w-full py-3 bg-brand border-4 border-brand-dark text-white font-display text-[0.65rem] tracking-widest pixel-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-brand-dark transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    "PREPARANDO..."
                  ) : (
                    <>
                      EMPEZAR <Play size={14} fill="currentColor" />
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-surface-dark border-4 border-border/50 p-5 flex flex-col border-dashed items-center justify-center opacity-50 min-h-[300px] lg:mt-24">
              <span className="font-display text-[0.6rem] text-muted text-center tracking-widest">
                SELECCIONA UN POKÉMON PARA VER SU GENÉTICA
              </span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
