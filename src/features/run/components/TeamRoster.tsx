import React from "react";
import { useGame } from "../../../context/GameContext";
import { PokemonCard } from "./PokemonCard";

export function TeamRoster() {
  const { run } = useGame();

  if (!run.isActive) return null;

  return (
    <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto min-h-0">
      <div className="flex justify-evenly items-center mb-2 border-b-2 border-border pb-2 w-full gap-2">
        <h2 className="font-display text-brand text-[0.65rem] tracking-wider shrink-0">
          MI EQUIPO
        </h2>
        
        <button
          onClick={() => (window as any).openBag?.()}
          className="flex items-center gap-2 shrink-0 p-1 px-3 bg-surface-alt border-2 border-border hover:border-brand hover:bg-surface-light transition-all group relative focus:outline-none shadow-[2px_2px_0_rgba(0,0,0,0.1)] active:translate-x-0.5 active:translate-y-0.5"
          title="Abrir Inventario"
        >
          <img
            src="/sprites/Bag.png"
            onError={(e) => { e.currentTarget.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" }}
            alt="Bag Sprite"
            className="w-6 h-6 md:w-8 md:h-8 rendering-pixelated filter group-hover:drop-shadow-[0_0_4px_rgba(255,0,0,0.5)]"
          />
          <span className="font-display text-[0.55rem] md:text-xs text-brand uppercase tracking-widest mt-0.5">
            Inventario
          </span>
        </button>

        <span className="font-body text-muted text-xs font-bold shrink-0 ml-auto hidden sm:block">
          {run.team.length}/6
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {run.team.map((pokemon) => {
          const isActive =
            run.currentBattle?.playerPokemon?.uid === pokemon.uid;
          return (
            <PokemonCard
              key={pokemon.uid}
              pokemon={pokemon}
              isActive={isActive}
            />
          );
        })}

        {run.team.length < 6 && run.team.length > 0 && (
          <div className="mt-2 p-2 border border-dashed border-border/40 rounded-sm">
            <p className="font-body text-[0.6rem] text-muted italic text-center leading-tight">
              Captura Pokémon en batalla para completar tu equipo
            </p>
          </div>
        )}

        {run.team.length === 0 && (
          <div className="text-center p-6 border-2 border-dashed border-border text-muted font-body text-xs bg-surface-alt">
            No tienes Pokémon en tu equipo.
          </div>
        )}
      </div>
    </div>
  );
}
