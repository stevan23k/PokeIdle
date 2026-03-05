import React from "react";

interface Props {
  currentHP: number;
  maxHP: number;
  showText?: boolean;
  barColor?: string;
}

export function HPBar({ currentHP, maxHP, showText = true, barColor }: Props) {
  const percent = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));

  let colorClass = barColor || "bg-hp";
  if (!barColor) {
    if (percent <= 20) colorClass = "bg-hp-critical";
    else if (percent <= 50) colorClass = "bg-hp-low";
  }

  return (
    <div className="w-full flex flex-col">
      <div
        className="w-full h-3 bg-surface-dark border-2 border-border shadow-inner overflow-hidden relative"
        role="progressbar"
        aria-valuenow={currentHP}
        aria-valuemin={0}
        aria-valuemax={maxHP}
        aria-label={`HP: ${Math.floor(currentHP)}/${maxHP}`}
      >
        <div
          className={`h-full transition-all duration-300 motion-reduce:transition-none ${colorClass} shadow-[0_0_8px_rgba(255,255,255,0.2)]`}
          style={{ width: `${percent}%` }}
        >
          <div className="absolute inset-0 bg-white/20 h-[30%] opacity-50"></div>
        </div>
      </div>
      {showText && (
        <div
          className="text-[0.6rem] text-right font-display text-white w-full mt-1 drop-shadow-sm uppercase tracking-tighter"
        >
          {Math.floor(currentHP)} / {maxHP} PS
        </div>
      )}
    </div>
  );
}
