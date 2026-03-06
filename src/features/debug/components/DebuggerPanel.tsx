import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../../../context/GameContext";
import { ITEMS } from "../../../lib/items";
import { Button } from "../../../components/ui/Button";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { levelUpPokemon, xpToNextLevel } from "../../../engine/xp.engine";
import {
  getPokemonSpecies,
  getEvolutionChain,
} from "../../run/services/pokeapi.service";
import { PokemonInjectionModal } from "./PokemonInjectionModal";
import { loadMegaEvolutions } from "../../../lib/mega.service";
import { resetMegaStateAfterBattle } from "../../../engine/mega.engine";
import { clsx } from "clsx";
import {
  X,
  Zap,
  ChevronDown,
  ChevronUp,
  Package,
  Coins,
  Shield,
  Swords,
  FlaskConical,
  BarChart3,
  Code2,
  RefreshCw,
  Plus,
  Minus,
  Search,
  Trophy,
  Star,
  Sparkles,
  Target,
  Map,
  Brain,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "general" | "equipo" | "items" | "progreso" | "mega" | "estado";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "GENERAL", icon: <Zap size={11} /> },
  { id: "equipo", label: "EQUIPO", icon: <Swords size={11} /> },
  { id: "items", label: "ITEMS", icon: <Package size={11} /> },
  { id: "progreso", label: "PROGRESO", icon: <Map size={11} /> },
  { id: "mega", label: "MEGA", icon: <Sparkles size={11} /> },
  { id: "estado", label: "ESTADO", icon: <Code2 size={11} /> },
];

// All mega stones in the game (matching required_item in mega_evolutions table)
const ALL_MEGA_STONES = [
  "venusaurite",
  "charizardite-x",
  "charizardite-y",
  "blastoisite",
  "alakazite",
  "gengarite",
  "kangaskhanite",
  "pinsirite",
  "gyaradosite",
  "aerodactylite",
  "mewtwonite-x",
  "mewtwonite-y",
  "ampharosite",
  "scizorite",
  "heracronite",
  "houndoominite",
  "tyranitarite",
  "blazikenite",
  "gardevoirite",
  "mawilite",
  "aggronite",
  "medichamite",
  "manectite",
  "banettite",
  "absolite",
  "garchompite",
  "lucarionite",
  "abomasite",
  "beedrillite",
  "pidgeotite",
  "slowbronite",
  "steelixite",
  "sceptilite",
  "swampertite",
  "sablenite",
  "sharpedonite",
  "cameruptite",
  "altarianite",
  "glalitite",
  "salamencite",
  "metagrossite",
  "latiasite",
  "latiosite",
  "lopunnite",
  "galladite",
  "audinite",
  "diancite",
];

// Quick item presets
const QUICK_ITEMS: { id: string; label: string; qty: number; img: string }[] = [
  { id: "poke-ball", label: "Poké Ball", qty: 50, img: "poke-ball" },
  { id: "great-ball", label: "Great Ball", qty: 30, img: "great-ball" },
  { id: "ultra-ball", label: "Ultra Ball", qty: 20, img: "ultra-ball" },
  { id: "master-ball", label: "Master Ball", qty: 5, img: "master-ball" },
  { id: "rare-candy", label: "Rare Candy", qty: 10, img: "rare-candy" },
  { id: "potion", label: "Poción", qty: 20, img: "potion" },
  { id: "super-potion", label: "Súper Poción", qty: 15, img: "super-potion" },
  { id: "hyper-potion", label: "Hiper Poción", qty: 10, img: "hyper-potion" },
  { id: "full-restore", label: "Full Restore", qty: 5, img: "full-restore" },
  { id: "revive", label: "Revive", qty: 10, img: "revive" },
  { id: "max-revive", label: "Max Revive", qty: 5, img: "max-revive" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-display text-[0.5rem] tracking-[0.2em] text-brand uppercase border-b border-brand/30 pb-0.5 w-full block mb-1">
      {children}
    </span>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-0.5 border-b border-border/20">
      <span className="font-display text-[0.5rem] text-muted tracking-tighter">
        {label}
      </span>
      <span className="font-display text-[0.5rem] text-white">{value}</span>
    </div>
  );
}

function DbgButton({
  onClick,
  children,
  variant = "default",
  className = "",
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "danger" | "success" | "accent";
  className?: string;
  disabled?: boolean;
}) {
  const colors = {
    default:
      "bg-surface-alt border-border text-white hover:border-brand hover:text-brand",
    danger:
      "bg-danger/10 border-danger/50 text-danger hover:border-danger hover:bg-danger/20",
    success:
      "bg-green-900/20 border-green-600/50 text-green-400 hover:border-green-500",
    accent:
      "bg-accent/10 border-accent/50 text-accent hover:border-accent hover:bg-accent/20",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "border-2 px-2 py-1 font-display text-[0.55rem] tracking-widest uppercase transition-all",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        colors[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DebuggerPanel() {
  const { run, setRun, setMeta, meta, notify } = useGame();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [isPokeModalOpen, setIsPokeModalOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [jsonExpanded, setJsonExpanded] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const setRunField = (patch: Partial<typeof run>) =>
    setRun((prev) => ({ ...prev, ...patch }));

  const addItem = (id: string, qty: number) =>
    setRun((prev) => ({
      ...prev,
      items: { ...prev.items, [id]: (prev.items[id] || 0) + qty },
    }));

  const notify_ = (msg: string, icon = "🛠️") =>
    notify({ message: msg, type: "badge", icon, duration: 2500 });

  // ── Rare Candy: apply to a specific Pokémon ────────────────────────────────
  const applyRareCandy = async (uid: string, times = 1) => {
    if ((run.items["rare-candy"] || 0) < times) {
      notify_("No tienes suficientes Rare Candies", "❌");
      return;
    }

    // 1. Level up synchronously and update state
    let leveledPokemon: (typeof run.team)[0] | null = null;
    let lastLevel = 0;

    setRun((prev) => {
      const team = [...prev.team];
      const idx = team.findIndex((p) => p.uid === uid);
      if (idx === -1) return prev;

      let pokemon = { ...team[idx] };
      lastLevel = pokemon.level;

      for (let i = 0; i < times; i++) {
        if (pokemon.level >= 100) break;
        pokemon = { ...pokemon, xp: xpToNextLevel(pokemon.level) };
        pokemon = levelUpPokemon(pokemon);
        lastLevel = pokemon.level;
      }

      leveledPokemon = pokemon;
      team[idx] = pokemon;

      let currentBattle = prev.currentBattle;
      if (currentBattle?.playerPokemon.uid === uid) {
        currentBattle = { ...currentBattle, playerPokemon: pokemon };
      }

      // Trigger move learn check via marker (useEngineTick handles it)
      const next: typeof prev = {
        ...prev,
        items: {
          ...prev.items,
          "rare-candy": Math.max(0, (prev.items["rare-candy"] || 0) - times),
        },
        team,
        currentBattle,
        battleLog: [
          ...prev.battleLog,
          {
            id: Date.now().toString(),
            text: `[DEBUG] ${pokemon.name} → Nv.${lastLevel}`,
            type: "level" as const,
          },
        ].slice(-40),
      };
      (next as any).__checkMoveLearnAt = {
        pokemonUid: uid,
        level: lastLevel,
        _nonce: Date.now(),
      };
      (next as any).__checkEvolutionAt = {
        pokemonUid: uid,
        level: lastLevel,
        pokemonId: pokemon.pokemonId,
        _nonce: Date.now(),
      };
      return next;
    });

    notify_(`Rare Candy ×${times} aplicado`, "🍬");
  };

  // ── Gym badges ─────────────────────────────────────────────────────────────
  const toggleBadge = (gymId: number) => {
    setRun((prev) => {
      const has = prev.gymsBadges.includes(gymId);
      return {
        ...prev,
        gymsBadges: has
          ? prev.gymsBadges.filter((b) => b !== gymId)
          : [...prev.gymsBadges, gymId].sort((a, b) => a - b),
      };
    });
  };

  // ── Zone teleport ──────────────────────────────────────────────────────────
  const teleportToZone = (idx: number) => {
    setRun((prev) => ({
      ...prev,
      currentZoneIndex: idx,
      currentZoneProgress: 0,
      zoneBattlesWon: 0,
      currentBattle: null,
    }));
    notify_(`Teleportado a zona ${idx}`, "🗺️");
  };

  // ── Mega helpers ───────────────────────────────────────────────────────────
  const toggleMegaBracelet = () => {
    setRunField({ hasMegaBracelet: !run.hasMegaBracelet });
    notify_(
      !run.hasMegaBracelet
        ? "Mega Bracelet equipado ⚡"
        : "Mega Bracelet removido",
      "💎",
    );
  };

  const giveAllMegaStones = () => {
    setRun((prev) => {
      const newItems = { ...prev.items };
      ALL_MEGA_STONES.forEach((s) => {
        newItems[s] = 1;
      });
      return { ...prev, items: newItems };
    });
    notify_("Todas las Mega Stones añadidas", "💎");
  };

  const resetMegaState = () => {
    setRunField({ megaState: resetMegaStateAfterBattle() });
    notify_("MegaState reseteado", "🔄");
  };

  const warmMegaCache = () => {
    loadMegaEvolutions().then((res) =>
      notify_(`Cache mega cargado: ${res.length} entradas`, "✅"),
    );
  };

  // ── Heal all ──────────────────────────────────────────────────────────────
  const healAll = () => {
    setRun((prev) => ({
      ...prev,
      team: prev.team.map((p) => ({
        ...p,
        currentHP: p.maxHP,
        status: null,
        statModifiers: {
          atk: 0,
          def: 0,
          spa: 0,
          spd: 0,
          spe: 0,
          acc: 0,
          eva: 0,
          crit: 0,
        },
      })),
    }));
    notify_("Equipo curado al 100%", "❤️");
  };

  // ── Kill battle ────────────────────────────────────────────────────────────
  const killBattle = () => {
    setRunField({ currentBattle: null });
    notify_("Batalla forzada a terminar", "💥");
  };

  // ── Filtered items for Items tab ──────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const all = Object.entries(ITEMS);
    if (!itemSearch.trim()) return all;
    const q = itemSearch.toLowerCase();
    return all.filter(
      ([id, item]) =>
        id.includes(q) || (item as any).name?.toLowerCase().includes(q),
    );
  }, [itemSearch]);

  // ── Filtered run state JSON for Estado tab ─────────────────────────────────
  const stateJson = useMemo(() => {
    const clean = { ...run };
    // Remove large arrays for readability unless expanded
    if (!jsonExpanded) {
      (clean as any).team = `[${run.team.length} pokémon]`;
      (clean as any).pc = `[${run.pc.length} pokémon]`;
      (clean as any).battleLog = `[${run.battleLog.length} entries]`;
    }
    const raw = JSON.stringify(clean, null, 2);
    if (!stateSearch.trim()) return raw;
    // Highlight matching lines
    return raw
      .split("\n")
      .filter((line) => line.toLowerCase().includes(stateSearch.toLowerCase()))
      .join("\n");
  }, [run, stateSearch, jsonExpanded]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const content = (
    <>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 z-999999 bg-brand/80 border-2 border-brand text-white p-2 pixel-shadow-sm hover:translate-x-px hover:translate-y-px transition-all"
          title="Abrir Debugger"
        >
          <Zap size={16} />
        </button>
      ) : (
        <div
          className={clsx(
            "fixed bottom-4 left-4 z-999999 w-[380px] flex flex-col",
            "bg-surface-dark border-4 border-brand pixel-shadow overflow-hidden font-display text-[0.6rem]",
            isMinimized ? "max-h-[44px]" : "max-h-[580px]",
            "transition-all duration-200",
          )}
        >
          {/* ── Header ────────────────────────────────────────────────────────── */}
          <div className="bg-brand px-3 py-2 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
              <Zap size={12} className="animate-pulse" />
              <span className="tracking-[0.15em] text-[0.6rem]">
                DEBUGGER v2.0
              </span>
              <span className="bg-black/30 px-1.5 py-0.5 text-[0.45rem] tracking-widest opacity-80">
                {run.isActive ? "RUN ACTIVA" : "SIN RUN"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized((v) => !v)}
                className="p-1 hover:bg-white/20 transition-colors"
              >
                {isMinimized ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* ── Tabs ──────────────────────────────────────────────────────── */}
              <div className="flex bg-surface-alt border-b-2 border-border shrink-0 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      "flex-1 min-w-fit px-2 py-1.5 flex items-center justify-center gap-1",
                      "uppercase tracking-tighter text-[0.5rem] whitespace-nowrap transition-colors",
                      activeTab === tab.id
                        ? "bg-brand text-white"
                        : "text-muted hover:bg-surface hover:text-white",
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Content ───────────────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 bg-surface custom-scrollbar">
                {/* ════════════════════════════════════════════════════════════
                  TAB: GENERAL
              ════════════════════════════════════════════════════════════ */}
                {activeTab === "general" && (
                  <>
                    <SectionLabel>Sesión</SectionLabel>
                    <div className="bg-black/40 border border-border p-2 flex flex-col gap-0.5">
                      <StatRow
                        label="Run ID"
                        value={run.runId?.slice(0, 12) || "—"}
                      />
                      <StatRow label="Región" value={run.currentRegion} />
                      <StatRow label="Zona" value={run.currentZoneIndex} />
                      <StatRow
                        label="Progreso zona"
                        value={`${run.currentZoneProgress}%`}
                      />
                      <StatRow
                        label="Batallas ganadas"
                        value={run.totalBattlesWon}
                      />
                      <StatRow label="Dinero" value={`$${run.money}`} />
                      <StatRow label="Equipo" value={`${run.team.length}/6`} />
                      <StatRow label="PC" value={run.pc.length} />
                      <StatRow label="Badges" value={run.gymsBadges.length} />
                      <StatRow
                        label="Speed mult."
                        value={run.speedMultiplier}
                      />
                      <StatRow
                        label="Mega Bracelet"
                        value={run.hasMegaBracelet ? "✅" : "❌"}
                      />
                      <StatRow
                        label="MegaState.isMega"
                        value={run.megaState?.isMega ? "✅" : "❌"}
                      />
                      <StatRow
                        label="Battle phase"
                        value={run.currentBattle?.phase || "—"}
                      />
                      <StatRow
                        label="Battle type"
                        value={run.currentBattle?.type || "—"}
                      />
                    </div>

                    <SectionLabel>Economía</SectionLabel>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[100, 1000, 10000, 50000, 100000, 999999].map((n) => (
                        <DbgButton
                          key={n}
                          onClick={() => setRunField({ money: run.money + n })}
                        >
                          +{n >= 1000 ? `${n / 1000}k` : n} $
                        </DbgButton>
                      ))}
                    </div>

                    <SectionLabel>PokéCoins (Meta)</SectionLabel>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[100, 1000, 9999].map((n) => (
                        <DbgButton
                          key={n}
                          onClick={() =>
                            setMeta((m) => ({
                              ...m,
                              pokeCoins: m.pokeCoins + n,
                            }))
                          }
                        >
                          +{n} 🪙
                        </DbgButton>
                      ))}
                    </div>

                    <SectionLabel>Control de batalla</SectionLabel>
                    <div className="grid grid-cols-2 gap-1.5">
                      <DbgButton onClick={healAll} variant="success">
                        ❤️ Curar equipo
                      </DbgButton>
                      <DbgButton
                        onClick={killBattle}
                        variant="danger"
                        disabled={!run.currentBattle}
                      >
                        💥 Terminar batalla
                      </DbgButton>
                      <DbgButton
                        onClick={() => setRunField({ isPaused: !run.isPaused })}
                        variant={run.isPaused ? "success" : "default"}
                      >
                        {run.isPaused ? "▶️ Reanudar" : "⏸️ Pausar"}
                      </DbgButton>
                      <DbgButton
                        onClick={() =>
                          setRunField({
                            speedMultiplier:
                              run.speedMultiplier === "SKIP" ? 1 : "SKIP",
                          })
                        }
                        variant={
                          run.speedMultiplier === "SKIP" ? "accent" : "default"
                        }
                      >
                        {run.speedMultiplier === "SKIP"
                          ? "⚡ SKIP ON"
                          : "⚡ SKIP OFF"}
                      </DbgButton>
                    </div>

                    <SectionLabel>Inyector Pokémon</SectionLabel>
                    <DbgButton
                      onClick={() => setIsPokeModalOpen(true)}
                      variant="accent"
                      className="w-full py-2"
                    >
                      🧬 Abrir inyector pokémon
                    </DbgButton>
                  </>
                )}

                {/* ════════════════════════════════════════════════════════════
                  TAB: EQUIPO
              ════════════════════════════════════════════════════════════ */}
                {activeTab === "equipo" && (
                  <>
                    <SectionLabel>
                      Rare Candy en mochila:{" "}
                      <span className="text-white">
                        {run.items["rare-candy"] || 0}
                      </span>
                    </SectionLabel>

                    {run.team.length === 0 ? (
                      <p className="text-muted text-[0.55rem] italic text-center py-4">
                        Sin Pokémon en el equipo
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {run.team.map((p) => (
                          <div
                            key={p.uid}
                            className="bg-surface-alt border-2 border-border p-2 flex items-center gap-2"
                          >
                            {/* Sprite */}
                            <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                              <PixelSprite
                                pokemonId={p.pokemonId}
                                variant="front"
                                size={40}
                                alt={p.name}
                                shiny={p.isShiny}
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-white text-[0.6rem] truncate capitalize">
                                  {p.name}
                                </span>
                                {p.isShiny && (
                                  <Sparkles
                                    size={9}
                                    className="text-accent shrink-0"
                                  />
                                )}
                              </div>
                              <div className="text-muted text-[0.5rem]">
                                Nv.{p.level} — {p.currentHP}/{p.maxHP} HP
                              </div>
                              <div className="w-full bg-black/40 h-1 mt-0.5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand transition-all"
                                  style={{
                                    width: `${(p.currentHP / p.maxHP) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Rare Candy controls */}
                            <div className="flex flex-col gap-1 shrink-0">
                              <DbgButton
                                onClick={() => applyRareCandy(p.uid, 1)}
                                disabled={
                                  p.level >= 100 || !run.items["rare-candy"]
                                }
                                variant="accent"
                                className="px-1.5 py-0.5 text-[0.45rem]"
                              >
                                🍬 ×1
                              </DbgButton>
                              <DbgButton
                                onClick={() => applyRareCandy(p.uid, 5)}
                                disabled={
                                  p.level >= 100 ||
                                  (run.items["rare-candy"] || 0) < 5
                                }
                                variant="accent"
                                className="px-1.5 py-0.5 text-[0.45rem]"
                              >
                                🍬 ×5
                              </DbgButton>
                              <DbgButton
                                onClick={() => {
                                  const times = 100 - p.level;
                                  applyRareCandy(p.uid, times);
                                }}
                                disabled={
                                  p.level >= 100 || !run.items["rare-candy"]
                                }
                                variant="danger"
                                className="px-1.5 py-0.5 text-[0.45rem]"
                              >
                                → 100
                              </DbgButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <SectionLabel>Acciones de equipo</SectionLabel>
                    <div className="grid grid-cols-2 gap-1.5">
                      <DbgButton onClick={healAll} variant="success">
                        ❤️ Curar todos
                      </DbgButton>
                      <DbgButton
                        onClick={() => {
                          // Give 99 rare candies for bulk testing
                          addItem("rare-candy", 99);
                          notify_("×99 Rare Candies añadidos", "🍬");
                        }}
                        variant="accent"
                      >
                        🍬 +99 Candies
                      </DbgButton>
                    </div>
                  </>
                )}

                {/* ════════════════════════════════════════════════════════════
                  TAB: ITEMS
              ════════════════════════════════════════════════════════════ */}
                {activeTab === "items" && (
                  <>
                    <SectionLabel>Acceso rápido</SectionLabel>
                    <div className="grid grid-cols-1 gap-1.5">
                      {QUICK_ITEMS.map((qi) => (
                        <button
                          key={qi.id}
                          onClick={() => {
                            addItem(qi.id, qi.qty);
                            notify_(`+${qi.qty} ${qi.label}`, "📦");
                          }}
                          className="bg-surface-alt border-2 border-border p-1.5 flex items-center justify-between hover:border-brand transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={`/sprites/items/${qi.img}.png`}
                              className="w-5 h-5 rendering-pixelated"
                              alt=""
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                            <span className="text-[0.55rem] text-white group-hover:text-brand transition-colors">
                              {qi.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted text-[0.45rem]">
                              Tienes: {run.items[qi.id] || 0}
                            </span>
                            <span className="text-brand text-[0.55rem] font-bold">
                              +{qi.qty}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <SectionLabel>Buscar cualquier item</SectionLabel>
                    <div className="relative">
                      <Search
                        size={11}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted"
                      />
                      <input
                        type="text"
                        placeholder="Nombre o ID del item..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full bg-black/40 border-2 border-border pl-7 pr-3 py-1.5 text-[0.55rem] text-white placeholder:text-muted/40 focus:border-brand focus:outline-none font-display"
                      />
                    </div>

                    {itemSearch && (
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredItems.slice(0, 30).map(([id]) => (
                          <button
                            key={id}
                            onClick={() => {
                              addItem(id, 5);
                              notify_(`+5 ${id}`, "📦");
                            }}
                            className="bg-surface-alt border border-border/40 p-1.5 flex items-center justify-between hover:border-brand transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={`/sprites/items/${id}.png`}
                                className="w-4 h-4 rendering-pixelated"
                                alt=""
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                              <span className="text-[0.55rem] text-white">
                                {id}
                              </span>
                            </div>
                            <span className="text-brand text-[0.5rem]">+5</span>
                          </button>
                        ))}
                        {filteredItems.length === 0 && (
                          <p className="text-muted text-[0.5rem] italic text-center py-2">
                            Sin resultados
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ════════════════════════════════════════════════════════════
                  TAB: PROGRESO
              ════════════════════════════════════════════════════════════ */}
                {activeTab === "progreso" && (
                  <>
                    <SectionLabel>Teleport de Zona</SectionLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-muted text-[0.5rem] whitespace-nowrap">
                        Zona actual: {run.currentZoneIndex}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {Array.from({ length: 18 }, (_, i) => (
                        <DbgButton
                          key={i}
                          onClick={() => teleportToZone(i)}
                          variant={
                            run.currentZoneIndex === i ? "accent" : "default"
                          }
                          className="text-center"
                        >
                          {i}
                        </DbgButton>
                      ))}
                    </div>

                    <SectionLabel>Badges de Gimnasio</SectionLabel>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 1, name: "Brock" },
                        { id: 2, name: "Misty" },
                        { id: 3, name: "Surge" },
                        { id: 4, name: "Erika" },
                        { id: 5, name: "Koga" },
                        { id: 6, name: "Blaine" },
                        { id: 7, name: "Sabrina" },
                        { id: 8, name: "Giovanni" },
                      ].map((gym) => {
                        const has = run.gymsBadges.includes(gym.id);
                        return (
                          <button
                            key={gym.id}
                            onClick={() => toggleBadge(gym.id)}
                            className={clsx(
                              "flex flex-col items-center gap-0.5 p-1.5 border-2 transition-all text-[0.45rem]",
                              has
                                ? "bg-brand/20 border-brand text-brand"
                                : "bg-surface-alt border-border/40 text-muted hover:border-brand/50",
                            )}
                          >
                            <Trophy
                              size={12}
                              className={has ? "text-brand" : "text-muted"}
                            />
                            <span className="tracking-tighter">{gym.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <DbgButton
                        onClick={() =>
                          setRun((p) => ({
                            ...p,
                            gymsBadges: [1, 2, 3, 4, 5, 6, 7, 8],
                          }))
                        }
                        variant="success"
                      >
                        ✅ Todos los badges
                      </DbgButton>
                      <DbgButton
                        onClick={() =>
                          setRun((p) => ({ ...p, gymsBadges: [] }))
                        }
                        variant="danger"
                      >
                        ❌ Quitar todos
                      </DbgButton>
                    </div>

                    <SectionLabel>Alto Mando</SectionLabel>
                    <div className="grid grid-cols-2 gap-1.5">
                      <DbgButton
                        onClick={() => setRunField({ eliteFourDefeated: true })}
                        variant="success"
                        disabled={run.eliteFourDefeated}
                      >
                        🏆 Marcar victorioso
                      </DbgButton>
                      <DbgButton
                        onClick={() =>
                          setRunField({ eliteFourDefeated: false })
                        }
                        variant="danger"
                        disabled={!run.eliteFourDefeated}
                      >
                        🔄 Resetear
                      </DbgButton>
                    </div>

                    <SectionLabel>Estadísticas globales (Meta)</SectionLabel>
                    <div className="bg-black/40 border border-border p-2 flex flex-col gap-0.5">
                      <StatRow label="Total runs" value={meta.totalRuns} />
                      <StatRow label="PokéCoins" value={meta.pokeCoins} />
                      <StatRow
                        label="Capturados únicos"
                        value={meta.capturedUniqueIds?.length || 0}
                      />
                      <StatRow
                        label="Nivel más alto"
                        value={meta.highestLevelReached}
                      />
                      <StatRow
                        label="Max win streak"
                        value={meta.maxWinStreakEver}
                      />
                    </div>
                  </>
                )}

                {/* ════════════════════════════════════════════════════════════
                  TAB: MEGA
              ════════════════════════════════════════════════════════════ */}
                {activeTab === "mega" && (
                  <>
                    <SectionLabel>Mega Bracelet</SectionLabel>
                    <button
                      onClick={toggleMegaBracelet}
                      className={clsx(
                        "w-full flex items-center justify-between p-3 border-2 transition-all",
                        run.hasMegaBracelet
                          ? "bg-orange-900/20 border-orange-500 text-orange-400"
                          : "bg-surface-alt border-border text-muted",
                      )}
                    >
                      <span className="font-display text-[0.6rem] tracking-widest">
                        MEGA BRACELET
                      </span>
                      <Sparkles
                        size={16}
                        className={
                          run.hasMegaBracelet
                            ? "text-orange-400 animate-pulse"
                            : "text-muted"
                        }
                      />
                    </button>

                    <SectionLabel>Mega Stones</SectionLabel>
                    <div className="grid grid-cols-2 gap-1.5">
                      <DbgButton
                        onClick={giveAllMegaStones}
                        variant="accent"
                        className="col-span-2 py-2"
                      >
                        💎 Dar TODAS las mega stones ({ALL_MEGA_STONES.length})
                      </DbgButton>
                    </div>

                    <div className="bg-black/40 border border-border p-2 flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                      {ALL_MEGA_STONES.map((stone) => (
                        <div
                          key={stone}
                          className="flex justify-between items-center"
                        >
                          <span className="text-[0.45rem] text-muted">
                            {stone}
                          </span>
                          <div className="flex items-center gap-1">
                            <span
                              className={clsx(
                                "text-[0.45rem]",
                                (run.items[stone] || 0) > 0
                                  ? "text-green-400"
                                  : "text-danger/60",
                              )}
                            >
                              ×{run.items[stone] || 0}
                            </span>
                            <DbgButton
                              onClick={() => addItem(stone, 1)}
                              className="px-1 py-0 text-[0.4rem]"
                            >
                              +1
                            </DbgButton>
                          </div>
                        </div>
                      ))}
                    </div>

                    <SectionLabel>MegaState actual</SectionLabel>
                    <div className="bg-black/40 border border-border p-2 flex flex-col gap-0.5">
                      <StatRow
                        label="isMega"
                        value={run.megaState?.isMega ? "✅ SÍ" : "❌ NO"}
                      />
                      <StatRow
                        label="megaName"
                        value={run.megaState?.megaName || "—"}
                      />
                      <StatRow
                        label="usedThisBattle"
                        value={run.megaState?.usedThisBattle ? "✅" : "❌"}
                      />
                      <StatRow
                        label="originalPokemonId"
                        value={run.megaState?.originalPokemonId ?? "—"}
                      />
                      <StatRow
                        label="originalName"
                        value={run.megaState?.originalName || "—"}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <DbgButton onClick={resetMegaState} variant="danger">
                        🔄 Reset megaState
                      </DbgButton>
                      <DbgButton onClick={warmMegaCache} variant="success">
                        📦 Warm cache
                      </DbgButton>
                    </div>
                  </>
                )}

                {/* ════════════════════════════════════════════════════════════
                  TAB: ESTADO
              ════════════════════════════════════════════════════════════ */}
                {activeTab === "estado" && (
                  <>
                    <SectionLabel>Inspector de RunState</SectionLabel>
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Search
                          size={10}
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted"
                        />
                        <input
                          type="text"
                          placeholder="Filtrar por clave..."
                          value={stateSearch}
                          onChange={(e) => setStateSearch(e.target.value)}
                          className="w-full bg-black/40 border-2 border-border pl-6 pr-2 py-1 text-[0.5rem] text-white placeholder:text-muted/40 focus:border-brand focus:outline-none font-display"
                        />
                      </div>
                      <DbgButton
                        onClick={() => setJsonExpanded((v) => !v)}
                        variant={jsonExpanded ? "accent" : "default"}
                        className="whitespace-nowrap"
                      >
                        {jsonExpanded ? "Resumir" : "Expandir"}
                      </DbgButton>
                    </div>
                    <pre className="bg-black/60 border border-border p-2 text-[0.45rem] text-green-400 font-mono overflow-x-auto max-h-64 custom-scrollbar leading-relaxed whitespace-pre-wrap break-all">
                      {stateJson}
                    </pre>

                    <SectionLabel>Acciones de estado</SectionLabel>
                    <div className="grid grid-cols-2 gap-1.5">
                      <DbgButton
                        onClick={() => {
                          navigator.clipboard.writeText(
                            JSON.stringify(run, null, 2),
                          );
                          notify_("RunState copiado al portapapeles", "📋");
                        }}
                      >
                        📋 Copiar JSON
                      </DbgButton>
                      <DbgButton
                        onClick={() => {
                          const pending = {
                            pendingLootSelection: run.pendingLootSelection,
                            pendingMoveLearn: run.pendingMoveLearn,
                            pendingEvolution: run.pendingEvolution,
                            pendingZoneTransition: run.pendingZoneTransition,
                          };
                          setRunField({
                            pendingLootSelection: null,
                            pendingMoveLearn: null,
                            pendingEvolution: null,
                            pendingZoneTransition: false,
                          });
                          notify_("Pendientes limpiados", "🧹");
                        }}
                        variant="danger"
                      >
                        🧹 Limpiar pendientes
                      </DbgButton>
                      <DbgButton
                        onClick={() => {
                          setRun((p) => ({
                            ...p,
                            currentBattle: null,
                            pendingLootSelection: null,
                            pendingMoveLearn: null,
                            pendingEvolution: null,
                            pendingZoneTransition: false,
                          }));
                          notify_("Estado de batalla limpiado", "🧹");
                        }}
                        variant="danger"
                        className="col-span-2"
                      >
                        💥 Hard reset batalla + pendientes
                      </DbgButton>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {isPokeModalOpen && (
        <PokemonInjectionModal onClose={() => setIsPokeModalOpen(false)} />
      )}
    </>
  );

  return createPortal(content, document.body);
}
