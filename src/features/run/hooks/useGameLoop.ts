import { useEffect, useRef } from "react";

export function useGameLoop(
  isActive: boolean,
  speedMultiplier: 1 | 2 | 4 | "SKIP",
  tickCallback: () => void
) {
  const savedCallback = useRef(tickCallback);

  useEffect(() => {
    savedCallback.current = tickCallback;
  }, [tickCallback]);

  useEffect(() => {
    if (!isActive) return;

    if (speedMultiplier === "SKIP") {
      // Very fast simulation handled by synchronous loops inside the game engine,
      // but to avoid freezing the UI, we can use a very short interval
      const id = setInterval(() => {
        savedCallback.current();
      }, 50); // Fast forward tick
      return () => clearInterval(id);
    }

    const intervalMs = speedMultiplier === 4 ? 500 : (speedMultiplier === 2 ? 1000 : 2000);
    const id = setInterval(() => {
      savedCallback.current();
    }, intervalMs);

    return () => clearInterval(id);
  }, [isActive, speedMultiplier]);
}
