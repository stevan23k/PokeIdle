import React from "react";
import { createPortal } from "react-dom";
import { MousePointer2, Cpu, X, Play } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

interface StartConfigModalProps {
  onSelect: (config: {
    isManualBattle: boolean;
    autoCapture: boolean;
    autoItems: boolean;
  }) => void;
  onCancel: () => void;
  starterName: string;
}

export function StartConfigModal({
  onSelect,
  onCancel,
  starterName,
}: StartConfigModalProps) {
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
      <Card className="w-full max-w-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onCancel}
          className="absolute -top-4 -right-4 w-10 h-10 bg-danger border-4 border-black text-white flex items-center justify-center hover:bg-red-500 hover:-translate-y-1 transition-transform z-10 shadow-pixel"
        >
          <X size={20} />
        </button>

        <h2 className="font-display text-xl md:text-2xl text-brand mb-2 text-center tracking-widest uppercase drop-shadow-md">
          CONFIGURACIÓN DE RUN
        </h2>
        <p className="font-body text-[0.7rem] text-muted text-center mb-10 uppercase tracking-widest border-b border-dashed border-border/30 pb-4">
          STARTER: <span className="text-white font-bold">{starterName}</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MODO IDLE */}
          <button
            onClick={() =>
              onSelect({
                isManualBattle: false,
                autoCapture: true,
                autoItems: true,
              })
            }
            className="group flex flex-col items-center p-8 bg-surface border-4 border-border hover:border-success transition-all hover:-translate-y-2 hover:shadow-[0_12px_0_rgba(34,197,94,0.3)]"
          >
            <div className="w-20 h-20 bg-surface-dark border-2 border-border flex items-center justify-center mb-6 group-hover:border-success group-hover:text-success transition-colors group-hover:scale-110">
              <Cpu size={40} />
            </div>
            <h3 className="font-display text-base text-foreground mb-3 group-hover:text-success transition-colors tracking-widest">
              MODO IDLE
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[0.65rem] text-muted uppercase font-body">
                <span className="w-1.5 h-1.5 bg-success rounded-full" />
                <span>COMBATES AUTO</span>
              </div>
              <div className="flex items-center gap-2 text-[0.65rem] text-muted uppercase font-body">
                <span className="w-1.5 h-1.5 bg-success rounded-full" />
                <span>CAPTURA AUTO (ON)</span>
              </div>
              <div className="flex items-center gap-2 text-[0.65rem] text-muted uppercase font-body">
                <span className="w-1.5 h-1.5 bg-success rounded-full" />
                <span>CURACIÓN AUTO (ON)</span>
              </div>
            </div>
            <span className="mt-6 text-[0.55rem] text-success font-bold tracking-[0.2em] italic uppercase">
              Progrés Rápido
            </span>
          </button>

          {/* MODO MANUAL */}
          <button
            onClick={() =>
              onSelect({
                isManualBattle: true,
                autoCapture: false,
                autoItems: false,
              })
            }
            className="group flex flex-col items-center p-8 bg-surface border-4 border-border hover:border-brand transition-all hover:-translate-y-2 hover:shadow-[0_12px_0_rgba(204,0,0,0.3)]"
          >
            <div className="w-20 h-20 bg-surface-dark border-2 border-border flex items-center justify-center mb-6 group-hover:border-brand group-hover:text-brand transition-colors group-hover:scale-110">
              <MousePointer2 size={40} />
            </div>
            <h3 className="font-display text-base text-foreground mb-3 group-hover:text-brand transition-colors tracking-widest">
              MODO MANUAL
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[0.65rem] text-muted uppercase font-body">
                <span className="w-1.5 h-1.5 bg-brand rounded-full" />
                <span>TOTAL CONTROL</span>
              </div>
              <div className="flex items-center gap-2 text-[0.65rem] text-muted uppercase font-body">
                <span className="w-1.5 h-1.5 bg-brand rounded-full" />
                <span>CAPTURA MANUAL</span>
              </div>
              <div className="flex items-center gap-2 text-[0.65rem] text-muted uppercase font-body">
                <span className="w-1.5 h-1.5 bg-brand rounded-full" />
                <span>GESTIÓN MANUAL</span>
              </div>
            </div>
            <span className="mt-6 text-[0.55rem] text-brand font-bold tracking-[0.2em] italic uppercase">
              Exp. Clásica
            </span>
          </button>
        </div>

        <div className="mt-10 pt-6 border-t border-dashed border-border/50 flex flex-col items-center gap-6">
          <p className="font-body text-[0.6rem] text-muted text-center italic max-w-md leading-relaxed">
            "Podrás cambiar el estilo de juego en cualquier momento usando los
            interruptores del menú de zona."
          </p>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-muted hover:text-danger uppercase tracking-[0.3em] flex items-center gap-2"
          >
            <X size={14} /> CANCELAR
          </Button>
        </div>
      </Card>
    </div>,
    document.body,
  );
}
