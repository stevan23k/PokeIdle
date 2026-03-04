import React from "react";
import { useBattleBackground } from "../../../features/run/hooks/useBattleBackground";
import { getBackgroundById } from "../../../lib/battleBackgrounds";

interface BattleBackgroundProps {
  backgroundId: string;
  className?: string;
}

export function BattleBackground({
  backgroundId,
  className,
}: BattleBackgroundProps) {
  const bg = getBackgroundById(backgroundId);
  const { backgroundFrames, currentFrame, isLoading, error } =
    useBattleBackground(bg);

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    height: "100%",
    width: "100%",
  };

  if (!bg || error) {
    return (
      <div
        className={className}
        style={{
          ...baseStyle,
          background: "linear-gradient(to bottom, #1a1a2e, #16213e)",
        }}
        aria-hidden="true"
      />
    );
  }

  if (isLoading || backgroundFrames.length === 0) {
    return (
      <div
        className={className}
        style={{ ...baseStyle, background: "#0D0D0D" }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        ...baseStyle,
        backgroundImage: `url(${backgroundFrames[currentFrame]})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
        backgroundPosition: "center center",
        imageRendering: "pixelated",
      }}
      aria-hidden="true"
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
    </div>
  );
}
