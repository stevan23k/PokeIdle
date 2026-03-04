import React, { useState } from "react";
import { useGame } from "../../../context/GameContext";
import type { ActivePokemon } from "../types/game.types";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { HPBar } from "../../../components/ui/HPBar";
import { XPBar } from "../../../components/ui/XPBar";
import { TypeBadge } from "../../../components/ui/TypeBadge";
import { MoveManager } from "./MoveManager";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { ItemSprite } from "../../../components/ui/ItemSprite/ItemSprite";
import { ITEMS } from "../../../lib/items";
import { unequipItem } from "../../../engine/heldItems.engine";
import { clsx } from "clsx";

interface Props {
  pokemon: ActivePokemon;
  isActive: boolean;
  onMoveToPC?: () => void;
}

export function PokemonCard({ pokemon, isActive, onMoveToPC }: Props) {
  const { run, setRun } = useGame();
  const [expanded, setExpanded] = useState(false);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [showUnequipPopover, setShowUnequipPopover] = useState(false);

  const handleSwitchRequest = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      pokemon.currentHP > 0 &&
      run.currentBattle?.phase === "active" &&
      !isActive
    ) {
      setShowSwitchConfirm(true);
    }
  };

  const confirmSwitch = () => {
    setRun((prev) => {
      if (!prev.currentBattle) return prev;

      // If manual battle, use the queue system
      if (prev.isManualBattle) {
        return {
          ...prev,
          currentBattle: {
            ...prev.currentBattle,
            manualActionQueue: { type: "switch", id: pokemon.uid },
          },
        };
      }

      // If auto battle, perform the switch immediately
      const newBattleLog = [
        ...prev.battleLog,
        {
          id: Date.now().toString(),
          text: `¡Adelante ${pokemon.name}!`,
          type: "normal" as const,
        },
      ].slice(-40);

      return {
        ...prev,
        currentBattle: {
          ...prev.currentBattle,
          playerPokemon: pokemon,
        },
        battleLog: newBattleLog,
      };
    });
    setShowSwitchConfirm(false);
  };

  const handleRelease = () => {
    setRun((prev) => {
      // Don't allow releasing the last pokemon if in battle, etc.
      // But let's just remove it from the team for now
      return {
        ...prev,
        team: prev.team.filter((p) => p.uid !== pokemon.uid),
      };
    });
    setShowReleaseConfirm(false);
  };

  return (
    <div
      className={clsx(
        "border-2 transition-colors",
        isActive ? "bg-surface-alt border-brand" : "bg-surface border-border",
        pokemon.currentHP === 0 && "opacity-60 grayscale-[0.5]",
      )}
    >
      <div
        className="p-2 flex items-center gap-3 cursor-pointer hover:bg-surface-light"
        onClick={(e) => {
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

          {/* Held Item */}
          <div className="flex items-center gap-2 border-t border-border pt-2 relative">
            <span className="font-display text-[0.5rem] text-muted tracking-wider">
              OBJETO:
            </span>
            {pokemon.heldItem && ITEMS[pokemon.heldItem] ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUnequipPopover(!showUnequipPopover);
                }}
                className="flex items-center gap-1.5 bg-surface border border-border px-2 py-1 hover:border-brand transition-colors"
              >
                <ItemSprite item={ITEMS[pokemon.heldItem]} size={16} />
                <span className="font-body text-[0.6rem] text-foreground">
                  {ITEMS[pokemon.heldItem].name}
                </span>
              </button>
            ) : (
              <span className="font-body text-[0.55rem] text-muted italic">
                Sin objeto equipado
              </span>
            )}
            {showUnequipPopover && pokemon.heldItem && (
              <div className="absolute left-0 bottom-full mb-1 bg-surface-dark border-2 border-border p-2 shadow-pixel z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const { success, newPokemon, newInventory } = unequipItem(
                      pokemon,
                      run.items,
                    );
                    if (success) {
                      setRun((prev) => ({
                        ...prev,
                        items: newInventory,
                        team: prev.team.map((p) =>
                          p.uid === pokemon.uid ? newPokemon : p,
                        ),
                        currentBattle:
                          prev.currentBattle?.playerPokemon?.uid === pokemon.uid
                            ? {
                                ...prev.currentBattle,
                                playerPokemon: newPokemon,
                              }
                            : prev.currentBattle,
                      }));
                    }
                    setShowUnequipPopover(false);
                  }}
                  className="font-display text-[0.5rem] text-danger hover:text-white hover:bg-danger/50 px-3 py-1 border border-danger transition-colors tracking-wider"
                >
                  DESEQUIPAR
                </button>
              </div>
            )}
          </div>

          {run.currentBattle?.phase === "active" &&
            !isActive &&
            pokemon.currentHP > 0 && (
              <button
                onClick={handleSwitchRequest}
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

          {!isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowReleaseConfirm(true);
              }}
              className="mt-1 w-full py-1.5 bg-danger/20 border border-danger text-[0.6rem] text-danger hover:bg-danger hover:text-white transition-colors font-display tracking-wider uppercase"
            >
              Liberar
            </button>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={showReleaseConfirm}
        onClose={() => setShowReleaseConfirm(false)}
        title={`¿Liberar a ${pokemon.name}?`}
        message={`Una vez liberado, ${pokemon.name} se irá para siempre. Esta acción no se puede deshacer.`}
        confirmText="Liberar"
        cancelText="Cancelar"
        onConfirm={handleRelease}
      />

      <ConfirmModal
        isOpen={showSwitchConfirm}
        onClose={() => setShowSwitchConfirm(false)}
        title={`¿Cambiar a ${pokemon.name}?`}
        message={`¿Estás seguro de que quieres enviar a ${pokemon.name} al combate?`}
        confirmText="Cambiar"
        cancelText="Cancelar"
        onConfirm={confirmSwitch}
      />
    </div>
  );
}
