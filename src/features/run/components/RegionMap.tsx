import React from 'react';
import { useGame } from '../../../context/GameContext';
import { REGIONS } from '../../../lib/regions';
import type { Zone } from '../../../lib/regions';
import { clsx } from 'clsx';
import { Trophy, CircleDashed, CheckCircle2, ChevronRight, Medal } from 'lucide-react';

interface RegionMapProps {
  zones: Zone[];
}

export function RegionMap({ zones }: RegionMapProps) {
  const { run } = useGame();

  if (!run.isActive) return null;

  const regionBase = REGIONS[run.currentRegion];
  if (!regionBase) return null;

  const region = { ...regionBase, zones };

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
          const isGym = zone.isGym;

          return (
            <div key={zone.id} className="flex items-center gap-3 py-2 z-10">
              <div className="bg-surface-alt rounded-full">
                {isCompleted ? <CheckCircle2 size={24} className={clsx("fill-surface", isGym ? "text-accent" : "text-success")} /> :
                 isCurrent   ? <ChevronRight size={24} className={clsx("bg-surface-alt animate-pulse", isGym ? "text-accent" : "text-brand")} /> :
                               isGym ? <Medal size={24} className="text-muted/50 bg-surface-alt" /> : <CircleDashed size={24} className="text-muted bg-surface-alt" />}
              </div>
              <div className={clsx(
                "flex flex-col font-display text-[0.55rem]", 
                isLocked ? "text-muted" : (isGym ? "text-accent" : "text-foreground")
              )}>
                <span className="flex items-center gap-1">
                  {zone.name}
                  {isGym && <span className="text-[0.5rem] p-0.5 bg-accent/20 border border-accent/30 text-accent rounded px-1">GYM</span>}
                </span>
                {isCurrent && <span className={clsx(
                  "text-[0.45rem] mt-1 tracking-wider border px-1 py-0.5 self-start",
                  isGym ? "bg-accent/10 border-accent/50 text-accent" : "bg-brand/10 border-brand/50 text-brand"
                )}>EXPLORANDO {Math.floor(run.currentZoneProgress)}%</span>}
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
