import React, { useState } from "react";
import { useGame } from "../../../context/GameContext";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { generateUid } from "../../../utils/random";
import { REGIONS } from "../../../lib/regions";
interface Props {
  onReturnToMenu?: () => void;
}

export function PauseMenu({ onReturnToMenu }: Props) {
  const { run, setRun, setMeta, resetRun, saveGame } = useGame();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!run.isActive) return null;

  const currentRegion = REGIONS[run.currentRegion];
  const currentZone = currentRegion.zones[run.currentZoneIndex];

  const togglePause = () => {
    setRun((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleRestart = () => {
    // Save to history before resetting
    setMeta((m) => ({
      ...m,
      totalRuns: m.totalRuns + 1,
      runHistory: [
        {
          runId: run.runId,
          startedAt: run.startedAt,
          endedAt: Date.now(),
          starterId: run.starterId,
          badges: run.gymsBadges.length,
          zoneReached: "Abandonado",
          totalCaptured: run.totalCaptured,
          totalBattlesWon: run.totalBattlesWon,
          totalFainted: run.totalFainted,
          moneyEarned: run.money,
          maxLevel: Math.max(...run.team.map((p) => p.level), 0),
          duration: Date.now() - run.startedAt,
          reasonEnded: "defeat",
        },
        ...m.runHistory,
      ],
    }));

    resetRun();

    if (onReturnToMenu) {
      onReturnToMenu();
    }
  };

  const handleExit = () => {
    saveGame();
    if (onReturnToMenu) {
      onReturnToMenu();
    }
  };

  return (
    <>
      {run.isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="max-w-2xl w-full relative pt-12 pb-8 px-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-border">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface-dark px-10 py-2 border-4 border-border shadow-pixel">
              <h2 className="font-display text-accent text-xl tracking-[0.3em] uppercase drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]">
                PAUSA
              </h2>
            </div>

            <div className="flex flex-col gap-6 mt-4">
              <Card variant="alt" noPadding className="p-6 bg-surface-dark/50 border-2 border-border/50">
                <h3 className="font-display text-xs text-brand tracking-[0.2em] uppercase mb-6 flex items-center gap-3 border-b border-border/30 pb-3">
                  <span className="text-lg">🏃</span> RESUMEN DE LA AVENTURA
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 font-body text-xs text-white uppercase tracking-wider">
                  <div className="flex justify-between items-center border-b border-border/10 pb-1">
                    <span className="text-[0.6rem] text-muted-foreground opacity-70">TIEMPO DE JUEGO:</span>
                    <span className="font-display text-[0.6rem] text-accent">
                      {formatDuration(Date.now() - run.startedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1">
                    <span className="text-[0.6rem] text-muted-foreground opacity-70">ZONA ACTUAL:</span>
                    <span className="font-display text-[0.6rem] text-white">
                      {currentZone?.name || "???"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1">
                    <span className="text-[0.6rem] text-muted-foreground opacity-70">MEDALLAS:</span>
                    <span className="font-display text-[0.6rem] text-accent">
                      {run.gymsBadges.length}/8
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1">
                    <span className="text-[0.6rem] text-muted-foreground opacity-70">POKÉDÓLARES:</span>
                    <span className="font-display text-[0.6rem] text-success">
                      ${run.money}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1">
                    <span className="text-[0.6rem] text-muted-foreground opacity-70">POKÉMON CAPTURADOS:</span>
                    <span className="font-display text-[0.6rem] text-white">
                      {run.totalCaptured}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1">
                    <span className="text-[0.6rem] text-muted-foreground opacity-70">BATALLAS GANADAS:</span>
                    <span className="font-display text-[0.6rem] text-white">
                      {run.totalBattlesWon}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1">
                    <span className="text-[0.6rem] text-muted-foreground opacity-70">POKÉMON DEBILITADOS:</span>
                    <span className="font-display text-[0.6rem] text-danger">
                      {run.totalFainted}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/10 pb-1">
                    <span className="text-[0.6rem] text-muted-foreground opacity-70">NIVEL MÁXIMO:</span>
                    <span className="font-display text-[0.6rem] text-white">
                      {Math.max(...run.team.map((p) => p.level), 0)}
                    </span>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="primary"
                  onClick={togglePause}
                  className="py-6 text-sm font-display tracking-widest shadow-pixel hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                >
                  REANUDAR AVENTURA
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleExit}
                  className="py-6 text-sm font-display tracking-widest shadow-pixel hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                >
                  GUARDAR Y SALIR
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t-2 border-border/30">
                <Button
                  variant="danger"
                  onClick={() => setShowConfirm(true)}
                  className="w-full py-4 text-[0.6rem] font-display tracking-widest opacity-80 hover:opacity-100 transition-opacity"
                >
                  RENDIRSE Y REINICIAR RUN
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        title="¿Rendirse?"
        message="Perderás todo el progreso de la Run actual. Los desbloqueables se mantendrán. ¿Estás seguro?"
        confirmText="Sí, Rendirse"
        cancelText="Cancelar"
        onConfirm={handleRestart}
        onClose={() => setShowConfirm(false)}
      />
    </>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}
