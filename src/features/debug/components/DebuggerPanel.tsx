import React, { useState, useMemo } from "react";
import { useGame } from "../../../context/GameContext";
import { ITEMS } from "../../../lib/items";
import { Button } from "../../../components/ui/Button";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { levelUpPokemon, xpToNextLevel } from "../../../engine/xp.engine";
import { PokemonInjectionModal } from "./PokemonInjectionModal";
import { loadMegaEvolutions } from "../../../lib/mega.service";
import { resetMegaStateAfterBattle } from "../../../engine/mega.engine";
import { clsx } from "clsx";
import {
  X, Zap, ChevronDown, ChevronUp, Package, Coins,
  Shield, Swords, FlaskConical, BarChart3, Code2,
  RefreshCw, Plus, Minus, Search, Trophy, Star,
  Sparkles, Target, Map, Brain
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "general" | "equipo" | "items" | "progreso" | "mega" | "estado";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "general",  label: "GENERAL",  icon: <Zap size={11} /> },
  { id: "equipo",   label: "EQUIPO",   icon: <Swords size={11} /> },
  { id: "items",    label: "ITEMS",    icon: <Package size={11} /> },
  { id: "progreso", label: "PROGRESO", icon: <Map size={11} /> },
  { id: "mega",     label: "MEGA",     icon: <Sparkles size={11} /> },
  { id: "estado",   label: "ESTADO",   icon: <Code2 size={11} /> },
];

const ALL_MEGA_STONES = [
  "venusaurite", "charizardite-x", "charizardite-y", "blastoisite",
  "alakazite", "gengarite", "kangaskhanite", "pinsirite", "gyaradosite",
  "aerodactylite", "mewtwonite-x", "mewtwonite-y", "ampharosite",
  "scizorite", "heracronite", "houndoominite", "tyranitarite", "blazikenite",
  "gardevoirite", "mawilite", "aggronite", "medichamite", "manectite",
  "banettite", "absolite", "garchompite", "lucarionite", "abomasite",
  "beedrillite", "pidgeotite", "slowbronite", "steelixite", "sceptilite",
  "swampertite", "sablenite", "sharpedonite", "cameruptite", "altarianite",
  "glalitite", "salamencite", "metagrossite", "latiasite", "latiosite",
  "lopunnite", "galladite", "audinite", "diancite",
];

const QUICK_ITEMS: { id: string; label: string; qty: number }[] = [
  { id: "poke-ball",    label: "Poké Ball",    qty: 50  },
  { id: "great-ball",   label: "Great Ball",   qty: 30  },
  { id: "ultra-ball",   label: "Ultra Ball",   qty: 20  },
  { id: "master-ball",  label: "Master Ball",  qty: 5   },
  { id: "rare-candy",   label: "Rare Candy",   qty: 10  },
  { id: "potion",       label: "Poción",        qty: 20  },
  { id: "super-potion", label: "Súper Poción",  qty: 15  },
  { id: "hyper-potion", label: "Hiper Poción",  qty: 10  },
  { id: "full-restore", label: "Full Restore",  qty: 5   },
  { id: "revive",       label: "Revive",        qty: 10  },
  { id: "max-revive",   label: "Max Revive",    qty: 5   },
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
      <span className="font-display text-[0.5rem] text-muted tracking-tighter">{label}</span>
      <span className="font-display text-[0.5rem] text-white">{value}</span>
    </div>
  );
}

function DbgButton({
  onClick, children, variant = "default", className = "", disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "danger" | "success" | "accent";
  className?: string;
  disabled?: boolean;
}) {
  const colors = {
    default: "bg-surface-alt border-border text-white hover:border-brand hover:text-brand",
    danger:  "bg-danger/10 border-danger/50 text-danger hover:border-danger hover:bg-danger/20",
    success: "bg-green-900/20 border-green-600/50 text-green-400 hover:border-green-500",
    accent:  "bg-accent/10 border-accent/50 text-accent hover:border-accent hover:bg-accent/20",
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

function ItemSprite({ id }: { id: string }) {
  return (
    <img
      src={`/sprites/items/${id}.png`}
      className="w-5 h-5 rendering-pixelated shrink-0"
      alt=""
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
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

  const setRunField = (patch: Partial<typeof run>) =>
    setRun((prev) => ({ ...prev, ...patch }));

  const addItem = (id: string, qty: number) =>
    setRun((prev) => ({
      ...prev,
      items: { ...prev.items, [id]: (prev.items[id] || 0) + qty },
    }));

  const notify_ = (msg: string, icon = "🛠️") =>
    notify({ message: msg, type: "badge", icon, duration: 2500 });

  // ── Rare Candy ─────────────────────────────────────────────────────────────
  const applyRareCandy = (uid: string, times = 1) => {
    if ((run.items["rare-candy"] || 0) < times) {
      notify_("No tienes suficientes Rare Candies", "❌");
      return;
    }
    setRun((prev) => {
      let team = [...prev.team];
      const idx = team.findIndex((p) => p.uid === uid);
      if (idx === -1) return prev;

      let pokemon = { ...team[idx] };
      let lastLevel = pokemon.level;

      for (let i = 0; i < times; i++) {
        if (pokemon.level >= 100) break;
        pokemon = { ...pokemon, xp: xpToNextLevel(pokemon.level) };
        pokemon = levelUpPokemon(pokemon);
        lastLevel = pokemon.level;
      }

      team[idx] = pokemon;

      let currentBattle = prev.currentBattle;
      if (currentBattle?.playerPokemon.uid === uid) {
        currentBattle = { ...currentBattle, playerPokemon: pokemon };
      }

      const next: typeof prev = {
        ...prev,
        items: { ...prev.items, "rare-candy": Math.max(0, (prev.items["rare-candy"] || 0) - times) },
        team,
        currentBattle,
        battleLog: [
          ...prev.battleLog,
          {
            id: Date.now().toString(),
            text: `[DEBUG] ${pokemon.name} subió al nivel ${lastLevel} con Rare Candy.`,
            type: "level" as const,
          },
        ].slice(-40),
      };

      (next as any).__checkMoveLearnAt = { pokemonUid: uid, level: lastLevel };
      (next as any).__checkEvolutionAt = { pokemonUid: uid, level: lastLevel, pokemonId: pokemon.pokemonId };

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

  // ── Mega ───────────────────────────────────────────────────────────────────
  const toggleMegaBracelet = () => {
    setRunField({ hasMegaBracelet: !run.hasMegaBracelet });
    notify_(!run.hasMegaBracelet ? "Mega Bracelet equipado ⚡" : "Mega Bracelet removido", "💎");
  };

  const giveAllMegaStones = () => {
    setRun((prev) => {
      const newItems = { ...prev.items };
      ALL_MEGA_STONES.forEach((s) => { newItems[s] = 1; });
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
      notify_(`Cache mega: ${res.length} entradas`, "✅"),
    );
  };

  // ── General ────────────────────────────────────────────────────────────────
  const healAll = () => {
    setRun((prev) => ({
      ...prev,
      team: prev.team.map((p) => ({
        ...p,
        currentHP: p.maxHP,
        status: null,
        statModifiers: { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0, crit:0 },
      })),
    }));
    notify_("Equipo curado al 100%", "❤️");
  };

  // ── Items search ───────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const all = Object.entries(ITEMS);
    if (!itemSearch.trim()) return all;
    const q = itemSearch.toLowerCase();
    return all.filter(([id, item]) =>
      id.includes(q) || (item as any).name?.toLowerCase().includes(q),
    );
  }, [itemSearch]);

  // ── State JSON ─────────────────────────────────────────────────────────────
  const stateJson = useMemo(() => {
    const clean = { ...run } as any;
    if (!jsonExpanded) {
      clean.team = `[${run.team.length} pokémon]`;
      clean.pc = `[${run.pc.length} pokémon]`;
      clean.battleLog = `[${run.battleLog.length} entries]`;
    }
    const raw = JSON.stringify(clean, null, 2);
    if (!stateSearch.trim()) return raw;
    return raw.split("\n").filter((l) => l.toLowerCase().includes(stateSearch.toLowerCase())).join("\n");
  }, [run, stateSearch, jsonExpanded]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-brand/80 border-2 border-brand text-white p-2 pixel-shadow-sm hover:translate-x-px hover:translate-y-px transition-all"
        title="Abrir Debugger"
      >
        <Zap size={16} />
      </button>
    );
  }

  return (
    <>
      <div className={clsx(
        "fixed bottom-4 left-4 z-50 w-[380px] flex flex-col",
        "bg-surface-dark border-4 border-brand pixel-shadow overflow-hidden font-display text-[0.6rem]",
        isMinimized ? "max-h-[44px]" : "max-h-[580px]",
        "transition-all duration-200",
      )}>
        {/* Header */}
                      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" className="w-5 h-5 rendering-pixelated" alt="" />
                      <span>Poké Balls</span>
                    </div>
                    <span className="text-brand">+50</span>
                  </button>
                  <button 
                    onClick={() => addItem('master-ball', 5)}
                    className="bg-surface-alt border-2 border-border p-2 flex items-center justify-between hover:border-brand group transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png" className="w-5 h-5 rendering-pixelated" alt="" />
                      <span>Master Balls</span>
                    </div>
                    <span className="text-brand">+5</span>
                  </button>
                  <button 
                    onClick={() => addItem('rare-candy', 10)}
                    className="bg-surface-alt border-2 border-border p-2 flex items-center justify-between hover:border-brand group transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png" className="w-5 h-5 rendering-pixelated" alt="" />
                      <span>Rare Candy</span>
                    </div>
                    <span className="text-brand">+10</span>
                  </button>
               </div>
            </div>
          )}

          {activeTab === 'pokemon' && (
            <div className="flex flex-col gap-4">
              <span className="text-accent uppercase underline">Pokémon Manager</span>
              <Button 
                variant="primary" 
                onClick={() => setIsPokeModalOpen(true)}
                className="w-full py-4 flex items-center justify-center gap-2 tracking-widest"
              >
                <Plus size={16} />
                INYECTOR POKÉMON
              </Button>
              <div className="p-3 bg-black/40 border border-border text-[0.55rem] text-muted leading-relaxed uppercase tracking-tighter">
                Usa esta herramienta para añadir Pokémon a tu equipo actual o desbloquearlos permanentemente como iniciales.
              </div>
            </div>
          )}
        </div>
      </div>
      {isPokeModalOpen && <PokemonInjectionModal onClose={() => setIsPokeModalOpen(false)} />}
    </>
  );
}
