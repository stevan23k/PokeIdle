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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="max-w-sm w-full relative pt-8">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-surface px-4 py-1 border-2 border-border">
              <h2 className="font-display text-accent-blue text-sm uppercase drop-shadow-sm">
                PAUSA
              </h2>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <Card variant="alt" noPadding className="p-3 mb-2">
                <h3 className="font-display text-[0.6rem] text-brand tracking-widest uppercase mb-3 flex items-center gap-2">
                  🏃 RUN ACTUAL
                </h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 font-body text-[0.65rem] text-muted leading-none">
                  <div className="flex justify-between">
                    <span>TIEMPO:</span>{" "}
                    <span className="text-foreground">
                      {formatDuration(Date.now() - run.startedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ZONA:</span>{" "}
                    <span className="text-foreground">
                      {currentZone?.name || "???"} ({run.currentZoneProgress}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>MEDALLAS:</span>{" "}
                    <span className="text-foreground">
                      {run.gymsBadges.length}/8
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>CAPTURAS:</span>{" "}
                    <span className="text-foreground">{run.totalCaptured}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VICTORIAS:</span>{" "}
                    <span className="text-foreground">
                      {run.totalBattlesWon}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>DEBILITADOS:</span>{" "}
                    <span className="text-danger">{run.totalFainted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>POKÉDÓLARES:</span>{" "}
                    <span className="text-accent">{run.money}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MAX NIVEL:</span>{" "}
                    <span className="text-foreground">
                      {Math.max(...run.team.map((p) => p.level), 0)}
                    </span>
                  </div>
                </div>
              </Card>

              <Button
                variant="primary"
                onClick={togglePause}
                className="w-full text-foreground"
              >
                Reanudar Aventura
              </Button>

              <Button
                variant="secondary"
                onClick={handleExit}
                className="w-full text-muted"
              >
                Guardar y Salir
              </Button>

              <Button
                variant="danger"
                onClick={() => setShowConfirm(true)}
                className="w-full mt-4"
              >
                Rendirse y Reiniciar
              </Button>
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
