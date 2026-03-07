import React, { useState } from "react";
import type { Item } from "../../../lib/items";
import { itemSpriteUrl } from "../../../lib/sprites";

interface ItemSpriteProps {
  item: Item;
  size?: number;
  className?: string;
}

/**
 * Renders an item sprite using local assets first,
 * with a fallback to PokeAPI GitHub sprites.
 */
export function ItemSprite({
  item,
  size = 32,
  className = "",
}: ItemSpriteProps) {
  const [hasError, setHasError] = useState(false);
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);

  // ── TM CUSTOM RENDERING ────────────────────────────────────────────────────
  const TM_TYPE_COLORS: Record<string, string> = {
    "tm-normal": "#A8A878",
    "tm-fire": "#F08030",
    "tm-water": "#6890F0",
    "tm-electric": "#F8D030",
    "tm-grass": "#78C850",
    "tm-ice": "#98D8D8",
    "tm-fighting": "#C03028",
    "tm-poison": "#A040A0",
    "tm-ground": "#E0C068",
    "tm-flying": "#A890F0",
    "tm-psychic": "#F85888",
    "tm-bug": "#A8B820",
    "tm-rock": "#B8A038",
    "tm-ghost": "#705898",
    "tm-dragon": "#7038F8",
    "tm-dark": "#705848",
    "tm-steel": "#B8B8D0",
    "tm-fairy": "#EE99AC",
  };

  if (item.spriteSlug in TM_TYPE_COLORS) {
    const color = TM_TYPE_COLORS[item.spriteSlug];
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className={`${className}`}
        style={{ imageRendering: "pixelated" }}
      >
        <title>{item.name}</title>
        {/* Disco exterior */}
        <circle
          cx="16"
          cy="16"
          r="14"
          fill={color}
          stroke="#333"
          strokeWidth="1.5"
        />
        {/* Anillo interior */}
        <circle
          cx="16"
          cy="16"
          r="8"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Agujero central */}
        <circle cx="16" cy="16" r="3" fill="#222" />
        {/* Brillo */}
        <circle cx="11" cy="10" r="3" fill="#fff" opacity="0.25" />
        {/* Letra MT */}
        <text
          x="16"
          y="20"
          textAnchor="middle"
          fontSize="7"
          fontWeight="bold"
          fill="#fff"
          fontFamily="monospace"
          opacity="0.9"
        >
          MT
        </text>
      </svg>
    );
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Use the spriteSlug from the item definition
  const spriteUrl = itemSpriteUrl(item.spriteSlug);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-light/50 rounded-md border border-white/10 overflow-hidden ${className}`}
        style={{ width: size, height: size }}
        title={item.name}
      >
        <img 
          src="/sprites/items/0.png" 
          alt="Item fallback" 
          className="w-full h-full object-contain image-rendering-pixelated opacity-50"
        />
      </div>
    );
  }

  return (
    <img
      src={fallbackSrc || spriteUrl}
      alt={item.name}
      title={item.name}
      className={`object-contain ${className}`}
      style={{
        width: size,
        height: size,
        imageRendering: "pixelated",
      }}
      onError={() => setHasError(true)}
    />
  );
}
