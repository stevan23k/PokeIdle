import React from "react";
import { useGame } from "../../../context/GameContext";
import { PixelSprite } from "../../../components/ui/PixelSprite";

export function CaptureLog() {
  const { run } = useGame();

  if (!run.isActive) return null;

  const recentCaptures = [...run.pc].reverse().slice(0, 10);

  return (
    <div className="flex flex-col p-3 border-b-2 border-border bg-surface-dark mb-2 min-h-[150px]">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-display text-muted text-[0.6rem] tracking-widest">
          CAPTURAS RECIENTES
        </h2>
        <span className="font-body text-[0.6rem] text-brand font-bold bg-brand/10 border border-brand/50 px-1 py-0.5">
          {run.totalCaptured}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[200px] pr-1 scroll-smooth">
        {recentCaptures.length === 0 ? (
          <div className="text-center font-body text-[0.6rem] text-muted/60 italic p-4">
            Aún no hay capturas.
          </div>
        ) : (
          recentCaptures.map((p) => (
            <div
              key={p.uid}
              className="flex items-center gap-3 p-1.5 border-2 border-border bg-surface hover:border-muted/50 transition-colors"
            >
              <div className="w-10 h-10 bg-surface-alt border border-border flex items-center justify-center flex-shrink-0 relative">
                <PixelSprite
                  pokemonId={p.pokemonId}
                  variant="front"
                  shiny={p.isShiny}
                  size={40}
                  showScanlines={false}
                  alt={p.name}
                  className="drop-shadow-sm"
                />
                {p.isShiny && (
                  <span className="absolute -top-1 -right-1 text-[0.5rem] select-none">
                    ✨
                  </span>
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                <span className="font-display text-[0.5rem] tracking-wider truncate text-foreground">
                  {p.name}
                </span>
                <span className="font-body text-[0.55rem] text-muted font-bold truncate">
                  Nv.{p.caughtLevel} · {p.caughtAt}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
