import React, { useState } from "react";
import { useGame } from "../../../context/GameContext";
import { BattleView } from "../../run/components/BattleView";
import { BattleLog } from "../../run/components/BattleLog";
import { ManualBattleHUD } from "../../run/components/ManualBattleHUD";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { useTrainingTick } from "../hooks/useTrainingTick";
import { LootSelectionModal } from "../../run/components/LootSelectionModal";
import { ItemSprite } from "../../../components/ui/ItemSprite";
import { ITEMS } from "../../../lib/items";
import { Sword, LogOut, Coins, Info, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";
import { createPortal } from "react-dom";
import { useItemOnPokemon } from "../../../engine/items.engine";
import { generateUid } from "../../../utils/random";

export function TrainingLayout({
  onNavigate,
}: {
  onNavigate: (
    screen: "main" | "starter" | "game" | "training-select" | "training",
  ) => void;
}) {
  const { training, setTraining, meta } = useGame();
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [hasSurrendered, setHasSurrendered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<{
    id: string;
    rect: DOMRect;
  } | null>(null);

  // Activate the training loop
  useTrainingTick();

  const isDefeated = training.currentBattle?.phase === "defeat";
  const showSessionEnd = isDefeated || hasSurrendered;

  const handleSurrender = () => {
    setShowSurrenderConfirm(true);
  };

  const confirmSurrender = () => {
    setShowSurrenderConfirm(false);
    setHasSurrendered(true);
  };

  const quitToMenu = () => {
    setTraining((prev) => ({
      ...prev,
      isActive: false,
      pokemonUid: "",
      currentBattle: null,
    }));
    onNavigate("main");
  };

  const restartTraining = () => {
    setTraining((prev) => ({
      ...prev,
      isActive: false,
      pokemonUid: "", // Crucial to return to selector
      currentBattle: null,
    }));
    onNavigate("training-select");
  };

  const handleUseItem = async (itemId: string) => {
    const { success, resultLog, newPokemon, newInventory, runStateMarkers } =
      await useItemOnPokemon(training.pokemon, itemId, training.items);

    if (success) {
      setTraining((prev) => {
        const nextBattle = prev.currentBattle
          ? { ...prev.currentBattle, playerPokemon: newPokemon }
          : null;

        // If item count reaches 0, hide tooltip
        if (!newInventory[itemId] || newInventory[itemId] <= 0) {
          setHoveredItem(null);
        }

        return {
          ...prev,
          ...(runStateMarkers ?? {}),
          pokemon: newPokemon,
          currentBattle: nextBattle,
          items: newInventory,
          battleLog: [
            ...prev.battleLog,
            { id: generateUid(), type: "normal", text: resultLog },
          ],
        };
      });
    } else {
      setTraining((prev) => ({
        ...prev,
        battleLog: [
          ...prev.battleLog,
          { id: generateUid(), type: "normal", text: resultLog },
        ],
      }));
    }
  };

  const currentPokemon = training.pokemon;
  if (!currentPokemon.uid) return null;

  const hpPercent = (currentPokemon.currentHP / currentPokemon.maxHP) * 100;
  const xpPercent = (currentPokemon.xp / currentPokemon.xpToNext) * 100;

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden crt-screen relative">
      {/* Header bar */}
      <header className="h-10 bg-surface border-b-2 border-border flex items-center justify-between px-4 z-20 pixel-shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Sword size={12} className="text-brand" />
            <span className="font-display text-[0.55rem] text-muted tracking-widest uppercase">
              ENTRENAMIENTO: {training.totalBattlesWon} VICTORIAS
            </span>
          </div>
          <div className="h-4 w-0.5 bg-border mx-1" />
          <div className="flex items-center gap-1.5">
            <Coins size={12} className="text-brand" />
            <span className="font-display text-[0.55rem] text-brand tracking-widest">
              {meta.pokeCoins}
            </span>
          </div>
        </div>

        <button
          onClick={handleSurrender}
          className="bg-danger/20 hover:bg-danger/30 text-danger border-2 border-danger/50 font-display text-[0.5rem] tracking-widest px-3 py-0.5 flex items-center gap-1.5 transition-colors"
        >
          <LogOut size={10} /> RENDIRSE
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Battle Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 relative">
            <BattleView />
          </div>

          <div className="h-32 md:h-40 border-t-4 border-border bg-surface-dark z-10 flex">
            {/* Battle Log Left */}
            <div className="flex-1 border-r-2 border-border p-2 overflow-hidden bg-black/40">
              <BattleLog />
            </div>

            {/* Menu/Manual Actions Right */}
            <div className="w-48 md:w-64 bg-surface p-2 flex flex-col overflow-y-auto">
              <ManualBattleHUD />
            </div>
          </div>
        </main>

        {/* Right Sidebar: Stats */}
        <aside className="hidden xl:flex w-64 border-l-4 border-border bg-surface flex-col pixel-shadow-sm p-4 gap-4">
          <div className="bg-surface-dark border-4 border-border p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 border-b-2 border-border pb-3">
              <div className="w-12 h-12 bg-surface border-2 border-border flex items-center justify-center relative">
                <PixelSprite
                  pokemonId={currentPokemon.pokemonId}
                  variant="front"
                  size={40}
                  shiny={currentPokemon.isShiny}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-[0.6rem] text-white tracking-widest uppercase truncate w-32">
                  {currentPokemon.name}
                </span>
                <span className="font-display text-[0.45rem] text-muted uppercase">
                  NV. {currentPokemon.level}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between font-display text-[0.45rem] tracking-widest text-muted">
                <span>HP</span>
                <span>
                  {currentPokemon.currentHP} / {currentPokemon.maxHP}
                </span>
              </div>
              <div className="h-2 w-full bg-surface border-2 border-border p-px">
                <div
                  className={clsx(
                    "h-full transition-all duration-300",
                    hpPercent > 50
                      ? "bg-success"
                      : hpPercent > 20
                        ? "bg-warning"
                        : "bg-danger",
                  )}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between font-display text-[0.45rem] tracking-widest text-muted">
                <span>XP</span>
                <span>
                  {currentPokemon.xp} / {currentPokemon.xpToNext}
                </span>
              </div>
              <div className="h-1.5 w-full bg-surface border border-border p-px">
                <div
                  className="h-full bg-brand shadow-[0_0_5px_rgba(204,0,0,0.3)] bg-linear-to-r from-brand to-brand-dark"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-dark/50 border-2 border-border p-3 flex flex-col gap-2">
            <h4 className="font-display text-[0.45rem] text-brand tracking-widest uppercase border-b border-border pb-1">
              ESTADISTICAS
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {Object.entries(currentPokemon.stats).map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between items-center group"
                >
                  <span className="font-display text-[0.45rem] text-muted uppercase group-hover:text-brand transition-colors">
                    {k.substring(0, 3)}
                  </span>
                  <span className="font-display text-[0.5rem] text-white">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-dark/50 border-2 border-border p-3 flex flex-col gap-2 flex-1 overflow-hidden">
            <h4 className="font-display text-[0.45rem] text-brand tracking-widest uppercase border-b border-border pb-1 flex items-center gap-2">
              <Info size={10} /> BOTÍN
            </h4>
            <div className="grid grid-cols-4 gap-2 overflow-y-auto custom-scrollbar pr-1 mt-1">
              {Object.entries(training.items).filter(([_, count]) => count > 0)
                .length === 0 ? (
                <div className="col-span-4 py-4 flex flex-col items-center justify-center border-2 border-dashed border-border opacity-20">
                  <span className="font-display text-[0.4rem]">VACÍO</span>
                </div>
              ) : (
                Object.entries(training.items)
                  .filter(([_, count]) => count > 0)
                  .map(([itemId, count]) => (
                    <div
                      key={itemId}
                      className="relative group cursor-pointer aspect-square bg-surface border-2 border-border flex items-center justify-center hover:border-brand transition-colors"
                      onMouseEnter={(e) =>
                        setHoveredItem({
                          id: itemId,
                          rect: e.currentTarget.getBoundingClientRect(),
                        })
                      }
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => handleUseItem(itemId)}
                    >
                      <ItemSprite item={ITEMS[itemId]} size={24} />
                      {count > 1 && (
                        <span className="absolute -bottom-1 -right-1 bg-brand text-white font-display text-[0.35rem] px-1 border border-border shadow-sm">
                          x{count}
                        </span>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Tooltip Portal */}
      {hoveredItem &&
        createPortal(
          <div
            className="fixed z-10001 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: `${hoveredItem.rect.bottom + 8}px`,
              left: `${Math.min(window.innerWidth - 200, Math.max(10, hoveredItem.rect.left - 80))}px`,
              width: "200px",
            }}
          >
            <div className="bg-surface border-4 border-border p-3 shadow-pixel">
              <h4 className="font-display text-[0.6rem] text-brand mb-1 uppercase">
                {ITEMS[hoveredItem.id].name}
              </h4>
              <p className="font-body text-[0.5rem] text-white leading-relaxed lowercase first-letter:uppercase">
                {ITEMS[hoveredItem.id].description}
              </p>
              <div className="mt-2 py-1 border-y border-border flex justify-between items-center px-0.5">
                <span className="font-display text-[0.4rem] text-muted uppercase">
                  EN POSESIÓN:
                </span>
                <span className="font-display text-[0.5rem] text-brand">
                  x{training.items[hoveredItem.id] || 0}
                </span>
              </div>
              <div className="mt-2 flex justify-between items-center">
                <span className="font-display text-[0.35rem] text-muted tracking-widest uppercase">
                  HAZ CLIC PARA USAR
                </span>
                <span className="font-display text-[0.35rem] text-brand uppercase">
                  {ITEMS[hoveredItem.id].category}
                </span>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* MODALS */}
      <LootSelectionModal />

      {/* Surrender Confirmation */}
      {showSurrenderConfirm &&
        createPortal(
          <div className="fixed inset-0 z-10000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-surface border-4 border-border p-8 max-w-sm w-full pixel-shadow animate-in zoom-in duration-200 text-center">
              <ShieldAlert size={48} className="text-warning mx-auto mb-4" />
              <h3 className="font-display text-lg text-white mb-4 uppercase">
                ¿RENDIRSE?
              </h3>
              <p className="font-body text-[0.6rem] text-muted mb-8 uppercase leading-relaxed font-bold">
                Perderás el progreso de este entrenamiento, pero conservarás tus
                PokéCoins.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmSurrender}
                  className="w-full py-3 bg-danger border-4 border-danger-dark text-white font-display text-[0.6rem] tracking-widest hover:translate-y-px active:translate-y-1 transition-transform"
                >
                  SÍ, RENDIRSE
                </button>
                <button
                  onClick={() => setShowSurrenderConfirm(false)}
                  className="w-full py-3 bg-surface-dark border-4 border-border text-muted font-display text-[0.6rem] tracking-widest hover:text-white transition-colors"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Defeat / Session End Modal */}
      {showSessionEnd &&
        createPortal(
          <div className="fixed inset-0 z-10000 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-surface border-4 border-border p-8 max-w-sm w-full pixel-shadow animate-in slide-in-from-bottom-8 duration-300 text-center">
              <div className="w-16 h-16 bg-danger/20 border-4 border-danger rounded-full flex items-center justify-center mx-auto mb-6">
                <Sword
                  size={32}
                  className={clsx(
                    "text-danger",
                    hasSurrendered ? "rotate-45" : "rotate-180",
                  )}
                />
              </div>
              <h2 className="font-display text-2xl text-danger mb-2 tracking-tighter drop-shadow-[0_0_10px_rgba(204,0,0,0.5)]">
                {hasSurrendered ? "RETIRADO" : "DERROTA"}
              </h2>
              <div className="bg-surface-dark p-4 border-2 border-border mb-8 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[0.5rem] font-display">
                  <span className="text-muted">VICTORIAS:</span>
                  <span className="text-white">{training.totalBattlesWon}</span>
                </div>
                <div className="flex justify-between items-center text-[0.5rem] font-display">
                  <span className="text-muted">NV. FINAL:</span>
                  <span className="text-white">{currentPokemon.level}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={restartTraining}
                  className="w-full py-4 bg-brand border-4 border-brand-dark text-white font-display text-[0.7rem] tracking-widest hover:translate-y-px transition-transform flex items-center justify-center gap-2"
                >
                  NUEVO ENTRENAMIENTO <Sword size={14} fill="currentColor" />
                </button>
                <button
                  onClick={quitToMenu}
                  className="w-full py-3 bg-surface-dark border-4 border-border text-muted font-display text-[0.6rem] tracking-widest hover:text-white transition-colors"
                >
                  VOLVER AL MENÚ
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
