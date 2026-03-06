import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../../../context/GameContext";
import {
  fetchAllPokemonList,
  getPokemonData,
} from "../../run/services/pokeapi.service";
import { NATURES } from "../../../engine/stats.engine";
import {
  X,
  Search,
  Sparkles,
  Star,
  Zap,
  ChevronRight,
  Check,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { clsx } from "clsx";
import { optimizeTeam } from "../../../engine/team.engine";
import { PixelSprite } from "../../../components/ui/PixelSprite";

interface PokemonInjectionModalProps {
  onClose: () => void;
}

export function PokemonInjectionModal({ onClose }: PokemonInjectionModalProps) {
  const { run, setRun, meta, setMeta, notify } = useGame();
  const [allPokemon, setAllPokemon] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoke, setSelectedPoke] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Customization
  const [level, setLevel] = useState(50);
  const [isShiny, setIsShiny] = useState(false);
  const [nature, setNature] = useState("hardy");
  const [perfectIVs, setPerfectIVs] = useState(true);
  const [injecting, setInjecting] = useState(false);

  useEffect(() => {
    fetchAllPokemonList().then((list) => {
      setAllPokemon(list);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const filteredPokemon = useMemo(() => {
    if (!searchQuery.trim()) return allPokemon.slice(0, 50);
    const q = searchQuery.toLowerCase();
    return allPokemon
      .filter((p) => p.name.toLowerCase().includes(q) || p.id.toString() === q)
      .slice(0, 50);
  }, [allPokemon, searchQuery]);

  const handleInjectToRun = async () => {
    if (!selectedPoke || injecting) return;
    setInjecting(true);
    try {
      const ivs = perfectIVs
        ? { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 }
        : undefined;
      const pokemon = await getPokemonData(
        selectedPoke.id,
        level,
        isShiny,
        ivs,
        nature,
      );

      setRun((prev) => {
        const { newTeam, newPC } = optimizeTeam(prev.team, prev.pc, pokemon);
        return {
          ...prev,
          team: newTeam,
          pc: newPC,
          battleLog: [
            ...prev.battleLog,
            {
              id: Date.now().toString(),
              text: `[DEBUG] Inyectado: ${pokemon.name} Nv.${level}`,
              type: "normal" as any,
            },
          ].slice(-40),
        };
      });

      notify({
        message: `${pokemon.name} inyectado a la partida`,
        type: "badge",
        icon: "💉",
        duration: 3000,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setInjecting(false);
    }
  };

  const handleUnlockAsStarter = () => {
    if (!selectedPoke) return;

    setMeta((prev) => {
      const existingIdx = prev.unlockedStarters.findIndex(
        (s) => s.id === selectedPoke.id,
      );
      const ivValue = perfectIVs ? 31 : 15;
      const newStarter = {
        id: selectedPoke.id,
        name:
          selectedPoke.name.charAt(0).toUpperCase() +
          selectedPoke.name.slice(1),
        maxIvs: {
          hp: ivValue,
          attack: ivValue,
          defense: ivValue,
          spAtk: ivValue,
          spDef: ivValue,
          speed: ivValue,
        },
        maxEvs: { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
        unlockedNatures: [nature],
        isShiny: isShiny,
        eggMoves: [],
      };

      if (existingIdx >= 0) {
        const updated = [...prev.unlockedStarters];
        updated[existingIdx] = {
          ...updated[existingIdx],
          unlockedNatures: Array.from(
            new Set([...updated[existingIdx].unlockedNatures, nature]),
          ),
          isShiny: updated[existingIdx].isShiny || isShiny,
          maxIvs: {
            hp: Math.max(updated[existingIdx].maxIvs.hp, ivValue),
            attack: Math.max(updated[existingIdx].maxIvs.attack, ivValue),
            defense: Math.max(updated[existingIdx].maxIvs.defense, ivValue),
            spAtk: Math.max(updated[existingIdx].maxIvs.spAtk, ivValue),
            spDef: Math.max(updated[existingIdx].maxIvs.spDef, ivValue),
            speed: Math.max(updated[existingIdx].maxIvs.speed, ivValue),
          },
        };
        return { ...prev, unlockedStarters: updated };
      } else {
        return {
          ...prev,
          unlockedStarters: [...prev.unlockedStarters, newStarter],
        };
      }
    });

    notify({
      message: `${selectedPoke.name} desbloqueado como inicial`,
      type: "badge",
      icon: "🔓",
      duration: 3000,
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-4 crt-screen"
      style={{
        zIndex: 99999,
        backgroundColor: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(4px)",
      }}
    >
      <Card
        className="w-full max-w-5xl h-[90vh] flex flex-col relative shadow-pixel-heavy border-4 border-brand-dark"
        noPadding
      >
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-12 h-12 bg-danger border-4 border-black text-white flex items-center justify-center hover:bg-red-500 hover:-translate-y-1 transition-all z-10 shadow-pixel"
        >
          <X size={24} />
        </button>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* SEARCH & LIST */}
          <div className="w-full md:w-2/3 flex flex-col border-r border-border bg-surface">
            <div className="p-4 border-b border-border bg-surface-dark shrink-0">
              <h2 className="font-display text-brand text-xl tracking-widest flex items-center gap-2">
                <Zap size={20} className="text-accent" />
                DEPURADOR POKÉMON
              </h2>
              <div className="mt-4 relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar por Nombre o ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border-2 border-border pl-12 pr-4 py-3 font-display text-sm focus:border-brand focus:outline-none placeholder:text-muted/40"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 custom-scrollbar">
              {loading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-brand border-t-accent rounded-full animate-spin" />
                  <span className="font-display text-xs text-muted tracking-widest">
                    CARGANDO BASE DE DATOS...
                  </span>
                </div>
              ) : (
                filteredPokemon.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPoke(p)}
                    className={clsx(
                      "flex flex-col items-center p-3 border-2 transition-all relative group",
                      selectedPoke?.id === p.id
                        ? "bg-brand/20 border-brand -translate-y-1 shadow-pixel"
                        : "bg-surface-alt border-border/40 hover:border-brand/60",
                    )}
                  >
                    <div className="w-16 h-16 flex items-center justify-center mb-2">
                      <PixelSprite
                        pokemonId={p.id}
                        variant="front"
                        size={64}
                        alt={p.name}
                      />
                    </div>
                    <span className="font-display text-[0.6rem] text-muted tracking-tighter mb-1">
                      #{p.id}
                    </span>
                    <span className="font-display text-[0.7rem] capitalize text-center truncate w-full">
                      {p.name}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* CUSTOMIZATION PANEL */}
          <div className="w-full md:w-1/3 flex flex-col bg-surface-dark">
            <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto custom-scrollbar">
              {selectedPoke ? (
                <>
                  <div className="flex flex-col items-center gap-4 py-4 border-b border-border/30">
                    <div className="w-32 h-32 bg-surface-alt border-4 border-border flex items-center justify-center relative shadow-inner">
                      <PixelSprite
                        pokemonId={selectedPoke.id}
                        variant="front"
                        shiny={isShiny}
                        size={96}
                        alt={selectedPoke.name}
                        className="drop-shadow-xl animate-bounce"
                      />
                      {isShiny && (
                        <Sparkles
                          className="absolute top-2 right-2 text-accent animate-pulse"
                          size={20}
                        />
                      )}
                    </div>
                    <div className="text-center">
                      <h3 className="font-display text-xl text-white uppercase tracking-wider">
                        {selectedPoke.name}
                      </h3>
                      <p className="font-display text-[0.6rem] text-muted tracking-[0.2em]">
                        CÓDIGO POKÉDEX: #{selectedPoke.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Level */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <label className="font-display text-[0.65rem] text-brand tracking-widest">
                          NIVEL
                        </label>
                        <span className="bg-brand text-white text-xs font-display px-2 py-0.5">
                          {level}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={level}
                        onChange={(e) => setLevel(parseInt(e.target.value))}
                        className="w-full accent-brand cursor-pointer"
                      />
                    </div>

                    {/* Shiny */}
                    <button
                      onClick={() => setIsShiny(!isShiny)}
                      className={clsx(
                        "flex items-center justify-between p-3 border-2 transition-all",
                        isShiny
                          ? "bg-accent/10 border-accent text-accent"
                          : "bg-surface-alt border-border text-muted",
                      )}
                    >
                      <span className="font-display text-[0.6rem] tracking-widest">
                        FORMA SHINY
                      </span>
                      <Sparkles
                        size={16}
                        fill={isShiny ? "currentColor" : "none"}
                      />
                    </button>

                    {/* Nature */}
                    <div className="flex flex-col gap-2">
                      <label className="font-display text-[0.65rem] text-brand tracking-widest">
                        NATURALEZA
                      </label>
                      <select
                        value={nature}
                        onChange={(e) => setNature(e.target.value)}
                        className="bg-surface-alt border-2 border-border p-2 font-display text-[0.7rem] text-white focus:border-brand focus:outline-none capitalize"
                      >
                        {Object.entries(NATURES).map(([id, n]) => (
                          <option key={id} value={id}>
                            {n.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* IVs */}
                    <button
                      onClick={() => setPerfectIVs(!perfectIVs)}
                      className={clsx(
                        "flex items-center justify-between p-3 border-2 transition-all",
                        perfectIVs
                          ? "bg-green-900/20 border-green-500 text-green-500"
                          : "bg-surface-alt border-border text-muted",
                      )}
                    >
                      <span className="font-display text-[0.6rem] tracking-widest">
                        IVS PERFECTOS (31)
                      </span>
                      {perfectIVs ? (
                        <Check size={16} />
                      ) : (
                        <div className="w-4 h-4 border-2 border-border" />
                      )}
                    </button>
                  </div>

                  <div className="mt-auto flex flex-col gap-3 py-4">
                    <Button
                      variant="primary"
                      onClick={handleInjectToRun}
                      disabled={!run.isActive || injecting}
                      className="w-full py-4 tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                      {injecting ? "INYECTANDO..." : "INYECTAR A RUN"}
                      <ChevronRight size={14} />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleUnlockAsStarter}
                      className="w-full py-4 tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                      DESBLOQUEAR INICIAL
                      <Zap size={14} />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-50">
                  <div className="w-20 h-20 border-4 border-dashed border-muted rounded-full flex items-center justify-center">
                    <Zap size={32} className="text-muted" />
                  </div>
                  <p className="font-display text-[0.6rem] text-muted tracking-widest leading-relaxed">
                    SELECCIONA UN POKÉMON
                    <br />
                    PARA PERSONALIZAR
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>,
    document.body,
  );
}
