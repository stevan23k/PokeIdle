import React from 'react';
import type { ActivePokemon } from '../types/game.types';
import { TypeBadge } from '../../../components/ui/TypeBadge';
import { useGame } from '../../../context/GameContext';
import { clsx } from "clsx";

interface Props {
  pokemon: ActivePokemon;
}

export function MoveManager({ pokemon }: Props) {
  const { setRun } = useGame();

  const toggleMove = (moveId: number) => {
    setRun(prev => ({
      ...prev,
      team: prev.team.map(p => {
        if (p.uid !== pokemon.uid) return p;
        return {
          ...p,
          moves: p.moves.map(m => m.moveId === moveId ? { ...m, enabled: !m.enabled } : m)
        };
      })
    }));
  };

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      <h4 className="text-[0.6rem] font-display text-muted uppercase">Movimientos</h4>
      <div className="grid grid-cols-1 gap-1.5">
        {pokemon.moves.map((move: any) => (
          <button
            key={move.moveId}
            onClick={(e) => { e.stopPropagation(); toggleMove(move.moveId); }}
            className={clsx(
              "flex items-center justify-between p-1.5 border transition-colors text-left",
              move.enabled 
                ? "bg-surface-alt border-border hover:border-muted" 
                : "bg-surface-dark border-transparent opacity-50 grayscale hover:opacity-80"
            )}
            title={move.enabled ? "Desactivar movimiento" : "Activar movimiento"}
          >
            <div className="flex flex-col gap-0.5 max-w-[70%]">
              <span className="font-display text-[0.55rem] text-foreground truncate">{move.moveName}</span>
              <div className="flex items-center gap-1.5">
                <TypeBadge type={move.type} className="scale-[0.8] origin-left" />
                <span className="text-[0.6rem] font-body text-muted flex-shrink-0">PP: {move.currentPP}</span>
              </div>
            </div>
            <div className="text-[0.6rem] font-body text-muted flex-shrink-0 text-right">
              {move.power > 0 ? `PDR: ${move.power}` : 'ESTADO'}
            </div>
          </button>
        ))}
        {pokemon.moves.length === 0 && (
          <div className="text-xs text-muted font-body italic">Sin movimientos</div>
        )}
      </div>
    </div>
  );
}
