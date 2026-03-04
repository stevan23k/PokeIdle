import { useState, useEffect, useRef } from "react";
import type { BattleBackground } from "../../../lib/battleBackgrounds";

interface UseBattleBackgroundResult {
  backgroundFrames: string[];
  currentFrame: number;
  isLoading: boolean;
  error: string | null;
}

export function useBattleBackground(
  bg: BattleBackground | null,
): UseBattleBackgroundResult {
  const [backgroundFrames, setBackgroundFrames] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!bg) return;
    setIsLoading(true);
    setError(null);
    setCurrentFrame(0);
    setBackgroundFrames([]);

    const img = new Image();
    img.src = `/${bg.spriteSheet}`;

    img.onload = () => {
      try {
        // --- Fast path: image is already fully opaque, skip Canvas entirely ---
        if (bg.transparencyColor === null) {
          setBackgroundFrames([`/${bg.spriteSheet}`]);
          setIsLoading(false);
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const [r, g, b] = bg.transparencyColor;

        for (let i = 0; i < data.length; i += 4) {
          if (data[i] === r && data[i + 1] === g && data[i + 2] === b) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);

        const frames: string[] = [];
        for (let i = 0; i < bg.frameCount; i++) {
          const frameCanvas = document.createElement("canvas");
          frameCanvas.width = img.width;
          frameCanvas.height = bg.frameHeight;
          const fCtx = frameCanvas.getContext("2d")!;

          const yOffset = bg.frameCount > 1 ? i * bg.frameHeight * 2 : 0;
          fCtx.drawImage(
            canvas,
            0,
            yOffset,
            img.width,
            bg.frameHeight,
            0,
            0,
            img.width,
            bg.frameHeight,
          );
          frames.push(frameCanvas.toDataURL("image/png"));
        }

        setBackgroundFrames(frames);
        setIsLoading(false);
      } catch (err) {
        setError(`Error processing sprite sheet: ${bg.spriteSheet}`);
        setIsLoading(false);
      }
    };

    img.onerror = () => {
      setError(`Could not load sprite sheet: ${bg.spriteSheet}`);
      setIsLoading(false);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [bg?.spriteSheet, bg?.transparencyColor]);

  useEffect(() => {
    if (backgroundFrames.length === 0 || !bg || bg.frameCount <= 1) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    animationRef.current = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % bg.frameCount);
    }, 1000 / bg.fps);

    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [backgroundFrames, bg?.frameCount, bg?.fps]);

  return { backgroundFrames, currentFrame, isLoading, error };
}
