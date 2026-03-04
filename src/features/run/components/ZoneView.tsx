import React from "react";
import { useGame } from "../../../context/GameContext";
import { REGIONS } from "../../../lib/regions";
import { LootTablePopover } from "./LootTablePopover";
import { PixelSprite } from "../../../components/ui/PixelSprite";

export function ZoneView() {
  const { run, setRun } = useGame();

  if (!run.isActive || !run.currentRegion) return null;

  const region = REGIONS[run.currentRegion];
  if (!region) return null;

  const currentZone = region.zones[run.currentZoneIndex];
  if (!currentZone) return null;

  const requiredBattles = currentZone.trainerCount;
  const progressPercent = Math.min(
    100,
    ((run.zoneBattlesWon || 0) / requiredBattles) * 100,
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-surface-dark p-3 border-b-2 border-border flex justify-between items-center shadow-pixel">
        <h2 className="font-display text-accent-blue text-sm uppercase drop-shadow-sm whitespace-nowrap overflow-hidden text-ellipsis mr-2 min-w-0">
          {currentZone.name}
        </h2>
        <span className="font-display text-[0.6rem] text-muted tracking-widest whitespace-nowrap shrink-0">
          ZONA {run.currentZoneIndex + 1}
        </span>
      </div>

      <div className="p-3 bg-surface flex-1 flex flex-col overflow-y-auto">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-2 bg-surface-dark border border-border inline-block relative">
            <div
              className="h-full bg-accent-blue transition-all"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <span className="font-body text-[0.55rem] text-muted whitespace-nowrap">
            {run.zoneBattlesWon || 0} / {requiredBattles} BATALLAS
          </span>
        </div>

        <div className="flex justify-between items-end mb-4">
          <p className="font-body text-[0.65rem] text-muted italic leading-relaxed">
            "{currentZone.description}"
          </p>
          <LootTablePopover />
        </div>

        {/* Settings / Toggles */}
        <div className="flex justify-between items-center bg-surface-dark p-2 border border-border mb-2">
          <span className="font-display text-[0.55rem] text-muted tracking-widest">
            AVISTAMIENTOS SALVAJES
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {currentZone.wildPokemon.map((wp) => {
            const isCaught =
              run.team.some((p: any) => p.pokemonId === wp.pokemonId) ||
              run.pc.some((p: any) => p.pokemonId === wp.pokemonId);
            return (
              <div
                key={wp.pokemonId}
                className={`flex justify-center items-center p-1 border ${isCaught ? "border-brand/30 bg-surface-alt" : "border-border/50 bg-surface-dark opacity-50"} relative group`}
              >
                <PixelSprite
                  pokemonId={wp.pokemonId}
                  variant="front"
                  size={40}
                  showScanlines={false}
                  alt="Pokemon"
                  className={isCaught ? "" : "brightness-0"}
                />
                {!isCaught && (
                  <span className="absolute text-[0.45rem] font-display text-muted bottom-0 tracking-tighter">
                    ???
                  </span>
                )}
                <div
                  className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 bg-surface-dark border border-border p-1 text-[0.5rem] font-display text-white z-10 whitespace-nowrap max-w-[150px] text-center"
                  style={{ wordWrap: "break-word", whiteSpace: "normal" }}
                >
                  Nv. {wp.minLevel}-{wp.maxLevel} ({wp.weight}%)
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-dashed border-border pt-3">
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="font-body text-xs text-muted group-hover:text-foreground transition-colors uppercase">
                Auto Captura
              </span>
              <input
                type="checkbox"
                checked={run.autoCapture}
                onChange={(e) =>
                  setRun((p) => ({ ...p, autoCapture: e.target.checked }))
                }
                className="accent-brand"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="font-body text-xs text-muted group-hover:text-foreground transition-colors uppercase">
                Batalla Manual
              </span>
              <input
                type="checkbox"
                checked={run.isManualBattle}
                onChange={(e) =>
                  setRun((p) => ({ ...p, isManualBattle: e.target.checked }))
                }
                className="accent-brand"
              />
            </label>
          </div>
        </div>
        <div className="font-body text-[0.55rem] text-muted text-right mt-1">
          Tienes {run.items["poke-ball"] || 0} Poké Balls,{" "}
          {run.items["great-ball"] || 0} Super Balls
        </div>
      </div>
    </div>
  );
}
