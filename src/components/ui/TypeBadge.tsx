import React from "react";
import { typeIconUrl } from "../../lib/sprites";
import { clsx } from "clsx";

const TYPE_COLORS: Record<string, string> = {
  normal: "#A8A878",
  fire: "#F08030",
  water: "#6890F0",
  electric: "#F8D030",
  grass: "#78C850",
  ice: "#98D8D8",
  fighting: "#C03028",
  poison: "#A040A0",
  ground: "#E0C068",
  flying: "#A890F0",
  psychic: "#F85888",
  bug: "#A8B820",
  rock: "#B8A038",
  ghost: "#705898",
  dragon: "#7038F8",
  dark: "#705848",
  steel: "#B8B8D0",
  fairy: "#EE99AC",
};

interface TypeBadgeProps {
  type: string;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function TypeBadge({
  type,
  size = "md",
  showLabel = true,
  className,
}: TypeBadgeProps) {
  const color = TYPE_COLORS[type.toLowerCase()] || "#777";
  const icon = typeIconUrl(type.toLowerCase());

  return (
    <div
      className={clsx(
        "inline-flex items-center justify-center rounded px-4 py-1 text-white font-bold uppercase shadow-sm",
        size === "sm" ? "text-[11px] min-w-14" : "text-sm min-w-18",
        className
      )}
      style={{
        backgroundColor: color,
        textShadow: "0px 1px 2px rgba(0,0,0,0.5)",
        gap: "4px",
      }}
    >
      {icon && (
        <img
          src={icon}
          alt=""
          className={size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5"}
          style={{ imageRendering: "pixelated" }}
        />
      )}
      {showLabel && type}
    </div>
  );
}
