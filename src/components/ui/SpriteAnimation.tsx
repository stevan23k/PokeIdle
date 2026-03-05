// SpriteAnimation.tsx
// Componente React para animar spritesheets horizontales con frames de tamaño variable.
// Usa metadatos JSON generados por generate_spritesheet_meta.py

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Tipos ────────────────────────────────────────────────
export interface FrameMeta {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpritesheetMeta {
  name: string;
  imagePath: string;
  frameWidth: number | null;
  frameHeight: number | null;
  totalFrames: number;
  uniform: boolean;
  sheetWidth: number;
  sheetHeight: number;
  frames: FrameMeta[];
}

interface SpriteAnimationProps {
  /** URL del spritesheet PNG */
  spritesheetUrl: string;
  /** Metadatos generados por generate_spritesheet_meta.py */
  metadata: SpritesheetMeta;
  /** Frames por segundo (default: 10) */
  fps?: number;
  /** Si debe repetir en loop (default: false) */
  loop?: boolean;
  /** Escala visual (default: 1) */
  scale?: number;
  /** Callback al terminar la animación (o cada loop si loop=true) */
  onComplete?: () => void;
  /** Clase CSS adicional para el contenedor */
  className?: string;
}

// ─── Componente ───────────────────────────────────────────
export function SpriteAnimation({
  spritesheetUrl,
  metadata,
  fps = 10,
  loop = false,
  scale = 1,
  onComplete,
  className = "",
}: SpriteAnimationProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const frameRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Resetear al cambiar spritesheet
    setCurrentFrame(0);
    frameRef.current = 0;
    completedRef.current = false;

    const interval = 1000 / fps;

    intervalRef.current = setInterval(() => {
      const next = frameRef.current + 1;

      if (next >= metadata.totalFrames) {
        if (loop) {
          frameRef.current = 0;
          setCurrentFrame(0);
          onComplete?.();
        } else {
          // Quedarse en el último frame y notificar
          if (!completedRef.current) {
            completedRef.current = true;
            stop();
            onComplete?.();
          }
        }
      } else {
        frameRef.current = next;
        setCurrentFrame(next);
      }
    }, interval);

    return stop;
  }, [spritesheetUrl, metadata, fps, loop, onComplete, stop]);

  // Frame actual
  const frame = metadata.frames[currentFrame];
  if (!frame) return null;

  const displayW = frame.w * scale;
  const displayH = frame.h * scale;

  return (
    <div
      className={`sprite-animation ${className}`}
      style={{
        width: displayW,
        height: displayH,
        backgroundImage: `url(${spritesheetUrl})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
        backgroundSize: `${metadata.sheetWidth * scale}px ${metadata.sheetHeight * scale}px`,
        imageRendering: "pixelated",
        overflow: "visible",
      }}
      aria-hidden="true"
    />
  );
}

// ─── Hook helper ──────────────────────────────────────────
// Para cargar el JSON de metadatos de forma asíncrona
export function useSpritesheetMeta(jsonUrl: string) {
  const [meta, setMeta] = useState<SpritesheetMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(jsonUrl)
      .then((r) => r.json())
      .then((data: SpritesheetMeta) => {
        setMeta(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [jsonUrl]);

  return { meta, loading, error };
}
