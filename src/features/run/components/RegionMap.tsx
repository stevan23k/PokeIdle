import React, { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import { REGIONS } from '../../../lib/regions';
import { clsx } from 'clsx';
import { Trophy, CircleDashed, CheckCircle2, ChevronRight } from 'lucide-react';

export function RegionMap() {
  const { run } = useGame();

  if (!run.isActive) return null;

  const region = REGIONS[run.currentRegion];
  if (!region) return null;

  return (
    <div className="flex flex-col p-3 border-b-2 border-border mb-2 bg-surface-alt shadow-inner">
      <h2 className="font-display text-brand text-[0.65rem] uppercase mb-4 tracking-wider">
        REGIÓN {region.name}
      </h2>

      <div className="flex flex-col relative before:absolute before:inset-y-2 before:left-[11px] before:w-0.5 before:bg-border before:-z-0">
        
        {region.zones.map((zone, index) => {
          const isCompleted = index < run.currentZoneIndex;
          const isCurrent = index === run.currentZoneIndex;
          const isLocked = index > run.currentZoneIndex;

          return (
            <div key={zone.id} className="flex items-center gap-3 py-2 z-10">
              <div className="bg-surface-alt rounded-full">
                {isCompleted ? <CheckCircle2 size={24} className="text-success fill-surface" /> :
                 isCurrent   ? <ChevronRight size={24} className="text-brand animate-pulse bg-surface-alt" /> :
                               <CircleDashed size={24} className="text-muted bg-surface-alt" />}
              </div>
              <div className={clsx("flex flex-col font-display text-[0.55rem]", isLocked ? "text-muted" : "text-foreground")}>
                <span>{zone.name}</span>
                {isCurrent && <span className="text-brand text-[0.45rem] mt-1 tracking-wider bg-brand/10 border border-brand/50 px-1 py-0.5 self-start">EXPLORANDO {Math.floor(run.currentZoneProgress)}%</span>}
              </div>
            </div>
          );
        })}

        {region.eliteFour && (
          <div className="flex items-center gap-3 py-3 mt-2 pt-4 border-t-2 border-dashed border-border z-10 bg-surface-alt">
            <div className="bg-surface-alt rounded-full border-2 border-accent p-1 shadow-[0_0_10px_rgba(255,215,0,0.2)]">
               <Trophy size={16} className="text-accent" />
            </div>
            <div className="flex flex-col font-display text-[0.6rem]">
              <span className="text-accent tracking-wider drop-shadow-[0_0_5px_rgba(255,215,0,0.3)]">LIGA POKÉMON</span>
              <span className="text-[0.45rem] mt-1 text-muted">
                {run.eliteFourDefeated ? "COMPLETADO" : (run.gymsBadges.length >= 8 ? "DESBLOQUEADO" : `REQUIERE 8 MEDALLAS (${run.gymsBadges.length}/8)`)}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
