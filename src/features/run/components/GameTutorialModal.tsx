import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Map as MapIcon,
  Backpack,
  Users,
  Settings2,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface GameTutorialModalProps {
  onClose: (hideForever: boolean) => void;
}

export function GameTutorialModal({ onClose }: GameTutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [hideForever, setHideForever] = useState(false);

  const steps: TutorialStep[] = [
    {
      title: "Exploración y Mapa",
      description:
        "Haz clic en el icono del mapa para viajar entre rutas y ciudades. Cada zona tiene diferentes Pokémon y niveles de dificultad.",
      icon: <MapIcon size={48} />,
      color: "text-brand",
    },
    {
      title: "Inventario y Objetos",
      description:
        "Gestiona tus Poké Balls, pociones y objetos equipables. Puedes anclar objetos importantes para usarlos rápidamente desde el panel lateral.",
      icon: <Backpack size={48} />,
      color: "text-accent",
    },
    {
      title: "Tu Equipo Pokémon",
      description:
        "Revisa las estadísticas de tu equipo, equipa objetos o libera pokemones para actualizar tu equipo!. Haz clic en 'Inventario' dentro del panel de equipo para abrir tu mochila.",
      icon: <Users size={48} />,
      color: "text-hp",
    },
    {
      title: "Controles de Acción",
      description:
        "Usa los botones de control para automatizar la run: Auto-Curación (mantiene tus Pokémon sanos), Auto-Captura y Batalla Manual.",
      icon: <Settings2 size={48} />,
      color: "text-success",
    },
  ];

  const next = () => {
    if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1);
    else onClose(hideForever);
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

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
      <div className="bg-surface-dark border-4 border-border w-full max-w-xl shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-surface-alt border-b-4 border-border p-4 flex justify-between items-center sm:px-8">
          <div className="flex flex-col">
            <h2 className="font-display text-sm md:text-base text-brand tracking-[0.2em] uppercase">
              Guía de Entrenador
            </h2>
            <span className="font-display text-[0.5rem] text-muted uppercase tracking-widest">
              Paso {currentStep + 1} de {steps.length}
            </span>
          </div>
          <button
            onClick={() => onClose(hideForever)}
            className="font-display text-[0.6rem] text-muted hover:text-brand transition-colors border-2 border-border px-2 py-1 hover:border-brand"
          >
            SALTAR
          </button>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 flex flex-col items-center text-center">
          <div className={`${steps[currentStep].color} mb-6 animate-bounce`}>
            {steps[currentStep].icon}
          </div>
          <h3 className="font-display text-lg text-foreground mb-4 tracking-widest uppercase">
            {steps[currentStep].title}
          </h3>
          <p className="font-body text-sm text-muted leading-relaxed max-w-sm">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Footer */}
        <div className="bg-surface-alt border-t-4 border-border p-6 md:px-8 space-y-6">
          <div className="flex justify-between items-center">
            <button
              onClick={prev}
              disabled={currentStep === 0}
              className={`flex items-center gap-1 font-display text-[0.65rem] tracking-widest uppercase transition-colors ${
                currentStep === 0
                  ? "opacity-0 pointer-events-none"
                  : "text-muted hover:text-white"
              }`}
            >
              <ChevronLeft size={14} /> Anterior
            </button>

            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 border border-border transition-colors ${i === currentStep ? "bg-brand" : "bg-surface"}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="flex items-center gap-1 font-display text-[0.65rem] text-brand hover:text-white tracking-widest uppercase transition-colors"
            >
              {currentStep === steps.length - 1 ? "Empezar" : "Siguiente"}{" "}
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 py-2 border-t border-dashed border-border/30 pt-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={hideForever}
                onChange={(e) => setHideForever(e.target.checked)}
                className="hidden"
              />
              <div
                className={`w-5 h-5 border-2 border-border flex items-center justify-center transition-colors ${hideForever ? "bg-brand border-brand" : "bg-surface group-hover:border-brand/50"}`}
              >
                {hideForever && <X size={14} className="text-white" />}
              </div>
              <span className="font-display text-[0.6rem] text-muted group-hover:text-white transition-colors uppercase tracking-widest">
                No volver a mostrar
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
