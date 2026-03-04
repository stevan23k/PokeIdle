import { useState, useCallback } from "react";
import { generateUid } from "../../../utils/random";

export interface GameNotification {
  id: string;
  type:
    | "evolution"
    | "gym_available"
    | "badge"
    | "capture"
    | "level_up"
    | "zone_complete"
    | "defeat"
    | "elite_four"
    | "champion";
  message: string;
  icon: string;
  duration: number; // ms
  pokemonId?: number;
  isShiny?: boolean;
}

export function useNotifications() {
  const [queue, setQueue] = useState<GameNotification[]>([]);

  const notify = useCallback((notification: Omit<GameNotification, "id">) => {
    const id = generateUid();
    const newNotif = { ...notification, id };

    setQueue((prev) => {
      const updated = [...prev, newNotif];
      return updated.slice(-3); // Keep max 3 notifications
    });

    // Auto dismiss
    setTimeout(() => {
      remove(id);
    }, notification.duration);
  }, []);

  const remove = useCallback((id: string) => {
    setQueue((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { queue, notify, remove };
}
