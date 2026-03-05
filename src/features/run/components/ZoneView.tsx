import React, { useState } from "react";
import { useGame } from "../../../context/GameContext";
import { REGIONS } from "../../../lib/regions";
import { LootTablePopover } from "./LootTablePopover";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { MapModal } from "./MapModal";

export function ZoneView() {
  const { run, setRun } = useGame();
  const [isMapOpen, setIsMapOpen] = useState(false);

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
        <span className="font-display text-[0.6rem] text-white tracking-widest whitespace-nowrap shrink-0">
          ZONA {run.currentZoneIndex + 1}
        </span>
      </div>

      {/* Roadmap visual */}
      <div className="bg-surface p-2 py-3 border-b border-border flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setIsMapOpen(true)}
          className="shrink-0 p-1 bg-surface-alt border-2 border-border hover:border-brand hover:bg-surface-light transition-all group relative focus:outline-none shadow-[2px_2px_0_rgba(0,0,0,0.1)] active:translate-x-0.5 active:translate-y-0.5"
          title="Ver Mapa"
        >
          <img
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/town-map.png"
            alt="Map Sprite"
            className="w-8 h-8 rendering-pixelated filter group-hover:drop-shadow-[0_0_4px_rgba(255,206,49,0.5)]"
          />
        </button>
        <div className="flex-1 flex items-center justify-between gap-1">
          {region.zones.map((z, idx) => {
            const isCurrent = idx === run.currentZoneIndex;
            const isPast = idx < run.currentZoneIndex;
            return (
              <React.Fragment key={z.id}>
                <div
                  className={`w-5 h-5 md:w-6 md:h-6 shrink-0 border-2 flex items-center justify-center font-display text-[0.45rem] ${isCurrent ? "bg-brand border-brand-deep text-white shadow-[0_0_5px_rgba(255,0,0,0.5)]" : isPast ? "bg-accent border-accent text-black" : "bg-surface-dark border-border text-white"}`}
                  title={`${z.name} - ${z.trainerCount} batallas`}
                >
                  {idx + 1}
                </div>
                {idx < region.zones.length - 1 && (
                  <div
                    className={`h-1 flex-1 min-w-[8px] md:min-w-[12px] ${isPast ? "bg-accent" : "bg-border"}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="p-3 bg-surface flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-3 bg-surface-dark border-2 border-border inline-block relative overflow-hidden shadow-inner">
            <div
              className={`h-full bg-accent-blue transition-all shadow-[0_0_8px_rgba(74,144,217,0.4)] ${progressPercent === 100 ? "bg-success shadow-[0_0_8px_rgba(120,200,80,0.4)]" : ""}`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <span className="font-display text-[0.55rem] text-white tracking-tighter whitespace-nowrap">
            {run.zoneBattlesWon || 0} / {requiredBattles} BATALLAS
          </span>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <p className="font-body text-[0.65rem] text-white italic leading-relaxed">
            "{currentZone.description}"
          </p>
          <div className="w-full">
            <LootTablePopover />
          </div>
        </div>

        {/* Wild Sightings */}
        <div className="flex justify-between items-center bg-surface-dark p-2 border border-border mb-2">
          <span className="font-display text-[0.55rem] text-white tracking-widest">
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
                className={`flex justify-center items-center p-1 border ${isCaught ? "border-brand/30 bg-surface-alt" : "border-border/50 bg-surface-dark opacity-50"} relative group cursor-help`}
              >
                <PixelSprite
                  pokemonId={wp.pokemonId}
                  variant="front"
                  size={40}
                  showScanlines={false}
                  alt="Pokemon"
                  className={isCaught ? "" : "brightness-0"}
                />
                <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 bg-surface-dark border border-border p-1 text-[0.5rem] font-display text-white z-10 whitespace-nowrap text-center shadow-pixel">
                  {isCaught ? wp.pokemonId : "???"}
                  <div className="text-[0.4rem] text-white">
                    Nv. {wp.minLevel}-{wp.maxLevel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-dashed border-border pt-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between group">
              <span className="font-display text-[0.55rem] text-white tracking-widest uppercase">
                Auto-Curación
              </span>
              <button
                onClick={() =>
                  setRun((p) => ({ ...p, autoItems: !p.autoItems }))
                }
                className={`px-3 py-1 font-display text-[0.55rem] border-2 transition-colors ${run.autoItems ? "bg-success/20 text-success border-success" : "bg-surface-dark text-white border-border hover:border-muted"}`}
              >
                {run.autoItems ? "ON" : "OFF"}
              </button>
            </div>
            <div className="flex items-center justify-between group">
              <span className="font-display text-[0.55rem] text-white tracking-widest uppercase">
                Auto Captura
              </span>
              <button
                onClick={() =>
                  setRun((p) => ({ ...p, autoCapture: !p.autoCapture }))
                }
                className={`px-3 py-1 font-display text-[0.55rem] border-2 transition-colors ${run.autoCapture ? "bg-success/20 text-success border-success" : "bg-surface-dark text-white border-border hover:border-muted"}`}
              >
                {run.autoCapture ? "ON" : "OFF"}
              </button>
            </div>
            <div className="flex items-center justify-between group">
              <span className="font-display text-[0.55rem] text-white tracking-widest uppercase">
                Batalla Manual
              </span>
              <button
                onClick={() =>
                  setRun((p) => ({ ...p, isManualBattle: !p.isManualBattle }))
                }
                className={`px-3 py-1 font-display text-[0.55rem] border-2 transition-colors ${run.isManualBattle ? "bg-brand/20 text-brand border-brand" : "bg-surface-dark text-white border-border hover:border-muted"}`}
              >
                {run.isManualBattle ? "ON" : "OFF"}
              </button>
            </div>
            <div className="flex items-center justify-between group">
              <span className="font-display text-[0.55rem] text-white tracking-widest uppercase">
                Auto Recompensa
              </span>
              <button
                onClick={() => setRun((p) => ({ ...p, autoLoot: !p.autoLoot }))}
                className={`px-3 py-1 font-display text-[0.55rem] border-2 transition-colors ${run.autoLoot ? "bg-success/20 text-success border-success" : "bg-surface-dark text-white border-border hover:border-muted"}`}
              >
                {run.autoLoot ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isMapOpen && <MapModal onClose={() => setIsMapOpen(false)} />}
    </div>
  );
}
