import React from "react";
import { useGame } from "../../../context/GameContext";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { HPBar } from "../../../components/ui/HPBar";
import { TypeBadge } from "../../../components/ui/TypeBadge";
import type { ActivePokemon } from "../types/game.types";
import { clsx } from "clsx";

interface Props {
  onSelect: (pokemon: ActivePokemon) => void;
}

export function SwitchPokemonModal({ onSelect }: Props) {
  const { run } = useGame();

  // Filter for living pokemon that are NOT the current one (which is fainted)
  const availablePokemon = run.team.filter(
    (p) => p.currentHP > 0 && p.uid !== run.currentBattle?.playerPokemon.uid,
  );

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface-dark border-4 border-brand-deep w-full max-w-md flex flex-col shadow-2xl">
        <div className="bg-brand-deep p-3 border-b-2 border-brand">
          <h2 className="font-display text-white text-xs tracking-[0.2em] uppercase text-center">
            ¡Pokémon debilitado! Elige un reemplazo
          </h2>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {availablePokemon.length > 0 ? (
            availablePokemon.map((pokemon) => (
              <button
                key={pokemon.uid}
                onClick={() => onSelect(pokemon)}
                className="flex items-center gap-3 p-2 bg-surface border-2 border-border hover:border-brand-light hover:bg-surface-light transition-all group active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-surface-dark border border-border flex items-center justify-center shrink-0">
                  <PixelSprite
                    pokemonId={pokemon.pokemonId}
                    variant="front"
                    shiny={pokemon.isShiny}
                    size={40}
                    alt={pokemon.name}
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex justify-between items-end">
                    <span className="font-display text-[0.65rem] text-white truncate uppercase">
                      {pokemon.name}
                    </span>
                    <span className="font-body text-[0.6rem] text-brand-light font-bold">
                      Nv.{pokemon.level}
                    </span>
                  </div>
                  <HPBar
                    currentHP={pokemon.currentHP}
                    maxHP={pokemon.maxHP}
                    showText={false}
                    size="sm"
                  />
                  <div className="flex gap-1">
                    {pokemon.types.map((t) => (
                      <TypeBadge key={t} type={t as any} />
                    ))}
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                  <span className="text-brand-light animate-pulse text-xs">
                    ▶
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="font-display text-danger text-[0.7rem] uppercase tracking-wider mb-2">
                No quedan Pokémon disponibles
              </p>
              <p className="font-body text-muted text-[0.6rem]">
                Tu equipo ha sido derrotado...
              </p>
            </div>
          )}
        </div>

        <div className="p-3 bg-surface border-t-2 border-border flex justify-center">
          <p className="font-body text-[0.55rem] text-muted italic">
            Selecciona un Pokémon para continuar la batalla
          </p>
        </div>
      </div>
    </div>
  );
}
