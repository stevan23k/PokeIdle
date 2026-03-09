import React, { useState } from "react";
import { useGame } from "../../../context/GameContext";
import { ITEMS } from "../../../lib/items";
import { clsx } from "clsx";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { useItemOnPokemon } from "../../../engine/items.engine";
import { equipItem } from "../../../engine/heldItems.engine";
import { calculateCaptureChance } from "../../../engine/capture.engine";
import { ItemSprite } from "../../../components/ui/ItemSprite";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { StarOff } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { canLearnTM } from "../services/pokeapi.service";

export function ItemBag() {
  const { run, setRun, setMeta, notify } = useGame();
  const [useTargetModal, setUseTargetModal] = useState<string | null>(null);
  const [tmCompatibility, setTmCompatibility] = useState<
    Record<string, boolean>
  >({});
  const [loadingCompatibility, setLoadingCompatibility] = useState(false);

  if (!run.isActive) return null;

  const handleUseItem = async (pokemonUid: string) => {
    if (!useTargetModal) return;

    let pokemon = run.team.find((p) => p.uid === pokemonUid);
    if (!pokemon) return;

    const itemDef = ITEMS[useTargetModal];
    if (!itemDef) return;

    // ── BLOQUEO TM — verificar ANTES de cualquier cosa ──
    if (itemDef.category === "tm") {
      const compatible = tmCompatibility[pokemon.uid];
      if (compatible === false) {
        notify({
          message: `${pokemon.name} no puede aprender ${itemDef.name}.`,
          type: "defeat",
          icon: "❌",
          duration: 2500,
        });
        return; // ← salir SIN consumir el item
      }
      if (compatible === undefined || loadingCompatibility) {
        return;
      }
    }

    if (itemDef.category === "held") {
      const { success, newPokemon, newInventory } = equipItem(
        pokemon,
        useTargetModal,
        run.items,
      );
      if (success) {
        setRun((prev) => ({
          ...prev,
          items: newInventory,
          itemUsage: {
            ...prev.itemUsage,
            [useTargetModal]: (prev.itemUsage[useTargetModal] || 0) + 1,
          },
          team: prev.team.map((p) => (p.uid === pokemon!.uid ? newPokemon : p)),
          currentBattle:
            prev.currentBattle?.playerPokemon?.uid === pokemon!.uid
              ? { ...prev.currentBattle, playerPokemon: newPokemon }
              : prev.currentBattle,
        }));
        setMeta((prev) => ({
          ...prev,
          totalItemsUsed: {
            ...prev.totalItemsUsed,
            [itemDef.category]:
              (prev.totalItemsUsed[itemDef.category] || 0) + 1,
          },
        }));
      }
    } else {
      const result = await useItemOnPokemon(pokemon, useTargetModal, run.items);
      const { success, newPokemon, newInventory, resultLog, runStateMarkers } =
        result;
      if (success) {
        const isTMPending = resultLog === "__PENDING_MOVE_LEARN__";
        const pendingMove = (result as any)?.pendingMove ?? null;

        // console.log(`[ItemBag] Applying markers to run:`, runStateMarkers);
        setRun((prev) => {
          const consumesTurn =
            prev.isManualBattle &&
            prev.currentBattle &&
            (itemDef.category === "heal" || itemDef.category === "battle");

          const nextEvoQueue = [
            ...((prev as any).__checkEvolutionQueue || []),
            ...(runStateMarkers?.__checkEvolutionQueue || []),
          ];
          const nextMoveQueue = [
            ...((prev as any).__checkMoveLearnQueue || []),
            ...(runStateMarkers?.__checkMoveLearnQueue || []),
          ];

          // console.log(`[ItemBag] Next Queues:`, { evo: nextEvoQueue.length, move: nextMoveQueue.length });

          return {
            ...prev,
            ...(runStateMarkers ?? {}),
            // Merge queues instead of overwriting
            __checkEvolutionQueue: nextEvoQueue,
            __checkMoveLearnQueue: nextMoveQueue,
            items: newInventory,
            itemUsage: {
              ...prev.itemUsage,
              [useTargetModal]: (prev.itemUsage[useTargetModal] || 0) + 1,
            },
            team: prev.team.map((p) =>
              p.uid === pokemon!.uid ? newPokemon : p,
            ),
            pendingMoveLearn:
              isTMPending && pendingMove
                ? {
                    pokemonUid: pokemon!.uid,
                    pokemonName: pokemon!.name,
                    newMove: pendingMove,
                  }
                : prev.pendingMoveLearn,
            currentBattle: prev.currentBattle
              ? {
                  ...prev.currentBattle,
                  playerPokemon:
                    prev.currentBattle.playerPokemon?.uid === pokemon!.uid
                      ? newPokemon
                      : prev.currentBattle.playerPokemon,
                  ...(consumesTurn
                    ? {
                        manualActionQueue: {
                          type: "item" as const,
                          id: useTargetModal,
                        },
                      }
                    : {}),
                }
              : null,
            battleLog: [
              ...prev.battleLog,
              ...(!isTMPending
                ? [
                    {
                      id: Date.now().toString(),
                      text: resultLog,
                      type: "normal" as const,
                    },
                  ]
                : []),
            ].slice(-40),
          };
        });
        setMeta((prev) => ({
          ...prev,
          totalItemsUsed: {
            ...prev.totalItemsUsed,
            [itemDef.category]:
              (prev.totalItemsUsed[itemDef.category] || 0) + 1,
          },
        }));
      }
    }

    setUseTargetModal(null);
  };

  const handleThrowBall = (itemId: string) => {
    if (!run.currentBattle || run.currentBattle.type !== "wild") {
      setRun((prev) => ({
        ...prev,
        battleLog: [
          ...prev.battleLog,
          {
            id: Date.now().toString(),
            text: "¡No puedes usar esta Ball aquí!",
            type: "danger" as const,
          },
        ].slice(-40),
      }));
      return;
    }
    const ballDef = ITEMS[itemId];
    if (!ballDef) return;

    // Step 1: deduct item and start animation (result unknown yet)
    setRun((prev) => {
      if (!prev.currentBattle) return prev;
      return {
        ...prev,
        items: { ...prev.items, [itemId]: (prev.items[itemId] || 0) - 1 },
        currentBattle: {
          ...prev.currentBattle,
          pendingCaptureAnim: { ballId: itemId, captured: null },
        },
        battleLog: [
          ...prev.battleLog,
          {
            id: Date.now().toString(),
            text: `Lanzaste ${ballDef.name}...`,
            type: "capture" as const,
          },
        ].slice(-40),
      };
    });

    // Step 2: calculate result after a delay (matches animation throw duration ~800ms)
    setTimeout(() => {
      setRun((prev) => {
        if (!prev.currentBattle) return prev;
        const bState = { ...prev.currentBattle };
        const catchAttempt = calculateCaptureChance(
          bState.enemyPokemon,
          ballDef,
          bState.enemyPokemon.status,
          255,
          bState.isBossBattle,
          prev.totalCaptured,
          false, // isDarkGrass
          1.0, // oPower
        );
        const caught = catchAttempt.success;
        return {
          ...prev,
          totalCaptured: caught ? prev.totalCaptured + 1 : prev.totalCaptured,
          currentBattle: {
            ...bState,
            phase: caught ? "caught" : bState.phase,
            pendingCaptureAnim: { ballId: itemId, captured: caught },
            // NEW: Consume turn on failure in manual battle
            manualActionQueue:
              !caught && prev.isManualBattle
                ? { type: "item", id: itemId }
                : bState.manualActionQueue,
          },
          battleLog: [
            ...prev.battleLog,
            {
              id: Date.now().toString(),
              text: catchAttempt.log,
              type: "normal" as const,
            },
          ].slice(-40),
        };
      });
    }, 800);
  };

  const unpinItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRun((prev) => ({
      ...prev,
      pinnedItems: (prev.pinnedItems || []).filter((id) => id !== itemId),
    }));
  };

  const pinnedItemsIds = run.pinnedItems || [];
  const currentItems = pinnedItemsIds
    .filter((id) => (run.items[id] || 0) > 0)
    .map((id) => [id, run.items[id]] as const);

  return (
    <div className="flex flex-col p-3 border-b-2 border-border mb-2 bg-surface">
      {currentItems.length > 0 && (
        <div className="flex flex-col mb-4">
          <h2 className="font-display text-brand text-[0.65rem] uppercase mb-3 tracking-wider flex justify-between">
            <span>ACCESO RÁPIDO</span>
          </h2>
          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
            {currentItems.map(([id, qty]) => {
              const item = ITEMS[id];
              if (!item) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between p-2 bg-surface-alt border border-border group relative"
                >
                  <div className="flex items-center gap-3">
                    <ItemSprite
                      item={item}
                      size={24}
                      className="drop-shadow-sm group-hover:scale-110 transition-transform"
                    />
                    <div className="flex flex-col gap-0.5 max-w-[80px]">
                      <span className="font-display text-[0.5rem] tracking-wider truncate text-foreground">
                        {item.name}
                      </span>
                      <span className="font-body text-[0.55rem] font-bold text-foreground">
                        x{qty}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => unpinItem(id, e)}
                      className="p-1 px-1.5 text-white hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Desanclar"
                    >
                      <StarOff size={12} />
                    </Button>

                    {(item.category === "heal" ||
                      item.category === "held" ||
                      item.category === "evo" ||
                      item.category === "ball" ||
                      item.category === "battle" ||
                      item.category === "tm" ||
                      item.category === "berry") && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          if (item.category === "ball") {
                            handleThrowBall(id);
                          } else {
                            if (item.category === "tm") {
                              setLoadingCompatibility(true);
                              const results: Record<string, boolean> = {};
                              const moveId =
                                item.effect.type === "teach"
                                  ? item.effect.moveId
                                  : 0;
                              await Promise.all(
                                run.team.map(async (p) => {
                                  results[p.uid] = await canLearnTM(
                                    p.pokemonId,
                                    moveId,
                                  );
                                }),
                              );
                              setTmCompatibility(results);
                              setLoadingCompatibility(false);
                            } else {
                              setTmCompatibility({});
                            }
                            setUseTargetModal(id);
                          }
                        }}
                        className="px-2 py-1 text-[0.45rem]"
                        disabled={loadingCompatibility}
                      >
                        {item.category === "held"
                          ? "EQUIPAR"
                          : item.category === "tm"
                            ? "ENSEÑAR"
                            : "USAR"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {useTargetModal !== null && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setUseTargetModal(null)}
          title={`Usar ${ITEMS[useTargetModal]?.name}`}
          onConfirm={() => {}}
          confirmText="Listo"
          cancelText="Cancelar"
          message={
            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto px-1 pt-1 -mx-2">
              <span className="text-[0.6rem] font-display text-foreground uppercase tracking-widest mb-1 pl-1">
                Selecciona al objetivo:
              </span>
              {run.team.map((p) => {
                const item = useTargetModal ? ITEMS[useTargetModal] : null;
                const isTmIncompatible =
                  item?.category === "tm" &&
                  (loadingCompatibility ||
                    (tmCompatibility[p.uid] !== undefined &&
                      tmCompatibility[p.uid] === false));

                return (
                  <button
                    key={p.uid}
                    onClick={() => handleUseItem(p.uid)}
                    disabled={isTmIncompatible}
                    className={clsx(
                      "flex justify-between items-center p-2 bg-surface border-2 shrink-0 transition-colors",
                      isTmIncompatible
                        ? "border-red-900/40 opacity-40 cursor-not-allowed grayscale-[0.5]"
                        : p.currentHP === 0
                          ? "border-danger/30 opacity-70 grayscale-[0.8]"
                          : "border-border hover:border-brand",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-dark border border-border flex items-center justify-center">
                        <PixelSprite
                          pokemonId={p.pokemonId}
                          variant="front"
                          shiny={p.isShiny}
                          size={40}
                          showScanlines={false}
                          alt={p.name}
                        />
                        {/* Compatibility Badge */}
                        {tmCompatibility[p.uid] !== undefined && (
                          <div
                            className={clsx(
                              "absolute top-0 right-0 text-[0.4rem] font-display px-1 py-0.5 border z-10",
                              tmCompatibility[p.uid]
                                ? "bg-emerald-900/90 border-emerald-500 text-emerald-400"
                                : "bg-red-900/90 border-red-800 text-red-100 opacity-60",
                            )}
                          >
                            {tmCompatibility[p.uid] ? "✓" : "✗"}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-display text-[0.55rem] tracking-wider text-left max-w-[120px] truncate">
                          {p.name}
                        </span>
                        <span className="font-body text-xs text-foreground font-bold">
                          Nv.{p.level}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className={clsx(
                          "font-body text-[0.6rem] font-bold",
                          p.currentHP === 0 ? "text-danger" : "text-hp",
                        )}
                      >
                        {Math.floor(p.currentHP)} / {p.maxHP} PS
                      </div>
                      {p.status && (
                        <span className="font-display text-[0.4rem] bg-danger text-white px-1 leading-tight">
                          {p.status}
                        </span>
                      )}
                      {p.heldItem && (
                        <div className="flex items-center gap-1 opacity-80 mt-1">
                          <ItemSprite item={ITEMS[p.heldItem]} size={12} />
                          <span className="font-display text-[0.4rem] text-accent tracking-tighter">
                            {ITEMS[p.heldItem]?.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          }
        />
      )}
    </div>
  );
}
