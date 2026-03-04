import React from "react";
import { useGame } from "../../../context/GameContext";
import { REGIONS } from "../../../lib/regions";
import { ITEMS } from "../../../lib/items";
import { ItemSprite } from "../../../components/ui/ItemSprite";

export function LootTablePopover() {
  const { run } = useGame();

  if (!run.isActive || !run.currentRegion) return null;

  const region = REGIONS[run.currentRegion];
  if (!region) return null;

  const zone = region.zones[run.currentZoneIndex];
  if (!zone) return null;

  return (
    <div className="group relative inline-block mt-2">
      <button className="text-xs font-display text-muted underline cursor-help">
        [VER LOOT DE ZONA]
      </button>
      <div className="absolute right-0 top-full mt-2 w-48 bg-surface-dark border-2 border-border p-2 hidden group-hover:block z-50 shadow-pixel before:content-[''] before:absolute before:border-8 before:border-transparent before:border-b-border before:-top-4 before:right-4">
        <h4 className="text-[0.6rem] font-display text-accent-blue mb-2">
          POSIBLES RECOMPENSAS
        </h4>
        {zone.itemDrops.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {zone.itemDrops.map((drop, i) => {
              const item = ITEMS[drop.itemId];
              if (!item) return null;
              return (
                <li
                  key={i}
                  className="flex justify-between items-center text-[0.65rem] font-body text-foreground"
                >
                  <span className="flex items-center gap-1">
                    <ItemSprite item={item} size={16} />
                    <span>{item.name}</span>
                  </span>
                  <span className="text-muted">
                    {Math.round(drop.chance * 100)}%
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[0.6rem] text-muted italic">No hay drops aquí.</p>
        )}
      </div>
    </div>
  );
}
