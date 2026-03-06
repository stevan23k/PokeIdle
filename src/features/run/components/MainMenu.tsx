import React, { useState } from "react";
import { useGame } from "../../../context/GameContext";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { Button } from "../../../components/ui/Button";
import { useAuth } from "../../../context/AuthContext";

interface Props {
  onStartNew: () => void;
  onContinue: () => void;
  onStartTraining: () => void;
  onContinueTraining: () => void;
  onOpenGacha: () => void;
  onOpenStats?: () => void;
}

export function MainMenu({
  onStartNew,
  onContinue,
  onStartTraining,
  onContinueTraining,
  onOpenGacha,
  onOpenStats,
}: Props) {
  const { run, setRun, training, setTraining, meta } = useGame();
  const { logout, isGuest } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTrainingConfirm, setShowTrainingConfirm] = useState(false);

  const handleStartNewClick = () => {
    if (run.isActive || run.team.length > 0) {
      setShowConfirm(true);
    } else {
      onStartNew();
    }
  };

  const handleConfirmNew = () => {
    setShowConfirm(false);
    // Hard reset run state if there was an active one
    setRun((prev) => ({
      ...prev,
      isActive: false,
      currentBattle: null,
      team: [],
    }));
    onStartNew();
  };

  return (
    <div
      className="fixed h-screen inset-0 z-50 bg-color-surface flex flex-col items-center align-center justify-center p-4 crt-screen"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <div className="w-full max-w-lg z-10 flex flex-col items-center relative">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-center text-brand mb-2 drop-shadow-[6px_6px_0_rgba(0,0,0,0.8)] animate-pulse">
          Poké<span className="text-white">Idle</span>
        </h1>
        <h2 className="font-display text-2xl sm:text-sm text-center text-accent mb-16 tracking-[0.5em] opacity-90 drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]">
          ROGUELIKE TRAINER
        </h2>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          {run.isActive && (
            <Button
              onClick={onContinue}
              variant="secondary"
              size="lg"
              className="w-full text-accent"
            >
              CONTINUAR PARTIDA
            </Button>
          )}

          <Button
            onClick={handleStartNewClick}
            variant="primary"
            size="lg"
            className="w-full"
          >
            NUEVA PARTIDA
          </Button>

          <Button
            onClick={() => {
              if (training.isActive) {
                setShowTrainingConfirm(true);
              } else {
                onStartTraining();
              }
            }}
            variant="secondary"
            size="lg"
            className="w-full flex-col gap-1 py-4"
          >
            <span className="group-hover:text-brand transition-colors">
              ENTRENAMIENTO INFINITO ⚔️
            </span>
            <span className="text-[0.6rem] text-accent opacity-80 group-hover:opacity-100 transition-opacity whitespace-normal text-center">
              💰 {meta.pokeCoins} POKÉCOINS
            </span>
          </Button>

          {/* Statistics Button */}
          <Button
            onClick={onOpenStats}
            variant="secondary"
            size="md"
            className="w-full flex items-center justify-between group p-3"
          >
            <div className="flex flex-col items-start translate-x-0 group-hover:translate-x-1 transition-transform truncate text-left">
              <span className="text-subtitle text-[0.6rem] text-accent tracking-widest uppercase mb-1">
                HISTORIAL
              </span>
              <span className="text-value text-[0.2rem] uppercase flex items-center gap-2">
                ESTADÍSTICAS
              </span>
              <span className="text-body text-label text-muted italic lowercase mt-1 text-wrap">
                Ver tus logros y progreso
              </span>
            </div>
            <div className="w-10 h-10 shrink-0 flex items-center justify-center border-2 border-accent group-hover:bg-accent group-hover:text-black transition-colors ml-2">
              📊
            </div>
          </Button>

          <div className="border-t border-border my-2 opacity-50"></div>

          <div className="relative mt-8 w-full flex flex-col items-center">
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/384.gif"
              alt="Gacha Preview"
              className="w-20 h-20 pixelated absolute -top-16 animate-bounce drop-shadow-lg"
            />
            <Button
              onClick={onOpenGacha}
              variant="secondary"
              size="lg"
              className="w-full text-accent"
            >
              INVOCACIÓN LEGENDARIA
            </Button>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2">
            <span className="font-display text-[1rem] text-muted uppercase tracking-[0.2em] opacity-60">
              {isGuest ? "Sessión: INVITADO" : "Sesión Activada"}
            </span>
            <button
              onClick={() => logout()}
              className="font-display text-[0.8rem] text-brand hover:text-white transition-colors uppercase underline underline-offset-4"
            >
              CERRAR SESIÓN
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="¿Sobreescribir Partida?"
        message="Tienes una partida en curso. Empezar una nueva borrará todo el progreso de la actual. ¿Estás seguro de continuar?"
        confirmText="Sí, Nueva Partida"
        cancelText="Cancelar"
        onConfirm={handleConfirmNew}
        onClose={() => setShowConfirm(false)}
      />

      <ConfirmModal
        isOpen={showTrainingConfirm}
        title="Sesión de Entrenamiento"
        message="Tienes una sesión de entrenamiento activa. ¿Qué deseas hacer?"
        confirmText="Continuar Entrenamiento"
        cancelText="Empezar de Cero"
        onConfirm={() => {
          setShowTrainingConfirm(false);
          onContinueTraining(); // We'll need to add this prop
        }}
        onClose={() => {
          setShowTrainingConfirm(false);
          // Start New Training logic: Reset training state
          setTraining((prev) => ({
            ...prev,
            isActive: false,
            currentBattle: null,
          }));
          onStartTraining();
        }}
      />
    </div>
  );
}
