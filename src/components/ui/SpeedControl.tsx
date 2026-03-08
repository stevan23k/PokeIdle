import React, { useEffect } from 'react';
import { clsx } from "clsx";

type SpeedOption = 0 | 1 | 2 | 4 | "SKIP";

interface Props {
  speed: SpeedOption;
  onChange: (s: SpeedOption) => void;
  isBlocked?: boolean;
}

const SPEEDS: SpeedOption[] = [0, 1, 2, 4, "SKIP"];

export function SpeedControl({ speed, onChange, isBlocked }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBlocked) return;
      
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return; // Do not trigger hotkeys when typing
      }
      
      switch (e.key) {
        case " ": // Spacebar
          e.preventDefault();
          onChange(0);
          break;
        case "1":
          onChange(1);
          break;
        case "2":
          onChange(2);
          break;
        case "3":
          onChange(4);
          break;
        case "4":
          onChange("SKIP");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChange, isBlocked]);

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center p-2" aria-label="Control de velocidad">
      <span className="text-xs text-muted font-display mr-2 hidden md:inline">VELOCIDAD</span>
      <div className="flex gap-1.5">
        {SPEEDS.map(s => {
          const isActive = speed === s;
          let label = `x${s}`;
          if (s === "SKIP") label = ">>|";
          if (s === 0) label = "PAUSA";
          
          return (
             <button
              key={s}
              onClick={() => onChange(s)}
              className={clsx(
                "px-2 py-1 text-[0.6rem] md:text-xs font-display border-2 select-none",
                isActive 
                  ? "bg-brand border-brand text-white translate-x-[2px] translate-y-[2px]" 
                  : "bg-surface-alt border-border text-muted pixel-shadow-sm hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_rgba(0,0,0,0.8)]"
              )}
              title={s === 0 ? "Barra espaciadora" : s === "SKIP" ? "Tecla 4" : `Tecla ${s === 4 ? 3 : s}`}
              aria-pressed={isActive}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  );
}
