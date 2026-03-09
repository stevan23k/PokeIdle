import React from "react";
import { useGame } from "../../context/GameContext";
import { StarterSelector } from "../../features/run/components/StarterSelector";
import { MainMenu } from "../../features/run/components/MainMenu";
import { RegionMap } from "../../features/run/components/RegionMap";
import { TeamRoster } from "../../features/run/components/TeamRoster";
import { BattleView } from "../../features/run/components/BattleView";
import { BattleLog } from "../../features/run/components/BattleLog";
import { SpeedControl } from "../../components/ui/SpeedControl";
import { ZoneView } from "../../features/run/components/ZoneView";
import { ItemBag } from "../../features/run/components/ItemBag";
import { CaptureLog } from "../../features/run/components/CaptureLog";
import { PauseMenu } from "../../features/run/components/PauseMenu";
import { ManualBattleHUD } from "../../features/run/components/ManualBattleHUD";
import { Menu } from "lucide-react";
import { clsx } from "clsx";
import { EventToast } from "../../components/ui/EventToast";
import { LootSelectionModal } from "../../features/run/components/LootSelectionModal";
import { BagModal } from "../../features/run/components/BagModal";
import { ZoneTransitionModal } from "../../features/run/components/ZoneTransitionModal";
import { ITEMS } from "../../lib/items";
import type { Zone } from "../../lib/regions";

import { TrainingSelector } from "../../features/training/components/TrainingSelector";
import { TrainingLayout } from "../../features/training/components/TrainingLayout";
import { GachaView } from "../../features/meta/components/GachaView";
import { GlobalStatsView } from "../../features/meta/components/GlobalStatsView";
import { GameTutorialModal } from "../../features/run/components/GameTutorialModal";
import { MoveLearningModal } from "../../features/run/components/MoveLearningModal";
import { EvolutionModal } from "../../features/run/components/EvolutionModal";
import { MegaEvolutionModal } from "../../features/run/components/MegaEvolutionModal";
import { useAuth } from "../../context/AuthContext";
import { DebuggerPanel } from "../../features/debug/components/DebuggerPanel";
import { PokemonInjectionModal } from "../../features/debug/components/PokemonInjectionModal";

export function GameLayout({ zones }: { zones: Zone[] }) {
  const { isAdmin } = useAuth();
  const {
    run,
    setRun,
    resetRun,
    training,
    setTraining,
    meta,
    setMeta,
    notifications,
    removeNotification,
  } = useGame();

  const [currentScreen, setCurrentScreen] = React.useState<
    | "main"
    | "starter"
    | "game"
    | "training-select"
    | "training"
    | "gacha"
    | "stats"
  >("main");
  const [isBagOpen, setIsBagOpen] = React.useState(false);
  const [isPokeInjectionOpen, setIsPokeInjectionOpen] = React.useState(false);
  const [showTutorial, setShowTutorial] = React.useState(false);

  // Expose bag control to window for other components (like TeamRoster)
  React.useEffect(() => {
    (window as any).openBag = () => setIsBagOpen(true);
    (window as any).openPokeInjection = () => setIsPokeInjectionOpen(true);
    return () => {
      delete (window as any).openBag;
      delete (window as any).openPokeInjection;
    };
  }, []);

  // Synchronize component state with game context
  React.useEffect(() => {
    if (run.isActive && currentScreen === "starter") {
      setCurrentScreen("game");

      // Trigger tutorial if not hidden and pause
      if (!meta.hideTutorial) {
        setShowTutorial(true);
        setRun((prev) => ({ ...prev, isPaused: true }));
      }
    }
    if (training.isActive && currentScreen === "training-select") {
      setCurrentScreen("training");
    }
  }, [run.isActive, currentScreen, meta.hideTutorial, setRun]);

  const handleCloseTutorial = (hideForever: boolean) => {
    setShowTutorial(false);
    setRun((prev) => ({ ...prev, isPaused: false }));
    if (hideForever) {
      setMeta((prev) => ({ ...prev, hideTutorial: true }));
    }
  };

  const globalElements = (
    <>
      {isBagOpen && <BagModal onClose={() => setIsBagOpen(false)} />}
      {isPokeInjectionOpen && (
        <PokemonInjectionModal onClose={() => setIsPokeInjectionOpen(false)} />
      )}
      <ZoneTransitionModal />
      {showTutorial && <GameTutorialModal onClose={handleCloseTutorial} />}
      {isAdmin && <DebuggerPanel />}
    </>
  );

  // 1. Defeat Screen
  if (
    run.isActive &&
    run.team.length > 0 &&
    run.team.every((p) => p.currentHP === 0)
  ) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center crt-screen p-4">
        <h1 className="font-display text-2xl md:text-3xl text-danger mb-4 text-center drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
          HAS SIDO DERROTADO
        </h1>
        <div className="bg-surface-dark border-4 border-border p-6 md:p-8 max-w-lg w-full flex flex-col gap-4 shadow-[10px_10px_0_rgba(0,0,0,1)]">
          <p className="font-body text-xs text-muted text-center italic leading-relaxed">
            "Tu equipo ya no puede continuar luchando..."
          </p>
          <div className="flex flex-col gap-y-2 mt-4 font-display text-xs text-muted tracking-widest leading-none">
            <div className="flex justify-between">
              <span>STARTER:</span>{" "}
              <span className="text-foreground">{run.starterName}</span>
            </div>
            <div className="flex justify-between">
              <span>MEDALLAS:</span>{" "}
              <span className="text-foreground">{run.gymsBadges.length}/8</span>
            </div>
            <div className="flex justify-between">
              <span>CAPTURAS:</span>{" "}
              <span className="text-foreground">{run.totalCaptured}</span>
            </div>
            <div className="flex justify-between">
              <span>VICTORIAS:</span>{" "}
              <span className="text-foreground">{run.totalBattlesWon}</span>
            </div>
            <div className="flex justify-between">
              <span>DEBILITADOS:</span>{" "}
              <span className="text-danger">{run.totalFainted}</span>
            </div>
            <div className="flex justify-between">
              <span>POKÉDÓLARES:</span>{" "}
              <span className="text-accent">{run.money}</span>
            </div>
          </div>

          <button
            onClick={() => {
              resetRun();
              setCurrentScreen("main");
            }}
            className="mt-8 px-6 py-4 bg-brand border-4 border-brand-deep font-display text-white text-[0.6rem] tracking-widest hover:bg-brand-dark transition-colors hover:translate-x-1 hover:translate-y-1 shadow-[4px_4px_0_rgba(0,0,0,0.8)] hover:shadow-none"
          >
            VOLVER AL MENÚ
          </button>
        </div>
        {globalElements}
      </div>
    );
  }

  // 2. Champion Screen
  if (run.isActive && run.eliteFourDefeated) {
    return (
      <div className="fixed inset-0 z-50 bg-[#1A1A00]/95 flex flex-col items-center justify-center crt-screen p-4">
        <h1 className="font-display text-2xl md:text-3xl text-accent mb-4 text-center drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
          ¡HAS GANADO!
        </h1>
        <div className="bg-surface-dark border-4 border-accent p-6 md:p-8 max-w-lg w-full flex flex-col gap-4 shadow-[10px_10px_0_rgba(0,0,0,1)]">
          <p className="font-body text-xs text-muted text-center italic leading-relaxed">
            "Te has convertido en Campeón de la región."
          </p>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-4 font-display text-[0.6rem] text-muted tracking-widest leading-none">
            <span>STARTER:</span>
            <span className="text-foreground text-right">
              {run.starterName}
            </span>
            <span>TIEMPO:</span>
            <span className="text-foreground text-right">
              {Math.floor((Date.now() - run.startedAt) / 60000)} MIN
            </span>
            <span>CAPTURAS:</span>
            <span className="text-foreground text-right">
              {run.totalCaptured}
            </span>
            <span>VICTORIAS:</span>
            <span className="text-foreground text-right">
              {run.totalBattlesWon}
            </span>
          </div>

          <button
            onClick={() => {
              resetRun();
              setCurrentScreen("main");
            }}
            className="mt-8 px-6 py-4 bg-accent border-4 border-[#B8A038] font-display text-black text-[0.6rem] tracking-widest hover:bg-white transition-colors hover:translate-x-1 hover:translate-y-1 shadow-[4px_4px_0_rgba(0,0,0,0.8)] hover:shadow-none"
          >
            VOLVER AL MENÚ
          </button>
        </div>
        {globalElements}
      </div>
    );
  }

  // 3. Routing Logic
  let screenContent: React.ReactNode;

  switch (currentScreen) {
    case "main":
      screenContent = (
        <MainMenu
          onStartNew={() => setCurrentScreen("starter")}
          onContinue={() => setCurrentScreen("game")}
          onStartTraining={() => setCurrentScreen("training-select")}
          onContinueTraining={() => setCurrentScreen("training")}
          onOpenGacha={() => setCurrentScreen("gacha")}
          onOpenStats={() => setCurrentScreen("stats")}
        />
      );
      break;

    case "stats":
      screenContent = (
        <GlobalStatsView onBack={() => setCurrentScreen("main")} />
      );
      break;

    case "gacha":
      screenContent = <GachaView onBack={() => setCurrentScreen("main")} />;
      break;

    case "starter":
      screenContent = (
        <div className="relative">
          <StarterSelector />
          <button
            onClick={() => setCurrentScreen("main")}
            className="fixed top-4 left-4 z-50 bg-surface-dark border-2 border-border p-2 font-display text-[0.6rem] text-muted hover:text-white transition-colors"
          >
            &lt; VOLVER
          </button>
        </div>
      );
      break;

    case "training-select":
      screenContent = (
        <TrainingSelector onBack={() => setCurrentScreen("main")} />
      );
      break;

    case "training":
      screenContent = <TrainingLayout onNavigate={setCurrentScreen} />;
      break;

    case "game":
    default:
      const isModalActive = !!(
        run.pendingEvolution ||
        run.pendingMoveLearn ||
        run.pendingLootSelection ||
        run.pendingZoneTransition ||
        run.pendingGymDialogue ||
        run.pendingGymCondition ||
        run.pendingMegaEvolution
      );

      screenContent = (
        <div className="flex flex-col h-screen min-h-screen max-h-screen bg-surface overflow-hidden">
          <PauseMenu onReturnToMenu={() => setCurrentScreen("main")} />
          <header className="flex-none bg-surface-dark border-b-2 border-border p-2 z-10 sticky top-0 flex items-center justify-between shadow-pixel">
            <h1 className="font-display text-text-heading text-foreground w-64 shrink-0 drop-shadow-sm">
              POKÉ<span className="text-brand">IDLE</span>
            </h1>
            <div className="flex justify-center flex-1">
              <SpeedControl
                speed={run.speedMultiplier}
                onChange={(s: any) =>
                  setRun((p) => ({ ...p, speedMultiplier: s }))
                }
                isBlocked={isModalActive}
              />
            </div>
            <div className="w-64 shrink-0 flex justify-end gap-2">
              <button
                onClick={() =>
                  !isModalActive && setRun((p) => ({ ...p, isPaused: true }))
                }
                disabled={isModalActive}
                className={clsx(
                  "flex items-center justify-center p-2 bg-surface-alt border-2 border-border transition-colors",
                  isModalActive
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:bg-surface-light hover:text-accent",
                )}
                title={
                  isModalActive
                    ? "Cierra la ventana actual primero"
                    : "Pausar Juego"
                }
              >
                <Menu size={16} />
              </button>
            </div>
          </header>

          <div className="h-screen max-h-screen bg-border text-foreground flex flex-col md:flex-row overflow-hidden w-full relative p-1 gap-1">
            <LootSelectionModal />
            <MoveLearningModal />
            <EvolutionModal />
            <MegaEvolutionModal />

            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
              {notifications.map((notif) => (
                <EventToast
                  key={notif.id}
                  notification={notif}
                  onDismiss={() => removeNotification(notif.id)}
                />
              ))}
            </div>

            <div className="flex-1 md:w-[320px] md:max-w-[320px] border-2 border-border bg-slate-200 overflow-y-auto hidden md:flex flex-col">
              <RegionMap zones={zones} />
              <TeamRoster />
            </div>

            <div className="flex-[1.5] flex flex-col min-w-[400px]">
              <BattleView />
              {run.isManualBattle && <ManualBattleHUD />}
            </div>

            <div className="flex-1 md:w-[320px] md:max-w-[320px] border-2 border-border bg-surface overflow-hidden hidden md:flex flex-col">
              <div className="flex-none flex flex-col border-b-2 border-border bg-surface">
                <ZoneView />
                <ItemBag />
                <div className="bg-surface-dark border-t-2 border-border p-3 px-4 flex items-center shadow-inner min-h-[48px]">
                  <div className="flex flex-wrap items-center gap-4">
                    {Object.entries(run.items)
                      .filter(
                        ([id, qty]) =>
                          (qty as number) > 0 && ITEMS[id]?.category === "ball",
                      )
                      .map(([id, qty]) => (
                        <div
                          key={id}
                          className="flex items-center gap-1.5 grayscale-[0.2] hover:grayscale-0 transition-all group"
                          title={ITEMS[id]?.name}
                        >
                          <img
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${id}.png`}
                            alt={id}
                            className="w-6 h-6 rendering-pixelated group-hover:scale-110 transition-transform"
                          />
                          <span className="font-display text-[0.7rem] text-foreground font-bold">
                            x{qty as number}
                          </span>
                        </div>
                      ))}
                    {Object.entries(run.items).filter(
                      ([id, qty]) =>
                        (qty as number) > 0 && ITEMS[id]?.category === "ball",
                    ).length === 0 && (
                      <span className="font-body text-[0.6rem] text-muted italic uppercase tracking-tighter">
                        Sin Poké Balls disponibles
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col bg-surface-dark">
                <BattleLog />
              </div>
            </div>

            <div className="md:hidden p-4 text-center font-display text-[0.45rem] bg-surface text-brand border-t-2 border-brand/50 tracking-widest flex items-center justify-center">
              SE RECOMIENDA PANTALLA ANCHA O ROTAR DISPOSITIVO
            </div>
          </div>
        </div>
      );
      break;
  }

  return (
    <>
      {screenContent}
      {globalElements}
    </>
  );
}
