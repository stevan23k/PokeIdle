import React from 'react';
import { useGame } from '../../../context/GameContext';
import { PokemonCard } from './PokemonCard';

export function TeamRoster() {
  const { run } = useGame();
  
  if (!run.isActive) return null;

  return (
    <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto min-h-0">
      <div className="flex justify-between items-end mb-2 border-b-2 border-border pb-2">
        <h2 className="font-display text-brand text-[0.65rem] tracking-wider">MI EQUIPO</h2>
        <span className="font-body text-muted text-xs font-bold">{run.team.length}/6</span>
      </div>
      
      <div className="flex flex-col gap-3">
        {run.team.map(pokemon => {
          const isActive = run.currentBattle?.playerPokemon?.uid === pokemon.uid;
          return (
            <PokemonCard 
              key={pokemon.uid} 
              pokemon={pokemon} 
              isActive={isActive} 
            />
          );
        })}
        
        {run.team.length === 0 && (
          <div className="text-center p-6 border-2 border-dashed border-border text-muted font-body text-xs bg-surface-alt">
            No tienes Pokémon en tu equipo.
          </div>
        )}
      </div>
    </div>
  );
}
