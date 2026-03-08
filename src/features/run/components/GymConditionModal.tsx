import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Info, X, Zap, Droplets, Mountain, Sprout, Skull, Move, Flame, Globe } from "lucide-react";
import type { GymMechanic } from "../types/game.types";

interface GymConditionModalProps {
  mechanic: GymMechanic;
  onClose: () => void;
}

const MECHANIC_INFO: Record<
  GymMechanic,
  {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }
> = {
  terreno_duro: {
    title: "Terreno Duro",
    description: "La dureza del terreno potencia los movimientos de tipo Agua y Planta en un 25%.",
    icon: <Mountain size={48} />,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  lluvia_constante: {
    title: "Lluvia Constante",
    description: "Una lluvia incesante potencia los movimientos de Agua (x1.5) y debilita los de Fuego (x0.5).",
    icon: <Droplets size={48} />,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  campo_electrificado: {
    title: "Campo Electrificado",
    description: "La estática en el aire permite que los movimientos de Tierra causen un 50% más de daño.",
    icon: <Zap size={48} />,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
  },
  esporas_aire: {
    title: "Esporas en el Aire",
    description: "Esporas paralizantes flotan en el gimnasio. Hay un 10% de probabilidad de dormir al atacante (excepto tipos Fuego, Hielo, Veneno o Acero).",
    icon: <Sprout size={48} />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
  },
  niebla_toxica: {
    title: "Niebla Tóxica",
    description: "Una neblina venenosa envuelve el campo. Al final de cada turno, cura a los Pokémon de tipo Veneno y daña a los demás (excepto Acero).",
    icon: <Skull size={48} />,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
  },
  inversion_stats: {
    title: "Espacio Raro",
    description: "Un extraño flujo de energía invierte todos los modificadores de estadísticas, precisión y evasión. ¡Lo débil es fuerte!",
    icon: <Move size={48} />,
    color: "text-fuchsia-400",
    bgColor: "bg-fuchsia-400/10",
  },
  suelo_ardiente: {
    title: "Suelo Ardiente",
    description: "El calor extremo quema a cualquier Pokémon que entre en combate, a menos que sea de tipo Fuego, Tierra o Roca.",
    icon: <Flame size={48} />,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  gravedad_aumentada: {
    title: "Gravedad Aumentada",
    description: "La gravedad extrema permite que los ataques de Tierra golpeen a Pokémon Voladores. Además, reduce la velocidad y anula movimientos de alta prioridad.",
    icon: <Globe size={48} />,
    color: "text-stone-300",
    bgColor: "bg-stone-300/10",
  },
};

export function GymConditionModal({ mechanic, onClose }: GymConditionModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "z" || e.key === "Z" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  const info = MECHANIC_INFO[mechanic];

  if (!info) return null;

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
      <div className="bg-surface-dark border-4 border-border w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-surface-alt border-b-4 border-border p-4 flex justify-between items-center sm:px-8">
          <div className="flex flex-col">
            <h2 className="font-display text-base text-brand tracking-[0.2em] uppercase flex items-center gap-2">
              <Info size={18} /> Condición del Gimnasio
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-display text-[0.6rem] text-muted hover:text-brand transition-colors border-2 border-border px-2 py-1 hover:border-brand"
          >
            ENTENDIDO
          </button>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 flex flex-col items-center text-center">
          <div className={`${info.bgColor} ${info.color} p-6 rounded-full mb-6 animate-pulse border-4 border-current/20 shadow-lg shadow-current/5`}>
            {info.icon}
          </div>
          <h3 className={`font-display text-xl ${info.color} mb-4 tracking-widest uppercase`}>
            {info.title}
          </h3>
          <p className="font-body text-base text-foreground/90 leading-relaxed max-w-sm">
            {info.description}
          </p>
        </div>

        {/* Footer */}
        <div className="bg-surface-alt border-t-4 border-border p-6 flex justify-center">
          <button
            onClick={onClose}
            className={`w-full py-3 bg-surface border-2 border-border font-display text-sm tracking-widest uppercase transition-all hover:border-brand hover:text-brand active:scale-95 flex items-center justify-center gap-2`}
          >
            Aceptar Desafío
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
