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
