import React, { useState, useEffect, useRef } from "react";
import { pokemonSprites } from "../../../lib/sprites";

interface PixelSpriteProps {
  pokemonId: number;
  variant: "front" | "back";
  shiny?: boolean;
  size?: number;
  showScanlines?: boolean;
  className?: string;
  alt?: string;
  onLoad?: () => void;
}

/**
 * Renders a Pokémon sprite from PokeAPI sprites.
 *
 * State design:
 *  - `useFallback` — whether the primary Gen-III URL failed; try the default sprite
 *  - `loaded` — whether the current img has dispatched onLoad
 *
 * Using `key={cacheKey}` on the <img> forces React to unmount + remount the element
 * every time the src changes, which guarantees onLoad fires even for cached images.
 */
export function PixelSprite({
  pokemonId,
  variant,
  shiny = false,
  size = 96,
  showScanlines = false,
  className,
  alt,
  onLoad,
}: PixelSpriteProps) {
  const primaryUrl =
    variant === "front"
      ? pokemonSprites.front(pokemonId, shiny)
      : pokemonSprites.back(pokemonId, shiny);

  const fallbackUrl =
    variant === "front"
      ? pokemonSprites.frontFallback(pokemonId, shiny)
      : pokemonSprites.backFallback(pokemonId, shiny);

  const [stage, setStage] = useState(0); // 0: primary, 1: secondary, 2: front-as-back
  const [hasFailed, setHasFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset state whenever the Pokémon or variant changes
  const prevKey = useRef(`${pokemonId}-${variant}-${shiny}`);
  const currentKey = `${pokemonId}-${variant}-${shiny}`;
  if (prevKey.current !== currentKey) {
    prevKey.current = currentKey;
    setStage(0);
    setHasFailed(false);
    setLoaded(false);
  }

  const getSrc = () => {
    if (stage === 0) return primaryUrl;
    if (stage === 1) return fallbackUrl;
    if (stage === 2 && variant === "back")
      return pokemonSprites.frontFallback(pokemonId);
    return null;
  };

  const src = getSrc();
  const isFrontAsBack = variant === "back" && stage === 2;

  const handleError = () => {
    if (stage === 0) {
      setStage(1);
    } else if (stage === 1 && variant === "back") {
      setStage(2);
    } else {
      setHasFailed(true);
    }
    setLoaded(false);
  };

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {/* Loading skeleton */}
      {!loaded && !hasFailed && (
        <div
          style={{
            position: "absolute",
            width: size * 0.7,
            height: size * 0.7,
            background: "var(--color-surface-light, #2a2a3c)",
            opacity: 0.4,
          }}
        />
      )}

      {/* Sprite */}
      {!hasFailed && src && (
        <img
          key={src}
          src={src}
          alt={alt ?? `Pokémon #${pokemonId}`}
          onLoad={() => {
            setLoaded(true);
            onLoad?.();
          }}
          onError={handleError}
          style={{
            width: size,
            height: size,
            imageRendering: "pixelated",
            objectFit: "contain",
            display: "block",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.12s ease",
            transform: isFrontAsBack ? "scaleX(-1)" : undefined,
          }}
        />
      )}

      {/* Fallback placeholder */}
      {hasFailed && (
        <div
          style={{
            width: size * 0.7,
            height: size * 0.7,
            background: "var(--color-surface-light, #2a2a3c)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.35,
            color: "var(--color-muted, #666)",
          }}
        >
          ?
        </div>
      )}

      {/* CRT scanlines overlay */}
      {showScanlines && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}
    </div>
  );
}
