import React, { useState } from "react";
import { useGame } from "../../../context/GameContext";
import { ITEMS } from "../../../lib/items";
import { clsx } from "clsx";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { useItemOnPokemon } from "../../../engine/items.engine";
import { equipItem } from "../../../engine/heldItems.engine";
import { ItemSprite } from "../../../components/ui/ItemSprite";
import { PixelSprite } from "../../../components/ui/PixelSprite";

export function ItemBag() {
  const { run, setRun, setMeta } = useGame();
  const [tab, setTab] = useState<"heal" | "ball" | "battle">("heal");
  const [useTargetModal, setUseTargetModal] = useState<string | null>(null);

  if (!run.isActive) return null;

  const handleUseItem = async (pokemonUid: string) => {
    if (!useTargetModal) return;

    let pokemon = run.team.find((p) => p.uid === pokemonUid);
    if (!pokemon) return;

    const itemDef = ITEMS[useTargetModal];
    if (!itemDef) return;

    if (itemDef.category === "held") {
      const { success, newPokemon, newInventory, msg } = equipItem(
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
    }

    setUseTargetModal(null);
  };

  const currentItems = Object.entries(run.items).filter(([id, qty]) => {
    if (qty <= 0) return false;
    const cat = ITEMS[id]?.category;
    if (tab === "heal") return cat === "heal";
    if (tab === "ball") return cat === "ball";
    return cat === "battle" || cat === "held" || cat === "evo";
  });

  return (
    <div className="flex flex-col p-3 border-b-2 border-border mb-2 bg-surface">
      <h2 className="font-display text-brand text-[0.65rem] uppercase mb-3 tracking-wider flex justify-between">
        <span>MOCHILA</span>
        {/* <span className="text-accent drop-shadow-md">¥ {run.totalBattlesWon * 50}</span> */}
      </h2>

      <div className="flex bg-surface-dark border-2 border-border p-0.5 mb-3 select-none">
        {(["heal", "ball", "battle"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex-1 py-1.5 font-display text-[0.45rem] tracking-widest text-center transition-colors border",
              tab === t
                ? "bg-surface text-brand border-brand"
                : "text-muted hover:text-white border-transparent",
            )}
          >
            {t === "heal" ? "CURA" : t === "ball" ? "BALLS" : "BATALLA"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 min-h-[120px] max-h-[220px] overflow-y-auto pr-1">
        {currentItems.length === 0 ? (
          <div className="text-center font-body text-xs text-muted italic p-4">
            Sección vacía.
          </div>
        ) : (
          currentItems.map(([id, qty]) => {
            const item = ITEMS[id];
            if (!item) return null;
            return (
              <div
                key={id}
                className="flex items-center justify-between p-2 bg-surface-alt border border-border group"
              >
                <div className="flex items-center gap-3">
                  <ItemSprite
                    item={item}
                    size={24}
                    className="drop-shadow-sm group-hover:scale-110 transition-transform"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-display text-[0.5rem] tracking-wider truncate max-w-[90px] text-foreground">
                      {item.name}
                    </span>
                    <span className="font-body text-[0.55rem] font-bold text-muted">
                      x{qty}
                    </span>
                  </div>
                </div>
                {(item.category === "heal" ||
                  item.category === "held" ||
                  item.category === "evo") && (
                  <button
                    onClick={() => setUseTargetModal(id)}
                    className="px-2 py-1.5 bg-surface-dark border border-border text-[0.45rem] text-muted font-display uppercase tracking-widest hover:border-brand hover:text-brand transition-colors"
                  >
                    {item.category === "held" ? "EQUIPAR" : "USAR"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {tab === "heal" && (
        <div className="mt-4 flex items-center justify-between border-t border-dashed border-border pt-3">
          <span className="font-display text-[0.55rem] text-muted tracking-widest">
            AUTO-CURACIÓN
          </span>
          <button
            onClick={() =>
              setRun((prev) => ({ ...prev, autoItems: !prev.autoItems }))
            }
            className={`px-3 py-1 font-display text-[0.55rem] border-2 transition-colors ${run.autoItems ? "bg-success/20 text-success border-success" : "bg-surface-dark text-muted border-border hover:border-muted"}`}
          >
            {run.autoItems ? "ON" : "OFF"}
          </button>
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
                    "flex justify-between items-center p-2 bg-surface border-2 flex-shrink-0 transition-colors",
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
