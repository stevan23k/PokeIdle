import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../../../context/GameContext";
import { ITEMS } from "../../../lib/items";
import { generateUid } from "../../../utils/random";
import { ItemSprite } from "../../../components/ui/ItemSprite";

export function LootSelectionModal() {
  const { run, setRun, training, setTraining } = useGame();

  const isTraining = training.isActive;
  const options = isTraining
    ? training.pendingLootSelection
    : run.pendingLootSelection;
  const isAuto = !isTraining && !run.isManualBattle && run.autoLoot;

  const handleSelect = (itemId: string) => {
    const item = ITEMS[itemId];

    if (isTraining) {
      setTraining((prev) => ({
        ...prev,
        pendingLootSelection: null,
        items: {
          ...prev.items,
          [itemId]: (prev.items[itemId] || 0) + 1,
        },
      }));
      // Also add to main run inventory so they persist if needed
      setRun((prev) => ({
        ...prev,
        items: { ...prev.items, [itemId]: (prev.items[itemId] || 0) + 1 },
      }));
    } else {
      setRun((prev) => {
        const nextState = { ...prev };
        nextState.items = {
          ...nextState.items,
          [itemId]: (nextState.items[itemId] || 0) + 1,
        };

        // Special Flags
        if (itemId === "mega-bracelet") nextState.hasMegaBracelet = true;

        nextState.battleLog = [
          ...nextState.battleLog,
          {
            id: generateUid(),
            text: `Elegiste recompensa: ${item.name}`,
            type: "capture" as any,
          },
        ].slice(-40);
        nextState.pendingLootSelection = null;
        return nextState;
      });
    }
  };

  useEffect(() => {
    if (options && options.length > 0 && isAuto && !run.isPaused) {
      const timer = setTimeout(() => {
        const randomItem = options[Math.floor(Math.random() * options.length)];
        handleSelect(randomItem);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [options, isAuto, run.isPaused]);

  if (!options || options.length === 0) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <h2 className="font-display text-lg text-brand mb-4 drop-shadow-md text-center animate-pulse">
        ¡ELIGE TU RECOMPENSA!
      </h2>

      {isAuto && (
        <p className="font-body text-[0.55rem] text-muted mb-4 animate-pulse">
          Selección automática en 6 segundos...
        </p>
      )}

      {!isAuto && (
        <p className="font-body text-[0.55rem] text-brand mb-4">
          Modo Manual / Auto-Recompensa OFF: Elige tu recompensa.
        </p>
      )}

      <div className="flex flex-row gap-3 w-full max-w-lg justify-center items-stretch">
        {options.map((itemId, idx) => {
          const item = ITEMS[itemId];
          if (!item) return null;

          return (
            <button
              key={`${itemId}-${idx}`}
              onClick={() => handleSelect(itemId)}
              className="flex-1 flex flex-col items-center justify-center bg-surface-dark border-2 border-border p-3 hover:border-brand hover:-translate-y-1 hover:shadow-[0_0_16px_rgba(var(--brand-rgb),0.6)] transition-all group overflow-hidden"
              style={{ cursor: "pointer" }}
            >
              <div className="mb-2 group-hover:scale-110 transition-transform flex items-center justify-center">
                <ItemSprite item={item} size={56} />
              </div>
              <h3 className="font-display text-[0.65rem] text-foreground mb-1 text-center group-hover:text-brand transition-colors leading-tight">
                {item.name}
              </h3>
              <p className="font-body text-[0.5rem] text-muted text-center hidden sm:block">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
