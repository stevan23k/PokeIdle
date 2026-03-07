import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../../../context/GameContext";
import { ITEMS } from "../../../lib/items";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { levelUpPokemon, xpToNextLevel } from "../../../engine/xp.engine";
import {
  getPokemonSpecies,
  getEvolutionChain,
} from "../../run/services/pokeapi.service";
import { getZonesForRegion } from "../../../lib/regions.service";
import type { Zone } from "../../../lib/regions";
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
  { id: "general", label: "GENERAL", icon: <Zap size={14} /> },
  { id: "equipo", label: "EQUIPO", icon: <Swords size={14} /> },
  { id: "items", label: "ITEMS", icon: <Package size={14} /> },
  { id: "progreso", label: "PROGRESO", icon: <Map size={14} /> },
  { id: "mega", label: "MEGA", icon: <Sparkles size={14} /> },
  { id: "estado", label: "ESTADO", icon: <Code2 size={14} /> },
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
  const [itemSearch, setItemSearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [regionZones, setRegionZones] = useState<Zone[]>([]);

  // ── Fetch Region Zones ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (activeTab === "progreso") {
      getZonesForRegion(run.currentRegion).then(setRegionZones);
    }
  }, [activeTab, run.currentRegion]);

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
          className="fixed bottom-4 left-4 z-999999 w-12 h-12 bg-brand border-4 border-black text-white flex items-center justify-center hover:-translate-y-1 transition-transform shadow-pixel group"
          title="Abrir Debugger"
        >
          <div className="flex flex-col items-center">
            <Zap size={16} />
            <span className="font-display text-[0.45rem] font-bold">DEV</span>
          </div>
        </button>
      ) : (
        <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card
            className="w-full max-w-5xl h-[90vh] flex flex-col relative shadow-[10px_10px_0_rgba(0,0,0,0.5)]"
            noPadding
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -top-4 -right-4 w-12 h-12 bg-brand border-4 border-black text-white flex items-center justify-center hover:bg-red-500 hover:-translate-y-1 transition-transform z-10 shadow-pixel"
            >
              <X size={24} />
            </button>

            {/* ── Header ────────────────────────────────────────────────────────── */}
            <div className="p-4 border-b-4 border-border bg-surface-alt bg-striped flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-brand animate-pulse" />
                <h2 className="font-display text-brand text-xl tracking-widest">
                  DEBUGGER v2.5
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className={clsx(
                  "px-3 py-1 text-[0.6rem] font-bold tracking-[0.2em] border-2 shadow-pixel-sm",
                  run.isActive ? "bg-green-900/20 border-green-500 text-green-400" : "bg-red-900/20 border-red-500 text-red-400"
                )}>
                  {run.isActive ? "RUN STATUS: ACTIVE" : "RUN STATUS: NULL"}
                </span>
                <span className="text-[0.45rem] tracking-widest text-muted font-bold px-2 py-1 bg-black/20 border border-border/40">
                  SESSION: {run.runId?.slice(0, 8) || "NULL"}
                </span>
              </div>
            </div>

            <div className="flex-1 flex flex-row overflow-hidden">
              {/* ── Sidebar ──────────────────────────────────────────────────── */}
              <div className="w-48 bg-surface-alt border-r border-border flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                <div className="p-4 border-b border-border mb-2">
                  <h3 className="font-display text-muted text-[0.65rem] tracking-[0.2em] uppercase">HERRAMIENTAS</h3>
                </div>
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3 transition-colors text-left font-display text-[0.6rem] tracking-widest uppercase",
                      activeTab === tab.id
                        ? "bg-brand text-white border-l-4 border-l-white"
                        : "text-muted hover:bg-surface hover:text-white border-l-4 border-transparent",
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
                <div className="mt-auto p-4 border-t border-border/10 opacity-30">
                  <div className="w-full h-1 bg-brand animate-pulse mb-1" />
                  <div className="w-2/3 h-1 bg-brand/50" />
                </div>
              </div>

              {/* ── Content Area ──────────────────────────────────────────────── */}
              <div className="flex-1 flex flex-col min-w-0 bg-surface">
                {/* ── Sub-Header (Search or Title) ────────────────── */}
                <div className="p-3 border-b border-border bg-surface-dark shrink-0 flex items-center justify-between">
                  {(activeTab === "items" || activeTab === "estado") ? (
                    <div className="relative w-full">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        placeholder={`Buscar en ${activeTab.toUpperCase()}...`}
                        value={activeTab === "items" ? itemSearch : stateSearch}
                        onChange={(e) => activeTab === "items" ? setItemSearch(e.target.value) : setStateSearch(e.target.value)}
                        className="w-full bg-surface border border-border pl-9 pr-3 py-1.5 font-display text-[0.65rem] text-foreground focus:border-brand focus:outline-none placeholder:text-muted/50"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-brand" />
                      <span className="font-display text-[0.7rem] text-brand tracking-[0.3em] uppercase">
                        {TABS.find(t => t.id === activeTab)?.label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-surface custom-scrollbar min-h-0">
                  {/* ════════════════════════════════════════════════════════════
                    TAB: GENERAL
                  ════════════════════════════════════════════════════════════ */}
                  {activeTab === "general" && (
                    <>
                      <SectionLabel>Sesión</SectionLabel>
                      <div className="bg-black/40 border border-border p-2 flex flex-col gap-0.5">
                        <StatRow label="Run ID" value={run.runId?.slice(0, 12) || "—"} />
                        <StatRow label="Región" value={run.currentRegion} />
                        <StatRow label="Zona" value={run.currentZoneIndex} />
                        <StatRow label="Progreso zona" value={`${run.currentZoneProgress}%`} />
                        <StatRow label="Batallas ganadas" value={run.totalBattlesWon} />
                        <StatRow label="Dinero" value={`$${run.money}`} />
                        <StatRow label="Equipo" value={`${run.team.length}/6`} />
                        <StatRow label="PC" value={run.pc.length} />
                        <StatRow label="Badges" value={run.gymsBadges.length} />
                        <StatRow label="Speed mult." value={run.speedMultiplier} />
                      </div>

                      <SectionLabel>Economía</SectionLabel>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[100, 1000, 10000, 100000].map((n) => (
                          <DbgButton key={n} onClick={() => setRunField({ money: run.money + n })}>
                            +{n >= 1000 ? `${n / 1000}k` : n} $
                          </DbgButton>
                        ))}
                      </div>

                      <SectionLabel>Control Maestro</SectionLabel>
                      <div className="grid grid-cols-2 gap-1.5">
                        <DbgButton onClick={healAll} variant="success">❤️ Curar equipo</DbgButton>
                        <DbgButton onClick={killBattle} variant="danger" disabled={!run.currentBattle}>💥 Terminar batalla</DbgButton>
                        <DbgButton onClick={() => (window as any).openPokeInjection?.()} variant="accent" className="col-span-2">🧬 Abrir Inyector</DbgButton>
                      </div>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════════════════
                    TAB: EQUIPO
                  ════════════════════════════════════════════════════════════ */}
                  {activeTab === "equipo" && (
                    <div className="flex flex-col gap-2 pr-1">
                      {run.team.map((p) => (
                        <div key={p.uid} className="bg-surface-alt border-2 border-border p-2.5 flex items-center gap-3">
                          <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-black/20 border border-border/40">
                            <PixelSprite pokemonId={p.pokemonId} variant="front" size={48} alt={p.name} shiny={p.isShiny} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-white text-[0.65rem] truncate uppercase font-display">{p.name}</span>
                              {p.isShiny && <Sparkles size={10} className="text-accent" />}
                            </div>
                            <div className="text-muted text-[0.5rem] font-mono">NV.{p.level} · {p.currentHP}/{p.maxHP} HP</div>
                            <div className="w-full bg-black/40 h-1.5 mt-1 border border-border/20">
                              <div className="h-full bg-brand" style={{ width: `${(p.currentHP / p.maxHP) * 100}%` }} />
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <DbgButton onClick={() => applyRareCandy(p.uid, 1)} disabled={p.level >= 100 || (run.items["rare-candy"] || 0) < 1}>+1</DbgButton>
                            <DbgButton onClick={() => applyRareCandy(p.uid, 10)} disabled={p.level >= 100 || (run.items["rare-candy"] || 0) < 10}>+10</DbgButton>
                          </div>
                        </div>
                      ))}
                      <DbgButton onClick={() => addItem("rare-candy", 50)} variant="accent" className="mt-2 w-full">🍬 Añadir 50 Rare Candies</DbgButton>
                    </div>
                  )}

                  {/* ════════════════════════════════════════════════════════════
                    TAB: ITEMS
                  ════════════════════════════════════════════════════════════ */}
                  {activeTab === "items" && (
                    <div className="flex flex-col gap-4 flex-1 min-h-0">
                      <SectionLabel>Acceso Rápido</SectionLabel>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 shrink-0">
                        {QUICK_ITEMS.map((qi) => (
                          <button
                            key={qi.id}
                            onClick={() => addItem(qi.id, qi.qty)}
                            className="bg-surface-alt border border-border p-2 flex items-center gap-2 hover:border-brand transition-colors group"
                          >
                            <img src={`/sprites/items/${qi.img}.png`} className="w-6 h-6 rendering-pixelated" alt="" />
                            <div className="flex flex-col items-start min-w-0">
                              <span className="text-[0.5rem] text-white truncate w-full uppercase font-display">{qi.label}</span>
                              <span className="text-[0.45rem] text-brand">+{qi.qty}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      <SectionLabel>Resultados de búsqueda</SectionLabel>
                      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                        {filteredItems.slice(0, 80).map(([id, item]) => (
                          <div key={id} className="flex items-center gap-3 bg-surface-alt border border-border/40 p-2.5 hover:border-brand/60 transition-colors group">
                            <img src={`/sprites/items/${id}.png`} className="w-8 h-8 rendering-pixelated shrink-0" alt="" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
                            <div className="flex-1 min-w-0">
                              <div className="font-display text-[0.65rem] text-white truncate">{(item as any).name}</div>
                              <div className="font-display text-[0.45rem] text-muted">{id} · Tienes: {run.items[id] || 0}</div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <DbgButton onClick={() => addItem(id, 1)}>+1</DbgButton>
                              <DbgButton onClick={() => addItem(id, 10)}>+10</DbgButton>
                            </div>
                          </div>
                        ))}
                        {itemSearch && filteredItems.length === 0 && (
                          <div className="text-center py-8 text-muted font-display text-[0.5rem] italic bg-black/20 border-2 border-dashed border-border/40">
                            NO RESULTS MATCH "{itemSearch.toUpperCase()}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ════════════════════════════════════════════════════════════
                    TAB: PROGRESO
                  ════════════════════════════════════════════════════════════ */}
                  {activeTab === "progreso" && (
                    <>
                      <SectionLabel>Gimnasios / Badges</SectionLabel>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                          <button
                            key={num}
                            onClick={() => toggleBadge(num)}
                            className={clsx(
                              "aspect-square border-2 flex items-center justify-center transition-all",
                              run.gymsBadges.includes(num) ? "bg-brand/20 border-brand text-brand" : "bg-black/20 border-border text-muted opacity-40"
                            )}
                          >
                            <Trophy size={20} />
                          </button>
                        ))}
                      </div>

                      <SectionLabel>Teleport a Zona</SectionLabel>
                      <div className="flex flex-col gap-1 overflow-y-auto max-h-64 custom-scrollbar pr-1">
                        {regionZones.map((zone, idx) => (
                          <button
                            key={zone.id || idx}
                            onClick={() => teleportToZone(idx)}
                            className={clsx(
                              "px-3 py-2 border-2 text-[0.55rem] text-left transition-colors flex justify-between items-center",
                              run.currentZoneIndex === idx ? "bg-brand border-white text-white" : "bg-surface-alt border-border text-muted hover:border-brand"
                            )}
                          >
                            <span className="truncate">{idx}. {zone.name} {zone.isGym ? "🏛️" : ""}</span>
                            {run.currentZoneIndex === idx && <Zap size={10} className="animate-pulse" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════════════════
                    TAB: MEGA
                  ════════════════════════════════════════════════════════════ */}
                  {activeTab === "mega" && (
                    <>
                      <SectionLabel>Status</SectionLabel>
                      <div className="grid grid-cols-1 gap-2">
                        <DbgButton onClick={toggleMegaBracelet} variant={run.hasMegaBracelet ? "success" : "default"}>
                          {run.hasMegaBracelet ? "✅ MEGA BRACELET: ACTIVE" : "❌ MEGA BRACELET: INACTIVE"}
                        </DbgButton>
                        <DbgButton onClick={giveAllMegaStones} variant="accent">💎 DAR TODAS LAS MEGA STONES</DbgButton>
                      </div>

                      <SectionLabel>Engine Control</SectionLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <DbgButton onClick={warmMegaCache}>🔥 WARM CACHE</DbgButton>
                        <DbgButton onClick={resetMegaState} variant="danger">🔄 RESET STATE</DbgButton>
                      </div>

                      <div className="bg-black/40 border border-border p-3 mt-2 flex flex-col gap-1">
                        <StatRow label="isMegaActive" value={run.megaState?.isMega ? "TRUE" : "FALSE"} />
                        <StatRow label="megaName" value={run.megaState?.megaName || "—"} />
                        <StatRow label="originalId" value={run.megaState?.originalPokemonId ?? "—"} />
                      </div>
                    </>
                  )}

                  {/* ════════════════════════════════════════════════════════════
                    TAB: ESTADO
                  ════════════════════════════════════════════════════════════ */}
                  {activeTab === "estado" && (
                    <div className="flex-1 flex flex-col min-h-0 gap-3">
                      <div className="flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <Code2 size={14} className="text-brand" />
                          <h3 className="font-display text-brand text-[0.7rem] tracking-[0.2em] uppercase">SYSTEM INSPECTOR</h3>
                        </div>
                        <DbgButton onClick={() => setJsonExpanded(!jsonExpanded)} variant={jsonExpanded ? "accent" : "default"}>
                          {jsonExpanded ? "COLAPSAR" : "EXPANDIR TODO"}
                        </DbgButton>
                      </div>

                      <pre className="flex-1 bg-black/60 border-2 border-border p-4 text-[0.5rem] text-green-400 font-mono overflow-auto custom-scrollbar leading-tight whitespace-pre-wrap break-all shadow-inner">
                        {stateJson}
                      </pre>

                      <div className="grid grid-cols-2 gap-2 shrink-0">
                        <DbgButton onClick={() => { navigator.clipboard.writeText(JSON.stringify(run, null, 2)); notify_("Copiado", "📋"); }}>📋 COPIAR JSON</DbgButton>
                        <DbgButton onClick={() => setRunField({ pendingEvolution: null, pendingMoveLearn: null, pendingZoneTransition: false })} variant="danger">🧹 LIMPIAR PENDIENTES</DbgButton>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );

  return createPortal(content, document.body);
}
