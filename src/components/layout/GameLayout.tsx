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
import { EventToast } from "../../components/ui/EventToast";
import { LootSelectionModal } from "../../features/run/components/LootSelectionModal";

import { TrainingSelector } from "../../features/training/components/TrainingSelector";
import { TrainingLayout } from "../../features/training/components/TrainingLayout";
import { GachaView } from "../../features/meta/components/GachaView";
import { GlobalStatsView } from "../../features/meta/components/GlobalStatsView";

export function GameLayout() {
  const {
    run,
    setRun,
    training,
    setTraining,
    meta,
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

  // Synchronize component state with game context
  React.useEffect(() => {
    if (run.isActive && currentScreen === "starter") {
      setCurrentScreen("game");
    }
    if (training.isActive && currentScreen === "training-select") {
      setCurrentScreen("training");
    }
  }, [run.isActive, training.isActive, currentScreen]);

  // Defeat Screen
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
              setRun((prev) => ({
                ...prev,
                isActive: false,
                currentBattle: null,
                team: [],
              }));
              setCurrentScreen("main");
            }}
            className="mt-8 px-6 py-4 bg-brand border-4 border-brand-deep font-display text-white text-[0.6rem] tracking-widest hover:bg-brand-dark transition-colors hover:translate-x-1 hover:translate-y-1 shadow-[4px_4px_0_rgba(0,0,0,0.8)] hover:shadow-none"
          >
            VOLVER AL MENÚ
          </button>
        </div>
      </div>
    );
  }

  // Champion Screen
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
              setRun((prev) => ({
                ...prev,
                isActive: false,
                currentBattle: null,
                team: [],
              }));
              setCurrentScreen("main");
            }}
            className="mt-8 px-6 py-4 bg-accent border-4 border-[#B8A038] font-display text-black text-[0.6rem] tracking-widest hover:bg-white transition-colors hover:translate-x-1 hover:translate-y-1 shadow-[4px_4px_0_rgba(0,0,0,0.8)] hover:shadow-none"
          >
            VOLVER AL MENÚ
          </button>
        </div>
      </div>
    );
  }

  // Routing Logic
  if (currentScreen === "main") {
    return (
      <MainMenu
        onStartNew={() => setCurrentScreen("starter")}
        onContinue={() => setCurrentScreen("game")}
        onStartTraining={() => setCurrentScreen("training-select")}
        onContinueTraining={() => setCurrentScreen("training")}
        onOpenGacha={() => setCurrentScreen("gacha")}
        onOpenStats={() => setCurrentScreen("stats")}
      />
    );
  }

  if (currentScreen === "stats") {
    return <GlobalStatsView onBack={() => setCurrentScreen("main")} />;
  }

  if (currentScreen === "gacha") {
    return <GachaView onBack={() => setCurrentScreen("main")} />;
  }

  if (currentScreen === "starter") {
    return (
      <div className="relative">
        <StarterSelector />
        <button
          onClick={() => setCurrentScreen("main")}
          className="fixed top-4 left-4 z-[100] bg-surface-dark border-2 border-border p-2 font-display text-[0.6rem] text-muted hover:text-white transition-colors"
        >
          &lt; VOLVER
        </button>
      </div>
    );
  }

  if (currentScreen === "training-select") {
    return (
      <div className="relative h-screen bg-surface-dark">
        <TrainingSelector />
        <button
          onClick={() => setCurrentScreen("main")}
          className="fixed top-4 left-4 z-[100] bg-surface-dark border-2 border-border p-2 font-display text-[0.6rem] text-muted hover:text-white transition-colors"
        >
          &lt; VOLVER
        </button>
      </div>
    );
  }

  if (currentScreen === "training") {
    return <TrainingLayout onNavigate={setCurrentScreen} />;
  }

  return (
    <div className="flex flex-col h-screen min-h-screen max-h-screen bg-surface overflow-hidden">
      <PauseMenu onReturnToMenu={() => setCurrentScreen("main")} />
      {/* HEADER */}
      <header className="flex-none bg-surface-dark border-b-2 border-border p-2 z-10 sticky top-0 flex items-center justify-between shadow-pixel">
        <h1 className="font-display text-text-heading text-foreground w-64 shrink-0 drop-shadow-sm">
          POKÉ<span className="text-brand">IDLE</span>
        </h1>
        <div className="flex justify-center flex-1">
          <SpeedControl
            speed={run.speedMultiplier}
            onChange={(s: any) => setRun((p) => ({ ...p, speedMultiplier: s }))}
          />
        </div>
        <div className="w-64 shrink-0 flex justify-end">
          <button
            onClick={() => setRun((p) => ({ ...p, isPaused: true }))}
            className="flex items-center justify-center p-2 bg-surface-alt border-2 border-border cursor-pointer hover:bg-surface-light hover:text-accent transition-colors"
            title="Pausar Juego"
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      <div className="h-screen max-h-screen bg-black text-foreground flex flex-col md:flex-row overflow-hidden max-w-[1600px] mx-auto xl:border-x-4 border-border relative">
        <LootSelectionModal />

        {/* Modals & Overlays */}
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {notifications.map((notif) => (
            <EventToast
              key={notif.id}
              notification={notif}
              onDismiss={() => removeNotification(notif.id)}
            />
          ))}
        </div>

        {/* Left Panel */}
        <div className="flex-1 md:w-[320px] md:max-w-[320px] border-r border-border bg-surface flex flex-col overflow-y-auto hidden md:flex">
          <RegionMap />
          <TeamRoster />
        </div>

        {/* Center Panel */}
        <div className="flex-[1.5] flex flex-col min-w-[400px]">
          <BattleView />
          {run.isManualBattle ? <ManualBattleHUD /> : <BattleLog />}
        </div>

        {/* Right Panel */}
        <div className="flex-1 md:w-[320px] md:max-w-[320px] border-l border-border bg-surface flex flex-col overflow-y-auto hidden md:flex">
          {run.isManualBattle && <BattleLog />}
          <ZoneView />
          <ItemBag />
          <CaptureLog />
        </div>

        {/* Mobile Disclaimer */}
        <div className="md:hidden p-4 text-center font-display text-[0.45rem] bg-surface text-brand border-t-2 border-brand/50 tracking-widest flex items-center justify-center">
          SE RECOMIENDA PANTALLA ANCHA O ROTAR DISPOSITIVO
        </div>
      </div>
    </div>
  );
}
