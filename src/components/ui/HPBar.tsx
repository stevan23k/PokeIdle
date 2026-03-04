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
        className="w-full h-2 bg-surface-dark border border-border pixel-shadow-sm overflow-hidden"
        role="progressbar"
        aria-valuenow={currentHP}
        aria-valuemin={0}
        aria-valuemax={maxHP}
        aria-label={`HP: ${Math.floor(currentHP)}/${maxHP}`}
      >
        <div
          className={`h-full transition-all duration-300 motion-reduce:transition-none ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showText && (
        <div
          className="text-xs text-right font-body text-muted w-full"
          style={{ marginTop: "2px" }}
        >
          {Math.floor(currentHP)} / {maxHP}
        </div>
      )}
    </div>
  );
}
