import React, { useState } from "react";
import { useGame } from "../../../context/GameContext";
import { ITEMS } from "../../../lib/items";
import { clsx } from "clsx";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { useItemOnPokemon } from "../../../engine/items.engine";
import { equipItem } from "../../../engine/heldItems.engine";
import { ItemSprite } from "../../../components/ui/ItemSprite";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { StarOff } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function ItemBag() {
  const { run, setRun, setMeta } = useGame();
  const [useTargetModal, setUseTargetModal] = useState<string | null>(null);

  if (!run.isActive) return null;

  const handleUseItem = async (pokemonUid: string) => {
    if (!useTargetModal) return;

    let pokemon = run.team.find((p) => p.uid === pokemonUid);
    if (!pokemon) return;

    const itemDef = ITEMS[useTargetModal];
    if (!itemDef) return;

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
      const { success, newPokemon, newInventory, resultLog } =
        await useItemOnPokemon(pokemon, useTargetModal, run.items);
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
          battleLog: [
            ...prev.battleLog,
            {
              id: Date.now().toString(),
              text: resultLog,
              type: "normal" as const,
            },
          ].slice(-40),
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
    }

    setUseTargetModal(null);
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
                      <span className="font-body text-[0.55rem] font-bold text-muted">
                        x{qty}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => unpinItem(id, e)}
                      className="p-1 px-1.5 text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Desanclar"
                    >
                      <StarOff size={12} />
                    </Button>

                    {(item.category === "heal" ||
                      item.category === "held" ||
                      item.category === "evo" ||
                      item.category === "ball" ||
                      item.category === "battle" ||
                      item.category === "berry") && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setUseTargetModal(id)}
                        className="px-2 py-1 text-[0.45rem]"
                      >
                        {item.category === "held" ? "EQUIPAR" : "USAR"}
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
              <span className="text-[0.6rem] font-display text-muted uppercase tracking-widest mb-1 pl-1">
                Selecciona al objetivo:
              </span>
              {run.team.map((p) => (
                <button
                  key={p.uid}
                  onClick={() => handleUseItem(p.uid)}
                  className={clsx(
                    "flex justify-between items-center p-2 bg-surface border-2 shrink-0 transition-colors",
                    p.currentHP === 0
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
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-display text-[0.55rem] tracking-wider text-left max-w-[120px] truncate">
                        {p.name}
                      </span>
                      <span className="font-body text-xs text-muted font-bold">
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
              ))}
            </div>
          }
        />
      )}
    </div>
  );
}
