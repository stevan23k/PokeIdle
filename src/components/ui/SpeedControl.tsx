import React from 'react';
import { clsx } from "clsx";

type SpeedOption = 1 | 2 | 4 | "SKIP";

interface Props {
  speed: SpeedOption;
  onChange: (s: SpeedOption) => void;
}

const SPEEDS: SpeedOption[] = [1, 2, 4, "SKIP"];

export function SpeedControl({ speed, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 bg-surface p-2 border-b-2 border-border" aria-label="Control de velocidad">
      <span className="text-xs text-muted font-display mr-2">VELOCIDAD</span>
      <div className="flex gap-1.5">
        {SPEEDS.map(s => {
          const isActive = speed === s;
          return (
             <button
              key={s}
              onClick={() => onChange(s)}
              className={clsx(
                "px-2 py-1 text-xs font-display border-2 select-none",
                isActive 
                  ? "bg-brand border-brand text-white translate-x-[2px] translate-y-[2px]" 
                  : "bg-surface-alt border-border text-muted pixel-shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.8)]"
              )}
              aria-pressed={isActive}
            >
              {s === "SKIP" ? ">>|" : `x${s}`}
            </button>
          )
        })}
      </div>
    </div>
  );
}
