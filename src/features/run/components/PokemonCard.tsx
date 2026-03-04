import React, { useState } from "react";
import { useGame } from "../../../context/GameContext";
import type { ActivePokemon } from "../types/game.types";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { HPBar } from "../../../components/ui/HPBar";
import { XPBar } from "../../../components/ui/XPBar";
import { TypeBadge } from "../../../components/ui/TypeBadge";
import { MoveManager } from "./MoveManager";
import { clsx } from "clsx";

interface Props {
  pokemon: ActivePokemon;
  isActive: boolean;
  onMoveToPC?: () => void;
}

export function PokemonCard({ pokemon, isActive, onMoveToPC }: Props) {
  const { run, setRun } = useGame();
  const [expanded, setExpanded] = useState(false);

  const handleSwitch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      pokemon.currentHP > 0 &&
      run.isManualBattle &&
      run.currentBattle?.phase === "active"
    ) {
      setRun((prev) => ({
        ...prev,
        currentBattle: {
          ...prev.currentBattle!,
          manualActionQueue: { type: "switch", id: pokemon.uid },
        },
      }));
    }
  };

  return (
    <div
      className={clsx(
        "border-2 transition-colors",
        isActive ? "bg-surface-alt border-brand" : "bg-surface border-border",
        pokemon.currentHP === 0 && "opacity-60 grayscale-[0.5]",
        run.isManualBattle &&
          run.currentBattle?.phase === "active" &&
          !isActive &&
          pokemon.currentHP > 0 &&
          "cursor-pointer hover:border-brand-dark",
      )}
      onClick={() => {
        // In manual battle, clicking the card directly can also act as a switch
        if (
          run.isManualBattle &&
          run.currentBattle?.phase === "active" &&
          !isActive &&
          pokemon.currentHP > 0
        ) {
          setRun((prev) => ({
            ...prev,
            currentBattle: {
              ...prev.currentBattle!,
              manualActionQueue: { type: "switch", id: pokemon.uid },
            },
          }));
        }
      }}
    >
      <div
        className="p-2 flex items-center gap-3 cursor-pointer hover:bg-surface-light"
        onClick={(e) => {
          // Prevent expanding if we are in manual battle and clicked to switch
          if (
            run.isManualBattle &&
            run.currentBattle?.phase === "active" &&
            !isActive
          )
            return;
          setExpanded(!expanded);
        }}
        role="button"
        aria-expanded={expanded}
      >
        <div className="w-12 h-12 bg-surface-dark border border-border flex items-center justify-center relative shrink-0">
          <PixelSprite
            pokemonId={pokemon.pokemonId}
            variant="front"
            shiny={pokemon.isShiny}
            size={40}
            showScanlines={false}
            alt={pokemon.name}
          />
          {pokemon.isShiny && (
            <span className="absolute -top-1 -right-1 text-xs select-none">
              ✨
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-end mb-1">
            <h3
              className="font-display text-[0.6rem] truncate"
              title={pokemon.name}
            >
              {pokemon.name}
            </h3>
            <span className="text-muted text-[0.65rem] font-body">
              Nv.{pokemon.level}
            </span>
          </div>
          <HPBar
            currentHP={pokemon.currentHP}
            maxHP={pokemon.maxHP}
            showText={false}
          />
          <XPBar
            currentXP={pokemon.xp}
            nextLevelXP={pokemon.xpToNext}
            prevLevelXP={Math.pow(pokemon.level, 3)}
          />
        </div>

        <div className="flex flex-col gap-1 items-end w-[40px] shrink-0">
          {pokemon.status && (
            <span className="text-[0.55rem] font-display text-white bg-danger px-1 rounded-sm">
              {pokemon.status}
            </span>
          )}
          {isActive && (
            <span className="text-[0.45rem] font-display text-brand border border-brand bg-brand/10 px-1 py-0.5">
              ACTIVO
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-3 border-t-2 border-border bg-surface-dark flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex gap-1.5 flex-wrap">
            {pokemon.types.map((t: string) => (
              <TypeBadge key={t} type={t as any} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.65rem] font-body text-muted">
            <div className="flex justify-between">
              <span>PS</span>
              <span className="text-foreground">{pokemon.stats.hp}</span>
            </div>
            <div className="flex justify-between">
              <span>ATQ</span>
              <span className="text-foreground">{pokemon.stats.attack}</span>
            </div>
            <div className="flex justify-between">
              <span>DEF</span>
              <span className="text-foreground">{pokemon.stats.defense}</span>
            </div>
            <div className="flex justify-between">
              <span>ATQ.E</span>
              <span className="text-foreground">{pokemon.stats.spAtk}</span>
            </div>
            <div className="flex justify-between">
              <span>DEF.E</span>
              <span className="text-foreground">{pokemon.stats.spDef}</span>
            </div>
            <div className="flex justify-between">
              <span>VEL</span>
              <span className="text-foreground">{pokemon.stats.speed}</span>
            </div>
          </div>

          <MoveManager pokemon={pokemon} />

          {run.isManualBattle &&
            run.currentBattle?.phase === "active" &&
            !isActive &&
            pokemon.currentHP > 0 && (
              <button
                onClick={handleSwitch}
                className="mt-1 w-full py-1.5 bg-brand border border-brand-deep text-[0.6rem] text-white hover:bg-brand-dark transition-colors font-display tracking-wider uppercase flex items-center justify-center gap-2"
              >
                <span className="animate-pulse">▶</span> CAMBIAR A{" "}
                {pokemon.name} <span className="animate-pulse">◀</span>
              </button>
            )}

          {onMoveToPC && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveToPC();
              }}
              className="mt-1 w-full py-1.5 bg-surface border border-border text-[0.6rem] text-muted hover:text-white hover:border-muted transition-colors font-display tracking-wider uppercase"
            >
              Mover al PC
            </button>
          )}
        </div>
      )}
    </div>
  );
}
