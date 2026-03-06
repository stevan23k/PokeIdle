import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../../../context/GameContext";
import { ITEMS, type ItemCategory } from "../../../lib/items";
import { ItemSprite } from "../../../components/ui/ItemSprite";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { useItemOnPokemon } from "../../../engine/items.engine";
import { equipItem } from "../../../engine/heldItems.engine";
import { calculateCaptureChance } from "../../../engine/capture.engine";
import { clsx } from "clsx";
import { X, Search, Star, SortAsc, SortDesc } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

interface BagModalProps {
  onClose: () => void;
}

export function BagModal({ onClose }: BagModalProps) {
  const { run, setRun, setMeta } = useGame();
  const [activeTab, setActiveTab] = useState<ItemCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "qty">("qty");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [useTargetModal, setUseTargetModal] = useState<string | null>(null);
  const [hoverItem, setHoverItem] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!run.isActive) return null;

  const categories = [
    { id: "all", label: "TODO" },
    { id: "heal", label: "MEDICINAS" },
    { id: "ball", label: "BALLS" },
    { id: "battle", label: "COMBATE" },
    { id: "berry", label: "BAYAS" },
    { id: "tm", label: "MTs" },
    { id: "key", label: "CLAVE" },
    { id: "evo", label: "EVO" },
    { id: "held", label: "EQUIPO" },
    { id: "special", label: "OTROS" },
  ] as const;

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

        setRun((prev) => {
          const consumesTurn =
            prev.isManualBattle &&
            prev.currentBattle &&
            (itemDef.category === "heal" ||
              itemDef.category === "battle" ||
              itemDef.category === "tm");

          return {
            ...prev,
            ...(runStateMarkers ?? {}),
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
      } else {
        // Show failure log even if not success
        setRun((prev) => ({
          ...prev,
          battleLog: [
            ...prev.battleLog,
            {
              id: Date.now().toString(),
              text: resultLog,
              type: "normal" as const,
            },
          ].slice(-40),
        }));
      }
      setMeta((prev) => ({
        ...prev,
        totalItemsUsed: {
          ...prev.totalItemsUsed,
          [itemDef.category]: (prev.totalItemsUsed[itemDef.category] || 0) + 1,
        },
      }));
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
    onClose();
  };

  const togglePin = (itemId: string) => {
    setRun((prev) => {
      const isPinned = prev.pinnedItems?.includes(itemId);
      const newPins = isPinned
        ? prev.pinnedItems.filter((i) => i !== itemId)
        : [...(prev.pinnedItems || []), itemId];
      return { ...prev, pinnedItems: newPins };
    });
  };

  const filteredAndSortedItems = useMemo(() => {
    let entries = Object.entries(run.items).filter(
      ([id, qty]) => (qty as number) > 0,
    );

    // Filter Category
    if (activeTab !== "all") {
      entries = entries.filter(([id]) => ITEMS[id]?.category === activeTab);
    }

    // Filter Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(([id]) =>
        ITEMS[id]?.name.toLowerCase().includes(q),
      );
    }

    // Sort
    entries.sort((a, b) => {
      const itemA = ITEMS[a[0]];
      const itemB = ITEMS[b[0]];
      if (!itemA || !itemB) return 0;

      if (sortBy === "name") {
        const val = itemA.name.localeCompare(itemB.name);
        return sortOrder === "asc" ? val : -val;
      } else {
        const val = (a[1] as number) - (b[1] as number);
        return sortOrder === "asc" ? val : -val;
      }
    });

    return entries;
  }, [run.items, activeTab, searchQuery, sortBy, sortOrder]);

  const hoverItemDef = hoverItem ? ITEMS[hoverItem] : null;

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
      className="crt-screen"
    >
      <Card
        className="w-full max-w-4xl h-[85vh] flex flex-col relative shadow-[10px_10px_0_rgba(0,0,0,0.5)]"
        noPadding
      >
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-10 h-10 bg-danger border-4 border-black text-white flex items-center justify-center hover:bg-red-500 hover:-translate-y-1 transition-transform z-10 shadow-pixel"
        >
          <X size={20} />
        </button>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* SIDEBAR FOR CATEGORIES */}
          <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-border bg-surface-alt flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto">
            <div className="p-4 border-b border-border hidden md:block">
              <h2 className="font-display text-brand text-lg">MOCHILA</h2>
              <p className="font-body text-xs text-muted">Gestión de Objetos</p>
            </div>
            <div className="flex md:flex-col">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id as any)}
                  className={clsx(
                    "px-4 py-3 text-left font-display text-[0.6rem] tracking-widest transition-colors border-b border-border/30 whitespace-nowrap",
                    activeTab === cat.id
                      ? "bg-surface-light text-brand border-l-4 border-l-brand"
                      : "text-muted hover:bg-surface hover:text-white border-l-4 border-transparent",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col min-0 bg-surface">
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 border-b border-border bg-surface-dark shrink-0">
              <div className="flex-1 w-full relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="text"
                  placeholder="Buscar objeto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface border border-border pl-9 pr-3 py-1.5 font-body text-sm text-foreground focus:border-brand focus:outline-none placeholder:text-muted/50"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button
                  variant={sortBy === "name" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy("name")}
                  className="flex-1 sm:flex-none tracking-widest px-3"
                >
                  NOMBRE
                </Button>
                <Button
                  variant={sortBy === "qty" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy("qty")}
                  className="flex-1 sm:flex-none tracking-widest px-3"
                >
                  CANTIDAD
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                  }
                  className="w-8 flex items-center justify-center px-0"
                >
                  {sortOrder === "asc" ? (
                    <SortAsc size={14} />
                  ) : (
                    <SortDesc size={14} />
                  )}
                </Button>
              </div>
            </div>

            {/* ITEM GRID */}
            <div className="flex-1 overflow-y-auto p-4 content-start custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredAndSortedItems.length === 0 ? (
                  <div className="col-span-full text-center py-10 font-body text-muted italic">
                    No se encontraron objetos en esta sección.
                  </div>
                ) : (
                  filteredAndSortedItems.map(([id, qty]) => {
                    const item = ITEMS[id];
                    if (!item) return null;
                    const isPinned = run.pinnedItems?.includes(id);

                    return (
                      <div
                        key={id}
                        onMouseEnter={() => setHoverItem(id)}
                        onMouseLeave={() => setHoverItem(null)}
                        className="bg-surface-alt border border-border p-3 flex flex-col items-center gap-2 group hover:border-brand transition-colors relative"
                      >
                        <button
                          onClick={() => togglePin(id)}
                          className={clsx(
                            "absolute top-1 right-1 p-1 transition-colors",
                            isPinned
                              ? "text-[#FFD700]"
                              : "text-muted hover:text-[#FFD700] opacity-0 group-hover:opacity-100",
                          )}
                        >
                          <Star
                            size={14}
                            className={isPinned ? "fill-current" : ""}
                          />
                        </button>

                        <div className="h-16 flex items-center justify-center">
                          <ItemSprite
                            item={item}
                            size={48}
                            className="drop-shadow-sm group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <div className="text-center w-full">
                          <div className="font-display text-[0.55rem] tracking-wider truncate mb-1 text-foreground">
                            {item.name}
                          </div>
                          <div className="font-body text-[0.65rem] font-bold text-muted bg-surface-dark py-0.5 rounded px-2 inline-block">
                            x{qty as number}
                          </div>
                        </div>

                        {(item.category === "heal" ||
                          item.category === "held" ||
                          item.category === "evo" ||
                          item.category === "ball" ||
                          item.category === "battle" ||
                          item.category === "tm" ||
                          item.category === "berry" ||
                          id === "rare-candy") && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="px-3 text-[0.45rem]"
                            onClick={() => {
                              if (item.category === "ball") {
                                handleThrowBall(id);
                              } else {
                                setUseTargetModal(id);
                              }
                            }}
                          >
                            {item.category === "held"
                              ? "EQUIPAR"
                              : item.category === "tm"
                                ? "ENSEÑAR"
                                : "USAR"}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* HOVER DETAILS */}
            <div className="h-24 md:h-32 shrink-0 border-t border-border bg-surface-alt p-4 flex items-center gap-4">
              {hoverItemDef ? (
                <>
                  <div className="w-16 h-16 shrink-0 bg-surface flex items-center justify-center border border-border shadow-inner">
                    <ItemSprite item={hoverItemDef} size={48} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-display text-sm text-brand tracking-widest mb-1">
                      {hoverItemDef.name}
                    </h3>
                    <p className="font-body text-xs text-muted leading-relaxed line-clamp-3">
                      {hoverItemDef.description}
                    </p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted italic font-body text-xs">
                  Pasa el ratón sobre un objeto para ver sus detalles.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* USE TARGET MODAL */}
        {useTargetModal !== null && (
          <ConfirmModal
            isOpen={true}
            onClose={() => setUseTargetModal(null)}
            title={`Usar ${ITEMS[useTargetModal]?.name}`}
            onConfirm={() => {}}
            confirmText="Listo"
            cancelText="Cancelar"
            message={
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto px-1 pt-1 -mx-2 custom-scrollbar">
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
      </Card>
    </div>,
    document.body,
  );
}
