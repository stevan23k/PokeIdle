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
  const [selectedPokeData, setSelectedPokeData] = useState<any | null>(null);

  // Fetch full data for the selected Pokémon to show types, etc.
  useEffect(() => {
    if (selectedPoke) {
      getPokemonData(selectedPoke.id, 50).then((data) => {
        setSelectedPokeData(data);
      });
    } else {
      setSelectedPokeData(null);
    }
  }, [selectedPoke]);

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
    if (!searchQuery.trim()) return allPokemon.slice(0, 120);
    const q = searchQuery.toLowerCase();
    return allPokemon
      .filter((p) => p.name.toLowerCase().includes(q) || p.id.toString() === q)
      .slice(0, 120);
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
    <div className="fixed inset-0 z-1000000 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <Card
        className="w-full max-w-6xl h-[90vh] flex flex-col relative shadow-[10px_10px_0_rgba(0,0,0,0.5)] border-4 border-black"
        noPadding
      >
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-12 h-12 bg-danger border-4 border-black text-white flex items-center justify-center hover:bg-red-500 hover:-translate-y-1 transition-transform z-20 shadow-pixel"
        >
          <X size={24} />
        </button>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="p-4 border-b-4 border-border bg-surface-alt bg-striped flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-brand animate-pulse" />
            <h2 className="font-display text-brand text-xl tracking-widest uppercase">
              Laboratorio de Clonación
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[0.45rem] tracking-[0.2em] text-muted font-bold">ACCESO NIVEL 5</span>
              <span className="text-[0.55rem] tracking-widest text-white font-display">INYECTOR DE ADN POKÉMON</span>
            </div>
            <div className="w-12 h-1 box-content border-2 border-brand/30 bg-brand/10" />
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* ── SEARCH & LIST (Main Content) ─────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 bg-surface">
            <div className="p-3 border-b border-border bg-surface-dark shrink-0 flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar por Nombre o ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface border border-border pl-10 pr-4 py-2 font-display text-[0.7rem] text-foreground focus:border-brand focus:outline-none placeholder:text-muted/50 uppercase tracking-widest"
                />
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 border-l border-border/40">
                <span className="text-[0.5rem] text-muted whitespace-nowrap uppercase">Resultados:</span>
                <span className="text-[0.6rem] text-brand font-bold font-mono">{filteredPokemon.length}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 custom-scrollbar bg-surface-dark/30">
              {loading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-brand border-t-brand-light rounded-full animate-spin" />
                  <span className="font-display text-[0.6rem] text-muted tracking-[0.3em] uppercase">Sincronizando PokeAPI...</span>
                </div>
              ) : (
                filteredPokemon.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPoke(p)}
                    className={clsx(
                      "flex flex-col items-center p-2 border-2 transition-all relative group h-24 overflow-hidden",
                      selectedPoke?.id === p.id
                        ? "bg-brand/10 border-brand shadow-[inset_0_0_12px_rgba(255,203,5,0.1)]"
                        : "bg-surface-alt border-border/40 hover:border-brand/40",
                    )}
                  >
                    <div className="absolute inset-0 bg-striped opacity-5 pointer-events-none" />
                    <div className="relative w-12 h-12 flex items-center justify-center mb-1 drop-shadow-md">
                      <PixelSprite pokemonId={p.id} variant="front" size={48} alt={p.name} />
                    </div>
                    <div className="relative flex flex-col items-center w-full z-10">
                      <span className="font-display text-[0.45rem] text-muted tracking-tighter">#{String(p.id).padStart(3, '0')}</span>
                      <span className="font-display text-[0.55rem] capitalize truncate w-full text-center text-white/90 group-hover:text-brand transition-colors font-bold">
                        {p.name}
                      </span>
                    </div>
                    {selectedPoke?.id === p.id && (
                      <div className="absolute top-1 right-1">
                        <Check size={8} className="text-brand" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── CUSTOMIZATION PANEL (Sidebar Style) ─────────────────────────── */}
          <div className="w-full md:w-80 bg-surface-alt border-l-4 border-border flex flex-col shrink-0 overflow-y-auto custom-scrollbar shadow-[-4px_0_12px_rgba(0,0,0,0.3)]">
            <div className="p-4 border-b border-border bg-black/20">
              <h3 className="font-display text-muted text-[0.65rem] tracking-[0.2em] uppercase">CONFIGURACIÓN DNA</h3>
            </div>

            <div className="p-5 flex flex-col gap-6 flex-1">
              {selectedPoke ? (
                <>
                  <div className="flex flex-col items-center gap-4 py-6 bg-black/40 border-2 border-border/40 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-striped opacity-10" />
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <div className="absolute inset-0 border-2 border-brand/20 animate-pulse rounded-full" />
                      <PixelSprite
                        pokemonId={selectedPoke.id}
                        variant="front"
                        shiny={isShiny}
                        size={96}
                        alt={selectedPoke.name}
                        className="relative z-10 drop-shadow-2xl brightness-110"
                      />
                      {isShiny && (
                        <Sparkles
                          className="absolute top-2 right-2 text-accent animate-spin-slow"
                          size={24}
                        />
                      )}
                    </div>
                    <div className="text-center relative z-10">
                      <h3 className="font-display text-xl text-brand uppercase tracking-tighter leading-none mb-1">
                        {selectedPoke.name}
                      </h3>
                      {selectedPokeData && (
                        <div className="flex gap-1.5 justify-center mt-2">
                          {selectedPokeData.types.map((type: string) => (
                            <span
                              key={type}
                              className={clsx(
                                "px-2 py-0.5 text-[0.45rem] font-bold uppercase tracking-widest border-2",
                                `type-bg-${type} border-black/40 text-white shadow-pixel-sm`,
                              )}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-5">
                    {/* Level */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="font-display text-[0.6rem] text-muted tracking-widest uppercase">Nivel de Potencia</span>
                        <span className="bg-brand text-black text-[0.65rem] font-bold font-display px-2 py-0.5 border-2 border-brand shadow-pixel-sm">
                          {level}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={level}
                        onChange={(e) => setLevel(parseInt(e.target.value))}
                        className="w-full accent-brand cursor-pointer h-1.5 bg-black/40 rounded-full appearance-none"
                      />
                    </div>

                    {/* Shiny */}
                    <button
                      onClick={() => setIsShiny(!isShiny)}
                      className={clsx(
                        "flex items-center justify-between px-4 py-3 border-2 transition-all group",
                        isShiny
                          ? "bg-accent/20 border-accent text-accent shadow-[0_0_12px_rgba(255,203,5,0.2)]"
                          : "bg-black/20 border-border text-muted hover:border-brand/40",
                      )}
                    >
                      <span className="font-display text-[0.6rem] tracking-widest uppercase">Codificación Shiny</span>
                      <Sparkles
                        size={16}
                        className={clsx(isShiny ? "animate-pulse" : "opacity-30")}
                        fill={isShiny ? "currentColor" : "none"}
                      />
                    </button>

                    {/* Nature */}
                    <div className="flex flex-col gap-2">
                      <label className="font-display text-[0.6rem] text-muted tracking-widest uppercase">Preajuste de Naturaleza</label>
                      <select
                        value={nature}
                        onChange={(e) => setNature(e.target.value)}
                        className="bg-black/40 border-2 border-border p-2.5 font-display text-[0.65rem] text-white focus:border-brand focus:outline-none capitalize cursor-pointer hover:border-brand/40"
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
                        "flex items-center justify-between px-4 py-3 border-2 transition-all",
                        perfectIVs
                          ? "bg-green-900/20 border-green-500 text-green-400"
                          : "bg-black/20 border-border text-muted",
                      )}
                    >
                      <span className="font-display text-[0.6rem] tracking-widest uppercase">Perfección Genética</span>
                      <div className={clsx(
                        "w-5 h-5 border-2 flex items-center justify-center transition-colors",
                        perfectIVs ? "border-green-500 bg-green-500/20" : "border-border bg-black/20"
                      )}>
                        {perfectIVs && <Check size={12} />}
                      </div>
                    </button>
                  </div>

                  <div className="mt-auto pt-6 flex flex-col gap-3">
                    <Button
                      variant="primary"
                      onClick={handleInjectToRun}
                      disabled={!run.isActive || injecting}
                      className="w-full h-14 tracking-[0.2em] font-bold text-[0.7rem] relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-brand/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {injecting ? "SECUENCIANDO..." : "INYECTAR DNA"}
                        <Zap size={14} />
                      </span>
                    </Button>
                    <button
                      onClick={handleUnlockAsStarter}
                      className="w-full py-3 border-2 border-brand/40 text-brand-light font-display text-[0.55rem] tracking-[0.3em] uppercase hover:bg-brand/10 hover:border-brand transition-all flex items-center justify-center gap-2"
                    >
                      CLONAR COMO INICIAL
                      <Star size={10} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center gap-6 opacity-30 py-20">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-dashed border-muted rounded-full animate-spin-slow" />
                    <Zap size={32} className="absolute inset-0 m-auto text-muted" />
                  </div>
                  <div>
                    <p className="font-display text-[0.65rem] text-muted tracking-widest uppercase mb-2">Esperando Muestra</p>
                    <p className="font-display text-[0.5rem] text-muted/60 tracking-tighter max-w-[180px]">
                      SELECCIONA UN EJEMPLAR DE LA BASE DE DATOS PARA INICIAR EL PROCESO DE CLONACIÓN
                    </p>
                  </div>
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
