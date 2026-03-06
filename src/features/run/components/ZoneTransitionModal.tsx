import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../../../context/GameContext";
import { ITEMS, type ItemCategory } from "../../../lib/items";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { levelUpPokemon } from "../../../engine/xp.engine";
import { generateUid } from "../../../utils/random";
import { clsx } from "clsx";
import {
  BatteryCharging,
  ShoppingCart,
  Dumbbell,
  ArrowLeft,
  ArrowRight,
  X,
  Plus,
  Minus,
} from "lucide-react";
import { ItemSprite } from "../../../components/ui/ItemSprite/ItemSprite";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

export function ZoneTransitionModal() {
  const { run, setRun, setMeta, notify } = useGame();

  const [step, setStep] = useState<"rewards" | "menu" | "shop" | "train">(
    (run as any)._skipRewardsScreen ? "menu" : "rewards",
  );
  const [shopFilter, setShopFilter] = useState<ItemCategory | "All">("All");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const availableShopItems = useMemo(() => {
    const gameStateContext = {
      team: run.team,
      pc: run.pc,
      gymsBadges: run.gymsBadges,
      money: run.money,
    };
    return Object.values(ITEMS).filter((item) => {
      if (!item.buyable || !item.shopPrice) return false;
      if (item.condition) {
        return item.condition(gameStateContext);
      }
      return true;
    });
  }, [run.gymsBadges, run.money, run.team, run.pc]);

  const filteredItems = availableShopItems.filter(
    (i) => shopFilter === "All" || i.category === shopFilter,
  );

  // Reset step when a new transition starts
  React.useEffect(() => {
    if (run.pendingZoneTransition) {
      setStep((run as any)._skipRewardsScreen ? "menu" : "rewards");
    }
  }, [run.pendingZoneTransition, (run as any)._skipRewardsScreen]);

  if (!run.pendingZoneTransition) {
    return null;
  }

  const handleContinueFromRewards = () => {
    setStep("menu");
  };

  const finishTransition = () => {
    setRun((p) => ({ ...p, pendingZoneTransition: false }));
  };

  const handleRest = () => {
    const randomBasicItems = [
      "potion",
      "antidote",
      "paralyze-heal",
      "poke-ball",
    ];
    const randomItem =
      randomBasicItems[Math.floor(Math.random() * randomBasicItems.length)];

    setRun((prev) => {
      const healedTeam = prev.team.map((p) => ({
        ...p,
        currentHP: p.maxHP,
        moves: p.moves.map((m) => ({ ...m, currentPP: m.maxPP })),
      }));

      const itemDef = ITEMS[randomItem];
      return {
        ...prev,
        team: healedTeam,
        items: {
          ...prev.items,
          [randomItem]: (prev.items[randomItem] || 0) + 1,
        },
        pendingZoneTransition: false,
        battleLog: [
          ...prev.battleLog,
          {
            id: generateUid(),
            text: `¡El equipo ha descansado! Recibiste un(a) ${itemDef.name}.`,
            type: "normal" as const,
          },
        ].slice(-40),
      };
    });
    notify({
      message: `¡Descansaste y obtuviste ${ITEMS[randomItem].name}!`,
      type: "badge",
      icon: "💤",
      duration: 3000,
    });
  };

  const handleTrain = (pokemonIndex: number) => {
    const levelsToGain = Math.floor(Math.random() * 4) + 2; // 2 to 5 levels

    setRun((prev) => {
      let updatedTeam = [...prev.team];
      let p = updatedTeam[pokemonIndex];
      let gained = 0;

      for (let i = 0; i < levelsToGain && p.level < 100; i++) {
        p = levelUpPokemon(p);
        gained++;
      }

      updatedTeam[pokemonIndex] = p;
      return {
        ...prev,
        team: updatedTeam,
        pendingZoneTransition: false,
        battleLog: [
          ...prev.battleLog,
          {
            id: generateUid(),
            text: `¡${p.name} entrenó duro y subió ${gained} niveles!`,
            type: "level" as const,
          },
        ].slice(-40),
      };
    });
    notify({
      message: `¡El Pokémon subió de nivel!`,
      type: "level_up",
      icon: "⭐",
      duration: 3000,
    });
  };

  const handleBuy = (itemId: string, price: number, quantity: number) => {
    const totalCost = price * quantity;
    if (run.money >= totalCost) {
      setRun((prev) => ({
        ...prev,
        money: prev.money - totalCost,
        items: {
          ...prev.items,
          [itemId]: (prev.items[itemId] || 0) + quantity,
        },
      }));

      const itemName = ITEMS[itemId].name;
      notify({
        message: `Compraste ${quantity}x ${itemName}`,
        type: "badge",
        icon: "💰",
        duration: 3000,
      });

      // Reset quantity for this item after purchase
      setQuantities((prev) => ({ ...prev, [itemId]: 1 }));
    } else {
      notify({
        message: `No tienes suficientes Poké-Dólares.`,
        type: "defeat",
        icon: "❌",
        duration: 3000,
      });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <Card className="w-full max-w-4xl relative flex flex-col max-h-[90vh] shadow-[12px_12px_0_rgba(0,0,0,0.8)]" noPadding>
        {/* REWARDS STEP */}
        {step === "rewards" && (
          <div className="flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in zoom-in duration-300">
            <h2 className="font-display text-2xl text-accent drop-shadow-[0_0_8px_rgba(255,215,0,0.6)] animate-pulse">
              ¡JEFE DERROTADO!
            </h2>
            <div className="text-center font-body text-sm text-muted">
              Has recibido las siguientes recompensas fijas:
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-3 bg-surface-alt border-2 border-border p-6 shadow-pixel w-48">
                <div className="w-16 h-16 bg-black/30 flex items-center justify-center border-2 border-brand/50 rounded-full">
                  <span className="font-display text-2xl">✉️</span>
                </div>
                <div className="text-center">
                  <div className="font-display text-[0.6rem] text-brand">
                    CARTA DE ZONA
                  </div>
                  <div className="font-display text-[0.55rem] text-muted-foreground mt-1 text-center leading-tight">
                    +20% Exp pasiva.
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 bg-surface-alt border-2 border-border p-6 shadow-pixel w-48">
                <div className="w-16 h-16 bg-black/30 flex items-center justify-center border-2 border-brand/50 rounded-full">
                  <span className="font-display text-2xl">⚡</span>
                </div>
                <div className="text-center">
                  <div className="font-display text-[0.6rem] text-brand">
                    REPARTIR EXP
                  </div>
                  <div className="font-display text-[0.55rem] text-muted-foreground mt-1 text-center leading-tight">
                    El equipo comparte
                    <br />
                    +20% de la XP de batalla.
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleContinueFromRewards}
              className="mt-8 px-12 py-3 flex items-center gap-2"
            >
              C O N T I N U A R <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {/* MAIN MENU STEP */}
        {step === "menu" && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b-4 border-border bg-surface-alt flex justify-between items-center bg-striped">
              <h2 className="font-display text-xl text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                ÁREA DE DESCANSO
              </h2>
              <div className="font-display text-xs text-brand flex items-center gap-2">
                <span className="opacity-80">Saldo:</span>
                <span className="text-emerald-400">₽{run.money}</span>
              </div>
            </div>

            <div className="p-6 text-center font-display text-[0.65rem] text-muted leading-relaxed">
              Elévate como entrenador o recupera fuerzas.
              <br />
              Solo puedes elegir <span className="text-accent">UNA</span>{" "}
              acción.
            </div>

            <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-stretch">
              {/* REST CARD */}
              <button
                onClick={handleRest}
                className="group flex flex-col items-center bg-surface-dark border-4 border-border p-6 hover:border-emerald-500 hover:bg-emerald-950/30 transition-all text-left relative overflow-hidden"
              >
                <BatteryCharging
                  size={48}
                  className="text-emerald-500 mb-6 group-hover:scale-110 transition-transform"
                />
                <h3 className="font-display text-lg text-emerald-400 mb-3 w-full text-center">
                  DESCANSAR
                </h3>
                <ul className="space-y-2 mt-4 text-[0.65rem] font-display text-muted w-full list-disc list-inside">
                  <li>Cura 100% HP del equipo.</li>
                  <li>Restaura todos los PP.</li>
                  <li>Revive aliados debilitados.</li>
                  <li>Otorga 1 poción o bola base.</li>
                </ul>
              </button>

              {/* SHOP CARD */}
              <button
                onClick={() => setStep("shop")}
                className="group flex flex-col items-center bg-surface-dark border-4 border-border p-6 hover:border-brand hover:bg-brand/10 transition-all text-left relative overflow-hidden"
              >
                <ShoppingCart
                  size={48}
                  className="text-brand mb-6 group-hover:scale-110 transition-transform"
                />
                <h3 className="font-display text-lg text-brand mb-3 w-full text-center">
                  COMPRAR
                </h3>
                <ul className="space-y-2 mt-4 text-[0.65rem] font-display text-muted w-full list-disc list-inside">
                  <li>Accede al catálogo de ítems.</li>
                  <li>Gasta tus Poké-Dólares.</li>
                  <li>Mejora tu inventario.</li>
                  <li>Puedes comprar varias veces.</li>
                </ul>
              </button>

              {/* TRAIN CARD */}
              <button
                onClick={() => setStep("train")}
                className="group flex flex-col items-center bg-surface-dark border-4 border-border p-6 hover:border-accent hover:bg-accent/10 transition-all text-left relative overflow-hidden"
              >
                <Dumbbell
                  size={48}
                  className="text-accent mb-6 group-hover:scale-110 transition-transform"
                />
                <h3 className="font-display text-lg text-accent mb-3 w-full text-center">
                  ENTRENAR
                </h3>
                <ul className="space-y-2 mt-4 text-[0.65rem] font-display text-muted w-full list-disc list-inside">
                  <li>Sube +2 a +5 niveles de golpe.</li>
                  <li>Aplica a SOLO 1 Pokémon.</li>
                  <li>Inmediato y permanente.</li>
                  <li>¡Piénsatelo bien!</li>
                </ul>
              </button>
            </div>

            {/* Opcional: Permitir avanzar sin hacer nada */}
            <div className="p-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={finishTransition}
                className="text-muted hover:text-white underline underline-offset-4 decoration-border hover:decoration-brand opacity-60"
              >
                Omitir y Avanzar a la siguiente zona
              </Button>
            </div>
          </div>
        )}

        {/* SHOP MENU */}
        {step === "shop" && (
          <div className="flex flex-col h-[85vh] animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="p-4 border-b-4 border-border bg-surface-alt flex justify-between items-center bg-striped shrink-0">
              <div className="flex flex-col">
                <h2 className="font-display text-lg text-brand drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                  TIENDA POKÉMON
                </h2>
                <span className="font-display text-[0.55rem] text-muted uppercase">
                  Gasta sabiamente
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="font-display text-xs text-brand flex items-center justify-end w-full">
                  <span className="text-emerald-400 bg-black/50 px-3 py-1 border border-border">
                    ₽{run.money}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("menu")}
                  className="flex items-center gap-1 text-muted hover:text-white"
                >
                  <ArrowLeft size={12} /> VOLVER
                </Button>
              </div>
            </div>

            {/* Shop Filters */}
            <div className="flex flex-wrap items-center gap-2 p-4 border-b-2 border-border/50 shrink-0 bg-surface-dark">
              {["All", "ball", "heal", "tm", "battle", "berry", "held"].map((cat) => {
                const labelMap: Record<string, string> = {
                  All: "TODO",
                  ball: "BALLS",
                  heal: "MEDICINAS",
                  tm: "MTs",
                  battle: "COMBATE",
                  berry: "BAYAS",
                  held: "EQUIPABLES",
                };
                return (
                  <Button
                    key={cat}
                    variant={shopFilter === cat ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setShopFilter(cat as ItemCategory | "All")}
                    className="tracking-widest px-3"
                  >
                    {labelMap[cat] || cat}
                  </Button>
                );
              })}
            </div>

            {/* Shop Items List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.map((item) => {
                  const qty = quantities[item.id] || 1;
                  const itemPrice = item.shopPrice || 99999;
                  const totalCost = itemPrice * qty;
                  const canAfford = run.money >= totalCost;
                  const maxAffordable = Math.floor(run.money / itemPrice);

                  const updateQty = (delta: number) => {
                    setQuantities((prev) => ({
                      ...prev,
                      [item.id]: Math.max(1, (prev[item.id] || 1) + delta),
                    }));
                  };

                  const setMax = () => {
                    if (maxAffordable > 0) {
                      setQuantities((prev) => ({
                        ...prev,
                        [item.id]: maxAffordable,
                      }));
                    }
                  };

                  return (
                    <Card
                      key={item.id}
                      className="flex flex-col justify-between hover:border-brand/50 transition-colors p-3"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-12 h-12 bg-black/40 border-2 border-border/50 flex items-center justify-center shrink-0">
                          <ItemSprite item={item} className="w-8 h-8" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-display text-[0.65rem] truncate text-white">
                            {item.name}
                          </span>
                          <span className="font-display text-[0.55rem] text-muted">
                            {item.category.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div
                        className="font-body text-[0.6rem] text-muted-foreground line-clamp-2 mb-3 leading-tight h-8"
                        title={item.description}
                      >
                        {item.description}
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center justify-between gap-1 mb-2 bg-black/20 p-1 border border-border/30">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(-1)}
                            disabled={qty <= 1}
                            className="p-1 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus size={10} className="text-white" />
                          </button>
                          <span className="font-display text-[0.65rem] w-6 text-center text-accent">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQty(1)}
                            className="p-1 hover:bg-white/10 transition-colors"
                          >
                            <Plus size={10} className="text-white" />
                          </button>
                        </div>
                        <button
                          onClick={setMax}
                          className="font-display text-[0.5rem] px-2 py-1 bg-surface-alt border border-border hover:bg-brand/20 text-muted hover:text-white transition-all uppercase"
                        >
                          Máx
                        </button>
                      </div>

                      <Button
                        variant={canAfford ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => handleBuy(item.id, itemPrice, qty)}
                        disabled={!canAfford}
                        className="w-full flex items-center justify-center gap-1 mt-auto"
                      >
                        ₽ {totalCost} -{" "}
                        {canAfford ? "COMPRAR" : "SALDO INSUFICIENTE"}
                      </Button>
                    </Card>
                  );
                })}
                {filteredItems.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted font-display text-xs">
                    No hay objetos disponibles en esta categoría.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t-4 border-border shrink-0 flex justify-between items-center">
              <span className="font-display text-[0.55rem] text-muted opacity-80">
                (Pagas con el saldo obtenido de batallas)
              </span>
              <Button
                variant="primary"
                size="md"
                onClick={finishTransition}
                className="px-6 py-2"
              >
                CERRAR TIENDA Y AVANZAR
              </Button>
            </div>
          </div>
        )}

        {/* TRAIN MENU */}
        {step === "train" && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="p-6 border-b-4 border-border bg-surface-alt flex justify-between items-center bg-striped shrink-0">
              <h2 className="font-display text-xl text-accent drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                ENTRENAMIENTO EXTREMO
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("menu")}
                className="flex items-center gap-1 text-muted hover:text-white"
              >
                <ArrowLeft size={12} /> VOLVER
              </Button>
            </div>

            <div className="px-6 py-4 text-center font-display text-[0.65rem] text-muted">
              Elige AL POKÉMON que deseas subir de Nivel (+2 a +5 Nvs).
              <br />
              <strong className="text-warning">
                ¡Esta acción es irreversible y terminará tu descanso de
                inmediato!
              </strong>
            </div>

            <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto">
              {run.team.map((pokemon, idx) => (
                <button
                  key={pokemon.uid}
                  onClick={() => handleTrain(idx)}
                  className="flex flex-col items-center justify-center gap-2 border-4 border-border p-4 bg-surface-dark hover:border-accent hover:bg-accent/10 transition-colors group cursor-pointer"
                >
                  <PixelSprite
                    pokemonId={pokemon.pokemonId}
                    variant="front"
                    shiny={pokemon.isShiny}
                    size={64}
                    showScanlines={false}
                    className="group-hover:scale-110 transition-transform"
                  />
                  <div className="text-center w-full mt-2 border-t border-border/50 pt-2">
                    <span className="font-display text-xs text-white capitalize block">
                      {pokemon.name}
                    </span>
                    <span className="font-display text-[0.6rem] text-accent block mt-1">
                      Niv. {pokemon.level}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>,
    document.body,
  );
}
